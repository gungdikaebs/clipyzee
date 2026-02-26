import { Worker, Job } from 'bullmq';
import { PrismaClient } from '@prisma/client';
import { exec } from 'child_process';
import * as path from 'path';
import * as fs from 'fs/promises';
import { constants } from 'fs';
import * as util from 'util';
import 'dotenv/config';
import bytes from 'bytes';
import { selectClips, TranscriptSegment, ClipCandidate } from './selector';
import { downloadVideo, extractAudio, cutClip, getVideoDuration } from './video';

const execPromise = util.promisify(exec);
const prisma = new PrismaClient();

const redisConnection = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
};

const MAX_FILE_SIZE_BYTES = 1073741824; // 1GB in bytes
const JOB_TIMEOUT_MS = 60 * 60 * 1000; // 1 hour
const CHUNK_SIZE_SECS = 45 * 60; // 45 minute chunks

async function checkFileExists(file: string) {
    return fs.access(file, constants.F_OK).then(() => true).catch(() => false);
}

// ---------------------------------------------------------
// Pipeline Step: Transcribe Audio
// ---------------------------------------------------------
async function transcribeAudio(audioPath: string, language: string): Promise<TranscriptSegment[]> {
    const pythonPath = path.join(__dirname, '../venv/bin/python3');
    const scriptPath = path.join(__dirname, '../scripts/transcribe.py');

    console.log(`[Transcribe] Starting Whisper Transcription (Lang: ${language})...`);

    // Using model_size="base" as configured per Whisper optimization requirements
    const transcribeCommand = `"${pythonPath}" "${scriptPath}" "${audioPath}" "${language}" "base"`;

    const { stdout, stderr } = await execPromise(transcribeCommand);

    if (stderr) {
        console.warn('[Transcribe] stderr warning:', stderr);
    }

    try {
        const transcript = JSON.parse(stdout);
        if (transcript.error) {
            throw new Error(`Whisper Error: ${transcript.error}`);
        }
        return transcript as TranscriptSegment[];
    } catch (e) {
        console.error('[Transcribe] Failed to parse transcript JSON:', stdout);
        throw new Error('Invalid transcript output');
    }
}

// ---------------------------------------------------------
// Pipeline Step: Cut Clips
// ---------------------------------------------------------
async function processClips(fullVideoPath: string, clips: ClipCandidate[], outputDir: string, jobId: string) {
    const jobOutputDir = path.join(outputDir, jobId);
    await fs.mkdir(jobOutputDir, { recursive: true });

    const finalClips: any[] = [];
    console.log(`[Clipping] Found ${clips.length} interesting candidates. Starting FFmpeg cuts...`);

    for (let i = 0; i < clips.length; i++) {
        const clip = clips[i];
        const clipFilename = `clip_${i + 1}.mp4`;
        const clipPath = path.join(jobOutputDir, clipFilename);

        try {
            await cutClip(fullVideoPath, clip.start, clip.end, clipPath);

            finalClips.push({
                ...clip,
                filePath: clipPath,
                duration: clip.end - clip.start
            });
        } catch (err) {
            console.error(`[Clipping] Failed to cut clip ${clipFilename}`, err);
        }
    }

    return finalClips;
}

// ---------------------------------------------------------
// Main Pipeline Orchestrator
// ---------------------------------------------------------
const processVideoWithTimeout = async (job: Job) => {
    return Promise.race([
        processVideo(job),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Job timeout exceeded (1 hour)')), JOB_TIMEOUT_MS))
    ]);
}

