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

    // Temporary path for downloaded video/audio
    const tempDownloadPath = path.join(outputDir, `download-${videoId}.mp4`);
    // Output clip path
    const outputClipPath = path.join(outputDir, `clip-${videoId}-${Date.now()}.mp4`);

    try {
        // Update status to PROCESSING
        await prisma.job.update({
            where: { id: jobId },
            data: { status: 'PROCESSING' },
        });

        console.log(`Downloading from YouTube: ${url}`);

        // Command to download video (worst quality is fine for MVP speed, or best audio)
        // For MVP, let's download best quality format that combines video+audio or just generic
        // -f "best[ext=mp4]" ensures we get an mp4
        const downloadCommand = `yt-dlp -f "best[ext=mp4]/best" -o "${tempDownloadPath}" "${url}"`;
        console.log(`Executing download: ${downloadCommand}`);

        await execPromise(downloadCommand);

        if (!fs.existsSync(tempDownloadPath)) {
            throw new Error(`Download failed, file not found at ${tempDownloadPath}`);
        }
        console.log(`Download complete: ${tempDownloadPath}`);

        // Dummy FFmpeg command (cutting 5 seconds)
        // Command: ffmpeg -i input.mp4 -t 5 -c copy output.mp4
        const ffmpegCommand = `ffmpeg -i "${tempDownloadPath}" -t 5 -c copy "${outputClipPath}" -y`;
        console.log(`Executing FFmpeg: ${ffmpegCommand}`);

        await execPromise(ffmpegCommand);

        console.log(`Clip created at ${outputClipPath}`);

        // Clean up downloaded full video to save space (MVP decision)
        if (fs.existsSync(tempDownloadPath)) {
            fs.unlinkSync(tempDownloadPath);
            console.log(`Deleted temp file: ${tempDownloadPath}`);
        }

        // Update status to COMPLETED
        await prisma.job.update({
            where: { id: jobId },
            data: {
                status: 'COMPLETED',
                result: { clips: [outputClipPath] },
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
        if (fs.existsSync(tempDownloadPath)) {
            fs.unlinkSync(tempDownloadPath);
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
