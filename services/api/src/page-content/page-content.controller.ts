// 后台页面内容管理接口（PRD §7.4.2，需登录会话）：
//   GET /api/v1/admin/pages       全部配置项（key + 配置对象 + 更新时间）
//   GET /api/v1/admin/pages/:key  单配置项（含 machineFields 供编辑页展示标记）
//   PUT /api/v1/admin/pages/:key  保存（校验 + 双语联动 + 刷新缓存，官网即时生效）
import { Body, Controller, Get, Param, Put, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { AdminGuard } from '../auth/admin.guard';
import { AppLoggerService } from '../logger/app-logger.service';
import { PageContentService } from './page-content.service';
// 注意：DTO 必须用值导入——ValidationPipe 依赖运行时元类型做校验与 whitelist 剥离
import { SavePageDto } from './dto/save-page.dto';

@Controller('api/v1/admin/pages')
@UseGuards(AdminGuard)
export class PageContentController {
  constructor(
    private readonly pages: PageContentService,
    private readonly logger: AppLoggerService,
  ) {}

  @Get()
  list() {
    return this.pages.list();
  }

  @Get(':key')
  get(@Param('key') key: string) {
    return this.pages.get(key);
  }

  @Put(':key')
  async save(@Param('key') key: string, @Body() dto: SavePageDto, @Req() req: Request) {
    const saved = await this.pages.save(key, dto.config);
    this.logger.audit('page.save', req.session.adminPhone ?? 'unknown', { key });
    return saved;
  }
}
