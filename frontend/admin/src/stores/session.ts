// 会话状态（任务 3.1/3.3）：单例 reactive 存储 + 会话校验单飞（避免并发路由守卫重复请求）
import { reactive } from 'vue';
import { getSession } from '@/api/auth';
import { ApiError } from '@/api/http';

export const sessionState = reactive({
  /** 已登录手机号（脱敏展示用）；空串表示未登录 */
  phone: '',
  /** 是否已完成一次会话校验（防止每次路由都打 /session） */
  checked: false,
});

/** 会话校验结果：expired 区分「会话已过期」（40100）与网络异常等其它失败 */
export interface SessionCheck {
  ok: boolean;
  expired: boolean;
}

let checking: Promise<SessionCheck> | null = null;

// 会话 Cookie（pysid）为 HttpOnly，JS 不可读。
// 种一枚非 HttpOnly 伴随标记（与后端 8h 对齐），用于区分「首次访问」与「登录过但会话已过期」
// ——两者后端 /session 均返回 40100，前者不该弹「会话已过期」
const SESSION_MARKER = 'pysid_present';
const MARKER_MAX_AGE_SECONDS = 8 * 60 * 60;

function setMarker(): void {
  document.cookie = `${SESSION_MARKER}=1; path=/; max-age=${MARKER_MAX_AGE_SECONDS}; SameSite=Lax`;
}
function removeMarker(): void {
  document.cookie = `${SESSION_MARKER}=1; path=/; max-age=0; SameSite=Lax`;
}
function hasMarker(): boolean {
  return document.cookie.split(';').some((item) => item.trim().startsWith(`${SESSION_MARKER}=`));
}

/** 校验登录态（并发调用共享同一请求）；已校验过则直接返回缓存结果 */
export async function ensureSession(): Promise<SessionCheck> {
  if (sessionState.checked) return { ok: sessionState.phone !== '', expired: false };
  if (!checking) {
    checking = getSession()
      .then((data) => {
        sessionState.phone = data.phone;
        setMarker(); // 服务端会话有效则补种标记（标记丢失但会话存续时自愈）
        return { ok: true, expired: false };
      })
      .catch((error: unknown) => {
        sessionState.phone = '';
        const unauthorized = error instanceof ApiError && error.code === 40100;
        return { ok: false, expired: unauthorized && hasMarker() };
      })
      .finally(() => {
        sessionState.checked = true;
        checking = null;
      });
  }
  return checking;
}

/** 登录成功：记录手机号并标记已校验（后续路由不再打 /session），种会话标记 */
export function markLoggedIn(phone: string): void {
  sessionState.phone = phone;
  sessionState.checked = true;
  setMarker();
}

/** 会话失效（退出 / 40100）：清空状态与标记，下次进入受保护路由重新校验 */
export function clearSession(): void {
  sessionState.phone = '';
  sessionState.checked = false;
  removeMarker();
}
