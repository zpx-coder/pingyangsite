// 类目编辑 DTO 校验单元测试（任务 1.12）：全部字段可选，仅校验传入值
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UpdateCategoryDto } from './update-category.dto';

async function errorMessages(data: Record<string, unknown>): Promise<string[]> {
  const errors = await validate(plainToInstance(UpdateCategoryDto, data));
  return errors.flatMap((error) => Object.values(error.constraints ?? {}));
}

describe('UpdateCategoryDto', () => {
  it('空对象合法（仅更新传入字段）', async () => {
    expect(await errorMessages({})).toEqual([]);
  });

  it('合法样例通过', async () => {
    expect(
      await errorMessages({ nameZh: '类目', nameEn: 'Category', sort: 1, status: 1 }),
    ).toEqual([]);
  });

  it('中文名超过 200 字', async () => {
    expect(await errorMessages({ nameZh: 'x'.repeat(201) })).toContain('类目名称不能超过 200 字');
  });

  it('英文名超过 200 字符', async () => {
    expect(await errorMessages({ nameEn: 'x'.repeat(201) })).toContain('英文名称不能超过 200 字符');
  });

  it('图标地址过长', async () => {
    expect(await errorMessages({ iconUrl: 'x'.repeat(256) })).toContain('图标地址过长');
  });

  it('简介超长', async () => {
    expect(await errorMessages({ introZh: 'x'.repeat(501) })).toContain('类目简介不能超过 500 字');
    expect(await errorMessages({ introEn: 'x'.repeat(501) })).toContain('英文简介不能超过 500 字符');
  });

  it('排序值非法（小数/负数）', async () => {
    expect(await errorMessages({ sort: 1.5 })).toContain('排序值须为整数');
    expect(await errorMessages({ sort: -1 })).toContain('排序值不能为负数');
  });

  it('状态取值无效', async () => {
    expect(await errorMessages({ status: 2 })).toContain('状态取值无效');
  });
});
