// 后台类目管理接口（PRD §7.3，全部需登录会话）：
//   GET    /api/v1/admin/categories            列表（分页/状态/关键词）
//   GET    /api/v1/admin/categories/:id        详情（含产品数/企业数）
//   POST   /api/v1/admin/categories            新增
//   PUT    /api/v1/admin/categories/:id        编辑
//   PUT    /api/v1/admin/categories/:id/translate  一键翻译（方案 §5.3）
//   DELETE /api/v1/admin/categories/:id        删除（非空类目被拒）
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
import { CategoryService } from './category.service';
// 注意：DTO 必须用值导入——ValidationPipe 依赖运行时元类型做校验与 whitelist 剥离
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { QueryCategoryDto } from './dto/query-category.dto';

@ApiTags('类目')
@ApiCookieAuth('admin-session')
@Controller('api/v1/admin/categories')
@UseGuards(AdminGuard)
export class CategoryController {
  constructor(
    private readonly category: CategoryService,
    private readonly logger: AppLoggerService,
  ) {}

  @ApiOperation({ summary: '类目分页列表' })
  @Get()
  list(@Query() query: QueryCategoryDto) {
    return this.category.list(query);
  }

  @ApiOperation({ summary: '类目详情' })
  @Get(':id')
  detail(@Param('id', ParseIntPipe) id: number) {
    return this.category.detail(id);
  }

  @ApiOperation({ summary: '新增类目' })
  @Post()
  async create(@Body() dto: CreateCategoryDto, @Req() req: Request) {
    const created = await this.category.create(dto);
    this.logger.audit('category.create', req.session.adminPhone ?? 'unknown', { id: created.id });
    return created;
  }

  @ApiOperation({ summary: '编辑类目' })
  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCategoryDto,
    @Req() req: Request,
  ) {
    const updated = await this.category.update(id, dto);
    this.logger.audit('category.update', req.session.adminPhone ?? 'unknown', { id });
    return updated;
  }

  @ApiOperation({ summary: '一键翻译类目' })
  @Put(':id/translate')
  async translate(@Param('id', ParseIntPipe) id: number, @Req() req: Request) {
    const updated = await this.category.translate(id);
    this.logger.audit('category.translate', req.session.adminPhone ?? 'unknown', { id });
    return updated;
  }

  @ApiOperation({ summary: '删除类目' })
  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number, @Req() req: Request) {
    await this.category.remove(id);
    this.logger.audit('category.delete', req.session.adminPhone ?? 'unknown', { id });
    return null;
  }
}
