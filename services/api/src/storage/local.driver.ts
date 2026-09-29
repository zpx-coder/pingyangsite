// 本地磁盘驱动（STORAGE_DRIVER=local，开发与本地部署测试用，方案 §10.1）：
//   - 文件落 <uploads>/<scope>/<yyyymm>/<uuid>.<ext>，由 /uploads/ 静态目录对外服务；
//   - 图片用 sharp 生成 400px 宽 JPG 缩略图（原文件同名 _thumb.jpg），视频无缩略图；
//   - 公开地址 = STORAGE_PUBLIC_BASE_URL + /uploads/<key>，可直接入库供官网/后台引用。
import { mkdir, rename, rm } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { ConfigService } from '@nestjs/config';
import type { StorageDriver } from './storage-driver.interface';
import type { StoredObject, UploadSource, UploadScope } from './storage.types';
import { LOCAL_THUMB_QUALITY, LOCAL_THUMB_WIDTH } from '../upload/upload.constants';

export class LocalDriver implements StorageDriver {
  readonly name = 'local' as const;

  constructor(private readonly config: ConfigService) {}

  private get dir(): string {
    return this.config.getOrThrow<string>('storage.local.dir');
  }

  private get baseUrl(): string {
    return this.config.getOrThrow<string>('storage.local.baseUrl');
  }

  async save(source: UploadSource, scope: UploadScope): Promise<StoredObject> {
    const month = new Date().toISOString().slice(0, 7).replace('-', '');
    const filename = `${randomUUID()}.${source.detectedExt}`;
    const key = `${scope}/${month}/${filename}`;
    const target = join(this.dir, key);

    await mkdir(dirname(target), { recursive: true });
    await rename(source.tempPath, target);

    let thumbnailUrl: string | null = null;
    if (source.detectedKind === 'image') {
      const thumbKey = `${scope}/${month}/${filename.replace(/\.[^.]+$/, '_thumb.jpg')}`;
      await sharp(target)
        .resize({ width: LOCAL_THUMB_WIDTH, withoutEnlargement: true })
        .jpeg({ quality: LOCAL_THUMB_QUALITY })
        .toFile(join(this.dir, thumbKey));
      thumbnailUrl = this.publicUrl(thumbKey);
    }

    return { key, url: this.publicUrl(key), thumbnailUrl };
  }

  async delete(key: string): Promise<void> {
    // 一并清理缩略图（_thumb 命名约定）；rm force 对不存在文件静默
    const thumbKey = key.replace(/(\.[^.]+)$/, '_thumb.jpg');
    await rm(join(this.dir, key), { force: true });
    await rm(join(this.dir, thumbKey), { force: true });
  }

  private publicUrl(key: string): string {
    return `${this.baseUrl}/uploads/${key}`;
  }
}
