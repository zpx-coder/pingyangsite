// @nestjs/common 测试替身（2026-09-29 任务 1.12 引入）：
//   @nestjs/common@12 为纯 ESM 包（"type":"module"），jest 29 CJS 运行时无法解析其
//   import 语法；单元测试经 jest moduleNameMapper 将 '@nestjs/common' 整体映射到本文件。
//   仅提供本仓库源码实际用到的导出：
//   - 装饰器：全部为透传空实现（单测直接实例化类，不经过 Nest 运行时）；
//   - 异常类：复刻 Nest 的 getResponse() 形态（普通 HttpException 返回字符串，
//     BadRequest/NotFound/Unauthorized 返回 { statusCode, message, error } 对象），
//     供 http-exception.filter 单测验证映射逻辑；
//   - HttpStatus：Nest 常量枚举值（业务码映射依赖其数值）。
//   类型（LoggerService、ExecutionContext 等）在编译期仍指向真实 .d.ts，无需在此声明。

type AnyDecorator = (...args: never[]) => unknown;

// 装饰器工厂：Nest 用法均为 @Xxx(...)，Xxx(...) 被调用后须返回一个装饰器函数；
// 该装饰器再被 __decorate 调用（对 target/key/descriptor 生效），返回 undefined 即可。
const noop = (): AnyDecorator => ((..._args: unknown[]) => (() => undefined)) as unknown as AnyDecorator;

export const Injectable = noop();
export const Controller = noop();
export const Get = noop();
export const Post = noop();
export const Put = noop();
export const Delete = noop();
export const Patch = noop();
export const Headers = noop();
export const Body = noop();
export const Param = noop();
export const Query = noop();
export const Req = noop();
export const Res = noop();
export const UploadedFile = noop();
export const UseGuards = noop();
export const UseInterceptors = noop();
export const Inject = noop();
export const Global = noop();
export const Module = noop();
export const Catch = noop();
export const Optional = noop();

/** 统一异常基类：getResponse() 返回纯字符串消息（与 Nest new HttpException(msg, status) 一致） */
export class HttpException extends Error {
  constructor(
    message: string,
    private readonly statusCode = 500,
  ) {
    super(message);
    this.name = new.target.name;
  }

  getStatus(): number {
    return this.statusCode;
  }

  getResponse(): string | { statusCode: number; message: string; error: string } {
    return this.message;
  }
}

/** Nest 风格异常：getResponse() 返回对象形态 */
class NestStyleException extends HttpException {
  constructor(
    message: string,
    statusCode: number,
    private readonly errorLabel: string,
  ) {
    super(message, statusCode);
  }

  override getResponse(): { statusCode: number; message: string; error: string } {
    return { statusCode: this.getStatus(), message: this.message, error: this.errorLabel };
  }
}

export class BadRequestException extends NestStyleException {
  constructor(message = 'Bad Request') {
    super(message, 400, 'Bad Request');
  }
}

export class NotFoundException extends NestStyleException {
  constructor(message = 'Not Found') {
    super(message, 404, 'Not Found');
  }
}

export class UnauthorizedException extends NestStyleException {
  constructor(message = 'Unauthorized') {
    super(message, 401, 'Unauthorized');
  }
}

export class ForbiddenException extends NestStyleException {
  constructor(message = 'Forbidden') {
    super(message, 403, 'Forbidden');
  }
}

/** 单测中控制器方法直接调用，管道不参与执行；仅提供可实例化的最小形态 */
export class ParseIntPipe {}

export class ValidationPipe {}

export const HttpStatus = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  PAYLOAD_TOO_LARGE: 413,
} as const;
