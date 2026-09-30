// 认证接口（任务 3.1/3.3）：登录 / 退出 / 会话查询（PRD §7.0）
import { request } from './http';

export interface LoginParams {
  phone: string;
  password: string;
}

/** 管理员登录：成功后服务端签发会话 Cookie（8 小时过期，PRD §7.0） */
export function login(params: LoginParams): Promise<{ phone: string }> {
  return request<{ phone: string }>({ url: '/admin/login', method: 'POST', data: params });
}

export function logout(): Promise<null> {
  return request<null>({ url: '/admin/logout', method: 'POST' });
}

/** 会话查询：后台启动 / 路由守卫校验登录态 */
export function getSession(): Promise<{ phone: string }> {
  return request<{ phone: string }>({ url: '/admin/session', method: 'GET' });
}
