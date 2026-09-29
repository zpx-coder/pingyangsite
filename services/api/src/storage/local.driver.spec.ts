// 本地磁盘存储驱动单元测试（任务 1.12）：
//   - mock node:fs/promises 与 sharp，纯内存断言路径拼接与缩略图生成调用；
//   - key 形态 scope/yyyymm/uuid.ext，公开地址 = baseUrl + /uploads/<key>，
//     图片额外生成 _thumb.jpg 缩略图（400px / 质量 80）。
jest.mock('sharp', () => {
  const chain = { resize: jest.fn(), jpeg: jest.fn(), toFile: jest.fn() };
  chain.resize.mockReturnValue(chain);
  chain.jpeg.mockReturnValue(chain);
  chain.toFile.mockResolvedValue({});
  return { __esModule: true, default: jest.fn(() => chain) };
});
jest.mock('node:fs/promises', () => ({
  mkdir: jest.fn(async () => undefined),
  rename: jest.fn(async () => undefined),
  rm: jest.fn(async () => undefined),
}));

import sharp from 'sharp';
import { mkdir, rename, rm } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { ConfigService } from '@nestjs/config';
import { LocalDriver } from './local.driver';
import type { UploadSource } from './storage.types';

const LOCAL_DIR = '/data/uploads';
const BASE_URL = 'https://static.example.com';
const KEY_PATTERN = /^product\/\d{6}\/[0-9a-f-]{36}\.jpg$/;

function makeDriver(): LocalDriver {
  const config = new ConfigService({ 'storage.local.dir': LOCAL_DIR, 'storage.local.baseUrl': BASE_URL });
  return new LocalDriver(config);
}

function makeSource(kind: 'image' | 'video', ext: string): UploadSource {
  return {
    tempPath: `/tmp/multer-stage.${ext}`,
    originalName: `demo.${ext}`,
    size: 1024,
    detectedKind: kind,
    detectedExt: ext,
  };
}

function lastSharpChain(): { resize: jest.Mock; jpeg: jest.Mock; toFile: jest.Mock } {
  const results = (sharp as unknown as jest.Mock).mock.results;
  return results[results.length - 1].value;
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('LocalDriver.save（图片）', () => {
  it('落盘到 scope/yyyymm/uuid.ext 并生成缩略图与公开地址', async () => {
    const driver = makeDriver();
    const source = makeSource('image', 'jpg');
    const stored = await driver.save(source, 'product');

    expect(stored.key).toMatch(KEY_PATTERN);
    const target = join(LOCAL_DIR, stored.key);
    expect(mkdir).toHaveBeenCalledWith(dirname(target), { recursive: true });
    expect(rename).toHaveBeenCalledWith(source.tempPath, target);

    const chain = lastSharpChain();
    expect(sharp).toHaveBeenCalledWith(target);
    expect(chain.resize).toHaveBeenCalledWith({ width: 400, withoutEnlargement: true });
    expect(chain.jpeg).toHaveBeenCalledWith({ quality: 80 });
    expect(chain.toFile).toHaveBeenCalledWith(target.replace(/\.[^.]+$/, '_thumb.jpg'));

    expect(stored.url).toBe(`${BASE_URL}/uploads/${stored.key}`);
    expect(stored.thumbnailUrl).toBe(`${BASE_URL}/uploads/${stored.key.replace(/\.[^.]+$/, '_thumb.jpg')}`);
  });
});

describe('LocalDriver.save（视频）', () => {
  it('不生成缩略图，thumbnailUrl 为 null', async () => {
    const driver = makeDriver();
    const stored = await driver.save(makeSource('video', 'mp4'), 'video');
    expect(stored.key).toMatch(/^video\/\d{6}\/[0-9a-f-]{36}\.mp4$/);
    expect(stored.thumbnailUrl).toBeNull();
    expect(sharp).not.toHaveBeenCalled();
    expect(stored.url).toBe(`${BASE_URL}/uploads/${stored.key}`);
  });
});

describe('LocalDriver.delete', () => {
  it('删除原文件并一并清理 _thumb 缩略图（rm force 幂等）', async () => {
    const driver = makeDriver();
    await driver.delete('product/202609/abc-def.jpg');
    expect(rm).toHaveBeenCalledWith(join(LOCAL_DIR, 'product/202609/abc-def.jpg'), { force: true });
    expect(rm).toHaveBeenCalledWith(join(LOCAL_DIR, 'product/202609/abc-def_thumb.jpg'), { force: true });
  });
});
