// 后台产品管理接口（PRD §7.1，全部需登录会话）：
//   GET    /api/v1/admin/products            列表（分页/名称/类目/状态组合筛选）
//   GET    /api/v1/admin/products/:id        详情（含类目与关联企业）
//   POST   /api/v1/admin/products            新增（默认草稿）
//   PUT    /api/v1/admin/products/:id        编辑
//   PUT    /api/v1/admin/products/:id/status 状态流转（草稿→已发布→已下架→重新发布）
//   POST   /api/v1/admin/products/batch      批量删除 / 批量上架 / 批量下架
//   DELETE /api/v1/admin/products/:id        删除（逻辑删除，询盘快照不受影响）
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
import { ProductService } from './product.service';
// 注意：DTO 必须用值导入——ValidationPipe 依赖运行时元类型做校验与 whitelist 剥离
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { QueryProductDto } from './dto/query-product.dto';
import { StatusProductDto } from './dto/status-product.dto';
import { BatchProductDto } from './dto/batch-product.dto';

@ApiTags('产品')
@ApiCookieAuth('admin-session')
@Controller('api/v1/admin/products')
@UseGuards(AdminGuard)
export class ProductController {
  constructor(
    private readonly product: ProductService,
    private readonly logger: AppLoggerService,
  ) {}

  @ApiOperation({ summary: '产品分页列表' })
  @Get()
  list(@Query() query: QueryProductDto) {
    return this.product.list(query);
  }

  @ApiOperation({ summary: '产品详情' })
  @Get(':id')
  detail(@Param('id', ParseIntPipe) id: number) {
    return this.product.detail(id);
  }

  @ApiOperation({ summary: '新增产品' })
  @Post()
  async create(@Body() dto: CreateProductDto, @Req() req: Request) {
    const created = await this.product.create(dto);
    this.logger.audit('product.create', req.session.adminPhone ?? 'unknown', { id: created.id });
    return created;
  }

  @ApiOperation({ summary: '编辑产品' })
  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProductDto,
    @Req() req: Request,
  ) {
    const updated = await this.product.update(id, dto);
    this.logger.audit('product.update', req.session.adminPhone ?? 'unknown', { id });
    return updated;
  }

  @ApiOperation({ summary: '产品状态流转' })
  @Put(':id/status')
  async updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: StatusProductDto,
    @Req() req: Request,
  ) {
    const updated = await this.product.updateStatus(id, dto.status);
    this.logger.audit('product.status', req.session.adminPhone ?? 'unknown', { id, status: dto.status });
    return updated;
  }

  @ApiOperation({ summary: '产品批量操作' })
  @Post('batch')
  async batch(@Body() dto: BatchProductDto, @Req() req: Request) {
    const result = await this.product.batch(dto.ids, dto.action);
    this.logger.audit('product.batch', req.session.adminPhone ?? 'unknown', {
      action: dto.action,
      ids: dto.ids,
      count: result.count,
    });
    return result;
  }

  @ApiOperation({ summary: '删除产品' })
  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number, @Req() req: Request) {
    await this.product.remove(id);
    this.logger.audit('product.delete', req.session.adminPhone ?? 'unknown', { id });
    return null;
  }
}
