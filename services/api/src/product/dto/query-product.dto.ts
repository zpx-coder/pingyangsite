// 产品列表查询入参（PRD §7.1：按名称/类目/状态筛选，组合生效，后台 20/页）
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, MaxLength, Min } from 'class-validator';

export class QueryProductDto {
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
  @IsIn([0, 1, 2], { message: '状态取值无效' })
  status?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: '类目 ID 须为整数' })
  categoryId?: number;

  @IsOptional()
  @MaxLength(100, { message: '关键词过长' })
  keyword?: string;
}
