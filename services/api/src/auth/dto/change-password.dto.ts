// 修改密码入参（PRD §7.0：当前密码验证；新密码 ≥8 位且含字母与数字；改密后强制重新登录）
import { IsNotEmpty, Matches, MaxLength } from 'class-validator';

export class ChangePasswordDto {
  @IsNotEmpty({ message: '请输入当前密码' })
  @MaxLength(128, { message: '密码长度超出限制' })
  currentPassword!: string;

  @Matches(/^(?=.*[A-Za-z])(?=.*\d).{8,64}$/, { message: '新密码须为 8–64 位且同时包含字母与数字' })
  newPassword!: string;
}
