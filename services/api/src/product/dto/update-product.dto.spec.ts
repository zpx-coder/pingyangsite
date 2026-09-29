// 产品编辑 DTO 校验单元测试（任务 1.12）：全部字段可选；companyId 传 null 解除关联
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UpdateProductDto } from './update-product.dto';

async function errorMessages(data: Record<string, unknown>): Promise<string[]> {
  const errors = await validate(plainToInstance(UpdateProductDto, data));
  return errors.flatMap((error) => Object.values(error.constraints ?? {}));
}

describe('UpdateProductDto', () => {
  it('空对象合法（仅更新传入字段）', async () => {
    expect(await errorMessages({})).toEqual([]);
  });

  it('companyId 传 null 合法（解除企业关联）', async () => {
    expect(await errorMessages({ companyId: null })).toEqual([]);
  });

  it('合法样例通过', async () => {
    expect(
      await errorMessages({
        nameZh: '产品',
        categoryId: 1,
        mainImage: 'https://a.example.com/m.png',
        status: 2,
      }),
    ).toEqual([]);
  });

  it('文本字段长度限制', async () => {
    expect(await errorMessages({ nameZh: 'x'.repeat(201) })).toContain('产品名称不能超过 200 字');
    expect(await errorMessages({ nameEn: 'x'.repeat(201) })).toContain('英文名称不能超过 200 字符');
    expect(await errorMessages({ introZh: 'x'.repeat(201) })).toContain('产品简介不能超过 200 字');
    expect(await errorMessages({ detailZh: 'x'.repeat(15001) })).toContain('产品详情不能超过 15000 字');
    expect(await errorMessages({ detailEn: 'x'.repeat(15001) })).toContain('英文详情不能超过 15000 字');
  });

  it('类目与关联企业 ID 校验', async () => {
    expect(await errorMessages({ categoryId: 'x' })).toContain('所属类目 ID 须为整数');
    expect(await errorMessages({ companyId: 0 })).toContain('关联企业 ID 无效');
    expect(await errorMessages({ companyId: 1.5 })).toContain('关联企业 ID 须为整数');
  });

  it('主图与图集校验', async () => {
    expect(await errorMessages({ mainImage: 'abc' })).toContain('主图地址格式不正确');
    const urls = Array.from({ length: 11 }, (_, i) => `https://a.example.com/${i}.jpg`);
    expect(await errorMessages({ images: urls })).toContain('产品图集最多 10 张');
    expect(await errorMessages({ images: ['abc'] })).toContain('产品图集图片地址格式不正确');
  });

  it('排序值与状态（0/1/2）', async () => {
    expect(await errorMessages({ sort: 1.5 })).toContain('排序值须为整数');
    expect(await errorMessages({ sort: -1 })).toContain('排序值不能为负数');
    expect(await errorMessages({ status: 3 })).toContain('状态取值无效');
  });
});
