// 上传编排服务单元测试（任务 1.12）：
//   - mock 文件系统与魔数嗅探，纯内存覆盖白名单/大小/类型校验各分支；
//   - 任一失败路径 finally 均清理暂存文件，不留磁盘残留。
jest.mock('node:fs/promises', () => ({
  rm: jest.fn(async () => undefined),
  mkdir: jest.fn(async () => undefined),
  rename: jest.fn(async () => undefined),
}));
jest.mock('./file-type.util', () => ({ sniffFileType: jest.fn() }));

import { rm } from 'node:fs/promises';
import { BadRequestException } from '@nestjs/common';
import { UploadService } from './upload.service';
import { sniffFileType } from './file-type.util';
import type { StorageDriver } from '../storage/storage-driver.interface';
import type { StagedFile } from '../storage/storage.types';
import { IMAGE_MAX_BYTES, VIDEO_MAX_BYTES } from './upload.constants';

const STORED = {
  key: 'product/202609/abc.jpg',
  url: 'https://static.example.com/uploads/product/202609/abc.jpg',
  thumbnailUrl: 'https://static.example.com/uploads/product/202609/abc_thumb.jpg',
};

function makeDriver() {
  return {
    name: 'local' as const,
    save: jest.fn(async () => STORED),
    delete: jest.fn(async () => undefined),
  } as unknown as StorageDriver;
}

function makeService() {
  const driver = makeDriver();
  return { service: new UploadService(driver), driver };
}

function makeFile(overrides: Partial<StagedFile> = {}): StagedFile {
  return {
    path: '/tmp/multer-stage-1.jpg',
    originalname: 'demo.jpg',
    size: 1024,
    mimetype: 'image/jpeg',
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('UploadService.uploadImage', () => {
  it('成功：嗅探后按真实扩展名落存储，暂存清理', async () => {
    (sniffFileType as jest.Mock).mockResolvedValue({ kind: 'image', ext: 'jpg' });
    const { service, driver } = makeService();
    const file = makeFile();
    await expect(service.uploadImage(file, 'product')).resolves.toEqual(STORED);
    expect(sniffFileType).toHaveBeenCalledWith(file.path);
    expect(driver.save).toHaveBeenCalledWith(
      {
        tempPath: '/tmp/multer-stage-1.jpg',
        originalName: 'demo.jpg',
        size: 1024,
        detectedKind: 'image',
        detectedExt: 'jpg',
      },
      'product',
    );
    expect(rm).toHaveBeenCalledWith('/tmp/multer-stage-1.jpg', { force: true });
  });

  it('原始文件名缺失时 originalName 为空串', async () => {
    (sniffFileType as jest.Mock).mockResolvedValue({ kind: 'image', ext: 'jpg' });
    const { service, driver } = makeService();
    await service.uploadImage(makeFile({ originalname: undefined }), 'product');
    expect(driver.save).toHaveBeenCalledWith(expect.objectContaining({ originalName: '' }), 'product');
  });

  it('缺文件：提示请选择图片且不触碰暂存', async () => {
    const { service, driver } = makeService();
    await expect(service.uploadImage(undefined, 'product')).rejects.toThrow(
      new BadRequestException('请选择要上传的图片'),
    );
    expect(sniffFileType).not.toHaveBeenCalled();
    expect(driver.save).not.toHaveBeenCalled();
    expect(rm).not.toHaveBeenCalled();
  });

  it('空文件（size 0）：同样按未选择处理并清理暂存', async () => {
    const { service } = makeService();
    const file = makeFile({ size: 0 });
    await expect(service.uploadImage(file, 'product')).rejects.toThrow('请选择要上传的图片');
    expect(rm).toHaveBeenCalledWith(file.path, { force: true });
  });

  it('图片超限：明确提示并清理暂存', async () => {
    const { service } = makeService();
    const file = makeFile({ size: IMAGE_MAX_BYTES + 1 });
    await expect(service.uploadImage(file, 'product')).rejects.toThrow('图片大小不能超过 5MB');
    expect(rm).toHaveBeenCalledWith(file.path, { force: true });
  });

  it('嗅探非图片：拒绝并清理暂存', async () => {
    (sniffFileType as jest.Mock).mockResolvedValue({ kind: 'video', ext: 'mp4' });
    const { service, driver } = makeService();
    const file = makeFile();
    await expect(service.uploadImage(file, 'product')).rejects.toThrow('仅支持 jpg/png/webp 格式图片');
    expect(driver.save).not.toHaveBeenCalled();
    expect(rm).toHaveBeenCalledWith(file.path, { force: true });
  });

  it('嗅探未知类型：拒绝', async () => {
    (sniffFileType as jest.Mock).mockResolvedValue({ kind: 'unknown', ext: null });
    const { service } = makeService();
    await expect(service.uploadImage(makeFile(), 'product')).rejects.toThrow('仅支持 jpg/png/webp 格式图片');
  });

  it('非法 scope：白名单拒绝且暂存清理', async () => {
    const { service, driver } = makeService();
    const file = makeFile();
    await expect(service.uploadImage(file, '../evil')).rejects.toThrow('未知的上传范围');
    expect(driver.save).not.toHaveBeenCalled();
    expect(rm).toHaveBeenCalledWith(file.path, { force: true });
  });

  it('驱动保存失败：异常上抛且 finally 仍清理暂存', async () => {
    (sniffFileType as jest.Mock).mockResolvedValue({ kind: 'image', ext: 'jpg' });
    const { service, driver } = makeService();
    (driver.save as jest.Mock).mockRejectedValueOnce(new Error('disk full'));
    await expect(service.uploadImage(makeFile(), 'product')).rejects.toThrow('disk full');
    expect(rm).toHaveBeenCalledWith('/tmp/multer-stage-1.jpg', { force: true });
  });
});

describe('UploadService.uploadVideo', () => {
  it('成功：嗅探 mp4 后落存储', async () => {
    (sniffFileType as jest.Mock).mockResolvedValue({ kind: 'video', ext: 'mp4' });
    const { service, driver } = makeService();
    const file = makeFile({ originalname: 'demo.mp4', mimetype: 'video/mp4' });
    await expect(service.uploadVideo(file, 'video')).resolves.toEqual(STORED);
    expect(driver.save).toHaveBeenCalledWith(
      expect.objectContaining({ detectedKind: 'video', detectedExt: 'mp4', originalName: 'demo.mp4' }),
      'video',
    );
  });

  it('视频超限：明确提示', async () => {
    const { service } = makeService();
    const file = makeFile({ size: VIDEO_MAX_BYTES + 1 });
    await expect(service.uploadVideo(file, 'video')).rejects.toThrow('视频大小不能超过 2GB');
  });

  it('缺文件：提示请选择视频', async () => {
    const { service } = makeService();
    await expect(service.uploadVideo(undefined, 'video')).rejects.toThrow('请选择要上传的视频');
  });

  it('嗅探非视频：拒绝', async () => {
    (sniffFileType as jest.Mock).mockResolvedValue({ kind: 'image', ext: 'png' });
    const { service } = makeService();
    await expect(service.uploadVideo(makeFile(), 'video')).rejects.toThrow('仅支持 mp4 格式视频');
  });
});
