// 产品状态流转入参（PRD §7.1）：草稿(0) → 已发布(1) → 已下架(2) →（重新）已发布(1)
import { IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class StatusProductDto {
  @ApiProperty({ description: '目标状态：0 草稿，1 已发布，2 已下架', example: 1 })
  @IsIn([0, 1, 2], { message: '状态取值无效' })
  status!: number;
}
