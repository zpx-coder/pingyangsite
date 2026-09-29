// 企业新增 DTO 校验单元测试（任务 1.12）：服务端独立校验，覆盖每条规则至少一个非法样例
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateCompanyDto } from './create-company.dto';

async function errorMessages(data: Record<string, unknown>): Promise<string[]> {
  const errors = await validate(plainToInstance(CreateCompanyDto, data));
  return errors.flatMap((error) => Object.values(error.constraints ?? {}));
}

const VALID = {
  nameZh: '企业',
  logoUrl: 'https://a.example.com/logo.png',
  categoryIds: [1],
  introZh: '简介',
};

describe('CreateCompanyDto', () => {
  it('合法样例通过', async () => {
    expect(await errorMessages(VALID)).toEqual([]);
  });

  it('企业名称必填且不超过 200 字', async () => {
    expect(await errorMessages({ ...VALID, nameZh: '' })).toContain('企业名称不能为空');
    expect(await errorMessages({ ...VALID, nameZh: 'x'.repeat(201) })).toContain(
      '企业名称不能超过 200 字',
    );
  });

  it('英文名称不超过 200 字符', async () => {
    expect(await errorMessages({ ...VALID, nameEn: 'x'.repeat(201) })).toContain(
      '英文名称不能超过 200 字符',
    );
  });

  it('Logo 必填且不超过 255 字符', async () => {
    expect(await errorMessages({ ...VALID, logoUrl: '' })).toContain('请上传企业 Logo');
    expect(await errorMessages({ ...VALID, logoUrl: 'x'.repeat(256) })).toContain('Logo 地址过长');
  });

  it('封面图不超过 255 字符', async () => {
    expect(await errorMessages({ ...VALID, coverUrl: 'x'.repeat(256) })).toContain('封面图地址过长');
  });

  it('类目多选：数组、至少 1 个、元素为整数', async () => {
    expect(await errorMessages({ ...VALID, categoryIds: 'x' })).toContain('所属类目格式不正确');
    expect(await errorMessages({ ...VALID, categoryIds: [] })).toContain('至少选择 1 个类目');
    expect(await errorMessages({ ...VALID, categoryIds: ['a'] })).toContain('类目 ID 须为整数');
  });

  it('成立年份为 1900~2100 整数', async () => {
    expect(await errorMessages({ ...VALID, foundedYear: 2010.5 })).toContain('成立年份须为整数');
    expect(await errorMessages({ ...VALID, foundedYear: 1899 })).toContain('成立年份不能早于 1900');
    expect(await errorMessages({ ...VALID, foundedYear: 2101 })).toContain('成立年份不能晚于 2100');
  });

  it('文本类字段长度限制', async () => {
    expect(await errorMessages({ ...VALID, scale: 'x'.repeat(101) })).toContain('员工规模不能超过 100 字');
    expect(await errorMessages({ ...VALID, address: 'x'.repeat(501) })).toContain('地址不能超过 500 字');
    expect(await errorMessages({ ...VALID, contactName: 'x'.repeat(101) })).toContain(
      '联系人不能超过 100 字',
    );
    expect(await errorMessages({ ...VALID, phone: 'x'.repeat(51) })).toContain('联系电话不能超过 50 字');
  });

  it('邮箱格式与长度', async () => {
    expect(await errorMessages({ ...VALID, email: 'not-an-email' })).toContain('邮箱格式不正确');
    expect(await errorMessages({ ...VALID, email: `${'x'.repeat(250)}@a.com` })).toContain(
      '邮箱不能超过 255 字符',
    );
  });

  it('官网链接须含协议且不超过 255 字符', async () => {
    expect(await errorMessages({ ...VALID, website: 'a.example.com' })).toContain(
      '官网链接格式不正确（需含 http/https）',
    );
    expect(await errorMessages({ ...VALID, website: `https://${'x'.repeat(250)}.com` })).toContain(
      '官网链接过长',
    );
  });

  it('企业简介必填且不超过 10000 字', async () => {
    expect(await errorMessages({ ...VALID, introZh: '' })).toContain('企业简介不能为空');
    expect(await errorMessages({ ...VALID, introZh: 'x'.repeat(10001) })).toContain('企业简介过长');
    expect(await errorMessages({ ...VALID, introEn: 'x'.repeat(10001) })).toContain('英文简介过长');
  });

  it('荣誉资质：数组、最多 10 张、元素须为图片地址', async () => {
    const urls = Array.from({ length: 11 }, (_, i) => `https://a.example.com/${i}.jpg`);
    expect(await errorMessages({ ...VALID, honorImages: 'x' })).toContain('荣誉资质格式不正确');
    expect(await errorMessages({ ...VALID, honorImages: urls })).toContain('荣誉资质最多 10 张');
    expect(await errorMessages({ ...VALID, honorImages: ['abc'] })).toContain(
      '荣誉资质图片地址格式不正确',
    );
  });

  it('排序值与状态', async () => {
    expect(await errorMessages({ ...VALID, sort: 1.5 })).toContain('排序值须为整数');
    expect(await errorMessages({ ...VALID, sort: -1 })).toContain('排序值不能为负数');
    expect(await errorMessages({ ...VALID, status: 2 })).toContain('状态取值无效');
  });
});
