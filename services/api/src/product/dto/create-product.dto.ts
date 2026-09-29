// 产品新增入参（PRD §7.1）：主图必填、类目单选必填（上架类目）、企业选填、
// 英文留空自动翻译、状态默认草稿(0)；产品详情 ≤15000 字防 TEXT 列溢出
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsUrl,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProductDto {
  @ApiProperty({ description: '产品中文名称', example: '不锈钢宠物碗' })
  @IsNotEmpty({ message: '产品名称不能为空' })
  @MaxLength(200, { message: '产品名称不能超过 200 字' })
  nameZh!: string;

  @ApiPropertyOptional({ description: '产品英文名称（留空自动翻译）', example: 'Stainless Steel Pet Bowl' })
  @IsOptional()
  @MaxLength(200, { message: '英文名称不能超过 200 字符' })
  nameEn?: string;

  @ApiProperty({ description: '所属类目 ID（须为上架类目）', example: 3 })
  @IsInt({ message: '所属类目 ID 须为整数' })
  categoryId!: number;

  @ApiPropertyOptional({ description: '关联企业 ID', example: 12 })
  @IsOptional()
  @IsInt({ message: '关联企业 ID 须为整数' })
  @Min(1, { message: '关联企业 ID 无效' })
  companyId?: number;

  @ApiProperty({ description: '产品主图地址', example: 'https://cdn.example.com/pet-bowl.png' })
  @IsNotEmpty({ message: '请上传产品主图' })
  @IsUrl({ require_protocol: true }, { message: '主图地址格式不正确' })
  @MaxLength(255, { message: '主图地址过长' })
  mainImage!: string;

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

  @ApiProperty({ description: '产品中文详情（富文本）', example: '<p>产品详情内容</p>' })
  @IsNotEmpty({ message: '产品详情不能为空' })
  @MaxLength(15000, { message: '产品详情不能超过 15000 字' })
  detailZh!: string;

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

  @ApiPropertyOptional({ description: '状态：0 草稿，1 已发布，2 已下架（缺省默认 0）', example: 0 })
  @IsOptional()
  @IsIn([0, 1, 2], { message: '状态取值无效' })
  status?: number;
}
