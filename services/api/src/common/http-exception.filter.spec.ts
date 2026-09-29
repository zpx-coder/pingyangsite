// 统一异常过滤器单元测试（任务 1.12）：
//   - 字符串消息体 HttpException 按状态码映射业务码——2026-09-29 询盘限流验收发现
//     429 提示被错误保留 50000，此处锁死回归；
//   - 对象消息体取 message 数组拼接、code 字段优先透传；
//   - 未知异常一律 50000 + 通用话术，不向客户端泄漏内部细节。
import { HttpException, HttpStatus } from '@nestjs/common';
import type { ArgumentsHost } from '@nestjs/common';
import type { Request, Response } from 'express';
import { HttpExceptionFilter } from './http-exception.filter';
import { ResultCode } from './api-response';
import type { AppLoggerService } from '../logger/app-logger.service';

/** 构造 getResponse() 返回自定义对象体的 HttpException（复刻 Nest 校验失败响应形态） */
class ObjectBodyException extends HttpException {
  constructor(private readonly body: unknown) {
    super('placeholder', 400);
  }

  override getResponse(): string {
    // 类型上声明为 string（真实 HttpException 返回并集之一），运行时实际返回对象体
    return this.body as unknown as string;
  }
}

function makeHost() {
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
  const req = { method: 'GET', url: '/api/v1/admin/inquiry' };
  return {
    res: res as unknown as Response,
    req: req as unknown as Request,
    host: {
      switchToHttp: () => ({ getResponse: () => res, getRequest: () => req }),
    } as unknown as ArgumentsHost,
  };
}

function makeFilter() {
  const logger = { error: jest.fn() } as unknown as AppLoggerService;
  return { filter: new HttpExceptionFilter(logger), logger };
}

describe('HttpExceptionFilter', () => {
  it('字符串消息体 429 按状态码映射业务码 42900（2026-09-29 回归缺陷）', () => {
    const { filter, logger } = makeFilter();
    const { res, host } = makeHost();
    filter.catch(new HttpException('请求过于频繁，请稍后再试', HttpStatus.TOO_MANY_REQUESTS), host);
    expect(res.status).toHaveBeenCalledWith(429);
    expect(res.json).toHaveBeenCalledWith({
      code: ResultCode.TOO_MANY_REQUESTS,
      message: '请求过于频繁，请稍后再试',
      data: null,
    });
    expect(logger.error).toHaveBeenCalledWith(
      '[GET] /api/v1/admin/inquiry -> HTTP 429 请求过于频繁，请稍后再试',
      expect.any(String),
    );
  });

  it.each([
    [HttpStatus.BAD_REQUEST, ResultCode.BAD_REQUEST],
    [HttpStatus.UNAUTHORIZED, ResultCode.UNAUTHORIZED],
    [HttpStatus.FORBIDDEN, ResultCode.FORBIDDEN],
    [HttpStatus.NOT_FOUND, ResultCode.NOT_FOUND],
  ])('字符串消息体 HTTP %i 映射业务码 %i', (status, code) => {
    const { filter } = makeFilter();
    const { res, host } = makeHost();
    filter.catch(new HttpException('业务提示', status), host);
    expect(res.status).toHaveBeenCalledWith(status);
    expect(res.json).toHaveBeenCalledWith({ code, message: '业务提示', data: null });
  });

  it('字符串消息体未映射状态码兜底 50000，但保留提示文案', () => {
    const { filter } = makeFilter();
    const { res, host } = makeHost();
    filter.catch(new HttpException('服务暂时不可用', HttpStatus.INTERNAL_SERVER_ERROR), host);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      code: ResultCode.INTERNAL_ERROR,
      message: '服务暂时不可用',
      data: null,
    });
  });

  it('413（multer 超限）统一覆盖为中文话术并映射 40000', () => {
    const { filter } = makeFilter();
    const { res, host } = makeHost();
    filter.catch(new HttpException('File too large', HttpStatus.PAYLOAD_TOO_LARGE), host);
    expect(res.status).toHaveBeenCalledWith(413);
    expect(res.json).toHaveBeenCalledWith({ code: ResultCode.BAD_REQUEST, message: '文件大小超出限制', data: null });
  });

  it('对象消息体单条 message 直接取用（BadRequestException 形态）', () => {
    const { filter } = makeFilter();
    const { res, host } = makeHost();
    filter.catch(new ObjectBodyException({ statusCode: 400, message: '参数错误', error: 'Bad Request' }), host);
    expect(res.json).toHaveBeenCalledWith({ code: ResultCode.BAD_REQUEST, message: '参数错误', data: null });
  });

  it('对象消息体 message 数组以分号拼接', () => {
    const { filter } = makeFilter();
    const { res, host } = makeHost();
    filter.catch(
      new ObjectBodyException({ statusCode: 400, message: ['字段 a 有误', '字段 b 有误'], error: 'Bad Request' }),
      host,
    );
    expect(res.json).toHaveBeenCalledWith({ code: ResultCode.BAD_REQUEST, message: '字段 a 有误；字段 b 有误', data: null });
  });

  it('对象消息体携带业务码时优先透传业务码', () => {
    const { filter } = makeFilter();
    const { res, host } = makeHost();
    filter.catch(new ObjectBodyException({ code: 40001, message: '自定义错误', statusCode: 400 }), host);
    expect(res.json).toHaveBeenCalledWith({ code: 40001, message: '自定义错误', data: null });
  });

  it('对象消息体缺失 message 时使用通用话术', () => {
    const { filter } = makeFilter();
    const { res, host } = makeHost();
    filter.catch(new ObjectBodyException({ statusCode: 400, error: 'Bad Request' }), host);
    expect(res.json).toHaveBeenCalledWith({
      code: ResultCode.BAD_REQUEST,
      message: '服务器开小差了，请稍后重试',
      data: null,
    });
  });

  it('未知异常返回 50000 + 通用话术，不泄漏异常细节', () => {
    const { filter, logger } = makeFilter();
    const { res, host } = makeHost();
    filter.catch(new Error('数据库连接失败：10.0.0.8:3306，账号 root'), host);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      code: ResultCode.INTERNAL_ERROR,
      message: '服务器开小差了，请稍后重试',
      data: null,
    });
    expect(logger.error).toHaveBeenCalledWith(
      '[GET] /api/v1/admin/inquiry -> HTTP 500 服务器开小差了，请稍后重试',
      expect.any(String),
    );
  });

  it('未知非 Error 异常落日志但不携带堆栈', () => {
    const { filter, logger } = makeFilter();
    const { res, host } = makeHost();
    filter.catch('boom', host);
    expect(res.json).toHaveBeenCalledWith({
      code: ResultCode.INTERNAL_ERROR,
      message: '服务器开小差了，请稍后重试',
      data: null,
    });
    expect(logger.error).toHaveBeenCalledWith(
      '[GET] /api/v1/admin/inquiry -> HTTP 500 服务器开小差了，请稍后重试',
      '',
    );
  });
});
