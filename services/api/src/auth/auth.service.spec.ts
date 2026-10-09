// 认证与账号管理服务单元测试（PRD §7.0，任务 1.1/1.11）
// 服务层 mock 模式参照：Prisma 客户端 / 日志均以 jest.fn 注入，
// 不依赖真实数据库与 Redis（测试可独立运行、无状态共享）。
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { hashSync } from 'bcryptjs';
import type { Request } from 'express';
import { AuthService } from './auth.service';
import type { PrismaService } from '../prisma/prisma.service';
import type { AppLoggerService } from '../logger/app-logger.service';

const PHONE = '13800000000';
// 测试用低开销哈希（成本 4 加速；DUMMY 比对在服务内为成本 10，仅一次）
const PASSWORD = 'Admin@123456';
const PASSWORD_HASH = hashSync(PASSWORD, 10);

type AdminUserMock = { id: number; phone: string; passwordHash: string };

function makePrisma(user: AdminUserMock | null) {
  return {
    adminUser: {
      findUnique: jest.fn(async () => user),
      update: jest.fn(async ({ data }: { data: Partial<AdminUserMock> }) => ({ ...user, ...data })),
    },
  } as unknown as PrismaService;
}

function makeLogger() {
  return { audit: jest.fn(), error: jest.fn(), log: jest.fn(), warn: jest.fn(), debug: jest.fn(), verbose: jest.fn() } as unknown as AppLoggerService;
}

function makeReq(phone = PHONE): Request {
  const session: Record<string, unknown> = { adminId: 1, adminPhone: phone };
  session.regenerate = jest.fn((cb: (err?: Error) => void) => cb());
  session.destroy = jest.fn((cb: (err?: Error) => void) => cb());
  session.save = jest.fn((cb: (err?: Error) => void) => cb());
  return { session, ip: '::1' } as unknown as Request;
}

function makeService(user: AdminUserMock | null = { id: 1, phone: PHONE, passwordHash: PASSWORD_HASH }) {
  const prisma = makePrisma(user);
  const logger = makeLogger();
  const service = new AuthService(prisma, logger);
  return { service, prisma, logger };
}

describe('AuthService.login', () => {
  it('成功：重建会话、返回手机号', async () => {
    const { service, logger } = makeService();
    const req = makeReq();
    const result = await service.login({ phone: PHONE, password: PASSWORD }, req);
    expect(result).toEqual({ phone: PHONE });
    expect(req.session.regenerate).toHaveBeenCalled();
    expect(logger.audit).toHaveBeenCalledWith('login', PHONE, { result: 'success' });
  });

  it('密码错误：audit fail + 401', async () => {
    const { service, logger } = makeService();
    await expect(service.login({ phone: PHONE, password: 'WrongPass1' }, makeReq())).rejects.toThrow(
      new UnauthorizedException('手机号或密码错误'),
    );
    expect(logger.audit).toHaveBeenCalledWith('login', PHONE, { result: 'fail' });
  });

  it('账号不存在：走 dummy 比对仍返回 401', async () => {
    const { service } = makeService(null);
    await expect(service.login({ phone: PHONE, password: PASSWORD }, makeReq())).rejects.toThrow(UnauthorizedException);
  });
});

describe('AuthService.logout', () => {
  it('销毁会话并留痕', async () => {
    const { service, logger } = makeService();
    const req = makeReq();
    await service.logout(req);
    expect(req.session.destroy).toHaveBeenCalled();
    expect(logger.audit).toHaveBeenCalledWith('logout', PHONE, {});
  });
});

describe('AuthService.changePhone', () => {
  it('当前密码错误 → 400（业务校验错误，避免触发前端会话过期处理器）', async () => {
    const { service } = makeService();
    await expect(
      service.changePhone({ newPhone: '13912345678', password: 'WrongPass1' }, makeReq()),
    ).rejects.toThrow(new BadRequestException('当前密码错误'));
  });

  it('手机号被占用 → 40000', async () => {
    const { service, prisma } = makeService();
    (prisma.adminUser.findUnique as jest.Mock).mockImplementation(async ({ where }: { where: { phone: string } }) =>
      where.phone === '13912345678' ? { id: 2, phone: where.phone, passwordHash: 'x' } : { id: 1, phone: PHONE, passwordHash: PASSWORD_HASH },
    );
    await expect(
      service.changePhone({ newPhone: '13912345678', password: PASSWORD }, makeReq()),
    ).rejects.toThrow('该手机号已被使用');
  });

  it('成功：更新手机号、会话同步、audit 留痕（含 IP）', async () => {
    const { service, prisma, logger } = makeService();
    const req = makeReq();
    const result = await service.changePhone({ newPhone: '13912345678', password: PASSWORD }, req);
    expect(result).toEqual({ phone: '13912345678' });
    expect(prisma.adminUser.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { phone: '13912345678' },
    });
    expect(req.session.adminPhone).toBe('13912345678');
    expect(req.session.save).toHaveBeenCalled();
    expect(logger.audit).toHaveBeenCalledWith('account.phone', '13912345678', { ip: '::1' });
  });
});

describe('AuthService.changePassword', () => {
  it('当前密码错误 → 400（业务校验错误，避免触发前端会话过期处理器）', async () => {
    const { service } = makeService();
    await expect(
      service.changePassword({ currentPassword: 'WrongPass1', newPassword: 'NewPass123' }, makeReq()),
    ).rejects.toThrow(new BadRequestException('当前密码错误'));
  });

  it('成功：更新哈希、强制销毁会话、audit 留痕', async () => {
    const { service, prisma, logger } = makeService();
    const req = makeReq();
    await service.changePassword({ currentPassword: PASSWORD, newPassword: 'NewPass123' }, req);
    expect(prisma.adminUser.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { passwordHash: expect.stringMatching(/^\$2[aby]\$/) },
    });
    expect(req.session.destroy).toHaveBeenCalled();
    expect(logger.audit).toHaveBeenCalledWith('account.password', PHONE, { ip: '::1' });
  });
});
