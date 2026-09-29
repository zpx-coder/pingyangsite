// 阿里云机器翻译驱动单元测试（任务 1.12）：
//   - mock node:https，按 SourceText 脚本化回放响应，零真实网络请求；
//   - 覆盖：RPC V1 签名参数、行数不匹配逐条兜底、不可重试服务端错误立即失败、
//     可重试错误指数退避重试、超时销毁连接后恢复。
jest.mock('node:https', () => ({ request: jest.fn() }));

import { request as httpsRequest } from 'node:https';
import { ConfigService } from '@nestjs/config';
import { AliyunDriver } from './aliyun.driver';
import { MtException } from './translation.types';

type ResponseScript = { chunks: string[] } | { error: Error } | null;

interface RecordedRequest {
  options: { path: string };
  events: Record<string, (...args: unknown[]) => void>;
  on: jest.Mock;
  end: jest.Mock;
  destroy: jest.Mock;
}

let requests: RecordedRequest[];
let responder: (options: { path: string }) => ResponseScript;

function okPayload(translated: string): { chunks: string[] } {
  return { chunks: [JSON.stringify({ Code: '200', Data: { Translated: translated } })] };
}

function sourceText(options: { path: string }): string {
  const query = options.path.slice(options.path.indexOf('?') + 1);
  return new URLSearchParams(query).get('SourceText') ?? '';
}

/** 安装按请求脚本回放的假 https 服务；null 脚本表示挂起（供超时用例手动触发） */
function startServer(script: (options: { path: string }) => ResponseScript): void {
  responder = script;
  (httpsRequest as unknown as jest.Mock).mockImplementation(
    (
      options: { path: string },
      // 'end' 事件回调无参数，故 handler 的 chunk 声明为可选
      callback: (res: { on: (event: string, handler: (chunk?: Buffer) => void) => void }) => void,
    ) => {
      const events: RecordedRequest['events'] = {};
      const req: RecordedRequest = {
        options,
        events,
        on: jest.fn((event: string, handler: (...args: unknown[]) => void) => {
          events[event] = handler;
        }),
        end: jest.fn(),
        destroy: jest.fn(),
      };
      requests.push(req);
      // 延迟一个 tick 投递，保证驱动完成 error/timeout 处理器注册后再回放
      setTimeout(() => {
        const spec = responder(options);
        if (spec === null) return;
        if ('error' in spec) {
          events.error?.(spec.error);
          return;
        }
        callback({
          on: (event: string, handler: (chunk?: Buffer) => void) => {
            if (event === 'data') spec.chunks.forEach((chunk) => handler(Buffer.from(chunk)));
            if (event === 'end') handler();
          },
        });
      }, 0);
      return req;
    },
  );
}

function makeDriver(): AliyunDriver {
  const config = new ConfigService({ 'mt.aliyun': { accessKeyId: 'test-ak', accessKeySecret: 'test-sk' } });
  return new AliyunDriver(config);
}

beforeEach(() => {
  requests = [];
  jest.clearAllMocks();
});

