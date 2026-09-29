// @nestjs/config 测试替身（任务 1.12）：该包同为纯 ESM，jest 29 CJS 无法解析；
// redis.module 等以值方式引用 ConfigService 作为注入 token，单测经 moduleNameMapper
// 映射到本文件。单测不实例化 Nest 模块，此类仅为让 import 链可解析。
export class ConfigService {
  private readonly values: Record<string, unknown>;

  constructor(values: Record<string, unknown> = {}) {
    this.values = values;
  }

  get<T>(key: string, fallback?: T): T | undefined {
    return (this.values[key] as T | undefined) ?? fallback;
  }

  getOrThrow<T>(key: string): T {
    if (key in this.values) {
      return this.values[key] as T;
    }
    throw new Error(`配置项 ${key} 不存在`);
  }
}

export const ConfigModule = {
  forRoot: () => ({ module: ConfigModule }),
};
