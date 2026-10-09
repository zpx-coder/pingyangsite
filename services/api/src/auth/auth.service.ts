// 认证服务（PRD §7.0）：
//   - 手机号 + 密码登录，bcrypt 加盐比对（账号不存在时亦执行一次比对，减小时序差异）；
//   - 登录成功重建会话（防会话固定）；退出销毁会话；
//   - 登录/退出写入 audit 日志（脱敏）。
//   - 登录失败锁定机制已于 2026-10-09 按负责人要求移除（失败仅保留 audit 留痕）。
import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';
import { compare, hashSync } from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { AppLoggerService } from '../logger/app-logger.service';
import type { LoginDto } from './dto/login.dto';
import type { ChangePhoneDto } from './dto/change-phone.dto';
import type { ChangePasswordDto } from './dto/change-password.dto';

// 账号不存在时的比对基准（bcrypt 输出恒为 60 字符哈希）
const DUMMY_PASSWORD_HASH = hashSync('dummy-password-for-timing', 10);

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: AppLoggerService,
  ) {}

  async login(dto: LoginDto, req: Request): Promise<{ phone: string }> {
    const phone = dto.phone.trim();

    // 校验（账号不存在时执行 dummy 比对，减小时序差异）
    const user = await this.prisma.adminUser.findUnique({ where: { phone } });
    const passwordOk = await compare(dto.password, user?.passwordHash ?? DUMMY_PASSWORD_HASH);
    if (!user || !passwordOk) {
      this.logger.audit('login', phone, { result: 'fail' });
      throw new UnauthorizedException('手机号或密码错误');
    }

    // 成功：重建会话（防会话固定）
    await this.regenerateSession(req, user.id, user.phone);
    this.logger.audit('login', phone, { result: 'success' });
    return { phone: user.phone };
  }

  async logout(req: Request): Promise<void> {
    this.logger.audit('logout', req.session.adminPhone ?? 'unknown', {});
    await this.destroySession(req);
  }

  /** 修改绑定手机号（PRD §7.0：原密码验证，首期不接短信验证码；不强制重登） */
  async changePhone(dto: ChangePhoneDto, req: Request): Promise<{ phone: string }> {
    const currentPhone = req.session.adminPhone ?? '';
    const user = await this.prisma.adminUser.findUnique({ where: { phone: currentPhone } });
    const passwordOk = await compare(dto.password, user?.passwordHash ?? DUMMY_PASSWORD_HASH);
    if (!user || !passwordOk) {
      // 业务校验错误用 400：401 会触发前端全局「会话已过期」处理器导致误强制登出（任务 3.10）
      throw new BadRequestException('当前密码错误');
    }
    const newPhone = dto.newPhone.trim();
    const existing = await this.prisma.adminUser.findUnique({ where: { phone: newPhone } });
    if (existing && existing.id !== user.id) {
      throw new BadRequestException('该手机号已被使用');
    }
    await this.prisma.adminUser.update({ where: { id: user.id }, data: { phone: newPhone } });
    // 会话内手机号同步为最新（PRD 仅要求改密强制重登）
    req.session.adminPhone = newPhone;
    await this.saveSession(req);
    this.logger.audit('account.phone', newPhone, { ip: req.ip ?? 'unknown' });
    return { phone: newPhone };
  }

  /** 修改密码（PRD §7.0：原密码验证；成功后销毁会话强制重新登录） */
  async changePassword(dto: ChangePasswordDto, req: Request): Promise<void> {
    const phone = req.session.adminPhone ?? '';
    const user = await this.prisma.adminUser.findUnique({ where: { phone } });
    const passwordOk = await compare(dto.currentPassword, user?.passwordHash ?? DUMMY_PASSWORD_HASH);
    if (!user || !passwordOk) {
      // 业务校验错误用 400：401 会触发前端全局「会话已过期」处理器导致误强制登出（任务 3.10）
      throw new BadRequestException('当前密码错误');
    }
    await this.prisma.adminUser.update({
      where: { id: user.id },
      data: { passwordHash: hashSync(dto.newPassword, 10) },
    });
    this.logger.audit('account.password', phone, { ip: req.ip ?? 'unknown' });
    // 强制重新登录（PRD §7.0）：销毁当前会话，后续请求返回 401
    await this.destroySession(req);
  }

  private regenerateSession(req: Request, adminId: number, adminPhone: string): Promise<void> {
    return new Promise((resolve, reject) => {
      req.session.regenerate((err) => {
        if (err) {
          reject(err);
          return;
        }
        req.session.adminId = adminId;
        req.session.adminPhone = adminPhone;
        req.session.save((saveErr) => (saveErr ? reject(saveErr) : resolve()));
      });
    });
  }

  private destroySession(req: Request): Promise<void> {
    return new Promise((resolve, reject) => {
      req.session.destroy((err) => (err ? reject(err) : resolve()));
    });
  }

  private saveSession(req: Request): Promise<void> {
    return new Promise((resolve, reject) => {
      req.session.save((err) => (err ? reject(err) : resolve()));
    });
  }
}
