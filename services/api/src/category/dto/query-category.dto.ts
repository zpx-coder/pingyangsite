// 类目列表查询入参（后台分页 20/页，计划 §5.2）
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, MaxLength, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class QueryCategoryDto {
  @ApiPropertyOptional({ description: '页码（从 1 开始）', example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: '页码须为整数' })
  @Min(1, { message: '页码最小为 1' })
  page?: number;

  @ApiPropertyOptional({ description: '每页条数（1–100）', example: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: '每页条数须为整数' })
  @Min(1, { message: '每页至少 1 条' })
  @Max(100, { message: '每页最多 100 条' })
  pageSize?: number;

  @ApiPropertyOptional({ description: '状态筛选：0 下架，1 上架', example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsIn([0, 1], { message: '状态取值无效' })
  status?: number;

  @ApiPropertyOptional({ description: '名称关键词（模糊匹配）', example: '宠物' })
  @IsOptional()
  @MaxLength(100, { message: '关键词过长' })
  keyword?: string;
}
