// @nestjs/platform-express 测试替身（任务 1.12）：该包同为纯 ESM，
// 单测经 moduleNameMapper 映射到本文件；仅提供上传控制器用到的 FileInterceptor。
type AnyDecorator = (...args: never[]) => unknown;

// 同 nest-common.mock：Xxx(...) 被调用后须返回装饰器函数，再由 __decorate 调用
const noop = (): AnyDecorator => ((..._args: unknown[]) => (() => undefined)) as unknown as AnyDecorator;

export const FileInterceptor = noop();
