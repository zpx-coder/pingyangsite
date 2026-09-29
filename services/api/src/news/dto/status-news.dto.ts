// 新闻发布/下线入参（PRD §7.4.1）：草稿(0) ↔ 已发布(1)
import { IsIn } from 'class-validator';

export class StatusNewsDto {
  @IsIn([0, 1], { message: '状态取值无效' })
  status!: number;
}
