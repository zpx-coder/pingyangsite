// 询盘列表查询入参（PRD §7.5：状态/产品名称/企业名称关键词/提交时间范围筛选，后台 20/页）
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Matches, Max, MaxLength, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class QueryInquiryDto {
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

  @ApiPropertyOptional({ description: '状态筛选：0 未处理，1 已处理', example: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsIn([0, 1], { message: '状态取值无效' })
  status?: number;

  @ApiPropertyOptional({ description: '产品名称/企业名称关键词筛选', example: '平阳' })
  @IsOptional()
  @MaxLength(100, { message: '关键词过长' })
  keyword?: string;

  @ApiPropertyOptional({ description: '提交时间开始日期（YYYY-MM-DD）', example: '2026-09-01' })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: '开始日期格式须为 YYYY-MM-DD' })
  startDate?: string;

  @ApiPropertyOptional({ description: '提交时间结束日期（YYYY-MM-DD）', example: '2026-09-30' })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: '结束日期格式须为 YYYY-MM-DD' })
  endDate?: string;
}
