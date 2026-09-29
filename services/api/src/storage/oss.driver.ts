// 阿里云 OSS 驱动（STORAGE_DRIVER=oss，生产，方案 §4.5）：
//   - 文件直传桶 <scope>/<yyyymm>/<uuid>.<ext>，公开地址优先走 CDN 域名；
//   - 缩略图用 OSS 图片处理按需裁剪（URL 加 x-oss-process 参数，不占额外存储）；
//   - 凭证经环境变量注入（configuration.ts 在启动时校验缺失即拒绝启动），不入库。
import { randomUUID } from 'node:crypto';
import OSS from 'ali-oss';
import { ConfigService } from '@nestjs/config';
import type { StorageDriver } from './storage-driver.interface';
import type { StoredObject, UploadSource, UploadScope } from './storage.types';
import { MIME_BY_EXT, OSS_THUMB_PROCESS } from '../upload/upload.constants';

interface OssStorageConfig {
  region: string;
  bucket: string;
  accessKeyId: string;
  accessKeySecret: string;
  endpoint?: string;
  cdnDomain?: string;
}

export class OssDriver implements StorageDriver {
  readonly name = 'oss' as const;

  private readonly client: OSS;
  private readonly cfg: OssStorageConfig;

  constructor(config: ConfigService) {
    this.cfg = config.getOrThrow<OssStorageConfig>('storage.oss');
    this.client = new OSS({
      region: this.cfg.region,
      bucket: this.cfg.bucket,
      accessKeyId: this.cfg.accessKeyId,
      accessKeySecret: this.cfg.accessKeySecret,
      endpoint: this.cfg.endpoint,
      secure: true,
    });
  }

  async save(source: UploadSource, scope: UploadScope): Promise<StoredObject> {
    const month = new Date().toISOString().slice(0, 7).replace('-', '');
    const filename = `${randomUUID()}.${source.detectedExt}`;
    const key = `${scope}/${month}/${filename}`;

    await this.client.put(key, source.tempPath, {
      headers: { 'Content-Type': MIME_BY_EXT[source.detectedExt] },
    });

    const url = this.publicUrl(key);
    const thumbnailUrl = source.detectedKind === 'image' ? `${url}?x-oss-process=${OSS_THUMB_PROCESS}` : null;
    return { key, url, thumbnailUrl };
  }

  async delete(key: string): Promise<void> {
    await this.client.delete(key);
  }

  private publicUrl(key: string): string {
    const host = this.cfg.cdnDomain ?? `${this.cfg.bucket}.${this.cfg.endpoint ?? `oss-${this.cfg.region}.aliyuncs.com`}`;
    return `https://${host}/${key}`;
  }
}
