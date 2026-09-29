// 企业编辑 DTO 校验单元测试（任务 1.12）：全部字段可选，仅校验传入值
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UpdateCompanyDto } from './update-company.dto';

async function errorMessages(data: Record<string, unknown>): Promise<string[]> {
  const errors = await validate(plainToInstance(UpdateCompanyDto, data));
  return errors.flatMap((error) => Object.values(error.constraints ?? {}));
}

describe('UpdateCompanyDto', () => {
  it('空对象合法（仅更新传入字段）', async () => {
    expect(await errorMessages({})).toEqual([]);
  });

  it('合法样例通过（categoryIds 传入即整体替换）', async () => {
    expect(
      await errorMessages({
        nameZh: '企业',
        logoUrl: '/l.png',
        categoryIds: [1, 2],
        foundedYear: 2020,
        email: 'a@b.com',
        website: 'https://a.com',
      }),
    ).toEqual([]);
  });

  it('文本字段长度限制', async () => {
    expect(await errorMessages({ nameZh: 'x'.repeat(201) })).toContain('企业名称不能超过 200 字');
    expect(await errorMessages({ nameEn: 'x'.repeat(201) })).toContain('英文名称不能超过 200 字符');
    expect(await errorMessages({ logoUrl: 'x'.repeat(256) })).toContain('Logo 地址过长');
    expect(await errorMessages({ introZh: 'x'.repeat(10001) })).toContain('企业简介过长');
    expect(await errorMessages({ introEn: 'x'.repeat(10001) })).toContain('英文简介过长');
  });

  it('类目数组校验', async () => {
    expect(await errorMessages({ categoryIds: 'x' })).toContain('所属类目格式不正确');
    expect(await errorMessages({ categoryIds: [] })).toContain('至少选择 1 个类目');
    expect(await errorMessages({ categoryIds: ['a'] })).toContain('类目 ID 须为整数');
  });

  it('成立年份范围', async () => {
    expect(await errorMessages({ foundedYear: 1899 })).toContain('成立年份不能早于 1900');
    expect(await errorMessages({ foundedYear: 2101 })).toContain('成立年份不能晚于 2100');
  });

  it('邮箱/官网/荣誉资质格式', async () => {
    expect(await errorMessages({ email: 'x' })).toContain('邮箱格式不正确');
    expect(await errorMessages({ website: 'abc' })).toContain('官网链接格式不正确（需含 http/https）');
    const urls = Array.from({ length: 11 }, (_, i) => `https://a.example.com/${i}.jpg`);
    expect(await errorMessages({ honorImages: urls })).toContain('荣誉资质最多 10 张');
    expect(await errorMessages({ honorImages: ['abc'] })).toContain('荣誉资质图片地址格式不正确');
  });

  it('排序值与状态', async () => {
    expect(await errorMessages({ sort: 1.5 })).toContain('排序值须为整数');
    expect(await errorMessages({ sort: -1 })).toContain('排序值不能为负数');
    expect(await errorMessages({ status: 2 })).toContain('状态取值无效');
  });
});
