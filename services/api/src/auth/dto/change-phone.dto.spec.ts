// 修改手机号 DTO 校验单元测试（PRD §7.0）
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ChangePhoneDto } from './change-phone.dto';

async function errorMessages(data: Record<string, unknown>): Promise<string[]> {
  const errors = await validate(plainToInstance(ChangePhoneDto, data));
  return errors.flatMap((error) => Object.values(error.constraints ?? {}));
}

describe('ChangePhoneDto', () => {
  it('合法入参通过', async () => {
    expect(await errorMessages({ newPhone: '13912345678', password: 'Admin@123456' })).toEqual([]);
  });

  it('新手机号格式校验', async () => {
    for (const bad of ['12345', '23812345678', '139123456789', '1391234567a']) {
      const messages = await errorMessages({ newPhone: bad, password: 'Admin@123456' });
      expect(messages).toContain('新手机号格式不正确');
    }
  });

  it('当前密码必填且长度受限', async () => {
    expect(await errorMessages({ newPhone: '13912345678' })).toContain('请输入当前密码');
    expect(await errorMessages({ newPhone: '13912345678', password: 'x'.repeat(129) })).toContain('密码长度超出限制');
  });
});
