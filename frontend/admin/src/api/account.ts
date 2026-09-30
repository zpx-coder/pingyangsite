// 账号管理接口（PRD §7.6）：修改绑定手机号 / 修改密码（均需当前密码验证，不接短信验证码）
import { request } from './http';

/** 修改绑定手机号：当前密码验证通过后生效，会话内手机号同步（不强制重登） */
export function changePhone(newPhone: string, password: string): Promise<{ phone: string }> {
  return request<{ phone: string }>({
    url: '/admin/account/phone',
    method: 'PUT',
    data: { newPhone, password },
  });
}

/** 修改密码：成功后服务端销毁会话强制重新登录（前端清会话状态并跳登录） */
export function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  return request<void>({
    url: '/admin/account/password',
    method: 'PUT',
    data: { currentPassword, newPassword },
  });
}
