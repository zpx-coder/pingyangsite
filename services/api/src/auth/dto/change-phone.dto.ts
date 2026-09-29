// 修改绑定手机号入参（PRD §7.0：原密码验证，首期不接短信验证码）
import { IsNotEmpty, Matches, MaxLength } from 'class-validator';

export class ChangePhoneDto {
  @Matches(/^1[3-9]\d{9}$/, { message: '新手机号格式不正确' })
  newPhone!: string;

  @IsNotEmpty({ message: '请输入当前密码' })
  @MaxLength(128, { message: '密码长度超出限制' })
  password!: string;
}
