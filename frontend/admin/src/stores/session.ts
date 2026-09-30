// 会话状态（任务 3.1）：单例 reactive 存储 + 会话校验单飞（避免并发路由守卫重复请求）
import { reactive } from 'vue';
import { getSession } from '@/api/auth';

export const sessionState = reactive({
  /** 已登录手机号（脱敏展示用）；空串表示未登录 */
  phone: '',
  /** 是否已完成一次会话校验（防止每次路由都打 /session） */
  checked: false,
});

let checking: Promise<boolean> | null = null;

/** 校验登录态（并发调用共享同一请求）；已校验过则直接返回缓存结果 */
export async function ensureSession(): Promise<boolean> {
  if (sessionState.checked) return sessionState.phone !== '';
  if (!checking) {
    checking = getSession()
      .then((data) => {
        sessionState.phone = data.phone;
        return true;
      })
      .catch(() => {
        sessionState.phone = '';
        return false;
      })
      .finally(() => {
        sessionState.checked = true;
        checking = null;
      });
  }
  return checking;
}

/** 登录成功：记录手机号并标记已校验（后续路由不再打 /session） */
export function markLoggedIn(phone: string): void {
  sessionState.phone = phone;
  sessionState.checked = true;
}

/** 会话失效（退出 / 40100）：清空状态，下次进入受保护路由重新校验 */
export function clearSession(): void {
  sessionState.phone = '';
  sessionState.checked = false;
}
