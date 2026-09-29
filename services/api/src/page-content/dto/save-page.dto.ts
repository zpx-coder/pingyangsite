// 页面内容保存入参（PRD §7.4.2）：key 走路径参数，config 为完整配置对象
import { IsObject } from 'class-validator';

export class SavePageDto {
  @IsObject({ message: '配置内容格式不正确' })
  config!: Record<string, unknown>;
}
