// 后台会话守卫单元测试（任务 1.12，计划 §5.2 接口层独立鉴权）：
//   - 会话存在且 adminId 真值 → 放行；
//   - 会话缺失 / adminId 缺失或假值 → 抛 401「请先登录」。
import { UnauthorizedException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { AdminGuard } from './admin.guard';

function makeContext(session: unknown): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ session }) }),
  } as unknown as ExecutionContext;
}

describe('AdminGuard', () => {
  const guard = new AdminGuard();

  it('会话含 adminId 时放行', () => {
    expect(guard.canActivate(makeContext({ adminId: 1 }))).toBe(true);
  });

  it('无会话时抛未登录', () => {
    expect(() => guard.canActivate(makeContext(undefined))).toThrow(new UnauthorizedException('请先登录'));
  });

  it('会话缺少 adminId 时抛未登录', () => {
    expect(() => guard.canActivate(makeContext({}))).toThrow('请先登录');
  });

  it('adminId 为假值时视为未登录', () => {
    expect(() => guard.canActivate(makeContext({ adminId: 0 }))).toThrow(UnauthorizedException);
  });
});
