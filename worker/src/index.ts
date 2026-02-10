import { Worker, Job } from 'bullmq';
import { PrismaClient } from '@prisma/client';
import { exec } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import * as util from 'util';
import 'dotenv/config';

const execPromise = util.promisify(exec);
const prisma = new PrismaClient();

const redisConnection = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
};

const processVideo = async (job: Job) => {
    const { videoId, jobId, url } = job.data;
    console.log(`Processing job ${job.id} for video ${videoId} (URL: ${url})`);

    // Ensure output directory exists
    const outputDir = path.join(__dirname, '../output');
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    // Paths
    const tempAudioPath = path.join(outputDir, `audio-${videoId}.wav`);
    const modelPath = path.join(__dirname, '../models/model');
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

        console.log(`Starting Transcription...`);
        const transcribeCommand = `"${pythonPath}" "${scriptPath}" "${tempAudioPath}" "${modelPath}"`;
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

        console.log(`Transcription complete. Found ${transcript.length} words.`);

        // Clean up audio file
        if (fs.existsSync(tempAudioPath)) {
            fs.unlinkSync(tempAudioPath);
            console.log(`Deleted temp audio: ${tempAudioPath}`);
        }

        // Update status to COMPLETED with transcript in result
        await prisma.job.update({
            where: { id: jobId },
            data: {
                status: 'COMPLETED',
                result: { transcript },
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
