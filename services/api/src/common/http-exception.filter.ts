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
  // multer LIMIT_FILE_SIZE（上传超限）
  [HttpStatus.PAYLOAD_TOO_LARGE]: ResultCode.BAD_REQUEST,
};

const GENERIC_ERROR_MESSAGE = '服务器开小差了，请稍后重试';
// 413 统一话术（multer 大小超限时 HttpException 消息为英文模板，此处覆盖为中文提示）
const PAYLOAD_TOO_LARGE_MESSAGE = '文件大小超出限制';

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
      if (status === HttpStatus.PAYLOAD_TOO_LARGE) {
        // multer 大小超限：Nest 抛出的消息为英文模板，统一覆盖为中文提示
        message = PAYLOAD_TOO_LARGE_MESSAGE;
        code = STATUS_CODE_MAP[status] ?? ResultCode.INTERNAL_ERROR;
      } else if (typeof body === 'string') {
        // 纯字符串消息体（new HttpException(msg, status) 形式）：按状态码映射业务码，
        // 否则会错误地保留 50000（如 429 限流提示，2026-09-29 询盘限流验收发现）
        message = body;
        code = STATUS_CODE_MAP[status] ?? ResultCode.INTERNAL_ERROR;
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
