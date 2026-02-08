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

  async processVideo(file: Express.Multer.File) {
    // 1. Save to DB
    const video = await this.prisma.video.create({
      data: {
        originalName: file.originalname,
        fileName: file.filename,
        path: file.path,
      },
    });

    // 2. Create Job in DB (status PENDING is default)
    const jobRecord = await this.prisma.job.create({
      data: {
        videoId: video.id,
      },
    });

    // 3. Add to Bull Queue
    await this.videoQueue.add('process-video', {
      videoId: video.id,
      jobId: jobRecord.id,
      filePath: file.path,
    });

    return {
      message: 'Video uploaded and queued',
      video,
      jobId: jobRecord.id,
    };
  }
}
