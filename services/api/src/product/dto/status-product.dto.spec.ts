// 产品状态流转 DTO 校验单元测试（任务 1.12）：状态仅允许 0（草稿）/1（已发布）/2（已下架）
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { StatusProductDto } from './status-product.dto';

async function errorMessages(data: Record<string, unknown>): Promise<string[]> {
  const errors = await validate(plainToInstance(StatusProductDto, data));
  return errors.flatMap((error) => Object.values(error.constraints ?? {}));
}

describe('StatusProductDto', () => {
  it('三种合法状态均通过', async () => {
    for (const status of [0, 1, 2]) {
      expect(await errorMessages({ status })).toEqual([]);
    }
  });

  it('状态缺失 → 状态取值无效', async () => {
    expect(await errorMessages({})).toContain('状态取值无效');
  });

  it('状态越界 → 状态取值无效', async () => {
    expect(await errorMessages({ status: 3 })).toContain('状态取值无效');
  });
});
