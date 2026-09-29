// 产品编辑入参：全部可选，仅更新传入字段；companyId 传 null 表示解除企业关联（PRD §7.1 企业选填）
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsUrl,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateProductDto {
  @ApiPropertyOptional({ description: '产品中文名称', example: '不锈钢宠物碗' })
  @IsOptional()
  @MaxLength(200, { message: '产品名称不能超过 200 字' })
  nameZh?: string;

  @ApiPropertyOptional({ description: '产品英文名称（留空自动翻译）', example: 'Stainless Steel Pet Bowl' })
  @IsOptional()
  @MaxLength(200, { message: '英文名称不能超过 200 字符' })
  nameEn?: string;

  @ApiPropertyOptional({ description: '所属类目 ID', example: 3 })
  @IsOptional()
  @IsInt({ message: '所属类目 ID 须为整数' })
  categoryId?: number;

  /** null = 解除企业关联；正整数 = 关联指定企业 */
  @ApiPropertyOptional({ description: '关联企业 ID（传 null 解除关联）', example: 12 })
  @IsOptional()
  @IsInt({ message: '关联企业 ID 须为整数' })
  @Min(1, { message: '关联企业 ID 无效' })
  companyId?: number | null;

  @ApiPropertyOptional({ description: '产品主图地址', example: 'https://cdn.example.com/pet-bowl.png' })
  @IsOptional()
  @IsUrl({ require_protocol: true }, { message: '主图地址格式不正确' })
  @MaxLength(255, { message: '主图地址过长' })
  mainImage?: string;

  @ApiPropertyOptional({
    description: '产品图集图片地址数组（最多 10 张）',
    type: [String],
    example: ['https://cdn.example.com/pet-bowl-1.png'],
  })
  @IsOptional()
  @IsArray({ message: '产品图集格式不正确' })
  @ArrayMaxSize(10, { message: '产品图集最多 10 张' })
  @IsUrl({ require_protocol: true }, { each: true, message: '产品图集图片地址格式不正确' })
  images?: string[];

  @ApiPropertyOptional({ description: '产品中文简介', example: '304 不锈钢材质，防滑底座设计' })
  @IsOptional()
  @MaxLength(200, { message: '产品简介不能超过 200 字' })
  introZh?: string;

  @ApiPropertyOptional({ description: '产品英文简介（留空自动翻译）', example: '304 stainless steel, non-slip base' })
  @IsOptional()
  @MaxLength(200, { message: '英文简介不能超过 200 字符' })
  introEn?: string;

  @ApiPropertyOptional({ description: '产品中文详情（富文本）', example: '<p>产品详情内容</p>' })
  @IsOptional()
  @MaxLength(15000, { message: '产品详情不能超过 15000 字' })
  detailZh?: string;

  @ApiPropertyOptional({ description: '产品英文详情（留空自动翻译）', example: '<p>Product details</p>' })
  @IsOptional()
  @MaxLength(15000, { message: '英文详情不能超过 15000 字' })
  detailEn?: string;

  @ApiPropertyOptional({ description: '参考价格', example: '10.00-15.00 元/件' })
  @IsOptional()
  @MaxLength(100, { message: '参考价格不能超过 100 字' })
  priceRef?: string;

  @ApiPropertyOptional({ description: '最小起订量', example: '500 件' })
  @IsOptional()
  @MaxLength(100, { message: '起订量不能超过 100 字' })
  moq?: string;

  @ApiPropertyOptional({ description: '排序值（升序，数值越小越靠前）', example: 1 })
  @IsOptional()
  @IsInt({ message: '排序值须为整数' })
  @Min(0, { message: '排序值不能为负数' })
  sort?: number;

  @ApiPropertyOptional({ description: '状态：0 草稿，1 已发布，2 已下架', example: 1 })
  @IsOptional()
  @IsIn([0, 1, 2], { message: '状态取值无效' })
  status?: number;
}
