// 询盘列表查询 DTO 校验规则单元测试：@Type 数字转换 + 日期格式
// reflect-metadata 必须先加载：class-transformer 的 @Type 在装饰期即调用 Reflect.getMetadata
import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { QueryInquiryDto } from './query-inquiry.dto';

async function errorMessages(data: Record<string, unknown>): Promise<string[]> {
  const errors = await validate(plainToInstance(QueryInquiryDto, data));
  return errors.flatMap((error) => Object.values(error.constraints ?? {}));
}

describe('QueryInquiryDto', () => {
  it('空查询与合法样例通过（字符串数字经 @Type 转换）', async () => {
    expect(await errorMessages({})).toEqual([]);
    expect(
      await errorMessages({
        page: '2',
        pageSize: '10',
        status: '1',
        keyword: '球阀',
        startDate: '2026-09-01',
        endDate: '2026-09-30',
      }),
    ).toEqual([]);
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

  it('起止日期须为 YYYY-MM-DD', async () => {
    expect(await errorMessages({ startDate: '2026/09/01' })).toContain('开始日期格式须为 YYYY-MM-DD');
    expect(await errorMessages({ endDate: '2026-9-1' })).toContain('结束日期格式须为 YYYY-MM-DD');
    expect(await errorMessages({ endDate: 'not-a-date' })).toContain('结束日期格式须为 YYYY-MM-DD');
  });
});
