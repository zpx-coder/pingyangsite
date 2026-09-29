// 魔数嗅探单元测试（任务 1.12，安全底线 §6：不信任客户端声明的 MIME 与扩展名）：
//   - mock node:fs/promises 的 open/read/close，纯内存构造文件头；
//   - 覆盖 jpg/png/webp/mp4 识别、未知类型、短文件头与读取失败时句柄关闭。
jest.mock('node:fs/promises', () => ({
  open: jest.fn(),
}));

import { open } from 'node:fs/promises';
import { sniffFileType } from './file-type.util';

const JPEG_HEAD = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
const PNG_HEAD = Buffer.from('89504e470d0a1a0a0000000049484452', 'hex');
const WEBP_HEAD = Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WEBPVP8 ')]);
const MP4_HEAD = Buffer.concat([Buffer.alloc(4, 0x18), Buffer.from('ftypisom')]);

interface FakeHandle {
  read: jest.Mock;
  close: jest.Mock;
}

/** 以内存字节流伪造文件句柄：read 按 position 拷贝头部，close 可追踪 */
function stubFile(head: Buffer, readError?: Error): FakeHandle {
  const handle: FakeHandle = {
    read: jest.fn(async (buffer: Buffer, offset: number, length: number, position: number) => {
      if (readError) throw readError;
      const count = Math.min(head.length - position, length);
      head.copy(buffer, offset, position, position + count);
      return { bytesRead: count };
    }),
    close: jest.fn(async () => undefined),
  };
  (open as unknown as jest.Mock).mockResolvedValue(handle);
  return handle;
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('sniffFileType', () => {
  it('jpg：FFD8FF 魔数识别', async () => {
    const handle = stubFile(JPEG_HEAD);
    await expect(sniffFileType('/tmp/a.jpg')).resolves.toEqual({ kind: 'image', ext: 'jpg' });
    expect(open).toHaveBeenCalledWith('/tmp/a.jpg', 'r');
    expect(handle.close).toHaveBeenCalled();
  });

  it('png：8 字节签名识别', async () => {
    stubFile(PNG_HEAD);
    await expect(sniffFileType('/tmp/a.png')).resolves.toEqual({ kind: 'image', ext: 'png' });
  });

  it('webp：RIFF/WEBP 标识识别', async () => {
    stubFile(WEBP_HEAD);
    await expect(sniffFileType('/tmp/a.webp')).resolves.toEqual({ kind: 'image', ext: 'webp' });
  });

  it('mp4：ftyp box 识别', async () => {
    stubFile(MP4_HEAD);
    await expect(sniffFileType('/tmp/a.mp4')).resolves.toEqual({ kind: 'video', ext: 'mp4' });
  });

  it('mp4：moov 前置 box 亦识别（部分编码器 ftyp 不在开头）', async () => {
    stubFile(Buffer.concat([Buffer.alloc(4), Buffer.from('moovmvhd')]));
    await expect(sniffFileType('/tmp/b.mp4')).resolves.toEqual({ kind: 'video', ext: 'mp4' });
  });

  it('未知类型返回 unknown', async () => {
    stubFile(Buffer.from('GIF89a not-supported'));
    await expect(sniffFileType('/tmp/a.gif')).resolves.toEqual({ kind: 'unknown', ext: null });
  });

  it('短文件头按已读字节判断', async () => {
    stubFile(Buffer.from([0xff, 0xd8])); // 仅 2 字节，不足 jpg 判定所需 3 字节
    await expect(sniffFileType('/tmp/short.bin')).resolves.toEqual({ kind: 'unknown', ext: null });
  });

  it('读取异常向上抛出且句柄仍关闭', async () => {
    const handle = stubFile(Buffer.alloc(0), new Error('EIO'));
    await expect(sniffFileType('/tmp/bad.bin')).rejects.toThrow('EIO');
    expect(handle.close).toHaveBeenCalled();
  });
});
