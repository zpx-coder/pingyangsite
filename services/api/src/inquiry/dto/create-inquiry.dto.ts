// 官网询盘提交入参（PRD §6.4 表单字段与校验规则）：
//   - 姓名/国家地区/邮箱/电话/询盘内容必填，公司名称选填；
//   - 产品 ID 可选；企业归属由服务端依据产品推导，不接受客户端传入；
//   - 验证码一次性，校验不区分大小写。
import { IsEmail, IsIn, IsInt, IsNotEmpty, IsOptional, Length, Matches, MaxLength, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateInquiryDto {
  @ApiProperty({ description: '姓名（2–50 个字符）', example: '张三' })
  @IsNotEmpty({ message: '请输入姓名' })
  @Length(2, 50, { message: '姓名须为 2–50 个字符' })
  name!: string;

  @ApiPropertyOptional({ description: '公司名称（选填）', example: '平阳某某贸易有限公司' })
  @IsOptional()
  @MaxLength(100, { message: '公司名称不能超过 100 个字符' })
  companyName?: string;

  @ApiProperty({ description: '国家/地区', example: '中国' })
  @IsNotEmpty({ message: '请选择国家/地区' })
  @MaxLength(100, { message: '国家/地区不能超过 100 个字符' })
  country!: string;

  @ApiProperty({ description: '邮箱', example: 'buyer@example.com' })
  @IsNotEmpty({ message: '请输入邮箱' })
  @IsEmail({}, { message: '邮箱格式不正确' })
  @MaxLength(255, { message: '邮箱不能超过 255 个字符' })
  email!: string;

  @ApiProperty({ description: '电话/WhatsApp（6–20 位，可含 +、空格、-）', example: '+86 13800138000' })
  @IsNotEmpty({ message: '请输入电话/WhatsApp' })
  @Matches(/^[0-9+\-\s]{6,20}$/, { message: '电话须为 6–20 位数字（可含 +、空格、-）' })
  phone!: string;

  @ApiProperty({ description: '询盘内容（10–2000 个字符）', example: '我想了解贵司产品的报价与起订量。' })
  @IsNotEmpty({ message: '请输入询盘内容' })
  @Length(10, 2000, { message: '询盘内容须为 10–2000 个字符' })
  content!: string;

  @ApiPropertyOptional({ description: '产品 ID（选填）', example: 1 })
  @IsOptional()
  @IsInt({ message: '产品 ID 须为整数' })
  @Min(1, { message: '产品 ID 无效' })
  productId?: number;

  @ApiPropertyOptional({ description: '来源语言：zh-CN 中文，en 英文，默认 zh-CN', example: 'zh-CN' })
  @IsOptional()
  @IsIn(['zh-CN', 'en'], { message: '来源语言取值无效' })
  lang?: string;

  @ApiProperty({ description: '验证码标识（先调验证码接口获取）', example: 'a1b2c3d4e5f6' })
  @IsNotEmpty({ message: '验证码标识不能为空' })
  @MaxLength(64, { message: '验证码标识无效' })
  captchaId!: string;

  @ApiProperty({ description: '验证码（4 位，不区分大小写）', example: 'A3b9' })
  @IsNotEmpty({ message: '请输入验证码' })
  @Length(4, 4, { message: '验证码为 4 个字符' })
  captchaCode!: string;
}
