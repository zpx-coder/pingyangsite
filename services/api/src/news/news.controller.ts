// 后台新闻管理接口（PRD §7.4.1，全部需登录会话）：
//   GET    /api/v1/admin/news            列表（分页/标题关键词/状态筛选）
//   GET    /api/v1/admin/news/:id        详情
//   POST   /api/v1/admin/news            新增（发布时间可定时未来，默认草稿）
//   PUT    /api/v1/admin/news/:id        编辑
//   PUT    /api/v1/admin/news/:id/status 发布 / 下线（转草稿）
//   DELETE /api/v1/admin/news/:id        删除（逻辑删除）
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { AdminGuard } from '../auth/admin.guard';
import { AppLoggerService } from '../logger/app-logger.service';
import { NewsService } from './news.service';
// 注意：DTO 必须用值导入——ValidationPipe 依赖运行时元类型做校验与 whitelist 剥离
import { CreateNewsDto } from './dto/create-news.dto';
import { UpdateNewsDto } from './dto/update-news.dto';
import { QueryNewsDto } from './dto/query-news.dto';
import { StatusNewsDto } from './dto/status-news.dto';

@Controller('api/v1/admin/news')
@UseGuards(AdminGuard)
export class NewsController {
  constructor(
    private readonly news: NewsService,
    private readonly logger: AppLoggerService,
  ) {}

  @Get()
  list(@Query() query: QueryNewsDto) {
    return this.news.list(query);
  }

  @Get(':id')
  detail(@Param('id', ParseIntPipe) id: number) {
    return this.news.detail(id);
  }

  @Post()
  async create(@Body() dto: CreateNewsDto, @Req() req: Request) {
    const created = await this.news.create(dto);
    this.logger.audit('news.create', req.session.adminPhone ?? 'unknown', { id: created.id });
    return created;
  }

  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateNewsDto,
    @Req() req: Request,
  ) {
    const updated = await this.news.update(id, dto);
    this.logger.audit('news.update', req.session.adminPhone ?? 'unknown', { id });
    return updated;
  }

  @Put(':id/status')
  async updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: StatusNewsDto,
    @Req() req: Request,
  ) {
    const updated = await this.news.updateStatus(id, dto.status);
    this.logger.audit('news.status', req.session.adminPhone ?? 'unknown', { id, status: dto.status });
    return updated;
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number, @Req() req: Request) {
    await this.news.remove(id);
    this.logger.audit('news.delete', req.session.adminPhone ?? 'unknown', { id });
    return null;
  }
}
