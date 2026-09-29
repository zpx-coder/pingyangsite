// Mock 驱动（MT_MODE=mock，本地开发/联调，方案 §10.1）：
// 返回 `[en] 原文` 样例译文，零网络请求、不消耗阿里云配额；
// 空文本返回空串，保证输出与入参一一对应。
import type { MtDriver, MtLanguage } from './translation.types';

export class MockDriver implements MtDriver {
  readonly name = 'mock' as const;

  async translate(texts: string[], _source: MtLanguage, target: MtLanguage): Promise<string[]> {
    return texts.map((text) => {
      const trimmed = text.trim();
      return trimmed === '' ? '' : `[${target}] ${trimmed}`;
    });
  }
}
