// 后台会话守卫：接口层独立鉴权（计划 §5.2：不依赖前端路由守卫）
// 除登录接口外的全部 /api/v1/admin/* 均须挂载。
import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    if (!request.session?.adminId) {
      throw new UnauthorizedException('请先登录');
    }
    return true;
  }
}
