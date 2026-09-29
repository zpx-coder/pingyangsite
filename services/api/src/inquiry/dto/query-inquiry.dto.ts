// 询盘列表查询入参（PRD §7.5：状态/产品名称/企业名称关键词/提交时间范围筛选，后台 20/页）
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Matches, Max, MaxLength, Min } from 'class-validator';

export class QueryInquiryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: '页码须为整数' })
  @Min(1, { message: '页码最小为 1' })
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: '每页条数须为整数' })
  @Min(1, { message: '每页至少 1 条' })
  @Max(100, { message: '每页最多 100 条' })
  pageSize?: number;

  @IsOptional()
  @Type(() => Number)
  @IsIn([0, 1], { message: '状态取值无效' })
  status?: number;

  @IsOptional()
  @MaxLength(100, { message: '关键词过长' })
  keyword?: string;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: '开始日期格式须为 YYYY-MM-DD' })
  startDate?: string;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: '结束日期格式须为 YYYY-MM-DD' })
  endDate?: string;
}
