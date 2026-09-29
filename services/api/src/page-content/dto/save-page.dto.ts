// 页面内容保存入参（PRD §7.4.2）：key 走路径参数，config 为完整配置对象
import { IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SavePageDto {
  @ApiProperty({
    description: '页面完整配置对象（覆盖式保存，官网即时生效）',
    example: { contactEmail: 'info@example.com', contactPhone: '+86 577 12345678' },
  })
  @IsObject({ message: '配置内容格式不正确' })
  config!: Record<string, unknown>;
}
