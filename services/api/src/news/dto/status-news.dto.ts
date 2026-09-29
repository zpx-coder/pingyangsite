// 新闻发布/下线入参（PRD §7.4.1）：草稿(0) ↔ 已发布(1)
import { IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class StatusNewsDto {
  @ApiProperty({ description: '状态：0 草稿，1 已发布', example: 1 })
  @IsIn([0, 1], { message: '状态取值无效' })
  status!: number;
}
