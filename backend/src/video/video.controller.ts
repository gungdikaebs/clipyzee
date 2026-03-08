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

  @Get('job/:id')
  getJob(@Param('id') id: string) {
    return this.videoService.getJobStatus(id);
  }

  @Get('download')
  downloadFile(@Query('path') filePath: string, @Res() res: Response) {
    const filename = filePath.split('/').pop() || 'clip.mp4';
    res.set({
      'Content-Type': 'video/mp4',
      'Content-Disposition': `attachment; filename="${filename}"`,
    });
    const fileStream = createReadStream(filePath);
    fileStream.pipe(res);
  }
}
