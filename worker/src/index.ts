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
    const { videoId, jobId, filePath } = job.data;
    console.log(`Processing job ${job.id} for video ${videoId}`);

    try {
        // Resolve file path (assuming filePath is relative to backend root)
        // worker/src/index.ts -> worker/src -> worker -> .. -> root -> backend -> filePath
        const absoluteFilePath = path.resolve(__dirname, '../../backend', filePath);

        console.log(`Resolved file path: ${absoluteFilePath}`);

        if (!fs.existsSync(absoluteFilePath)) {
            throw new Error(`File not found: ${absoluteFilePath}`);
        }

        // Update status to PROCESSING
        await prisma.job.update({
            where: { id: jobId },
            data: { status: 'PROCESSING' },
        });

        const outputDir = path.join(__dirname, '../output');
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        const outputFileName = `clip-${videoId}-${Date.now()}.mp4`;
        const outputPath = path.join(outputDir, outputFileName);

        // Dummy FFmpeg command (cutting 5 seconds)
        // Command: ffmpeg -i input.mp4 -t 5 -c copy output.mp4
        // -y to overwrite
        const command = `ffmpeg -i "${absoluteFilePath}" -t 5 -c copy "${outputPath}" -y`;
        console.log(`Executing: ${command}`);

        await execPromise(command);

        console.log(`Clip created at ${outputPath}`);

        // Update status to COMPLETED
        await prisma.job.update({
            where: { id: jobId },
            data: {
                status: 'COMPLETED',
                result: { clips: [outputPath] },
            },
        });

        console.log(`Job ${job.id} completed`);
    } catch (error) {
        console.error(`Job ${job.id} failed`, error);
        await prisma.job.update({
            where: { id: jobId },
            data: { status: 'FAILED' }, // Could add error message to result
        });
        // Do not rethrow if you want to avoid retry loop for fatal errors
        // But for BullMQ, throwing marks it as failed.
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

console.log('Worker started...');
