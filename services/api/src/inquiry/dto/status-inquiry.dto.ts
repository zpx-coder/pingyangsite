// 询盘状态流转入参（PRD §7.5：标记已处理/未处理）
import { IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class StatusInquiryDto {
  @ApiProperty({ description: '状态：0 未处理，1 已处理', example: 1 })
  @IsIn([0, 1], { message: '状态取值无效' })
  status!: number;
}
