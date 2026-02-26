
import { Queue } from 'bullmq';
import { PrismaClient } from '@prisma/client';
import 'dotenv/config';

const redisConnection = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
};

const videoQueue = new Queue('video', { connection: redisConnection });
const prisma = new PrismaClient();

async function addTestJob() {
    console.log('Adding test job to "video" queue...');

    // URL: https://www.youtube.com/watch?v=dQw4w9WgXcQ (Rick Roll - Known good for testing)
    const url = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';

    // 1. Create Video Record
    const video = await prisma.video.create({
        data: {
            sourceUrl: url,
            sourceType: 'YOUTUBE',
            title: 'Test Video via Script',
        }
    });
    console.log(`Created Video record: ${video.id}`);

    // 2. Create Job Record
    const job = await prisma.job.create({
        data: {
            videoId: video.id,
            status: 'PENDING',
        }
    });
    console.log(`Created Job record: ${job.id}`);

    // 3. Add to Queue
    await videoQueue.add('process', {
        videoId: video.id,
        jobId: job.id,
        url: url,
        language: 'en'
    });

    console.log(`Job added to Queue! ID: ${job.id}`);
    console.log(`Now run 'npm run dev' to see it process.`);
    process.exit(0);
}

addTestJob().catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
});
