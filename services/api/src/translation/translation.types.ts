// 翻译驱动统一接口（任务 1.4，方案 §5.3）：
//   - MockDriver 本地返回样例（不消耗配额）；AliyunDriver 调阿里云机器翻译；
//   - 切换仅改 MT_MODE 环境变量；失败以 MtException 抛出，由调用方降级（不阻塞保存）。
export type MtLanguage = 'zh' | 'en';

export interface MtDriver {
  readonly name: 'mock' | 'aliyun';

  /** 批量翻译；返回数组与入参一一对应（条数不匹配视为失败） */
  translate(texts: string[], source: MtLanguage, target: MtLanguage): Promise<string[]>;
}

/** 翻译失败（网络/限流/签名/服务端错误）；message 为可展示的安全文案 */
export class MtException extends Error {
  /** 是否值得重试（网络错误/限流/服务端瞬时错误为 true；签名与参数错误为 false） */
  retryable = true;
  /** 阿里云返回的错误码（仅审计定位用，不外传） */
  code?: string;

  constructor(
    message: string,
    public readonly cause?: Error,
  ) {
    super(message);
    this.name = 'MtException';
  }
}
