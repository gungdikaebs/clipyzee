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
import { downloadAudioOnly, extractAudio, downloadClip, getVideoDuration, renderClipWithSubtitles } from './video';
import { generateAssSubtitles } from './subtitle';
import { analyzeTranscript } from './llm';

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

            // 3.4 Gemini LLM Selection
            console.log(`[Selector] Running Gemini LLM analyzer for chunk...`);
            const formatTimeForLLM = (totalSeconds: number) => {
                const h = Math.floor(totalSeconds / 3600);
                const m = Math.floor((totalSeconds % 3600) / 60);
                const s = Math.floor(totalSeconds % 60);
                return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
            };

            const formattedTranscript = offsetTranscript
                .map(seg => `[${formatTimeForLLM(seg.start)} - ${formatTimeForLLM(seg.end)}] ${seg.text}`)
                .join('\n');

            const llmCandidates = await analyzeTranscript(formattedTranscript);
            console.log(`[Selector] Gemini returned ${llmCandidates.length} candidates.`);

            const parseTimeToSeconds = (timeStr: string): number => {
                const parts = timeStr.trim().split(':').map(Number);
                if (parts.length === 3) {
                    return parts[0] * 3600 + parts[1] * 60 + parts[2];
                } else if (parts.length === 2) {
                    return parts[0] * 60 + parts[1];
                } else {
                    return Number(timeStr) || 0;
                }
            };

            const chunkClips = llmCandidates.map(c => ({
                start: parseTimeToSeconds(c.start),
                end: parseTimeToSeconds(c.end),
                reason: c.reason,
                score: c.score,
            }));

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
    const { videoId, jobId, url, start, end, aspectRatio, subtitleStyle, cropX, extractOnly, rawVideoPath } = job.data;
    const aspect = aspectRatio || '9:16';
    const subStyle = subtitleStyle || 'DEFAULT';
    console.log(`[Render] Processing job ${job.id} for video ${videoId} [${start}s - ${end}s] (Aspect: ${aspect}, Style: ${subStyle}, ExtractOnly: ${extractOnly}, RawVideoPath: ${rawVideoPath})`);

    const outputDir = path.join(__dirname, '../output/renders');
    await fs.mkdir(outputDir, { recursive: true });

    let finalFilePath: string | null = null;

    try {
        // A. Extract Only Flow (Fast Raw Clip download)
        if (extractOnly) {
            console.log(`[Render] [Bypass] Extracting raw clip only from YouTube...`);
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
            console.log(`[Render] Raw clip extracted to: ${finalFilePath}`);
            return;
        }

        // B. Standard Subtitle Render Flow
        let transcript: TranscriptSegment[] = [];
        const { customTranscript } = job.data;

        if (customTranscript && customTranscript.length > 0) {
            console.log(`[Render] Using custom edited transcript override with ${customTranscript.length} segments.`);
            transcript = customTranscript;
        } else {
            // The render-clip actually receives the same videoId, but we don't pass the heavy transcript
            // in the BullMQ payload, so we must load it from the database where it was saved.
            const parentJob = await prisma.job.findFirst({
                where: { videoId: videoId, type: 'ANALYZE', status: 'COMPLETED' },
                orderBy: { createdAt: 'desc' }
            });

            if (parentJob && parentJob.result && (parentJob.result as any).transcript) {
                transcript = (parentJob.result as any).transcript;
            } else {
                // Fallback to reading the local json dump if DB is wiped but files persist
                const transcriptPath = path.join(__dirname, `../output/transcript-${videoId}.json`);
                if (await checkFileExists(transcriptPath)) {
                    const rawData = await fs.readFile(transcriptPath, 'utf-8');
                    transcript = JSON.parse(rawData);
                } else {
                    console.warn(`[Render] WARNING: Could not find word-level transcript for ${videoId}. Subtitles will not be generated.`);
                }
            }
        }

        // C. Reuse rawVideoPath if present on local disk, otherwise download from YouTube
        let downloadedFilePath = "";
        if (rawVideoPath && await checkFileExists(rawVideoPath)) {
            downloadedFilePath = rawVideoPath;
            console.log(`[Render] Reusing pre-extracted raw video clip: ${downloadedFilePath}`);
        } else {
            console.log(`[Render] Downloading video clip from YouTube...`);
            downloadedFilePath = await downloadClip(url, outputDir, jobId, start, end);
        }

        if (transcript.length > 0) {
            // 3. Generate .ass subtitle file for the specific timeframe
            const assFileName = `subs-${jobId}.ass`;
            const assFilePath = path.join(outputDir, assFileName);

            console.log(`[Render] Generating stylized subtitles for ${start}s - ${end}s (Style: ${subStyle}, Aspect: ${aspect})`);
            await generateAssSubtitles(transcript, assFilePath, start, end, subStyle, aspect);

            // 4. Render final video with burned-in subtitles
            const finalRenderFileName = `render-${jobId}.mp4`;
            const finalRenderFilePath = path.join(outputDir, finalRenderFileName);

            console.log(`[Render] Burning subtitles and rendering as ${aspect}...`);
            finalFilePath = await renderClipWithSubtitles(downloadedFilePath, assFilePath, finalRenderFilePath, aspect, Number(start), transcript);

            // Clean up intermediates
            try {
                if (!rawVideoPath) {
                    await fs.rm(downloadedFilePath, { force: true });
                }
                await fs.rm(assFilePath, { force: true });
            } catch (e) {
                console.error(`[Cleanup] Render job ${jobId} failed to clean intermediates.`, e);
            }

        } else {
            console.log(`[Render] No transcript available, outputting default downloaded video.`);
            finalFilePath = downloadedFilePath;
        }

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
