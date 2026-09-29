// 类目编辑入参：全部可选，仅更新传入字段；
// 英文字段传非空值视为人工校对（清除机器翻译标记），留空则自动翻译
import { IsIn, IsInt, IsOptional, MaxLength, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateCategoryDto {
  @ApiPropertyOptional({ description: '类目中文名称', example: '宠物用品' })
  @IsOptional()
  @MaxLength(200, { message: '类目名称不能超过 200 字' })
  nameZh?: string;

  @ApiPropertyOptional({ description: '类目英文名称（留空自动翻译）', example: 'Pet Supplies' })
  @IsOptional()
  @MaxLength(200, { message: '英文名称不能超过 200 字符' })
  nameEn?: string;

  @ApiPropertyOptional({ description: '类目图标地址', example: 'https://cdn.example.com/icons/pet.png' })
  @IsOptional()
  @MaxLength(255, { message: '图标地址过长' })
  iconUrl?: string;

  @ApiPropertyOptional({ description: '类目中文简介', example: '平阳宠物用品产业集群' })
  @IsOptional()
  @MaxLength(500, { message: '类目简介不能超过 500 字' })
  introZh?: string;

  @ApiPropertyOptional({ description: '类目英文简介（留空自动翻译）', example: 'Pingyang pet supplies industry' })
  @IsOptional()
  @MaxLength(500, { message: '英文简介不能超过 500 字符' })
  introEn?: string;

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
