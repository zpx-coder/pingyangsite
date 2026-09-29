// 页面内容保存 DTO 校验规则单元测试：config 须为普通对象
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { SavePageDto } from './save-page.dto';

async function errorMessages(data: Record<string, unknown>): Promise<string[]> {
  const errors = await validate(plainToInstance(SavePageDto, data));
  return errors.flatMap((error) => Object.values(error.constraints ?? {}));
}

describe('SavePageDto', () => {
  it('普通对象通过（含空对象）', async () => {
    expect(await errorMessages({ config: {} })).toEqual([]);
    expect(await errorMessages({ config: { titleZh: '关于' } })).toEqual([]);
  });

  it('非对象取值均报错', async () => {
    expect(await errorMessages({})).toContain('配置内容格式不正确');
    expect(await errorMessages({ config: null })).toContain('配置内容格式不正确');
    expect(await errorMessages({ config: 'x' })).toContain('配置内容格式不正确');
    expect(await errorMessages({ config: 1 })).toContain('配置内容格式不正确');
    expect(await errorMessages({ config: [1, 2] })).toContain('配置内容格式不正确');
  });
});
