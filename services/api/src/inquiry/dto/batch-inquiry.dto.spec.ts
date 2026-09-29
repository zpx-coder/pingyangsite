// 询盘批量操作 DTO 校验规则单元测试：ID 列表 1–100 条且均为整数，操作类型受限
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { BatchInquiryDto } from './batch-inquiry.dto';

async function errorMessages(data: Record<string, unknown>): Promise<string[]> {
  const errors = await validate(plainToInstance(BatchInquiryDto, data));
  return errors.flatMap((error) => Object.values(error.constraints ?? {}));
}

describe('BatchInquiryDto', () => {
  it('合法样例通过（两种操作类型）', async () => {
    expect(await errorMessages({ ids: [1, 2, 3], action: 'process' })).toEqual([]);
    expect(await errorMessages({ ids: [1], action: 'unprocess' })).toEqual([]);
  });

  it('ids 必须为数组', async () => {
    expect(await errorMessages({ ids: '1,2', action: 'process' })).toContain('询盘 ID 列表格式不正确');
  });

  it('ids 至少 1 条、最多 100 条', async () => {
    expect(await errorMessages({ ids: [], action: 'process' })).toContain('请选择要操作的询盘');
    const many = Array.from({ length: 101 }, (_, i) => i + 1);
    expect(await errorMessages({ ids: many, action: 'process' })).toContain('单次最多操作 100 条');
    // 100 条为合法上限
    expect(await errorMessages({ ids: many.slice(0, 100), action: 'process' })).toEqual([]);
  });

  it('ids 每个元素须为整数', async () => {
    expect(await errorMessages({ ids: [1, 'a'], action: 'process' })).toContain('询盘 ID 须为整数');
    expect(await errorMessages({ ids: [1.5], action: 'process' })).toContain('询盘 ID 须为整数');
  });

  it('操作类型受限', async () => {
    expect(await errorMessages({ ids: [1], action: 'delete' })).toContain('操作类型无效');
    expect(await errorMessages({ ids: [1] })).toContain('操作类型无效');
  });
});
