// 统一响应结构与业务结果码（计划 §5.2）：{ code, message, data }，code=0 成功
// 全站接口（public / admin）共用；分页结构 { page, pageSize, total, list } 见各业务模块。

export const ResultCode = {
  SUCCESS: 0,
  BAD_REQUEST: 40000,
  UNAUTHORIZED: 40100,
  FORBIDDEN: 40300,
  NOT_FOUND: 40400,
  TOO_MANY_REQUESTS: 42900,
  INTERNAL_ERROR: 50000,
} as const;

export type ResultCodeValue = (typeof ResultCode)[keyof typeof ResultCode];

export interface ApiResponse<T = unknown> {
  code: number;
  message: string;
  data: T | null;
}

export function ok<T>(data: T, message = 'ok'): ApiResponse<T> {
  return { code: ResultCode.SUCCESS, message, data };
}

export function fail(code: number, message: string): ApiResponse<null> {
  return { code, message, data: null };
}
