// 后台上传控制器单元测试：直接调用方法、mock 服务/日志/请求（不启动 Nest 运行时）
import { UploadController } from './upload.controller';
import type { UploadService } from './upload.service';
import type { AppLoggerService } from '../logger/app-logger.service';
import type { StagedFile } from '../storage/storage.types';

const STORED = {
  key: 'product/202609/abc.jpg',
  url: 'https://static.example.com/uploads/product/202609/abc.jpg',
  thumbnailUrl: 'https://static.example.com/uploads/product/202609/abc_thumb.jpg',
};

function makeUpload() {
  return {
    uploadImage: jest.fn(async () => STORED),
    uploadVideo: jest.fn(async () => STORED),
  } as unknown as UploadService;
}

function makeController() {
  const upload = makeUpload();
  const logger = { audit: jest.fn() } as unknown as AppLoggerService;
  return { controller: new UploadController(upload, logger), upload, logger };
}

function makeReq(adminPhone?: string): never {
  return { session: { adminId: 1, ...(adminPhone ? { adminPhone } : {}) } } as never;
}

describe('UploadController', () => {
  it('uploadImage 透传服务结果并留 audit（含会话手机号）', async () => {
    const { controller, upload, logger } = makeController();
    const file = { path: '/tmp/x.jpg', originalname: 'x.jpg', size: 100 } as StagedFile;
    const result = await controller.uploadImage(file, 'product', makeReq('13800000000'));
    expect(upload.uploadImage).toHaveBeenCalledWith(file, 'product');
    expect(result).toEqual(STORED);
    expect(logger.audit).toHaveBeenCalledWith('upload', '13800000000', { scope: 'product', key: STORED.key });
  });

  it('uploadImage 会话缺手机号时 actor 记为 unknown', async () => {
    const { controller, logger } = makeController();
    await controller.uploadImage(undefined, 'product', makeReq());
    expect(logger.audit).toHaveBeenCalledWith('upload', 'unknown', { scope: 'product', key: STORED.key });
  });

  it('uploadVideo 透传并留 audit', async () => {
    const { controller, upload, logger } = makeController();
    const file = { path: '/tmp/x.mp4', originalname: 'x.mp4', size: 100 } as StagedFile;
    const result = await controller.uploadVideo(file, 'video', makeReq('13800000000'));
    expect(upload.uploadVideo).toHaveBeenCalledWith(file, 'video');
    expect(result).toEqual(STORED);
    expect(logger.audit).toHaveBeenCalledWith('upload', '13800000000', { scope: 'video', key: STORED.key });
  });
});
