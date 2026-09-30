// 统一请求层（任务 3.1）：信封 { code, message, data } 解包 + 401 会话失效处理
// 开发期经 Vite 代理、生产经 Nginx 反代，均为同域请求（会话 Cookie 自动携带）
import axios, { AxiosError, type AxiosRequestConfig } from 'axios';
import { ElMessage } from 'element-plus';

export class ApiError extends Error {
  readonly code: number;
  constructor(code: number, message: string) {
    super(message);
    this.code = code;
  }
}

interface Envelope<T> {
  code: number;
  message: string;
  data: T | null;
}

export const http = axios.create({
  baseURL: '/api/v1',
  timeout: 30000,
  withCredentials: true,
});

// 40100（未登录/会话过期）：由会话存储注册跳转处理，避免与 router 循环依赖
let onUnauthorized: (() => void) | null = null;
export function setUnauthorizedHandler(handler: () => void): void {
  onUnauthorized = handler;
}

http.interceptors.response.use(
  (response) => {
    const body = response.data as Envelope<unknown>;
    if (body && typeof body === 'object' && 'code' in body) {
      if (body.code === 0) return body.data;
      if (body.code === 40100) {
        onUnauthorized?.();
        throw new ApiError(body.code, body.message || '登录已过期，请重新登录');
      }
      throw new ApiError(body.code, body.message || '请求失败');
    }
    return response.data;
  },
  (error: AxiosError<Envelope<unknown>>) => {
    const body = error.response?.data;
    if (body && typeof body === 'object' && 'code' in body) {
      if (body.code === 40100) {
        onUnauthorized?.();
        throw new ApiError(body.code, body.message || '登录已过期，请重新登录');
      }
      throw new ApiError(body.code, body.message || '请求失败');
    }
    throw new ApiError(-1, error.message || '网络错误，请稍后重试');
  },
);

/** 请求并解包信封（response 拦截器已返回 data，此处提供显式类型） */
export function request<T>(config: AxiosRequestConfig): Promise<T> {
  return http.request(config) as Promise<T>;
}

/** 统一弹出业务错误消息（表单提交失败路径复用） */
export function notifyError(error: unknown, fallback = '操作失败，请稍后重试'): void {
  const message = error instanceof ApiError ? error.message : fallback;
  ElMessage.error(message);
}
