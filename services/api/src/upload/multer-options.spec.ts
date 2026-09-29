// multer 落盘配置单元测试（任务 1.12）：
//   - mock mkdirSync 避免真实建目录（不触碰磁盘）；
//   - 断言 diskStorage 配置形状、大小上限与扩展名白名单过滤（早期拦截，
//     真正的安全校验是保存前的魔数嗅探）。
jest.mock('node:fs', () => ({
  ...jest.requireActual('node:fs'),
  mkdirSync: jest.fn(),
}));

import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { BadRequestException } from '@nestjs/common';
import { UPLOAD_TMP_DIR, ensureTmpDir, imageMulterOptions, videoMulterOptions } from './multer-options';
import { IMAGE_MAX_BYTES, VIDEO_MAX_BYTES } from './upload.constants';

type FileFilterCallback = (error: Error | null, acceptFile: boolean) => void;
type FileFilter = (req: unknown, file: { originalname: string }, callback: FileFilterCallback) => void;

/** 直接驱动 fileFilter（不经过 multer），捕获回调入参 */
function filterCall(options: { fileFilter?: unknown }, filename: string): { error: Error | null; accept: boolean } {
  const callback = jest.fn();
  (options.fileFilter as unknown as FileFilter)({}, { originalname: filename }, callback as FileFilterCallback);
  const [error, accept] = callback.mock.calls[0] as [Error | null, boolean];
  return { error, accept };
}

describe('multer 落盘配置', () => {
  it('暂存目录位于 <cwd>/uploads/tmp', () => {
    expect(UPLOAD_TMP_DIR).toBe(join(process.cwd(), 'uploads', 'tmp'));
  });

  it('图片配置：diskStorage 引擎 + 5MB 上限', () => {
    expect(imageMulterOptions.storage).toBeDefined();
    expect(typeof (imageMulterOptions.storage as { _handleFile?: unknown })._handleFile).toBe('function');
    expect((imageMulterOptions.limits as { fileSize?: number }).fileSize).toBe(IMAGE_MAX_BYTES);
  });

  it('视频配置：2GB 上限', () => {
    expect(videoMulterOptions.storage).toBeDefined();
    expect((videoMulterOptions.limits as { fileSize?: number }).fileSize).toBe(VIDEO_MAX_BYTES);
  });

  it('图片 fileFilter：白名单放行（含大小写与 jpeg）', () => {
    for (const name of ['a.jpg', 'a.JPG', 'a.jpeg', 'a.png', 'a.webp']) {
      const { error, accept } = filterCall(imageMulterOptions, name);
      expect(accept).toBe(true);
      expect(error).toBeNull();
    }
  });

  it('图片 fileFilter：非白名单拒绝并给出提示', () => {
    const { error, accept } = filterCall(imageMulterOptions, 'evil.gif');
    expect(accept).toBe(false);
    expect(error).toBeInstanceOf(BadRequestException);
    expect((error as Error).message).toBe('仅支持 jpg/png/webp 格式图片');
  });

  it('图片 fileFilter：无扩展名拒绝', () => {
    const { error, accept } = filterCall(imageMulterOptions, 'noext');
    expect(accept).toBe(false);
    expect(error).toBeInstanceOf(BadRequestException);
  });

  it('视频 fileFilter：mp4 放行、其他拒绝', () => {
    expect(filterCall(videoMulterOptions, 'a.mp4').accept).toBe(true);
    const { error, accept } = filterCall(videoMulterOptions, 'a.avi');
    expect(accept).toBe(false);
    expect((error as Error).message).toBe('仅支持 mp4 格式视频');
  });

  it('ensureTmpDir：递归创建暂存目录（mock 不落盘）', () => {
    ensureTmpDir();
    expect(mkdirSync).toHaveBeenCalledWith(UPLOAD_TMP_DIR, { recursive: true });
  });
});
