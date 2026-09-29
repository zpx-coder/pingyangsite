// 统一响应拦截器：控制器返回值自动包装为 { code: 0, message: 'ok', data }
// 已符合统一结构（含 code/message/data 三字段）的返回值原样透传。
import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiResponse, ok } from './api-response';

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
  intercept(_context: ExecutionContext, next: CallHandler<T>): Observable<ApiResponse<T>> {
    return next.handle().pipe(
      map((data) => (isApiResponse(data) ? (data as unknown as ApiResponse<T>) : ok(data))),
    );
  }
}

function isApiResponse(value: unknown): value is ApiResponse<unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    'code' in value &&
    'message' in value &&
    'data' in value
  );
}
