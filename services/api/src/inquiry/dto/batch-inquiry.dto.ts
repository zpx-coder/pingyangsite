// 询盘批量操作入参（PRD §7.5 列表页批量操作）：批量标记已处理 / 未处理
import { ArrayMaxSize, ArrayMinSize, IsArray, IsIn, IsInt } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export const BATCH_ACTIONS = ['process', 'unprocess'] as const;

export class BatchInquiryDto {
  @ApiProperty({ description: '询盘 ID 列表（1–100 条）', example: [1, 2, 3] })
  @IsArray({ message: '询盘 ID 列表格式不正确' })
  @ArrayMinSize(1, { message: '请选择要操作的询盘' })
  @ArrayMaxSize(100, { message: '单次最多操作 100 条' })
  @IsInt({ each: true, message: '询盘 ID 须为整数' })
  ids!: number[];

  @ApiProperty({ description: '操作类型：process 标记已处理，unprocess 标记未处理', example: 'process' })
  @IsIn(BATCH_ACTIONS, { message: '操作类型无效' })
  action!: (typeof BATCH_ACTIONS)[number];
}
