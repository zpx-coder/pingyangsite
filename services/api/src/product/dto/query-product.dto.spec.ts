// 产品列表查询 DTO 校验单元测试（任务 1.12）：查询串数字经 @Type 转换后校验
// @Type 装饰器依赖 reflect-metadata（应用入口加载，单测须显式引入）
import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { QueryProductDto } from './query-product.dto';

async function errorMessages(data: Record<string, unknown>): Promise<string[]> {
  const errors = await validate(plainToInstance(QueryProductDto, data));
  return errors.flatMap((error) => Object.values(error.constraints ?? {}));
}

describe('QueryProductDto', () => {
  it('空查询合法', async () => {
    expect(await errorMessages({})).toEqual([]);
  });

  it('字符串数字经 @Type 转换后通过', async () => {
    expect(await errorMessages({ page: '2', pageSize: '10', status: '1', categoryId: '3' })).toEqual(
      [],
    );
  });

  it('页码须为整数且最小为 1', async () => {
    expect(await errorMessages({ page: 'abc' })).toContain('页码须为整数');
    expect(await errorMessages({ page: 0 })).toContain('页码最小为 1');
  });

  it('每页条数 1~100 之间', async () => {
    expect(await errorMessages({ pageSize: 0 })).toContain('每页至少 1 条');
    expect(await errorMessages({ pageSize: 101 })).toContain('每页最多 100 条');
  });

  it('状态仅允许 0/1/2', async () => {
    expect(await errorMessages({ status: 3 })).toContain('状态取值无效');
  });

  it('类目 ID 须为整数', async () => {
    expect(await errorMessages({ categoryId: 'abc' })).toContain('类目 ID 须为整数');
  });

  it('关键词不超过 100 字符', async () => {
    expect(await errorMessages({ keyword: 'x'.repeat(101) })).toContain('关键词过长');
  });
});
