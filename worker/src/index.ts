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
import { downloadAudioOnly, extractAudio, downloadClip, getVideoDuration } from './video';

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
// Phase 1: Analysis Job
// ---------------------------------------------------------
const handleAnalyzeJob = async (job: Job) => {
    const { videoId, jobId, url, language } = job.data;
    console.log(`[Analyze] Processing job ${job.id} for video ${videoId} (URL: ${url}, Lang: ${language})`);

    const outputDir = path.join(__dirname, '../output');
    await fs.mkdir(outputDir, { recursive: true });

    const tempAudioExtractPath = path.join(outputDir, `audio-${videoId}.wav`);
    const transcriptPath = path.join(outputDir, `transcript-${videoId}.json`);
    const lang = language || 'id';

    let fullAudioPath: string | null = null;

    try {
        await prisma.job.update({
            where: { id: jobId },
            data: { status: 'PROCESSING' },
        });

        // 1. Download Audio Only (Fastest)
        fullAudioPath = await downloadAudioOnly(url, outputDir, videoId);

        // 1.1 Guard: Check File Size
        const stat = await fs.stat(fullAudioPath);
        if (stat.size > MAX_FILE_SIZE_BYTES) {
            throw new Error(`Audio file too large: ${bytes(stat.size)}. Max allowed is 1GB.`);
        }

        // 2. Fetch Duration
        const totalDuration = await getVideoDuration(fullAudioPath);
        console.log(`[Analyze] Full audio duration: ${totalDuration}s`);

        let currentTime = 0;
        let masterClips: ClipCandidate[] = [];
        let fullTranscript: TranscriptSegment[] = [];

        // 3. Chronological Loop
        while (currentTime < totalDuration) {
            const chunkDuration = Math.min(CHUNK_SIZE_SECS, totalDuration - currentTime);
            console.log(`[Analyze] Processing Chunk: ${currentTime}s to ${currentTime + chunkDuration}s`);

            // 3.1 Extract 16kHz wav Chunk
            await extractAudio(fullAudioPath, tempAudioExtractPath, currentTime, chunkDuration);

            // 3.2 Transcribe Local Chunk
            const chunkTranscript = await transcribeAudio(tempAudioExtractPath, lang);

            // 3.3 Apply Offset
            const offsetTranscript = chunkTranscript.map(seg => ({
                ...seg,
                start: seg.start + currentTime,
                end: seg.end + currentTime
            }));

            fullTranscript = fullTranscript.concat(offsetTranscript);
            console.log(`[Analyze] Chunk Transcription complete. Found ${offsetTranscript.length} segments.`);

            // 3.4 Rule-Based Segment Selection
            console.log(`[Selector] Running deterministic analyzer for chunk...`);
            const chunkClips = selectClips(offsetTranscript);
            console.log(`[Selector] Found ${chunkClips.length} candidates in chunk.`);

            masterClips = masterClips.concat(chunkClips);

            // 3.5 Disk Safety: Cleanup chunk audio immediately
            if (await checkFileExists(tempAudioExtractPath)) {
                await fs.rm(tempAudioExtractPath, { force: true });
            }

            // 4. Early Exit Constraint
            if (masterClips.length >= 5) {
                console.log(`[Analyze] Early Exit Triggered! Found ${masterClips.length} clips (Target >= 5). Halting further transcriptions.`);
                break;
            }

            currentTime += chunkDuration;
        }

        // 5. Post-Process Clipy
        masterClips.sort((a, b) => b.score - a.score);
        const topClips = masterClips.slice(0, 10); // Standard constraint

        // Save Transcript for debugging/user request
        await fs.writeFile(transcriptPath, JSON.stringify(fullTranscript, null, 2));

        // 6. Complete Job
        await prisma.job.update({
            where: { id: jobId },
            data: {
                status: 'COMPLETED',
                result: {
                    transcript: fullTranscript,
                    clips: topClips // Now only metadata, no heavy video files
                } as any,
            },
        });

        console.log(`[Analyze] Job ${job.id} completed successfully.`);

    } catch (error) {
        console.error(`[Analyze] Job ${job.id} failed:`, error);
        await prisma.job.update({ where: { id: jobId }, data: { status: 'FAILED' } });
        throw error;
    } finally {
        console.log(`[Cleanup] Initiating sequence for job ${job.id}...`);
        const filesToClean = [tempAudioExtractPath, transcriptPath];
        if (fullAudioPath) filesToClean.push(fullAudioPath);

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

// ---------------------------------------------------------
// Phase 2: Render Clip Job
// ---------------------------------------------------------
const handleRenderJob = async (job: Job) => {
    const { videoId, jobId, url, start, end } = job.data;
    console.log(`[Render] Processing job ${job.id} for video ${videoId} [${start}s - ${end}s]`);

    const outputDir = path.join(__dirname, '../output/renders');
    await fs.mkdir(outputDir, { recursive: true });

    let finalFilePath: string | null = null;

    try {
        await prisma.job.update({
            where: { id: jobId },
            data: { status: 'PROCESSING' },
        });

        // Delegate to yt-dlp native section download
        finalFilePath = await downloadClip(url, outputDir, jobId, start, end);

        await prisma.job.update({
            where: { id: jobId },
            data: {
                status: 'COMPLETED',
                result: {
                    filePath: finalFilePath
                } as any,
            },
        });

        console.log(`[Render] Job ${job.id} completed. File located at ${finalFilePath}`);

    } catch (error) {
        console.error(`[Render] Job ${job.id} failed:`, error);
        await prisma.job.update({ where: { id: jobId }, data: { status: 'FAILED' } });
        throw error;
    }
};

// ---------------------------------------------------------
// Main Pipeline Router
// ---------------------------------------------------------
const processJobRouter = async (job: Job) => {
    return Promise.race([
        (async () => {
            if (job.name === 'analyze-video' || job.name === 'process-video') {
                return await handleAnalyzeJob(job);
            } else if (job.name === 'render-clip') {
                return await handleRenderJob(job);
            } else {
                throw new Error(`Unknown job name: ${job.name}`);
            }
        })(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Job timeout exceeded (1 hour)')), JOB_TIMEOUT_MS))
    ]);
};

// Queue configuration
const worker = new Worker('video', processJobRouter, {
    connection: redisConnection,
    concurrency: 1, // Fix: Explicitly prevent memory exhaustion from parallel tasks
});

worker.on('completed', job => {
    console.log(`[Worker] Job ${job.id} has finalized completion event.`);
});

worker.on('failed', (job, err) => {
    console.log(`[Worker] Job ${job?.id} emitted failure event: ${err.message}`);
});

console.log('Worker started (Two-Phase Pipeline: Analyze & Render)...');
