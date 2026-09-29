// 后台上传接口（任务 1.3）：
//   POST /api/v1/admin/upload/image?scope=product  图片（jpg/png/webp ≤5MB，自动生成缩略图）
//   POST /api/v1/admin/upload/video?scope=video    视频（mp4 ≤2GB）
// 均须登录会话（AdminGuard）；scope 白名单防路径穿越；上传成功留 audit。
import { Controller, Post, Query, Req, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { AdminGuard } from '../auth/admin.guard';
import { AppLoggerService } from '../logger/app-logger.service';
import type { StagedFile, StoredObject } from '../storage/storage.types';
import { imageMulterOptions, videoMulterOptions } from './multer-options';
import { UploadService } from './upload.service';

@ApiTags('上传')
@ApiCookieAuth('admin-session')
@Controller('api/v1/admin/upload')
@UseGuards(AdminGuard)
export class UploadController {
  constructor(
    private readonly upload: UploadService,
    private readonly logger: AppLoggerService,
  ) {}

  @ApiOperation({ summary: '上传图片' })
  @Post('image')
  @UseInterceptors(FileInterceptor('file', imageMulterOptions))
  async uploadImage(
    @UploadedFile() file: StagedFile | undefined,
    @Query('scope') scope: string,
    @Req() req: Request,
  ): Promise<StoredObject> {
    const stored = await this.upload.uploadImage(file, scope);
    this.logger.audit('upload', req.session.adminPhone ?? 'unknown', { scope, key: stored.key });
    return stored;
  }

  @ApiOperation({ summary: '上传视频' })
  @Post('video')
  @UseInterceptors(FileInterceptor('file', videoMulterOptions))
  async uploadVideo(
    @UploadedFile() file: StagedFile | undefined,
    @Query('scope') scope: string,
    @Req() req: Request,
  ): Promise<StoredObject> {
    const stored = await this.upload.uploadVideo(file, scope);
    this.logger.audit('upload', req.session.adminPhone ?? 'unknown', { scope, key: stored.key });
    return stored;
  }
}
