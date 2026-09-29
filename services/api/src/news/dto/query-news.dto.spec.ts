// 新闻列表查询 DTO 校验规则单元测试：@Type 数字转换 + 取值范围
// reflect-metadata 必须先加载：class-transformer 的 @Type 在装饰期即调用 Reflect.getMetadata
import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { QueryNewsDto } from './query-news.dto';

async function errorMessages(data: Record<string, unknown>): Promise<string[]> {
  const errors = await validate(plainToInstance(QueryNewsDto, data));
  return errors.flatMap((error) => Object.values(error.constraints ?? {}));
}

describe('QueryNewsDto', () => {
  it('空查询与合法样例通过（字符串数字经 @Type 转换）', async () => {
    expect(await errorMessages({})).toEqual([]);
    expect(await errorMessages({ page: '2', pageSize: '10', status: '1', keyword: '阀门' })).toEqual([]);
  });

  it('页码须为整数且最小为 1', async () => {
    expect(await errorMessages({ page: 0 })).toContain('页码最小为 1');
    expect(await errorMessages({ page: 1.5 })).toContain('页码须为整数');
    expect(await errorMessages({ page: 'abc' })).toContain('页码须为整数');
  });

  it('每页条数范围 1–100', async () => {
    expect(await errorMessages({ pageSize: 0 })).toContain('每页至少 1 条');
    expect(await errorMessages({ pageSize: 101 })).toContain('每页最多 100 条');
    expect(await errorMessages({ pageSize: 2.5 })).toContain('每页条数须为整数');
  });

  it('状态取值受限', async () => {
    expect(await errorMessages({ status: 2 })).toContain('状态取值无效');
  });

  it('关键词不超过 100 字', async () => {
    expect(await errorMessages({ keyword: 'x'.repeat(101) })).toContain('关键词过长');
  });
});
