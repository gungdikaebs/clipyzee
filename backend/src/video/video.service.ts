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

  async processVideo(url: string, language: string = 'en') {
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
        type: 'ANALYZE',
      },
    });

    // 3. Add to Bull Queue
    await this.videoQueue.add('analyze-video', {
      videoId: video.id,
      jobId: jobRecord.id,
      url: url,
      language: language,
    });

    return {
      message: 'Video URL queued for analysis processing',
      video,
      jobId: jobRecord.id,
    };
  }

  async renderClip(dto: {
    videoId: string;
    url: string;
    start: number;
    end: number;
    aspectRatio?: string;
    subtitleStyle?: string;
    customTranscript?: any[];
    cropX?: number;
    extractOnly?: boolean;
    rawVideoPath?: string;
  }) {
    // 1. Create Render Job in DB
    const jobRecord = await this.prisma.job.create({
      data: {
        videoId: dto.videoId,
        type: 'RENDER',
      },
    });

    // 2. Add to Bull Queue
    await this.videoQueue.add('render-clip', {
      videoId: dto.videoId,
      jobId: jobRecord.id,
      url: dto.url,
      start: dto.start,
      end: dto.end,
      aspectRatio: dto.aspectRatio || '9:16',
      subtitleStyle: dto.subtitleStyle || 'DEFAULT',
      customTranscript: dto.customTranscript || null,
      cropX: dto.cropX !== undefined ? dto.cropX : 50,
      extractOnly: !!dto.extractOnly,
      rawVideoPath: dto.rawVideoPath || null,
    });

    return {
      message: 'Clip queued for rendering',
      jobId: jobRecord.id,
    };
  }

  async getJobStatus(jobId: string) {
    const job = await this.prisma.job.findUnique({
      where: { id: jobId }
    });

    if (!job) {
      throw new Error(`Job not found: ${jobId}`);
    }

    return job;
  }

  async updateClips(videoId: string, clips: any[]) {
    const analyzeJob = await this.prisma.job.findFirst({
      where: {
        videoId: videoId,
        type: 'ANALYZE',
        status: 'COMPLETED'
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    if (!analyzeJob) {
      throw new Error(`No completed ANALYZE job found for video ID: ${videoId}`);
    }

    const currentResult = (analyzeJob.result as any) || {};
    const updatedResult = {
      ...currentResult,
      clips: clips
    };

    await this.prisma.job.update({
      where: { id: analyzeJob.id },
      data: {
        result: updatedResult
      }
    });

    return { success: true };
  }

  async getHistory() {
    return this.prisma.video.findMany({
      include: {
        jobs: {
          where: {
            type: 'ANALYZE',
            status: 'COMPLETED',
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }
}
