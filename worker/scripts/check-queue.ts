import { Queue } from 'bullmq';
import { PrismaClient } from '@prisma/client';

const redisConnection = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
};

const videoQueue = new Queue('video', { connection: redisConnection });
const prisma = new PrismaClient();

async function check() {
    console.log('--- DB Jobs ---');
    const jobs = await prisma.job.findMany({ orderBy: { id: 'desc' }, take: 5 });
    console.log(jobs);

    console.log('\n--- Redis Queue Status ---');
    const waitingCount = await videoQueue.getWaitingCount();
    const activeCount = await videoQueue.getActiveCount();
    const failedCount = await videoQueue.getFailedCount();
    console.log(`Waiting: ${waitingCount}, Active: ${activeCount}, Failed: ${failedCount}`);

    const activeJobs = await videoQueue.getActive();
    console.log('\nActive Jobs:', activeJobs.map(j => ({ id: j.id, name: j.name })));

    process.exit(0);
}

check();