const processVideo = async (job: Job) => {
    const { videoId, jobId, url, language } = job.data;
    console.log(`[Pipeline] Processing job ${job.id} for video ${videoId} (URL: ${url}, Lang: ${language})`);

    const outputDir = path.join(__dirname, '../output');
    await fs.mkdir(outputDir, { recursive: true });

    const tempAudioPath = path.join(outputDir, `audio-${videoId}.wav`);
    const transcriptPath = path.join(outputDir, `transcript-${videoId}.json`);
    const lang = language || 'id';

    let fullVideoPath: string | null = null;

    try {
        await prisma.job.update({
            where: { id: jobId },
            data: { status: 'PROCESSING' },
        });

        // 1. Download Full Video (Single Source of Truth)
        fullVideoPath = await downloadVideo(url, outputDir, videoId);

        // 1.1 Guard: Check File Size
        const stat = await fs.stat(fullVideoPath);
        if (stat.size > MAX_FILE_SIZE_BYTES) {
            throw new Error(`Video file too large: ${bytes(stat.size)}. Max allowed is 1GB.`);
        }

        // 2. Fetch Duration for Chunking
        const totalDuration = await getVideoDuration(fullVideoPath);
        console.log(`[Pipeline] Full video duration: ${totalDuration}s`);

        let currentTime = 0;
        let masterClips: ClipCandidate[] = [];
        let fullTranscript: TranscriptSegment[] = [];

        // 3. Chronological Loop
        while (currentTime < totalDuration) {
            const chunkDuration = Math.min(CHUNK_SIZE_SECS, totalDuration - currentTime);
            console.log(`[Pipeline] Processing Chunk: ${currentTime}s to ${currentTime + chunkDuration}s`);

            // 3.1 Extract Audio Chunk
            await extractAudio(fullVideoPath, tempAudioPath, currentTime, chunkDuration);

            // 3.2 Transcribe Local Chunk
            const chunkTranscript = await transcribeAudio(tempAudioPath, lang);

            // 3.3 Apply Offset
            const offsetTranscript = chunkTranscript.map(seg => ({
                ...seg,
                start: seg.start + currentTime,
                end: seg.end + currentTime
            }));

            fullTranscript = fullTranscript.concat(offsetTranscript);
            console.log(`[Pipeline] Chunk Transcription complete. Found ${offsetTranscript.length} segments.`);

            // 3.4 Rule-Based Segment Selection
            console.log(`[Selector] Running deterministic analyzer for chunk...`);
            const chunkClips = selectClips(offsetTranscript);
            console.log(`[Selector] Found ${chunkClips.length} candidates in chunk.`);

            masterClips = masterClips.concat(chunkClips);

            // 3.5 Disk Safety: Cleanup chunk audio immediately
            if (await checkFileExists(tempAudioPath)) {
                await fs.rm(tempAudioPath, { force: true });
            }

            // 4. Early Exit Constraint
            if (masterClips.length >= 5) {
                console.log(`[Pipeline] Early Exit Triggered! Found ${masterClips.length} clips (Target >= 5). Halting further transcriptions.`);
                break;
            }

            currentTime += chunkDuration;
        }

        // 5. Post-Process Clipy
        masterClips.sort((a, b) => b.score - a.score);
        const topClips = masterClips.slice(0, 10); // Standard constraint

        // Save Transcript for debugging/user request
        await fs.writeFile(transcriptPath, JSON.stringify(fullTranscript, null, 2));

        // 6. Slice Video into localized clips
        let finalClips: any[] = [];
        if (topClips.length > 0) {
            finalClips = await processClips(fullVideoPath, topClips, outputDir, jobId);
        }

        // 6. Complete
        await prisma.job.update({
            where: { id: jobId },
            data: {
                status: 'COMPLETED',
                result: {
                    transcript: fullTranscript,
                    clips: finalClips
                } as any,
            },
        });

        console.log(`[Pipeline] Job ${job.id} completed successfully.`);

    } catch (error) {
        console.error(`[Pipeline] Job ${job.id} failed:`, error);

        await prisma.job.update({
            where: { id: jobId },
            data: { status: 'FAILED' },
        });

        throw error;
    } finally {
        console.log(`[Cleanup] Initiating sequence for job ${job.id}...`);

        // Robust asynchronous cleanup for disk safety
        const filesToClean = [tempAudioPath, transcriptPath];
        if (fullVideoPath) filesToClean.push(fullVideoPath);

        for (const file of filesToClean) {
            if (await checkFileExists(file)) {
                try {
                    await fs.rm(file, { force: true });
                    console.log(`[Cleanup] Deleted ${file}`);
                } catch (e) {
                    console.error(`[Cleanup] Failed to delete ${file}`, e);
                }
            }
        }
    }
};

const worker = new Worker('video', processVideoWithTimeout, {
    connection: redisConnection,
    concurrency: 1, // Fix: Explicitly prevent memory exhaustion from parallel Whisper tasks
});

worker.on('completed', job => {
    console.log(`[Worker] Job ${job.id} has finalized completion event.`);
});

worker.on('failed', (job, err) => {
    console.log(`[Worker] Job ${job?.id} emitted failure event: ${err.message}`);
});

console.log('Worker started (YouTube MVP - Pipeline V2)...');
