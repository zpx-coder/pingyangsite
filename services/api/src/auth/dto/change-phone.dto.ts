// 修改绑定手机号入参（PRD §7.0：原密码验证，首期不接短信验证码）
import { IsNotEmpty, Matches, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChangePhoneDto {
  @ApiProperty({ description: '新手机号（中国大陆 11 位手机号）', example: '13900139000' })
  @Matches(/^1[3-9]\d{9}$/, { message: '新手机号格式不正确' })
  newPhone!: string;

  @ApiProperty({ description: '当前密码（用于身份验证）', example: 'Abc123456' })
  @IsNotEmpty({ message: '请输入当前密码' })
  @MaxLength(128, { message: '密码长度超出限制' })
  password!: string;
}
