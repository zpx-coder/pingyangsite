// 新闻发布/下线 DTO 校验规则单元测试：状态仅允许草稿(0) / 已发布(1)
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { StatusNewsDto } from './status-news.dto';

async function errorMessages(data: Record<string, unknown>): Promise<string[]> {
  const errors = await validate(plainToInstance(StatusNewsDto, data));
  return errors.flatMap((error) => Object.values(error.constraints ?? {}));
}

describe('StatusNewsDto', () => {
  it('0 与 1 均合法', async () => {
    expect(await errorMessages({ status: 0 })).toEqual([]);
    expect(await errorMessages({ status: 1 })).toEqual([]);
  });

  it('非法取值与缺失均报错', async () => {
    expect(await errorMessages({ status: 2 })).toContain('状态取值无效');
    expect(await errorMessages({ status: '1' })).toContain('状态取值无效');
    expect(await errorMessages({})).toContain('状态取值无效');
  });
});
