// multer 落盘配置：一律 diskStorage 暂存（视频最大 2GB，禁止进内存），
// 暂存文件名由 multer 随机生成（服务端以魔数嗅探结果重新命名，见 file-type.util）。
// 文件大小超限由 multer 直接拒绝（LIMIT_FILE_SIZE → 413 → 统一响应 40000）。
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { BadRequestException } from '@nestjs/common';
import type { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import { diskStorage } from 'multer';
import {
  IMAGE_EXTENSIONS,
  IMAGE_MAX_BYTES,
  VIDEO_EXTENSIONS,
  VIDEO_MAX_BYTES,
} from './upload.constants';

/** 暂存目录（相对 API 服务 cwd；UploadModule 启动时确保存在） */
export const UPLOAD_TMP_DIR = join(process.cwd(), 'uploads', 'tmp');

export function ensureTmpDir(): void {
  mkdirSync(UPLOAD_TMP_DIR, { recursive: true });
}

function makeOptions(kind: 'image' | 'video'): MulterOptions {
  const extensions = kind === 'image' ? IMAGE_EXTENSIONS : VIDEO_EXTENSIONS;
  return {
    storage: diskStorage({ destination: UPLOAD_TMP_DIR }),
    limits: { fileSize: kind === 'image' ? IMAGE_MAX_BYTES : VIDEO_MAX_BYTES },
    // 扩展名白名单为早期拦截（体验层）；真正的安全校验是保存前的魔数嗅探
    fileFilter: (_req, file, callback) => {
      const ext = file.originalname.split('.').pop()?.toLowerCase();
      if (!ext || !extensions.includes(ext)) {
        callback(
          new BadRequestException(
            kind === 'image' ? '仅支持 jpg/png/webp 格式图片' : '仅支持 mp4 格式视频',
          ),
          false,
        );
        return;
      }
      callback(null, true);
    },
  };
}

export const imageMulterOptions = makeOptions('image');
export const videoMulterOptions = makeOptions('video');
