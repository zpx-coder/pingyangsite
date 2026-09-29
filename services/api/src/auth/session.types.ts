// 服务端会话数据（express-session + Redis 存储）
import 'express-session';

declare module 'express-session' {
  interface SessionData {
    /** 已登录管理员 ID（未登录时不存在） */
    adminId?: number;
    /** 已登录管理员手机号（会话内展示与审计用） */
    adminPhone?: string;
  }
}
