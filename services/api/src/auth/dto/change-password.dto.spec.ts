// 修改密码 DTO 校验单元测试（PRD §7.0：新密码 ≥8 位且含字母与数字）
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ChangePasswordDto } from './change-password.dto';

async function errorMessages(data: Record<string, unknown>): Promise<string[]> {
  const errors = await validate(plainToInstance(ChangePasswordDto, data));
  return errors.flatMap((error) => Object.values(error.constraints ?? {}));
}

describe('ChangePasswordDto', () => {
  it('合法入参通过', async () => {
    expect(await errorMessages({ currentPassword: 'Admin@123456', newPassword: 'NewPass123' })).toEqual([]);
  });

  it('当前密码必填且长度受限', async () => {
    expect(await errorMessages({ newPassword: 'NewPass123' })).toContain('请输入当前密码');
    expect(await errorMessages({ currentPassword: 'x'.repeat(129), newPassword: 'NewPass123' })).toContain(
      '密码长度超出限制',
    );
  });

  it('新密码强度校验：过短/纯字母/纯数字均拒绝', async () => {
    for (const weak of ['Short1', 'allletters', '12345678', '']) {
      const messages = await errorMessages({ currentPassword: 'Admin@123456', newPassword: weak });
      expect(messages).toContain('新密码须为 8–64 位且同时包含字母与数字');
    }
  });

  it('新密码超长拒绝', async () => {
    const messages = await errorMessages({ currentPassword: 'Admin@123456', newPassword: 'Aa1'.padEnd(65, 'x') });
    expect(messages).toContain('新密码须为 8–64 位且同时包含字母与数字');
  });
});
