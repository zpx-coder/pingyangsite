// 统一异常过滤器：所有异常收敛为统一响应 { code, message, data: null }。
// 已知异常（HttpException）按状态码映射业务码；未知异常不向客户端泄漏细节，
// 仅落脱敏日志。
import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import type { Request, Response } from 'express';
import { AppLoggerService } from '../logger/app-logger.service';
import { fail, ResultCode } from './api-response';

const STATUS_CODE_MAP: Record<number, number> = {
  [HttpStatus.BAD_REQUEST]: ResultCode.BAD_REQUEST,
  [HttpStatus.UNAUTHORIZED]: ResultCode.UNAUTHORIZED,
  [HttpStatus.FORBIDDEN]: ResultCode.FORBIDDEN,
  [HttpStatus.NOT_FOUND]: ResultCode.NOT_FOUND,
  [HttpStatus.TOO_MANY_REQUESTS]: ResultCode.TOO_MANY_REQUESTS,
};

const GENERIC_ERROR_MESSAGE = '服务器开小差了，请稍后重试';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: AppLoggerService) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code: number = ResultCode.INTERNAL_ERROR;
    let message = GENERIC_ERROR_MESSAGE;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();
      if (typeof body === 'string') {
        message = body;
      } else if (typeof body === 'object' && body !== null) {
        const rawMessage = (body as { message?: string | string[] }).message;
        message = Array.isArray(rawMessage) ? rawMessage.join('；') : (rawMessage ?? message);
        code = (body as { code?: number }).code ?? (STATUS_CODE_MAP[status] ?? ResultCode.INTERNAL_ERROR);
      }
    }

    // 脱敏后记录（不打印请求体，防止密文/个人信息入日志）
    this.logger.error(
      `[${request.method}] ${request.url} -> HTTP ${status} ${message}`,
      exception instanceof Error ? exception.stack : '',
    );
    response.status(status).json(fail(code, message));
  }
}
