// 后台企业管理接口（PRD §7.2，全部需登录会话）：
//   GET    /api/v1/admin/companies            列表（分页/名称/类目/状态筛选，多类目标签展示）
//   GET    /api/v1/admin/companies/:id        详情（含类目标签与产品数）
//   POST   /api/v1/admin/companies            新增（类目多选必填 ≥1）
//   PUT    /api/v1/admin/companies/:id        编辑（categoryIds 传入即整体替换关联）
//   DELETE /api/v1/admin/companies/:id        删除（逻辑删除，产品保留展示「未关联」）
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
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { AdminGuard } from '../auth/admin.guard';
import { AppLoggerService } from '../logger/app-logger.service';
import { CompanyService } from './company.service';
// 注意：DTO 必须用值导入——ValidationPipe 依赖运行时元类型做校验与 whitelist 剥离
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { QueryCompanyDto } from './dto/query-company.dto';

@ApiTags('企业')
@ApiCookieAuth('admin-session')
@Controller('api/v1/admin/companies')
@UseGuards(AdminGuard)
export class CompanyController {
  constructor(
    private readonly company: CompanyService,
    private readonly logger: AppLoggerService,
  ) {}

  @ApiOperation({ summary: '企业分页列表' })
  @Get()
  list(@Query() query: QueryCompanyDto) {
    return this.company.list(query);
  }

  @ApiOperation({ summary: '企业详情' })
  @Get(':id')
  detail(@Param('id', ParseIntPipe) id: number) {
    return this.company.detail(id);
  }

  @ApiOperation({ summary: '新增企业' })
  @Post()
  async create(@Body() dto: CreateCompanyDto, @Req() req: Request) {
    const created = await this.company.create(dto);
    this.logger.audit('company.create', req.session.adminPhone ?? 'unknown', { id: created.id });
    return created;
  }

  @ApiOperation({ summary: '编辑企业' })
  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCompanyDto,
    @Req() req: Request,
  ) {
    const updated = await this.company.update(id, dto);
    this.logger.audit('company.update', req.session.adminPhone ?? 'unknown', { id });
    return updated;
  }

  @ApiOperation({ summary: '删除企业' })
  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number, @Req() req: Request) {
    await this.company.remove(id);
    this.logger.audit('company.delete', req.session.adminPhone ?? 'unknown', { id });
    return null;
  }
}
