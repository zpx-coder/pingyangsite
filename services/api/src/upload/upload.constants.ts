// 上传校验常量（PRD §5.3 富文本与媒体规范 + 安全底线 §6 上传白名单）
import type { UploadScope } from '../storage/storage.types';

/** 上传范围白名单（对应后台各内容模块的素材目录） */
export const UPLOAD_SCOPES: readonly UploadScope[] = ['product', 'company', 'news', 'content', 'video'];

/** 图片：jpg/png/webp，单张 ≤ 5MB（PRD §5.3） */
export const IMAGE_MAX_BYTES = 5 * 1024 * 1024;
/** 视频：mp4，单文件 ≤ 2GB（PRD §5.3） */
export const VIDEO_MAX_BYTES = 2 * 1024 * 1024 * 1024;

export const IMAGE_MIME_WHITELIST: Readonly<Record<string, string>> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

export const VIDEO_MIME_WHITELIST: Readonly<Record<string, string>> = {
  'video/mp4': 'mp4',
};

export const IMAGE_EXTENSIONS: readonly string[] = ['jpg', 'jpeg', 'png', 'webp'];
export const VIDEO_EXTENSIONS: readonly string[] = ['mp4'];

/** 真实扩展名 → Content-Type（OSS 上传与静态访问用） */
export const MIME_BY_EXT: Readonly<Record<string, string>> = {
  jpg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  mp4: 'video/mp4',
};

/** OSS 缩略图按需裁剪参数（方案 §4.5：不额外占存储） */
export const OSS_THUMB_PROCESS = 'image/resize,w_400';

/** 本地缩略图宽度（px） */
export const LOCAL_THUMB_WIDTH = 400;
export const LOCAL_THUMB_QUALITY = 80;
