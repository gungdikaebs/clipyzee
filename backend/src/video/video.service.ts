import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class VideoService {
  constructor(
    @InjectQueue('video') private videoQueue: Queue,
    private prisma: PrismaService,
  ) { }

  async processVideo(url: string) {
    // 1. Save to DB (YouTube Source)
    const video = await this.prisma.video.create({
      data: {
        sourceUrl: url,
        sourceType: 'YOUTUBE',
        title: 'Pending Title Fetch', // Worker will update this
      },
    });

    // 2. Create Job in DB
    const jobRecord = await this.prisma.job.create({
      data: {
        videoId: video.id,
      },
    });

    // 3. Add to Bull Queue
    await this.videoQueue.add('process-video', {
      videoId: video.id,
      jobId: jobRecord.id,
      url: url,
    });

    return {
      message: 'Video URL queued for processing',
      video,
      jobId: jobRecord.id,
    };
  }
}
