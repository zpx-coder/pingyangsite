// 询盘状态流转入参（PRD §7.5：标记已处理/未处理）
import { IsIn } from 'class-validator';

export class StatusInquiryDto {
  @IsIn([0, 1], { message: '状态取值无效' })
  status!: number;
}
