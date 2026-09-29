// 新闻列表查询入参（PRD §7.4.1：按标题关键词、状态筛选，后台 20/页）
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, MaxLength, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class QueryNewsDto {
  @ApiPropertyOptional({ description: '页码，默认 1', example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: '页码须为整数' })
  @Min(1, { message: '页码最小为 1' })
  page?: number;

  @ApiPropertyOptional({ description: '每页条数，默认 20，最大 100', example: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: '每页条数须为整数' })
  @Min(1, { message: '每页至少 1 条' })
  @Max(100, { message: '每页最多 100 条' })
  pageSize?: number;

  @ApiPropertyOptional({ description: '状态筛选：0 草稿，1 已发布', example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsIn([0, 1], { message: '状态取值无效' })
  status?: number;

  @ApiPropertyOptional({ description: '标题关键词筛选', example: '平阳' })
  @IsOptional()
  @MaxLength(100, { message: '关键词过长' })
  keyword?: string;
}
