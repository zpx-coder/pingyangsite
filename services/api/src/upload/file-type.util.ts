// 魔数嗅探（安全底线 §6：上传文件校验类型并做恶意文件检测，
// 不信任客户端声明的 MIME 与扩展名——服务端命名以嗅探结果为准）。
import { open } from 'node:fs/promises';

export interface SniffedType {
  kind: 'image' | 'video' | 'unknown';
  /** 真实扩展名（不含点）；未知文件为 null */
  ext: string | null;
}

const PNG_MAGIC = Buffer.from('89504e470d0a1a0a', 'hex');
// 部分编码器在 ftyp 前写入 free/mdat 等 box，mp4 识别以主要 box 类型为准
const MP4_BOX_TYPES = ['ftyp', 'moov', 'free', 'mdat', 'wide'];

/** 读取文件头 16 字节判断真实类型（jpg/png/webp/mp4） */
export async function sniffFileType(path: string): Promise<SniffedType> {
  const handle = await open(path, 'r');
  try {
    const head = Buffer.alloc(16);
    const { bytesRead } = await handle.read(head, 0, head.length, 0);
    const buf = head.subarray(0, bytesRead);

    if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
      return { kind: 'image', ext: 'jpg' };
    }
    if (buf.length >= 8 && buf.subarray(0, 8).equals(PNG_MAGIC)) {
      return { kind: 'image', ext: 'png' };
    }
    if (
      buf.length >= 12 &&
      buf.subarray(0, 4).toString('latin1') === 'RIFF' &&
      buf.subarray(8, 12).toString('latin1') === 'WEBP'
    ) {
      return { kind: 'image', ext: 'webp' };
    }
    if (buf.length >= 12 && MP4_BOX_TYPES.includes(buf.subarray(4, 8).toString('latin1'))) {
      return { kind: 'video', ext: 'mp4' };
    }
    return { kind: 'unknown', ext: null };
  } finally {
    await handle.close();
  }
}
