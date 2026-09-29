// 产品批量操作 DTO 校验单元测试（任务 1.12）：ids 数组约束与 action 白名单
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { BATCH_ACTIONS, BatchProductDto } from './batch-product.dto';

async function errorMessages(data: Record<string, unknown>): Promise<string[]> {
  const errors = await validate(plainToInstance(BatchProductDto, data));
  return errors.flatMap((error) => Object.values(error.constraints ?? {}));
}

describe('BatchProductDto', () => {
  it('三种合法操作均通过', async () => {
    for (const action of BATCH_ACTIONS) {
      expect(await errorMessages({ ids: [1, 2], action })).toEqual([]);
    }
  });

  it('ids 须为数组且至少 1 个、最多 100 个', async () => {
    expect(await errorMessages({ ids: 'x', action: 'delete' })).toContain('产品 ID 列表格式不正确');
    expect(await errorMessages({ ids: [], action: 'delete' })).toContain('请选择要操作的产品');
    const ids = Array.from({ length: 101 }, (_, i) => i + 1);
    expect(await errorMessages({ ids, action: 'delete' })).toContain('单次最多操作 100 条');
  });

  it('ids 元素须为整数', async () => {
    expect(await errorMessages({ ids: ['a'], action: 'delete' })).toContain('产品 ID 须为整数');
  });

  it('action 白名单之外（含缺失）→ 操作类型无效', async () => {
    expect(await errorMessages({ ids: [1], action: 'x' })).toContain('操作类型无效');
    expect(await errorMessages({ ids: [1] })).toContain('操作类型无效');
  });
});
