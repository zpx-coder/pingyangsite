// 后台产品控制器单元测试（任务 1.12）：直接调用方法、mock 服务与请求对象，
// 不启动 Nest 运行时；audit 留痕断言操作人/操作对象（含状态流转与批量操作明细）。
// 控制器值导入 Query DTO，其 @Type 装饰器依赖 reflect-metadata，单测须显式引入
import 'reflect-metadata';
import type { Request } from 'express';
import type { AppLoggerService } from '../logger/app-logger.service';
import { ProductController } from './product.controller';
import type { ProductService } from './product.service';

const PHONE = '13800000000';

function makeService() {
  return {
    list: jest.fn(async () => ({ page: 1, pageSize: 20, total: 0, list: [] })),
    detail: jest.fn(async () => ({ id: 1 })),
    create: jest.fn(async () => ({ id: 9 })),
    update: jest.fn(async () => ({ id: 1 })),
    updateStatus: jest.fn(async () => ({ id: 1, status: 2 })),
    batch: jest.fn(async () => ({ count: 2 })),
    remove: jest.fn(async () => undefined),
  } as unknown as ProductService;
}

function makeLogger() {
  return {
    audit: jest.fn(),
    error: jest.fn(),
    log: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    verbose: jest.fn(),
  } as unknown as AppLoggerService;
}

function makeReq(phone?: string): Request {
  return { session: { adminPhone: phone }, ip: '::1' } as unknown as Request;
}

describe('ProductController', () => {
  let controller: ProductController;
  let service: ProductService;
  let logger: AppLoggerService;

  beforeEach(() => {
    service = makeService();
    logger = makeLogger();
    controller = new ProductController(service, logger);
  });

  it('list 透传查询对象', async () => {
    const query = { page: 2, status: 1, categoryId: 3 };
    const result = await controller.list(query);
    expect(service.list).toHaveBeenCalledWith(query);
    expect(result).toEqual({ page: 1, pageSize: 20, total: 0, list: [] });
  });

  it('detail 透传 id', async () => {
    expect(await controller.detail(3)).toEqual({ id: 1 });
    expect(service.detail).toHaveBeenCalledWith(3);
  });

  it('create 透传 dto 并 audit 留痕', async () => {
    const dto = { nameZh: '产品', categoryId: 1, mainImage: '/m.png', detailZh: '详情' };
    const result = await controller.create(dto, makeReq(PHONE));
    expect(service.create).toHaveBeenCalledWith(dto);
    expect(logger.audit).toHaveBeenCalledWith('product.create', PHONE, { id: 9 });
    expect(result).toEqual({ id: 9 });
  });

  it('create 会话无手机号 → 留痕操作人为 unknown', async () => {
    await controller.create(
      { nameZh: '产品', categoryId: 1, mainImage: '/m.png', detailZh: '详情' },
      makeReq(),
    );
    expect(logger.audit).toHaveBeenCalledWith('product.create', 'unknown', { id: 9 });
  });

  it('update 透传并留痕', async () => {
    const dto = { priceRef: 'x' };
    await controller.update(1, dto, makeReq(PHONE));
    expect(service.update).toHaveBeenCalledWith(1, dto);
    expect(logger.audit).toHaveBeenCalledWith('product.update', PHONE, { id: 1 });
  });

  it('updateStatus 透传状态并留痕（含状态值）', async () => {
    const dto = { status: 2 };
    const result = await controller.updateStatus(1, dto, makeReq(PHONE));
    expect(service.updateStatus).toHaveBeenCalledWith(1, 2);
    expect(logger.audit).toHaveBeenCalledWith('product.status', PHONE, { id: 1, status: 2 });
    expect(result).toEqual({ id: 1, status: 2 });
  });

  it('batch 透传 ids/action 并留痕（含数量）', async () => {
    const dto = { ids: [1, 2], action: 'delete' as const };
    const result = await controller.batch(dto, makeReq(PHONE));
    expect(service.batch).toHaveBeenCalledWith([1, 2], 'delete');
    expect(logger.audit).toHaveBeenCalledWith('product.batch', PHONE, {
      action: 'delete',
      ids: [1, 2],
      count: 2,
    });
    expect(result).toEqual({ count: 2 });
  });

  it('remove 透传、留痕并返回 null', async () => {
    const result = await controller.remove(1, makeReq(PHONE));
    expect(service.remove).toHaveBeenCalledWith(1);
    expect(logger.audit).toHaveBeenCalledWith('product.delete', PHONE, { id: 1 });
    expect(result).toBeNull();
  });
});
