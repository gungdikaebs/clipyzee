import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { VideoService } from './video.service';
import { VideoController } from './video.controller';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'video',
    }),
  ],
  controllers: [VideoController],
  providers: [VideoService],
})
export class VideoModule { }
