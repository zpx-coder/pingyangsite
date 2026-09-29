// 企业编辑入参：全部可选，仅更新传入字段；categoryIds 传入即整体替换关联
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  IsUrl,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateCompanyDto {
  @ApiPropertyOptional({ description: '企业中文名称', example: '平阳县某某宠物用品有限公司' })
  @IsOptional()
  @MaxLength(200, { message: '企业名称不能超过 200 字' })
  nameZh?: string;

  @ApiPropertyOptional({ description: '企业英文名称（留空自动翻译）', example: 'XX Pet Products Co., Ltd.' })
  @IsOptional()
  @MaxLength(200, { message: '英文名称不能超过 200 字符' })
  nameEn?: string;

  @ApiPropertyOptional({ description: '企业 Logo 地址', example: 'https://cdn.example.com/logo.png' })
  @IsOptional()
  @MaxLength(255, { message: 'Logo 地址过长' })
  logoUrl?: string;

  @ApiPropertyOptional({ description: '企业封面图地址', example: 'https://cdn.example.com/cover.png' })
  @IsOptional()
  @MaxLength(255, { message: '封面图地址过长' })
  coverUrl?: string;

  @ApiPropertyOptional({ description: '所属类目 ID 数组（传入即整体替换，至少 1 个）', type: [Number], example: [1, 3] })
  @IsOptional()
  @IsArray({ message: '所属类目格式不正确' })
  @ArrayMinSize(1, { message: '至少选择 1 个类目' })
  @IsInt({ each: true, message: '类目 ID 须为整数' })
  categoryIds?: number[];

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

  @ApiPropertyOptional({ description: '企业地址', example: '浙江省温州市平阳县' })
  @IsOptional()
  @MaxLength(500, { message: '地址不能超过 500 字' })
  address?: string;

  @ApiPropertyOptional({ description: '联系人姓名', example: '张三' })
  @IsOptional()
  @MaxLength(100, { message: '联系人不能超过 100 字' })
  contactName?: string;

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

  @ApiPropertyOptional({ description: '企业中文简介', example: '专注宠物用品制造 20 年，产品远销欧美' })
  @IsOptional()
  @MaxLength(10000, { message: '企业简介过长' })
  introZh?: string;

  @ApiPropertyOptional({ description: '企业英文简介（留空自动翻译）', example: '20 years of pet supplies manufacturing' })
  @IsOptional()
  @MaxLength(10000, { message: '英文简介过长' })
  introEn?: string;

  @ApiPropertyOptional({
    description: '荣誉资质图片地址数组（最多 10 张）',
    type: [String],
    example: ['https://cdn.example.com/honor-1.png'],
  })
  @IsOptional()
  @IsArray({ message: '荣誉资质格式不正确' })
  @ArrayMaxSize(10, { message: '荣誉资质最多 10 张' })
  @IsUrl({ require_protocol: true }, { each: true, message: '荣誉资质图片地址格式不正确' })
  honorImages?: string[];

  @ApiPropertyOptional({ description: '排序值（升序，数值越小越靠前）', example: 1 })
  @IsOptional()
  @IsInt({ message: '排序值须为整数' })
  @Min(0, { message: '排序值不能为负数' })
  sort?: number;

  @ApiPropertyOptional({ description: '状态：0 下架，1 上架', example: 1 })
  @IsOptional()
  @IsIn([0, 1], { message: '状态取值无效' })
  status?: number;
}
