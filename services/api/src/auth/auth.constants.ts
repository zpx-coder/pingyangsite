// 认证与会话常量（PRD §7.0）
export const SESSION_COOKIE_NAME = 'pysid';
export const SESSION_MAX_AGE_MS = 8 * 60 * 60 * 1000; // 会话 8 小时过期
export const MAX_LOGIN_FAILURES = 5; // 同一账号连续失败 5 次
export const LOGIN_LOCK_SECONDS = 15 * 60; // 锁定 15 分钟
export const LOGIN_FAILURE_WINDOW_SECONDS = 15 * 60; // 失败计数窗口（与锁定一致）

// Redis key（失败计数 / 锁定标记）
export function loginFailKey(phone: string): string {
  return `admin:login:fail:${phone}`;
}

export function loginLockKey(phone: string): string {
  return `admin:login:lock:${phone}`;
}
