// 阿里云 OSS 存储驱动单元测试（任务 1.12）：
//   - mock ali-oss SDK（fake client），不产生真实网络请求；
//   - 断言桶直传参数、Content-Type 按嗅探扩展名、CDN 优先/endpoint/区域默认三级
//     域名回退，以及图片按需裁剪缩略图 URL（不占额外存储）。
jest.mock('ali-oss', () => ({ __esModule: true, default: jest.fn() }));

import OSS from 'ali-oss';
import { ConfigService } from '@nestjs/config';
import { OssDriver } from './oss.driver';
import type { UploadSource } from './storage.types';

const FULL_CFG = {
  region: 'cn-hangzhou',
  bucket: 'pingyang-media',
  accessKeyId: 'test-access-key',
  accessKeySecret: 'test-access-secret',
  endpoint: 'oss-cn-hangzhou.aliyuncs.com',
  cdnDomain: 'cdn.example.com',
};

function makeDriver(overrides: Partial<typeof FULL_CFG> = {}) {
  const client = {
    put: jest.fn(async () => ({})),
    delete: jest.fn(async () => ({})),
  };
  (OSS as unknown as jest.Mock).mockReturnValue(client);
  const config = new ConfigService({ 'storage.oss': { ...FULL_CFG, ...overrides } });
  return { driver: new OssDriver(config), client };
}

function makeSource(kind: 'image' | 'video', ext: string): UploadSource {
  return { tempPath: `/tmp/stage.${ext}`, originalName: `demo.${ext}`, size: 2048, detectedKind: kind, detectedExt: ext };
}

describe('OssDriver 构造', () => {
  it('以环境配置创建 OSS 客户端（secure 固定开启）', () => {
    makeDriver();
    expect(OSS).toHaveBeenCalledWith(
      expect.objectContaining({
        region: 'cn-hangzhou',
        bucket: 'pingyang-media',
        accessKeyId: 'test-access-key',
        accessKeySecret: 'test-access-secret',
        endpoint: 'oss-cn-hangzhou.aliyuncs.com',
        secure: true,
      }),
    );
  });
});

describe('OssDriver.save', () => {
  it('图片：直传 + 正确 Content-Type + CDN 地址 + 按需裁剪缩略图 URL', async () => {
    const { driver, client } = makeDriver();
    const stored = await driver.save(makeSource('image', 'png'), 'product');
    expect(stored.key).toMatch(/^product\/\d{6}\/[0-9a-f-]{36}\.png$/);
    expect(client.put).toHaveBeenCalledWith(stored.key, '/tmp/stage.png', {
      headers: { 'Content-Type': 'image/png' },
    });
    expect(stored.url).toBe(`https://cdn.example.com/${stored.key}`);
    expect(stored.thumbnailUrl).toBe(`${stored.url}?x-oss-process=image/resize,w_400`);
  });

  it('视频：无缩略图 URL，Content-Type 为 video/mp4', async () => {
    const { driver, client } = makeDriver();
    const stored = await driver.save(makeSource('video', 'mp4'), 'video');
    expect(client.put).toHaveBeenCalledWith(stored.key, '/tmp/stage.mp4', {
      headers: { 'Content-Type': 'video/mp4' },
    });
    expect(stored.thumbnailUrl).toBeNull();
  });

  it('无 CDN 域名时回退 bucket.endpoint 拼接', async () => {
    const { driver } = makeDriver({ cdnDomain: undefined });
    const stored = await driver.save(makeSource('image', 'jpg'), 'product');
    expect(stored.url).toBe(`https://pingyang-media.oss-cn-hangzhou.aliyuncs.com/${stored.key}`);
  });

  it('无 CDN 与 endpoint 时回退 oss-region.aliyuncs.com', async () => {
    const { driver } = makeDriver({ cdnDomain: undefined, endpoint: undefined });
    const stored = await driver.save(makeSource('image', 'jpg'), 'product');
    expect(stored.url).toBe(`https://pingyang-media.oss-cn-hangzhou.aliyuncs.com/${stored.key}`);
  });
});

describe('OssDriver.delete', () => {
  it('按 key 删除对象', async () => {
    const { driver, client } = makeDriver();
    await driver.delete('product/202609/abc.jpg');
    expect(client.delete).toHaveBeenCalledWith('product/202609/abc.jpg');
  });
});
