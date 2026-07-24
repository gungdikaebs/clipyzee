import { Queue } from 'bullmq';
import { PrismaClient } from '@prisma/client';

const redisConnection = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
};

const videoQueue = new Queue('video', { connection: redisConnection });
const prisma = new PrismaClient();

async function clearAll() {
    console.log('--- Wiping BullMQ (Redis) Queue ---');

    // Obiliterate completely wipes everything in the queue (waiting, active, failed, completed)
    try {
        await videoQueue.obliterate({ force: true });
        console.log('✅ BullMQ Queue obliterated successfully.');
    } catch (e: any) {
        console.error('⚠️ Failed to obliterate queue:', e.message);
    }

    console.log('\n--- Wiping Prisma Job Records ---');
    try {
        const deletedJobs = await prisma.job.deleteMany({});
        console.log(`✅ Deleted ${deletedJobs.count} jobs from the database.`);
    } catch (e: any) {
        console.error('⚠️ Failed to delete DB jobs:', e.message);
    }

    console.log('\nClear process completed. You can start fresh now! 🎉');
    process.exit(0);
}

clearAll();
