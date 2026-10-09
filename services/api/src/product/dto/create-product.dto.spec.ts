// 产品新增 DTO 校验单元测试（任务 1.12）：服务端独立校验，覆盖每条规则至少一个非法样例
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateProductDto } from './create-product.dto';

async function errorMessages(data: Record<string, unknown>): Promise<string[]> {
  const errors = await validate(plainToInstance(CreateProductDto, data));
  return errors.flatMap((error) => Object.values(error.constraints ?? {}));
}

const VALID = {
  nameZh: '产品',
  categoryId: 1,
  mainImage: 'https://a.example.com/m.png',
  detailZh: '详情',
};

describe('CreateProductDto', () => {
  it('合法样例通过', async () => {
    expect(await errorMessages(VALID)).toEqual([]);
  });

  it('产品名称必填且不超过 200 字', async () => {
    expect(await errorMessages({ ...VALID, nameZh: '' })).toContain('产品名称不能为空');
    expect(await errorMessages({ ...VALID, nameZh: 'x'.repeat(201) })).toContain(
      '产品名称不能超过 200 字',
    );
  });

  it('英文名称不超过 200 字符', async () => {
    expect(await errorMessages({ ...VALID, nameEn: 'x'.repeat(201) })).toContain(
      '英文名称不能超过 200 字符',
    );
  });

  it('所属类目 ID 必填且须为整数', async () => {
    expect(await errorMessages({ ...VALID, categoryId: undefined })).toContain(
      '所属类目 ID 须为整数',
    );
    expect(await errorMessages({ ...VALID, categoryId: 'x' })).toContain('所属类目 ID 须为整数');
  });

  it('关联企业 ID 须为 ≥1 整数', async () => {
    expect(await errorMessages({ ...VALID, companyId: 1.5 })).toContain('关联企业 ID 须为整数');
    expect(await errorMessages({ ...VALID, companyId: 0 })).toContain('关联企业 ID 无效');
  });

  it('主图必填、须为绝对 URL 或站内相对路径且不超过 255 字符', async () => {
    expect(await errorMessages({ ...VALID, mainImage: '' })).toContain('请上传产品主图');
    expect(await errorMessages({ ...VALID, mainImage: 'abc' })).toContain('主图地址格式不正确');
    // 演示数据主图使用站内相对路径（/img/*.jpg），须通过校验（缺陷修复）
    expect(await errorMessages({ ...VALID, mainImage: '/img/p1.jpg' })).toEqual([]);
    expect(await errorMessages({ ...VALID, mainImage: 'example.com/a.jpg' })).toContain(
      '主图地址格式不正确',
    );
    expect(await errorMessages({ ...VALID, mainImage: '//cdn.example.com/a.jpg' })).toContain(
      '主图地址格式不正确',
    );
    expect(await errorMessages({ ...VALID, mainImage: `https://${'x'.repeat(250)}.com` })).toContain(
      '主图地址过长',
    );
  });

  it('产品图集：数组、最多 10 张、元素须为图片地址', async () => {
    const urls = Array.from({ length: 11 }, (_, i) => `https://a.example.com/${i}.jpg`);
    expect(await errorMessages({ ...VALID, images: 'x' })).toContain('产品图集格式不正确');
    expect(await errorMessages({ ...VALID, images: urls })).toContain('产品图集最多 10 张');
    expect(await errorMessages({ ...VALID, images: ['abc'] })).toContain(
      '产品图集图片地址格式不正确',
    );
    // 演示数据图集使用站内相对路径，须通过校验；裸域名与协议相对地址仍拒绝
    expect(await errorMessages({ ...VALID, images: ['/img/p1.jpg'] })).toEqual([]);
    expect(await errorMessages({ ...VALID, images: ['example.com/a.jpg'] })).toContain(
      '产品图集图片地址格式不正确',
    );
  });

  it('中英文简介分别不超过 200 字/字符', async () => {
    expect(await errorMessages({ ...VALID, introZh: 'x'.repeat(201) })).toContain(
      '产品简介不能超过 200 字',
    );
    expect(await errorMessages({ ...VALID, introEn: 'x'.repeat(201) })).toContain(
      '英文简介不能超过 200 字符',
    );
  });

  it('产品详情必填且不超过 15000 字', async () => {
    expect(await errorMessages({ ...VALID, detailZh: '' })).toContain('产品详情不能为空');
    expect(await errorMessages({ ...VALID, detailZh: 'x'.repeat(15001) })).toContain(
      '产品详情不能超过 15000 字',
    );
    expect(await errorMessages({ ...VALID, detailEn: 'x'.repeat(15001) })).toContain(
      '英文详情不能超过 15000 字',
    );
  });

  it('参考价格与起订量不超过 100 字', async () => {
    expect(await errorMessages({ ...VALID, priceRef: 'x'.repeat(101) })).toContain(
      '参考价格不能超过 100 字',
    );
    expect(await errorMessages({ ...VALID, moq: 'x'.repeat(101) })).toContain('起订量不能超过 100 字');
  });

  it('排序值与状态（0/1/2）', async () => {
    expect(await errorMessages({ ...VALID, sort: 1.5 })).toContain('排序值须为整数');
    expect(await errorMessages({ ...VALID, sort: -1 })).toContain('排序值不能为负数');
    expect(await errorMessages({ ...VALID, status: 3 })).toContain('状态取值无效');
  });
});
