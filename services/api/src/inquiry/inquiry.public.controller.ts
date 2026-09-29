// 官网询盘公开接口（PRD §6.4 / §9.2）：
//   GET  /api/v1/public/captcha        获取验证码（JSON：captchaId + svg）
//   GET  /api/v1/public/captcha/:id    验证码图片（<img> 直连，不缓存）
//   POST /api/v1/public/inquiries      提交询盘
import { Body, Controller, Get, Param, Post, Req, Res } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { AppLoggerService } from '../logger/app-logger.service';
import { InquiryService } from './inquiry.service';
// 注意：DTO 必须用值导入——ValidationPipe 依赖运行时元类型做校验与 whitelist 剥离
import { CreateInquiryDto } from './dto/create-inquiry.dto';

@ApiTags('询盘')
@Controller('api/v1/public')
export class InquiryPublicController {
  constructor(
    private readonly inquiry: InquiryService,
    private readonly logger: AppLoggerService,
  ) {}

  @ApiOperation({ summary: '获取验证码' })
  @Get('captcha')
  captcha() {
    return this.inquiry.createCaptcha();
  }

  @ApiOperation({ summary: '验证码图片（SVG）' })
  @Get('captcha/:id')
  async captchaImage(@Param('id') id: string, @Res() res: Response) {
    const svg = await this.inquiry.captchaImage(id);
    res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.end(svg);
  }

  @ApiOperation({ summary: '提交询盘' })
  @Post('inquiries')
  async submit(@Body() dto: CreateInquiryDto, @Req() req: Request) {
    const ip = req.ip ?? 'unknown';
    const result = await this.inquiry.submit(dto, ip);
    this.logger.audit('inquiry.submit', 'public', {
      id: result.id,
      productId: dto.productId ?? null,
      country: dto.country,
      lang: dto.lang ?? 'zh-CN',
      ip,
    });
    return result;
  }
}
