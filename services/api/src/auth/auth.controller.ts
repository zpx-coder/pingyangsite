// 认证接口（/api/v1/admin：登录 / 退出 / 会话查询 / 账号管理）
import { Body, Controller, Get, Post, Put, Req, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { AuthService } from './auth.service';
import { AdminGuard } from './admin.guard';
import { LoginDto } from './dto/login.dto';
// 注意：DTO 必须用值导入——ValidationPipe 依赖运行时元类型做校验与 whitelist 剥离
import { ChangePhoneDto } from './dto/change-phone.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ok } from '../common/api-response';

@ApiTags('认证')
@ApiCookieAuth('admin-session')
@Controller('api/v1/admin')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @ApiOperation({ summary: '管理员登录' })
  @Post('login')
  login(@Body() dto: LoginDto, @Req() req: Request) {
    return this.authService.login(dto, req);
  }

  @UseGuards(AdminGuard)
  @ApiOperation({ summary: '退出登录' })
  @Post('logout')
  async logout(@Req() req: Request) {
    await this.authService.logout(req);
    return ok(null, '已退出登录');
  }

  /** 会话查询：后台前端启动时校验登录态 */
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: '查询登录会话' })
  @Get('session')
  session(@Req() req: Request) {
    return ok({ phone: req.session.adminPhone });
  }

  /** 修改绑定手机号（PRD §7.0：原密码验证） */
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: '修改绑定手机号' })
  @Put('account/phone')
  changePhone(@Body() dto: ChangePhoneDto, @Req() req: Request) {
    return this.authService.changePhone(dto, req);
  }

  /** 修改密码（PRD §7.0：原密码验证；成功后强制重新登录） */
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: '修改密码' })
  @Put('account/password')
  async changePassword(@Body() dto: ChangePasswordDto, @Req() req: Request) {
    await this.authService.changePassword(dto, req);
    return ok(null, '密码已修改，请重新登录');
  }
}
