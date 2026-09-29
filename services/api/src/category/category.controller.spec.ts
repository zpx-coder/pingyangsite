// 后台类目控制器单元测试（任务 1.12）：直接调用方法、mock 服务与请求对象，
// 不启动 Nest 运行时；audit 留痕断言操作人与操作对象。
// 控制器值导入 Query DTO，其 @Type 装饰器依赖 reflect-metadata，单测须显式引入
import 'reflect-metadata';
import type { Request } from 'express';
import type { AppLoggerService } from '../logger/app-logger.service';
import { CategoryController } from './category.controller';
import type { CategoryService } from './category.service';

const PHONE = '13800000000';

function makeService() {
  return {
    list: jest.fn(async () => ({ page: 1, pageSize: 20, total: 0, list: [] })),
    detail: jest.fn(async () => ({ id: 1 })),
    create: jest.fn(async () => ({ id: 9 })),
    update: jest.fn(async () => ({ id: 1 })),
    translate: jest.fn(async () => ({ id: 1 })),
    remove: jest.fn(async () => undefined),
  } as unknown as CategoryService;
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

describe('CategoryController', () => {
  let controller: CategoryController;
  let service: CategoryService;
  let logger: AppLoggerService;

  beforeEach(() => {
    service = makeService();
    logger = makeLogger();
    controller = new CategoryController(service, logger);
  });

  it('list 透传查询对象', async () => {
    const query = { page: 2, status: 1 };
    const result = await controller.list(query);
    expect(service.list).toHaveBeenCalledWith(query);
    expect(result).toEqual({ page: 1, pageSize: 20, total: 0, list: [] });
  });

  it('detail 透传 id', async () => {
    expect(await controller.detail(3)).toEqual({ id: 1 });
    expect(service.detail).toHaveBeenCalledWith(3);
  });

  it('create 透传 dto 并 audit 留痕（含操作人手机号）', async () => {
    const dto = { nameZh: '类目' };
    const req = makeReq(PHONE);
    const result = await controller.create(dto, req);
    expect(service.create).toHaveBeenCalledWith(dto);
    expect(logger.audit).toHaveBeenCalledWith('category.create', PHONE, { id: 9 });
    expect(result).toEqual({ id: 9 });
  });

  it('create 会话无手机号 → 留痕操作人为 unknown', async () => {
    await controller.create({ nameZh: '类目' }, makeReq());
    expect(logger.audit).toHaveBeenCalledWith('category.create', 'unknown', { id: 9 });
  });

  it('update 透传并留痕', async () => {
    const dto = { sort: 3 };
    await controller.update(1, dto, makeReq(PHONE));
    expect(service.update).toHaveBeenCalledWith(1, dto);
    expect(logger.audit).toHaveBeenCalledWith('category.update', PHONE, { id: 1 });
  });

  it('translate 透传并留痕', async () => {
    await controller.translate(1, makeReq(PHONE));
    expect(service.translate).toHaveBeenCalledWith(1);
    expect(logger.audit).toHaveBeenCalledWith('category.translate', PHONE, { id: 1 });
  });

  it('remove 透传、留痕并返回 null', async () => {
    const result = await controller.remove(1, makeReq(PHONE));
    expect(service.remove).toHaveBeenCalledWith(1);
    expect(logger.audit).toHaveBeenCalledWith('category.delete', PHONE, { id: 1 });
    expect(result).toBeNull();
  });
});
