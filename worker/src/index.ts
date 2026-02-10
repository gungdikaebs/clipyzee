import { Worker, Job } from 'bullmq';
import { PrismaClient } from '@prisma/client';
import { exec } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import * as util from 'util';
import 'dotenv/config';
import { selectClips } from './selector';
import { downloadVideo, cutClip } from './video';

const execPromise = util.promisify(exec);
const prisma = new PrismaClient();
// ... (rest of imports remains same)

const redisConnection = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
};

const processVideo = async (job: Job) => {
    const { videoId, jobId, url, language } = job.data;
    console.log(`Processing job ${job.id} for video ${videoId} (URL: ${url}, Lang: ${language})`);

    // Ensure output directory exists
    const outputDir = path.join(__dirname, '../output');
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    // Paths
    const tempAudioPath = path.join(outputDir, `audio-${videoId}.wav`);

    // Select language (default to 'id' for Whisper as requested)
    const lang = language || 'id';

    const pythonPath = path.join(__dirname, '../venv/bin/python3');
    const scriptPath = path.join(__dirname, '../scripts/transcribe.py');

    try {
        // Update status to PROCESSING
        await prisma.job.update({
            where: { id: jobId },
            data: { status: 'PROCESSING' },
        });

        console.log(`Downloading Audio from YouTube: ${url}`);

        // Command to download AUDIO ONLY (wav, 16khz, mono)
        const downloadCommand = `yt-dlp -x --audio-format wav --postprocessor-args "ffmpeg:-ac 1 -ar 16000" -o "${tempAudioPath}" "${url}"`;
        console.log(`Executing download: ${downloadCommand}`);

        await execPromise(downloadCommand);

        if (!fs.existsSync(tempAudioPath)) {
            throw new Error(`Download failed, file not found at ${tempAudioPath}`);
        }
        console.log(`Audio download complete: ${tempAudioPath}`);

        console.log(`Starting Whisper Transcription (Model: small, Lang: ${lang})...`);

        // Call Python script with: python3 transcribe.py <audio_path> <language>
        const transcribeCommand = `"${pythonPath}" "${scriptPath}" "${tempAudioPath}" "${lang}"`;
        console.log(`Executing transcription: ${transcribeCommand}`);

        const { stdout, stderr } = await execPromise(transcribeCommand);

        if (stderr) {
            console.error('Transcription stderr:', stderr);
        }

        let transcript;
        try {
            transcript = JSON.parse(stdout);
        } catch (e) {
            console.error('Failed to parse transcript JSON:', stdout);
            throw new Error('Invalid transcript output');
        }

        console.log(`Transcription complete. Found ${transcript.length} segments.`);

        // Rule-Based Clip Selection (MVP)
        console.log(`Running clip selector...`);
        const clips = selectClips(transcript);
        console.log(`Found ${clips.length} interesting clip candidates.`);

        // Save transcript to JSON file (User Request)
        const transcriptPath = path.join(outputDir, `transcript-${videoId}.json`);
        // Use fs.promises for consistency if possible, but writeFileSync is fine here as per original code style
        fs.writeFileSync(transcriptPath, JSON.stringify(transcript, null, 2));
        console.log(`Transcript saved to: ${transcriptPath}`);

        // --- VIDEO CLIPPING PHASE ---
        const finalClips: any[] = [];
        let fullVideoPath: string | null = null;

        if (clips.length > 0) {
            try {
                console.log(`[Video] Starting video download for joining/clipping...`);
                fullVideoPath = await downloadVideo(url, outputDir, videoId);
                console.log(`[Video] Full video downloaded: ${fullVideoPath}`);

                for (let i = 0; i < clips.length; i++) {
                    const clip = clips[i];

                    const jobOutputDir = path.join(outputDir, jobId);
                    if (!fs.existsSync(jobOutputDir)) {
                        fs.mkdirSync(jobOutputDir, { recursive: true });
                    }

                    const clipFilename = `clip_${i + 1}.mp4`;
                    const clipPath = path.join(jobOutputDir, clipFilename);

                    try {
                        await cutClip(fullVideoPath, clip.start, clip.end, clipPath);

                        finalClips.push({
                            ...clip,
                            filePath: clipPath,
                            duration: clip.end - clip.start
                        });
                        console.log(`[Video] Clip generated: ${clipPath}`);
                    } catch (err) {
                        console.error(`[Video] Failed to cut clip ${clipFilename}`, err);
                    }
                }
            } catch (err) {
                console.error("[Video] Processing failed", err);
                throw err;
            } finally {
                // Cleanup full video
                if (fullVideoPath && fs.existsSync(fullVideoPath)) {
                    fs.unlinkSync(fullVideoPath);
                    console.log(`[Video] Cleanup: Deleted full video ${fullVideoPath}`);
                }
            }
        }


        // Clean up audio file
        if (fs.existsSync(tempAudioPath)) {
            fs.unlinkSync(tempAudioPath);
            console.log(`Deleted temp audio: ${tempAudioPath}`);
        }

        // Update status to COMPLETED with transcript and clips in result
        await prisma.job.update({
            where: { id: jobId },
            data: {
                status: 'COMPLETED',
                result: {
                    transcript,
                    clips: finalClips
                } as any,
            },
        });

        console.log(`Job ${job.id} completed`);
    } catch (error) {
        console.error(`Job ${job.id} failed`, error);
        await prisma.job.update({
            where: { id: jobId },
            data: { status: 'FAILED' },
        });

        // Cleanup if failed
        if (fs.existsSync(tempAudioPath)) {
            fs.unlinkSync(tempAudioPath);
        }

        throw error;
    }
};

const worker = new Worker('video', processVideo, {
    connection: redisConnection,
});

worker.on('completed', job => {
    console.log(`${job.id} has completed!`);
});

worker.on('failed', (job, err) => {
    console.log(`${job?.id} has failed with ${err.message}`);
});

console.log('Worker started (YouTube MVP)...');