describe('AliyunDriver.translate', () => {
  it('成功：签名参数齐全，译文按行切分返回', async () => {
    startServer(() => okPayload('hello\nworld'));
    const driver = makeDriver();
    await expect(driver.translate(['你好', '世界'], 'zh', 'en')).resolves.toEqual(['hello', 'world']);

    expect(requests).toHaveLength(1);
    expect(requests[0].options).toEqual(
      expect.objectContaining({ host: 'mt.aliyuncs.com', method: 'GET', timeout: 10000 }),
    );
    const params = new URLSearchParams(requests[0].options.path.slice(2));
    expect(params.get('Action')).toBe('TranslateGeneral');
    expect(params.get('Version')).toBe('2018-10-12');
    expect(params.get('Format')).toBe('JSON');
    expect(params.get('FormatType')).toBe('text');
    expect(params.get('SourceLanguage')).toBe('zh');
    expect(params.get('TargetLanguage')).toBe('en');
    expect(params.get('SourceText')).toBe('你好\n世界');
    expect(params.get('Scene')).toBe('general');
    expect(params.get('AccessKeyId')).toBe('test-ak');
    expect(params.get('SignatureMethod')).toBe('HMAC-SHA1');
    expect(params.get('SignatureVersion')).toBe('1.0');
    expect(params.get('SignatureNonce')).toMatch(/^[0-9a-f-]{36}$/);
    expect(params.get('Timestamp')).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
    expect(params.get('Signature')).toMatch(/^[A-Za-z0-9+/=]+$/);
  });

  it('en→zh 语言映射', async () => {
    startServer(() => okPayload('你好'));
    const driver = makeDriver();
    await expect(driver.translate(['hello'], 'en', 'zh')).resolves.toEqual(['你好']);
    const params = new URLSearchParams(requests[0].options.path.slice(2));
    expect(params.get('SourceLanguage')).toBe('en');
    expect(params.get('TargetLanguage')).toBe('zh');
  });

  it('返回行数与入参不一致时逐条兜底翻译', async () => {
    startServer((options) => {
      const text = sourceText(options);
      if (text.includes('\n')) return okPayload('single-line-only');
      if (text === '你好') return okPayload('hello');
      return okPayload('world');
    });
    const driver = makeDriver();
    await expect(driver.translate(['你好', '世界'], 'zh', 'en')).resolves.toEqual(['hello', 'world']);
    expect(requests).toHaveLength(3);
    expect(sourceText(requests[1].options)).toBe('你好');
    expect(sourceText(requests[2].options)).toBe('世界');
  });

  it('服务端不可重试错误：立即失败并保留错误码', async () => {
    startServer(() => ({ chunks: [JSON.stringify({ Code: 'InvalidParameter', Message: 'bad' })] }));
    const driver = makeDriver();
    const err = await driver.translate(['你好'], 'zh', 'en').catch((e: unknown) => e);
    expect(err).toBeInstanceOf(MtException);
    expect((err as MtException).retryable).toBe(false);
    expect((err as MtException).code).toBe('InvalidParameter');
    expect(requests).toHaveLength(1);
  });

  it('可重试服务端错误：指数退避重试 3 次后失败', async () => {
    startServer(() => ({ chunks: [JSON.stringify({ Code: 'Throttling.User' })] }));
    const driver = makeDriver();
    const err = await driver.translate(['你好'], 'zh', 'en').catch((e: unknown) => e);
    expect(err).toBeInstanceOf(MtException);
    expect((err as MtException).cause).toBeInstanceOf(Error);
    expect(requests).toHaveLength(3);
  });

  it('返回缺失译文：按可重试处理，重试后成功', async () => {
    let count = 0;
    startServer(() => {
      count += 1;
      return count === 1 ? { chunks: [JSON.stringify({ Code: '200', Data: {} })] } : okPayload('你好');
    });
    const driver = makeDriver();
    await expect(driver.translate(['你好'], 'zh', 'en')).resolves.toEqual(['你好']);
    expect(requests).toHaveLength(2);
  });

  it('网络错误：重试后成功', async () => {
    let count = 0;
    startServer(() => {
      count += 1;
      return count === 1 ? { error: new Error('ECONNRESET') } : okPayload('你好');
    });
    const driver = makeDriver();
    await expect(driver.translate(['你好'], 'zh', 'en')).resolves.toEqual(['你好']);
    expect(requests).toHaveLength(2);
  });

  it('响应非 JSON：重试后成功', async () => {
    let count = 0;
    startServer(() => {
      count += 1;
      return count === 1 ? { chunks: ['oops-not-json'] } : okPayload('你好');
    });
    const driver = makeDriver();
    await expect(driver.translate(['你好'], 'zh', 'en')).resolves.toEqual(['你好']);
    expect(requests).toHaveLength(2);
  });

  it('请求超时：销毁连接并重试后成功', async () => {
    startServer(() => (requests.length === 1 ? null : okPayload('你好')));
    const driver = makeDriver();
    const promise = driver.translate(['你好'], 'zh', 'en');
    // 驱动在发起请求时已同步注册处理器；手动触发 timeout → destroy(error) → error 事件
    const first = requests[0];
    first.events.timeout();
    const destroyArg = first.destroy.mock.calls[0][0] as unknown;
    expect(destroyArg).toBeInstanceOf(MtException);
    first.events.error(destroyArg as Error);
    await expect(promise).resolves.toEqual(['你好']);
    expect(requests).toHaveLength(2);
  });
});
