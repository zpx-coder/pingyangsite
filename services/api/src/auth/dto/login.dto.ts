// 登录请求体（服务端独立校验，安全底线 §6：不依赖前端校验）
import { IsNotEmpty, Matches, MaxLength } from 'class-validator';

export class LoginDto {
  @Matches(/^1[3-9]\d{9}$/, { message: '手机号格式不正确' })
  phone!: string;

  @IsNotEmpty({ message: '请输入密码' })
  @MaxLength(128, { message: '密码长度超出限制' })
  password!: string;
}
