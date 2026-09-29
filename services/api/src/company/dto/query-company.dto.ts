// 企业列表查询入参（PRD §7.2：按名称/类目/状态筛选，后台 20/页）
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, MaxLength, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class QueryCompanyDto {
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

  @ApiPropertyOptional({ description: '类目 ID 筛选', example: 3 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: '类目 ID 须为整数' })
  categoryId?: number;

  @ApiPropertyOptional({ description: '企业名称关键词（模糊匹配）', example: '宠物' })
  @IsOptional()
  @MaxLength(100, { message: '关键词过长' })
  keyword?: string;
}
