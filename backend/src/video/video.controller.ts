import { Controller, Post, Body, Get, Param, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { createReadStream } from 'fs';
import { VideoService } from './video.service';
import { CreateVideoDto, RenderClipDto } from './dto/create-video.dto';

@Controller('video')
export class VideoController {
  constructor(private readonly videoService: VideoService) { }

  @Post()
  create(@Body() createVideoDto: CreateVideoDto) {
    return this.videoService.processVideo(createVideoDto.url, createVideoDto.language);
  }

  @Post('render')
  render(@Body() renderClipDto: RenderClipDto) {
    return this.videoService.renderClip(renderClipDto);
  }

  @Get('history')
  getHistory() {
    return this.videoService.getHistory();
  }

  @Get('job/:id')
  getJob(@Param('id') id: string) {
    return this.videoService.getJobStatus(id);
  }

  @Post('update-clips')
  updateClips(@Body() body: { videoId: string; clips: any[] }) {
    return this.videoService.updateClips(body.videoId, body.clips);
  }

  @Get('download')
  downloadFile(
    @Query('path') filePath: string,
    @Query('download') download: string,
    @Res() res: Response
  ) {
    if (download === 'true') {
      res.download(filePath);
    } else {
      res.sendFile(filePath);
    }
  }
}
