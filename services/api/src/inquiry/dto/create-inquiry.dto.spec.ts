// 官网询盘提交 DTO 校验规则单元测试（PRD §6.4 表单校验）
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateInquiryDto } from './create-inquiry.dto';

async function errorMessages(data: Record<string, unknown>): Promise<string[]> {
  const errors = await validate(plainToInstance(CreateInquiryDto, data));
  return errors.flatMap((error) => Object.values(error.constraints ?? {}));
}

const VALID = {
  name: '张三',
  country: '中国',
  email: 'buyer@example.com',
  phone: '13800138000',
  content: '我想了解产品详情与报价',
  captchaId: 'cid-1',
  captchaCode: 'AB12',
};

describe('CreateInquiryDto', () => {
  it('合法样例通过（含可选字段）', async () => {
    expect(
      await errorMessages({ ...VALID, companyName: '公司', productId: 5, lang: 'zh-CN' }),
    ).toEqual([]);
    expect(await errorMessages({ ...VALID, lang: 'en' })).toEqual([]);
  });

  it('姓名必填且 2–50 个字符', async () => {
    expect(await errorMessages({ ...VALID, name: undefined })).toContain('请输入姓名');
    expect(await errorMessages({ ...VALID, name: '' })).toContain('请输入姓名');
    expect(await errorMessages({ ...VALID, name: '张' })).toContain('姓名须为 2–50 个字符');
    expect(await errorMessages({ ...VALID, name: 'x'.repeat(51) })).toContain('姓名须为 2–50 个字符');
  });

  it('公司名称可选且不超过 100 字符', async () => {
    expect(await errorMessages({ ...VALID, companyName: 'x'.repeat(101) })).toContain(
      '公司名称不能超过 100 个字符',
    );
  });

  it('国家/地区必填且不超过 100 字符', async () => {
    expect(await errorMessages({ ...VALID, country: undefined })).toContain('请选择国家/地区');
    expect(await errorMessages({ ...VALID, country: 'x'.repeat(101) })).toContain(
      '国家/地区不能超过 100 个字符',
    );
  });

  it('邮箱必填、格式与长度校验', async () => {
    expect(await errorMessages({ ...VALID, email: undefined })).toContain('请输入邮箱');
    expect(await errorMessages({ ...VALID, email: 'not-an-email' })).toContain('邮箱格式不正确');
    expect(await errorMessages({ ...VALID, email: `a@${'x'.repeat(250)}.com` })).toContain(
      '邮箱不能超过 255 个字符',
    );
  });

  it('电话必填且为 6–20 位数字（可含 +、空格、-）', async () => {
    expect(await errorMessages({ ...VALID, phone: undefined })).toContain('请输入电话/WhatsApp');
    const phoneMsg = '电话须为 6–20 位数字（可含 +、空格、-）';
    expect(await errorMessages({ ...VALID, phone: 'abc' })).toContain(phoneMsg);
    expect(await errorMessages({ ...VALID, phone: '123' })).toContain(phoneMsg);
    // 合法形态：+86 与空格分隔
    expect(await errorMessages({ ...VALID, phone: '+86 138 0013 8000' })).toEqual([]);
  });

  it('询盘内容必填且 10–2000 个字符', async () => {
    expect(await errorMessages({ ...VALID, content: undefined })).toContain('请输入询盘内容');
    expect(await errorMessages({ ...VALID, content: '太短了' })).toContain('询盘内容须为 10–2000 个字符');
    expect(await errorMessages({ ...VALID, content: 'x'.repeat(2001) })).toContain(
      '询盘内容须为 10–2000 个字符',
    );
  });

  it('产品 ID 可选但须为 ≥1 的整数', async () => {
    expect(await errorMessages({ ...VALID, productId: 0 })).toContain('产品 ID 无效');
    expect(await errorMessages({ ...VALID, productId: 1.5 })).toContain('产品 ID 须为整数');
    expect(await errorMessages({ ...VALID, productId: '5' })).toContain('产品 ID 须为整数');
  });

  it('来源语言取值受限', async () => {
    expect(await errorMessages({ ...VALID, lang: 'fr' })).toContain('来源语言取值无效');
  });

  it('验证码标识必填且不超过 64 字符', async () => {
    expect(await errorMessages({ ...VALID, captchaId: undefined })).toContain('验证码标识不能为空');
    expect(await errorMessages({ ...VALID, captchaId: '' })).toContain('验证码标识不能为空');
    expect(await errorMessages({ ...VALID, captchaId: 'x'.repeat(65) })).toContain('验证码标识无效');
  });

  it('验证码必填且为 4 个字符', async () => {
    expect(await errorMessages({ ...VALID, captchaCode: undefined })).toContain('请输入验证码');
    expect(await errorMessages({ ...VALID, captchaCode: '' })).toContain('请输入验证码');
    expect(await errorMessages({ ...VALID, captchaCode: 'AB1' })).toContain('验证码为 4 个字符');
    expect(await errorMessages({ ...VALID, captchaCode: 'AB123' })).toContain('验证码为 4 个字符');
  });
});
