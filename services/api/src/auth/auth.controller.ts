// 认证接口（/api/v1/admin：登录 / 退出 / 会话查询）
import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { AuthService } from './auth.service';
import { AdminGuard } from './admin.guard';
import { LoginDto } from './dto/login.dto';
import { ok } from '../common/api-response';

@Controller('api/v1/admin')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  login(@Body() dto: LoginDto, @Req() req: Request) {
    return this.authService.login(dto, req);
  }

  @UseGuards(AdminGuard)
  @Post('logout')
  async logout(@Req() req: Request) {
    await this.authService.logout(req);
    return ok(null, '已退出登录');
  }

  /** 会话查询：后台前端启动时校验登录态 */
  @UseGuards(AdminGuard)
  @Get('session')
  session(@Req() req: Request) {
    return ok({ phone: req.session.adminPhone });
  }
}
