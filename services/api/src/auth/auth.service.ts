// 认证服务（PRD §7.0）：
//   - 手机号 + 密码登录，bcrypt 加盐比对（账号不存在时亦执行一次比对，减小时序差异）；
//   - 同账号连续失败 5 次锁定 15 分钟（Redis 计数 + 锁定标记，提示剩余时间）；
//   - 登录成功重建会话（防会话固定）；退出销毁会话；
//   - 登录/退出写入 audit 日志（脱敏）。
import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';
import type { RedisClientType } from 'redis';
import { compare, hashSync } from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { AppLoggerService } from '../logger/app-logger.service';
import { REDIS_CLIENT } from '../redis/redis.module';
import type { LoginDto } from './dto/login.dto';
import {
  LOGIN_FAILURE_WINDOW_SECONDS,
  LOGIN_LOCK_SECONDS,
  MAX_LOGIN_FAILURES,
  loginFailKey,
  loginLockKey,
} from './auth.constants';

// 账号不存在时的比对基准（bcrypt 输出恒为 60 字符哈希）
const DUMMY_PASSWORD_HASH = hashSync('dummy-password-for-timing', 10);

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(REDIS_CLIENT) private readonly redis: RedisClientType,
    private readonly logger: AppLoggerService,
  ) {}

  async login(dto: LoginDto, req: Request): Promise<{ phone: string }> {
    const phone = dto.phone.trim();

    // 1. 锁定检查（PRD §7.0：提示剩余时间）
    const lockTtl = await this.redis.ttl(loginLockKey(phone));
    if (lockTtl > 0) {
      const remainingMinutes = Math.max(1, Math.ceil(lockTtl / 60));
      throw new UnauthorizedException(`账号已锁定，请 ${remainingMinutes} 分钟后再试`);
    }

    // 2. 校验
    const user = await this.prisma.adminUser.findUnique({ where: { phone } });
    const passwordOk = await compare(dto.password, user?.passwordHash ?? DUMMY_PASSWORD_HASH);
    if (!user || !passwordOk) {
      await this.recordFailure(phone);
      this.logger.audit('login', phone, { result: 'fail' });
      throw new UnauthorizedException('手机号或密码错误');
    }

    // 3. 成功：清空失败状态、重建会话
    await this.redis.del([loginFailKey(phone), loginLockKey(phone)]);
    await this.regenerateSession(req, user.id, user.phone);
    this.logger.audit('login', phone, { result: 'success' });
    return { phone: user.phone };
  }

  async logout(req: Request): Promise<void> {
    this.logger.audit('logout', req.session.adminPhone ?? 'unknown', {});
    await this.destroySession(req);
  }

  /** 失败计数：窗口内 +1，达到阈值即锁定并清零计数 */
  private async recordFailure(phone: string): Promise<void> {
    const count = await this.redis.incr(loginFailKey(phone));
    if (count === 1) {
      await this.redis.expire(loginFailKey(phone), LOGIN_FAILURE_WINDOW_SECONDS);
    }
    if (count >= MAX_LOGIN_FAILURES) {
      await this.redis.set(loginLockKey(phone), '1', { EX: LOGIN_LOCK_SECONDS });
      await this.redis.del(loginFailKey(phone));
    }
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
}
