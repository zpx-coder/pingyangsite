// 类目新增 DTO 校验单元测试（任务 1.12）：服务端独立校验，覆盖每条规则至少一个非法样例
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateCategoryDto } from './create-category.dto';

async function errorMessages(data: Record<string, unknown>): Promise<string[]> {
  const errors = await validate(plainToInstance(CreateCategoryDto, data));
  return errors.flatMap((error) => Object.values(error.constraints ?? {}));
}

describe('CreateCategoryDto', () => {
  it('合法样例通过（英文留空允许自动翻译）', async () => {
    expect(await errorMessages({ nameZh: '机械设备', nameEn: 'Machinery', iconUrl: '/a.png' })).toEqual([]);
  });

  it('类目名称必填且不超过 200 字', async () => {
    expect(await errorMessages({})).toContain('类目名称不能为空');
    expect(await errorMessages({ nameZh: 'x'.repeat(201) })).toContain('类目名称不能超过 200 字');
  });

  it('英文名称不超过 200 字符', async () => {
    expect(await errorMessages({ nameZh: '类目', nameEn: 'x'.repeat(201) })).toContain(
      '英文名称不能超过 200 字符',
    );
  });

  it('图标地址不超过 255 字符', async () => {
    expect(await errorMessages({ nameZh: '类目', iconUrl: 'x'.repeat(256) })).toContain('图标地址过长');
  });

  it('中英文简介分别不超过 500 字/字符', async () => {
    expect(await errorMessages({ nameZh: '类目', introZh: 'x'.repeat(501) })).toContain(
      '类目简介不能超过 500 字',
    );
    expect(await errorMessages({ nameZh: '类目', introEn: 'x'.repeat(501) })).toContain(
      '英文简介不能超过 500 字符',
    );
  });

  it('排序值须为 ≥0 整数', async () => {
    expect(await errorMessages({ nameZh: '类目', sort: 1.5 })).toContain('排序值须为整数');
    expect(await errorMessages({ nameZh: '类目', sort: -1 })).toContain('排序值不能为负数');
  });

  it('状态仅允许 0/1', async () => {
    expect(await errorMessages({ nameZh: '类目', status: 2 })).toContain('状态取值无效');
  });
});
