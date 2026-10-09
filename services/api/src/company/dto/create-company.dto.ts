// 企业新增入参（PRD §7.2）：类目多选必填 ≥1；Logo 必填；英文留空自动翻译
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEmail,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsUrl,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IMAGE_URL_PATTERN } from '../../common/image-url.constants';

export class CreateCompanyDto {
  @ApiProperty({ description: '企业中文名称', example: '平阳县某某宠物用品有限公司' })
  @IsNotEmpty({ message: '企业名称不能为空' })
  @MaxLength(200, { message: '企业名称不能超过 200 字' })
  nameZh!: string;

  @ApiPropertyOptional({ description: '企业英文名称（留空自动翻译）', example: 'XX Pet Products Co., Ltd.' })
  @IsOptional()
  @MaxLength(200, { message: '英文名称不能超过 200 字符' })
  nameEn?: string;

  @ApiProperty({ description: '企业 Logo 地址', example: 'https://cdn.example.com/logo.png' })
  @IsNotEmpty({ message: '请上传企业 Logo' })
  @MaxLength(255, { message: 'Logo 地址过长' })
  logoUrl!: string;

  @ApiPropertyOptional({ description: '企业封面图地址', example: 'https://cdn.example.com/cover.png' })
  @IsOptional()
  @MaxLength(255, { message: '封面图地址过长' })
  coverUrl?: string;

  @ApiProperty({ description: '所属类目 ID 数组（至少 1 个）', type: [Number], example: [1, 3] })
  @IsArray({ message: '所属类目格式不正确' })
  @ArrayMinSize(1, { message: '至少选择 1 个类目' })
  @IsInt({ each: true, message: '类目 ID 须为整数' })
  categoryIds!: number[];

  @ApiPropertyOptional({ description: '成立年份（1900–2100）', example: 2008 })
  @IsOptional()
  @IsInt({ message: '成立年份须为整数' })
  @Min(1900, { message: '成立年份不能早于 1900' })
  @Max(2100, { message: '成立年份不能晚于 2100' })
  foundedYear?: number;

  @ApiPropertyOptional({ description: '员工规模', example: '100-500人' })
  @IsOptional()
  @MaxLength(100, { message: '员工规模不能超过 100 字' })
  scale?: string;

  @ApiPropertyOptional({ description: '员工规模（英文，留空自动翻译）', example: '100–500 employees' })
  @IsOptional()
  @MaxLength(100, { message: '员工规模（英文）不能超过 100 字' })
  scaleEn?: string;

  @ApiPropertyOptional({ description: '企业地址', example: '浙江省温州市平阳县' })
  @IsOptional()
  @MaxLength(500, { message: '地址不能超过 500 字' })
  address?: string;

  @ApiPropertyOptional({ description: '企业英文地址（留空自动翻译）', example: 'Pingyang County, Wenzhou, Zhejiang' })
  @IsOptional()
  @MaxLength(500, { message: '英文地址不能超过 500 字' })
  addressEn?: string;

  @ApiPropertyOptional({ description: '联系人姓名', example: '张三' })
  @IsOptional()
  @MaxLength(100, { message: '联系人不能超过 100 字' })
  contactName?: string;

  @ApiPropertyOptional({ description: '联系人英文姓名（留空自动翻译）', example: 'Zhang San' })
  @IsOptional()
  @MaxLength(100, { message: '英文联系人不能超过 100 字' })
  contactNameEn?: string;

  @ApiPropertyOptional({ description: '联系电话', example: '0577-63666666' })
  @IsOptional()
  @MaxLength(50, { message: '联系电话不能超过 50 字' })
  phone?: string;

  @ApiPropertyOptional({ description: '联系邮箱', example: 'contact@example.com' })
  @IsOptional()
  @IsEmail({}, { message: '邮箱格式不正确' })
  @MaxLength(255, { message: '邮箱不能超过 255 字符' })
  email?: string;

  @ApiPropertyOptional({ description: '官网链接（需含 http/https）', example: 'https://www.example.com' })
  @IsOptional()
  @IsUrl({ require_protocol: true }, { message: '官网链接格式不正确（需含 http/https）' })
  @MaxLength(255, { message: '官网链接过长' })
  website?: string;

  @ApiProperty({ description: '企业中文简介', example: '专注宠物用品制造 20 年，产品远销欧美' })
  @IsNotEmpty({ message: '企业简介不能为空' })
  @MaxLength(10000, { message: '企业简介过长' })
  introZh!: string;

  @ApiPropertyOptional({ description: '企业英文简介（留空自动翻译）', example: '20 years of pet supplies manufacturing' })
  @IsOptional()
  @MaxLength(10000, { message: '英文简介过长' })
  introEn?: string;

  @ApiPropertyOptional({
    description: '荣誉资质图片地址数组（最多 10 张，http/https 绝对地址或站内相对路径，如 /img/honor-cert.jpg）',
    type: [String],
    example: ['https://cdn.example.com/honor-1.png'],
  })
  @IsOptional()
  @IsArray({ message: '荣誉资质格式不正确' })
  @ArrayMaxSize(10, { message: '荣誉资质最多 10 张' })
  @Matches(IMAGE_URL_PATTERN, { each: true, message: '荣誉资质图片地址格式不正确' })
  honorImages?: string[];

  @ApiPropertyOptional({ description: '排序值（升序，数值越小越靠前）', example: 1 })
  @IsOptional()
  @IsInt({ message: '排序值须为整数' })
  @Min(0, { message: '排序值不能为负数' })
  sort?: number;

  @ApiPropertyOptional({ description: '状态：0 下架，1 上架（缺省默认 1）', example: 1 })
  @IsOptional()
  @IsIn([0, 1], { message: '状态取值无效' })
  status?: number;
}
