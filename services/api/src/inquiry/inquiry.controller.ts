// 后台询盘管理接口（PRD §7.5，全部需登录会话）：
//   GET    /api/v1/admin/inquiries           列表（状态/关键词/时间范围筛选，20/页）
//   GET    /api/v1/admin/inquiries/stats     统计卡片（总数/未处理/今日/本周）
//   GET    /api/v1/admin/inquiries/export    导出当前筛选结果为 xlsx
//   GET    /api/v1/admin/inquiries/:id       详情
//   PUT    /api/v1/admin/inquiries/:id/status 标记已处理/未处理
//   POST   /api/v1/admin/inquiries/batch     批量标记已处理/未处理
// 注意：stats/export 路由声明在 :id 之前，避免被参数路由截获。
import { Body, Controller, Get, Param, ParseIntPipe, Post, Put, Query, Req, Res, UseGuards } from '@nestjs/common';
import type { Request, Response } from 'express';
import { AdminGuard } from '../auth/admin.guard';
import { AppLoggerService } from '../logger/app-logger.service';
import { InquiryService } from './inquiry.service';
// 注意：DTO 必须用值导入——ValidationPipe 依赖运行时元类型做校验与 whitelist 剥离
import { QueryInquiryDto } from './dto/query-inquiry.dto';
import { StatusInquiryDto } from './dto/status-inquiry.dto';
import { BatchInquiryDto } from './dto/batch-inquiry.dto';

const EXPORT_CONTENT_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

@Controller('api/v1/admin/inquiries')
@UseGuards(AdminGuard)
export class InquiryController {
  constructor(
    private readonly inquiry: InquiryService,
    private readonly logger: AppLoggerService,
  ) {}

  @Get()
  list(@Query() query: QueryInquiryDto) {
    return this.inquiry.list(query);
  }

  @Get('stats')
  stats() {
    return this.inquiry.stats();
  }

  @Get('export')
  async export(@Query() query: QueryInquiryDto, @Req() req: Request, @Res() res: Response) {
    const { buffer, count } = await this.inquiry.exportData(query);
    const dateStamp = cstDateStamp(new Date());
    res.setHeader('Content-Type', EXPORT_CONTENT_TYPE);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="inquiries_${dateStamp}.xlsx"; filename*=UTF-8''${encodeURIComponent(`询盘导出_${dateStamp}.xlsx`)}`,
    );
    res.end(buffer);
    this.logger.audit('inquiry.export', req.session.adminPhone ?? 'unknown', { count, filters: query });
  }

  @Get(':id')
  detail(@Param('id', ParseIntPipe) id: number) {
    return this.inquiry.detail(id);
  }

  @Put(':id/status')
  async updateStatus(@Param('id', ParseIntPipe) id: number, @Body() dto: StatusInquiryDto, @Req() req: Request) {
    const updated = await this.inquiry.updateStatus(id, dto.status);
    this.logger.audit('inquiry.status', req.session.adminPhone ?? 'unknown', { id, status: dto.status });
    return updated;
  }

  @Post('batch')
  async batch(@Body() dto: BatchInquiryDto, @Req() req: Request) {
    const result = await this.inquiry.batch(dto.ids, dto.action);
    this.logger.audit('inquiry.batch', req.session.adminPhone ?? 'unknown', {
      action: dto.action,
      ids: dto.ids,
      count: result.count,
    });
    return result;
  }
}

/** 当前时刻的 CST 日期戳 YYYYMMDD（导出文件名用） */
function cstDateStamp(date: Date): string {
  const shifted = new Date(date.getTime() + 8 * 60 * 60 * 1000);
  const pad = (value: number): string => String(value).padStart(2, '0');
  return `${shifted.getUTCFullYear()}${pad(shifted.getUTCMonth() + 1)}${pad(shifted.getUTCDate())}`;
}
