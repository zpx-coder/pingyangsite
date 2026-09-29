// 阿里云机器翻译驱动（MT_MODE=real，生产，方案 §5.3）：
//   - 调机器翻译通用版 TranslateGeneral（mt.aliyuncs.com，版本 2018-10-12）；
//   - RPC V1 签名（HMAC-SHA1）+ 指数退避重试 + 超时（性能基线 §7：外部调用 ≤30s）；
//   - 用 Node 内置 https 实现，零第三方 SDK 依赖；凭证经环境变量注入，不入库、不入日志。
import { createHmac, randomUUID } from 'node:crypto';
import { request as httpsRequest, type RequestOptions } from 'node:https';
import { ConfigService } from '@nestjs/config';
import type { MtDriver, MtLanguage } from './translation.types';
import { MtException } from './translation.types';

const MT_ENDPOINT = 'mt.aliyuncs.com';
const MT_API_VERSION = '2018-10-12';
const REQUEST_TIMEOUT_MS = 10_000;
const MAX_ATTEMPTS = 3;
// 指数退避基数（毫秒）：300 → 900 → 1800
const RETRY_BASE_DELAY_MS = 300;

// 可重试的服务端错误码（限流/服务端瞬时错误）
const RETRYABLE_CODES = new Set(['Throttling.User', 'ServiceUnavailable', 'InternalError']);

interface AliyunMtCredentials {
  accessKeyId: string;
  accessKeySecret: string;
}

interface TranslateResponse {
  Code?: string;
  Message?: string;
  Data?: { Translated?: string };
}

export class AliyunDriver implements MtDriver {
  readonly name = 'aliyun' as const;

  private readonly credentials: AliyunMtCredentials;

  constructor(config: ConfigService) {
    this.credentials = config.getOrThrow<AliyunMtCredentials>('mt.aliyun');
  }

  async translate(texts: string[], source: MtLanguage, target: MtLanguage): Promise<string[]> {
    // 批量：FormatType=text 时以换行分隔多段文本，一次请求整体翻译
    const payload = texts.join('\n');
    const sourceLanguage = source === 'zh' ? 'zh' : 'en';
    const targetLanguage = target === 'zh' ? 'zh' : 'en';

    const params: Record<string, string> = {
      Action: 'TranslateGeneral',
      Version: MT_API_VERSION,
      Format: 'JSON',
      FormatType: 'text',
      SourceLanguage: sourceLanguage,
      TargetLanguage: targetLanguage,
      SourceText: payload,
      Scene: 'general',
    };

    let lastError: unknown;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
      try {
        const translated = await this.requestOnce(params);
        const lines = translated.split('\n');
        if (lines.length === texts.length) {
          return lines;
        }
        // 返回行数与入参不一致（罕见）：按段逐条重译兜底
        return await this.translateIndividually(texts, params);
      } catch (err) {
        lastError = err;
        if (err instanceof MtException && err.retryable === false) {
          throw err;
        }
        if (attempt < MAX_ATTEMPTS) {
          await new Promise((resolve) => setTimeout(resolve, RETRY_BASE_DELAY_MS * 3 ** (attempt - 1)));
        }
      }
    }
    throw new MtException('翻译服务暂不可用，请稍后重试', lastError instanceof Error ? lastError : undefined);
  }

  private async translateIndividually(
    texts: string[],
    baseParams: Record<string, string>,
  ): Promise<string[]> {
    const results: string[] = [];
    for (const text of texts) {
      const body = await this.requestOnce({ ...baseParams, SourceText: text });
      results.push(body);
    }
    return results;
  }

  /** 单次请求（含签名）；网络错误与可重试服务端错误抛 retryable MtException */
  private async requestOnce(params: Record<string, string>): Promise<string> {
    const body = await this.post(params);
    if (body.Code && body.Code !== '200') {
      const err = new MtException('翻译服务暂不可用，请稍后重试');
      err.retryable = RETRYABLE_CODES.has(body.Code);
      err.code = body.Code;
      throw err;
    }
    const translated = body.Data?.Translated;
    if (typeof translated !== 'string' || translated === '') {
      const err = new MtException('翻译服务暂不可用，请稍后重试');
      err.retryable = true;
      throw err;
    }
    return translated;
  }

  private post(params: Record<string, string>): Promise<TranslateResponse> {
    const query = this.buildSignedQuery(params);
    const options: RequestOptions = {
      host: MT_ENDPOINT,
      path: `/?${query}`,
      method: 'GET',
      timeout: REQUEST_TIMEOUT_MS,
    };

    return new Promise((resolve, reject) => {
      const req = httpsRequest(options, (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk: Buffer) => chunks.push(chunk));
        res.on('end', () => {
          const raw = Buffer.concat(chunks).toString('utf8');
          let parsed: TranslateResponse;
          try {
            parsed = JSON.parse(raw) as TranslateResponse;
          } catch {
            reject(new MtException('翻译服务暂不可用，请稍后重试'));
            return;
          }
          resolve(parsed);
        });
      });
      req.on('error', (err) => {
        const mtErr = new MtException('翻译服务暂不可用，请稍后重试', err);
        mtErr.retryable = true;
        reject(mtErr);
      });
      req.on('timeout', () => {
        req.destroy(new MtException('翻译服务超时，请稍后重试'));
      });
      req.end();
    });
  }

  /** RPC V1 签名：StringToSign = GET&%2F& + percentEncode(规范化查询串)，HMAC-SHA1 后 Base64 */
  private buildSignedQuery(params: Record<string, string>): string {
    const common: Record<string, string> = {
      AccessKeyId: this.credentials.accessKeyId,
      SignatureMethod: 'HMAC-SHA1',
      SignatureNonce: randomUUID(),
      SignatureVersion: '1.0',
      Timestamp: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
    };
    const merged = { ...params, ...common };

    const canonical = Object.keys(merged)
      .sort()
      .map((key) => `${rfc3986(key)}=${rfc3986(merged[key])}`)
      .join('&');
    const stringToSign = `GET&${rfc3986('/')}&${rfc3986(canonical)}`;
    const signature = createHmac('sha1', `${this.credentials.accessKeySecret}&`)
      .update(stringToSign)
      .digest('base64');

    const entries = Object.entries(merged).sort(([a], [b]) => a.localeCompare(b));
    entries.push(['Signature', signature]);
    return entries
      .map(([key, value]) => `${rfc3986(key)}=${rfc3986(value)}`)
      .join('&');
  }
}

// RFC 3986 编码（阿里云 RPC 签名要求，与 encodeURIComponent 一致，保留 ~ 不编码亦可）
function rfc3986(value: string): string {
  return encodeURIComponent(value).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
}
