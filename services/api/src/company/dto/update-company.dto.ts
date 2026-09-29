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

export class UpdateCompanyDto {
  @IsOptional()
  @MaxLength(200, { message: '企业名称不能超过 200 字' })
  nameZh?: string;

  @IsOptional()
  @MaxLength(200, { message: '英文名称不能超过 200 字符' })
  nameEn?: string;

  @IsOptional()
  @MaxLength(255, { message: 'Logo 地址过长' })
  logoUrl?: string;

  @IsOptional()
  @MaxLength(255, { message: '封面图地址过长' })
  coverUrl?: string;

  @IsOptional()
  @IsArray({ message: '所属类目格式不正确' })
  @ArrayMinSize(1, { message: '至少选择 1 个类目' })
  @IsInt({ each: true, message: '类目 ID 须为整数' })
  categoryIds?: number[];

  @IsOptional()
  @IsInt({ message: '成立年份须为整数' })
  @Min(1900, { message: '成立年份不能早于 1900' })
  @Max(2100, { message: '成立年份不能晚于 2100' })
  foundedYear?: number;

  @IsOptional()
  @MaxLength(100, { message: '员工规模不能超过 100 字' })
  scale?: string;

  @IsOptional()
  @MaxLength(500, { message: '地址不能超过 500 字' })
  address?: string;

  @IsOptional()
  @MaxLength(100, { message: '联系人不能超过 100 字' })
  contactName?: string;

  @IsOptional()
  @MaxLength(50, { message: '联系电话不能超过 50 字' })
  phone?: string;

  @IsOptional()
  @IsEmail({}, { message: '邮箱格式不正确' })
  @MaxLength(255, { message: '邮箱不能超过 255 字符' })
  email?: string;

  @IsOptional()
  @IsUrl({ require_protocol: true }, { message: '官网链接格式不正确（需含 http/https）' })
  @MaxLength(255, { message: '官网链接过长' })
  website?: string;

  @IsOptional()
  @MaxLength(10000, { message: '企业简介过长' })
  introZh?: string;

  @IsOptional()
  @MaxLength(10000, { message: '英文简介过长' })
  introEn?: string;

  @IsOptional()
  @IsArray({ message: '荣誉资质格式不正确' })
  @ArrayMaxSize(10, { message: '荣誉资质最多 10 张' })
  @IsUrl({ require_protocol: true }, { each: true, message: '荣誉资质图片地址格式不正确' })
  honorImages?: string[];

  @IsOptional()
  @IsInt({ message: '排序值须为整数' })
  @Min(0, { message: '排序值不能为负数' })
  sort?: number;

  @IsOptional()
  @IsIn([0, 1], { message: '状态取值无效' })
  status?: number;
}
