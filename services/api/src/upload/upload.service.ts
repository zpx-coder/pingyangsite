// 上传编排（任务 1.3）：白名单/大小校验 + 魔数嗅探 + 驱动落存储 + 暂存清理。
// 校验失败时给出明确提示并删除暂存文件，不留磁盘残留。
import { rm } from 'node:fs/promises';
import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { STORAGE_DRIVER } from '../storage/storage.module';
import type { StorageDriver } from '../storage/storage-driver.interface';
import type { StagedFile, StoredObject, UploadScope, UploadSource } from '../storage/storage.types';
import { sniffFileType } from './file-type.util';
import { IMAGE_MAX_BYTES, UPLOAD_SCOPES, VIDEO_MAX_BYTES } from './upload.constants';

const MESSAGE_BY_KIND = {
  image: {
    empty: '请选择要上传的图片',
    tooLarge: '图片大小不能超过 5MB',
    badType: '仅支持 jpg/png/webp 格式图片',
  },
  video: {
    empty: '请选择要上传的视频',
    tooLarge: '视频大小不能超过 2GB',
    badType: '仅支持 mp4 格式视频',
  },
} as const;

type UploadKind = 'image' | 'video';

@Injectable()
export class UploadService {
  constructor(@Inject(STORAGE_DRIVER) private readonly driver: StorageDriver) {}

  async uploadImage(file: StagedFile | undefined, scope: string): Promise<StoredObject> {
    return this.upload(file, 'image', IMAGE_MAX_BYTES, scope);
  }

  async uploadVideo(file: StagedFile | undefined, scope: string): Promise<StoredObject> {
    return this.upload(file, 'video', VIDEO_MAX_BYTES, scope);
  }

  private async upload(
    file: StagedFile | undefined,
    kind: UploadKind,
    maxBytes: number,
    scope: string,
  ): Promise<StoredObject> {
    let source: UploadSource | null = null;
    try {
      const validScope = this.assertScope(scope);
      source = await this.validate(file, kind, maxBytes);
      return await this.driver.save(source, validScope);
    } finally {
      // 任一环节失败都清理暂存，不留磁盘残留；
      // 本地驱动成功后暂存已被 rename 移走，rm force 幂等
      const tempPath = source?.tempPath ?? file?.path;
      if (tempPath) {
        await rm(tempPath, { force: true });
      }
    }
  }

  private assertScope(scope: string): UploadScope {
    if (!UPLOAD_SCOPES.includes(scope as UploadScope)) {
      throw new BadRequestException('未知的上传范围');
    }
    return scope as UploadScope;
  }

  private async validate(
    file: StagedFile | undefined,
    kind: UploadKind,
    maxBytes: number,
  ): Promise<UploadSource> {
    const messages = MESSAGE_BY_KIND[kind];
    if (!file) {
      throw new BadRequestException(messages.empty);
    }
    if (file.size <= 0) {
      throw new BadRequestException(messages.empty);
    }
    if (file.size > maxBytes) {
      throw new BadRequestException(messages.tooLarge);
    }
    // 魔数嗅探（不信任客户端声明）：伪造扩展名/内容一律拒绝
    const sniffed = await sniffFileType(file.path);
    if (sniffed.kind !== kind || !sniffed.ext) {
      throw new BadRequestException(messages.badType);
    }
    return {
      tempPath: file.path,
      originalName: file.originalname ?? '',
      size: file.size,
      detectedKind: kind,
      detectedExt: sniffed.ext,
    };
  }
}
