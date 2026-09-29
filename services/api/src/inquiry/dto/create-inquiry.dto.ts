// 官网询盘提交入参（PRD §6.4 表单字段与校验规则）：
//   - 姓名/国家地区/邮箱/电话/询盘内容必填，公司名称选填；
//   - 产品 ID 可选；企业归属由服务端依据产品推导，不接受客户端传入；
//   - 验证码一次性，校验不区分大小写。
import { IsEmail, IsIn, IsInt, IsNotEmpty, IsOptional, Length, Matches, MaxLength, Min } from 'class-validator';

export class CreateInquiryDto {
  @IsNotEmpty({ message: '请输入姓名' })
  @Length(2, 50, { message: '姓名须为 2–50 个字符' })
  name!: string;

  @IsOptional()
  @MaxLength(100, { message: '公司名称不能超过 100 个字符' })
  companyName?: string;

  @IsNotEmpty({ message: '请选择国家/地区' })
  @MaxLength(100, { message: '国家/地区不能超过 100 个字符' })
  country!: string;

  @IsNotEmpty({ message: '请输入邮箱' })
  @IsEmail({}, { message: '邮箱格式不正确' })
  @MaxLength(255, { message: '邮箱不能超过 255 个字符' })
  email!: string;

  @IsNotEmpty({ message: '请输入电话/WhatsApp' })
  @Matches(/^[0-9+\-\s]{6,20}$/, { message: '电话须为 6–20 位数字（可含 +、空格、-）' })
  phone!: string;

  @IsNotEmpty({ message: '请输入询盘内容' })
  @Length(10, 2000, { message: '询盘内容须为 10–2000 个字符' })
  content!: string;

  @IsOptional()
  @IsInt({ message: '产品 ID 须为整数' })
  @Min(1, { message: '产品 ID 无效' })
  productId?: number;

  @IsOptional()
  @IsIn(['zh-CN', 'en'], { message: '来源语言取值无效' })
  lang?: string;

  @IsNotEmpty({ message: '验证码标识不能为空' })
  @MaxLength(64, { message: '验证码标识无效' })
  captchaId!: string;

  @IsNotEmpty({ message: '请输入验证码' })
  @Length(4, 4, { message: '验证码为 4 个字符' })
  captchaCode!: string;
}
