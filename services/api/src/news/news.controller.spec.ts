// 后台新闻控制器单元测试：直接调用方法、mock 服务/请求对象（不启动 Nest 运行时）
// reflect-metadata 必须先加载：控制器值导入的 query-news.dto 使用 class-transformer 的 @Type
import 'reflect-metadata';
import type { Request } from 'express';
import { NewsController } from './news.controller';
import type { NewsService } from './news.service';
import type { AppLoggerService } from '../logger/app-logger.service';

function makeService() {
  return {
    list: jest.fn(async () => ({ page: 1, pageSize: 20, total: 0, list: [] })),
    detail: jest.fn(async () => ({ id: 1 })),
    create: jest.fn(async () => ({ id: 1 })),
    update: jest.fn(async () => ({ id: 1 })),
    updateStatus: jest.fn(async () => ({ id: 1, status: 1 })),
    remove: jest.fn(async () => undefined),
  } as unknown as NewsService;
}

function makeLogger() {
  return { audit: jest.fn() } as unknown as AppLoggerService;
}

function makeReq(phone?: string): Request {
  return { session: { adminPhone: phone } } as unknown as Request;
}

describe('NewsController', () => {
  let controller: NewsController;
  let service: NewsService;
  let logger: AppLoggerService;

  beforeEach(() => {
    service = makeService();
    logger = makeLogger();
    controller = new NewsController(service, logger);
  });

  it('list 透传查询条件', async () => {
    const query = { page: 1, pageSize: 20 };
    await controller.list(query);
    expect(service.list).toHaveBeenCalledWith(query);
  });

  it('detail 透传 id', async () => {
    await controller.detail(1);
    expect(service.detail).toHaveBeenCalledWith(1);
  });

  it('create 透传 DTO 并留痕（会话手机号）', async () => {
    const dto = { titleZh: '标题', contentZh: '正文', publishTime: '2026-01-01T00:00:00.000Z' };
    await controller.create(dto, makeReq('13800000000'));
    expect(service.create).toHaveBeenCalledWith(dto);
    expect(logger.audit).toHaveBeenCalledWith('news.create', '13800000000', { id: 1 });
  });

  it('create 会话缺失时留痕 unknown', async () => {
    await controller.create({ titleZh: '标题' } as never, makeReq(undefined));
    expect(logger.audit).toHaveBeenCalledWith('news.create', 'unknown', { id: 1 });
  });

  it('update 透传并留痕', async () => {
    const dto = { titleZh: '新标题' };
    await controller.update(2, dto, makeReq('13800000000'));
    expect(service.update).toHaveBeenCalledWith(2, dto);
    expect(logger.audit).toHaveBeenCalledWith('news.update', '13800000000', { id: 2 });
  });

  it('updateStatus 透传状态并留痕', async () => {
    await controller.updateStatus(3, { status: 1 }, makeReq('13800000000'));
    expect(service.updateStatus).toHaveBeenCalledWith(3, 1);
    expect(logger.audit).toHaveBeenCalledWith('news.status', '13800000000', { id: 3, status: 1 });
  });

  it('remove 返回 null 并留痕', async () => {
    const result = await controller.remove(4, makeReq('13800000000'));
    expect(service.remove).toHaveBeenCalledWith(4);
    expect(logger.audit).toHaveBeenCalledWith('news.delete', '13800000000', { id: 4 });
    expect(result).toBeNull();
  });
});
