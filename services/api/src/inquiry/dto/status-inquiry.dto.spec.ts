// 询盘状态流转 DTO 校验规则单元测试：仅允许 0（未处理）/ 1（已处理）
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { StatusInquiryDto } from './status-inquiry.dto';

async function errorMessages(data: Record<string, unknown>): Promise<string[]> {
  const errors = await validate(plainToInstance(StatusInquiryDto, data));
  return errors.flatMap((error) => Object.values(error.constraints ?? {}));
}

describe('StatusInquiryDto', () => {
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
