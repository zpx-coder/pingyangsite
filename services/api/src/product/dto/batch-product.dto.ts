// 产品批量操作入参（PRD §7.1 列表页批量操作）：批量删除 / 批量上架 / 批量下架
import { ArrayMaxSize, ArrayMinSize, IsArray, IsIn, IsInt } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export const BATCH_ACTIONS = ['delete', 'publish', 'unpublish'] as const;

export class BatchProductDto {
  @ApiProperty({ description: '产品 ID 数组（1–100 条）', type: [Number], example: [1, 2, 3] })
  @IsArray({ message: '产品 ID 列表格式不正确' })
  @ArrayMinSize(1, { message: '请选择要操作的产品' })
  @ArrayMaxSize(100, { message: '单次最多操作 100 条' })
  @IsInt({ each: true, message: '产品 ID 须为整数' })
  ids!: number[];

  @ApiProperty({ description: '操作类型：delete 批量删除，publish 批量上架，unpublish 批量下架', example: 'publish' })
  @IsIn(BATCH_ACTIONS, { message: '操作类型无效' })
  action!: (typeof BATCH_ACTIONS)[number];
}
