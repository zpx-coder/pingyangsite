// DTO 校验规则单元测试（PRD §7.0：服务端独立校验）
// 模式：plainToInstance 构造实例（保证 @Type 等转换生效），validate 直接跑 class-validator 规则。
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { LoginDto } from './login.dto';

async function errorMessages(data: Record<string, unknown>): Promise<string[]> {
  const errors = await validate(plainToInstance(LoginDto, data));
  return errors.flatMap((error) => Object.values(error.constraints ?? {}));
}

describe('LoginDto', () => {
  it('合法手机号与密码通过', async () => {
    expect(await errorMessages({ phone: '13800000000', password: 'Admin@123456' })).toEqual([]);
  });

  it('手机号格式不正确', async () => {
    const messages = await errorMessages({ phone: '12345', password: 'Admin@123456' });
    expect(messages).toContain('手机号格式不正确');
  });

  it('密码必填且长度受限', async () => {
    expect(await errorMessages({ phone: '13800000000' })).toContain('请输入密码');
    expect(await errorMessages({ phone: '13800000000', password: 'x'.repeat(129) })).toContain('密码长度超出限制');
  });
});
