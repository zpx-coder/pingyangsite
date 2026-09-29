// ali-oss 官方 SDK 未随包提供 TS 类型声明，本项目仅用到 put/delete，
// 此处做最小本地声明（避免引入过期的 @types/ali-oss）。
declare module 'ali-oss' {
  interface OssClientOptions {
    region: string;
    bucket: string;
    accessKeyId: string;
    accessKeySecret: string;
    endpoint?: string;
    secure?: boolean;
  }

  interface OssResult {
    res: { status: number };
  }

  class OssClient {
    constructor(options: OssClientOptions);
    put(
      name: string,
      file: string,
      options?: { headers?: Record<string, string> },
    ): Promise<OssResult & { name: string; url?: string }>;
    delete(name: string): Promise<OssResult>;
  }

  export = OssClient;
}
