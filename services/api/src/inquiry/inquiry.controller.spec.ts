// 后台询盘控制器单元测试：透传、audit 留痕与导出响应头
//（mock Response，不启动 Nest 运行时）
// reflect-metadata 必须先加载：控制器值导入的 query-inquiry.dto 使用 class-transformer 的 @Type
import 'reflect-metadata';
import type { Request, Response } from 'express';
import { InquiryController } from './inquiry.controller';
import type { InquiryService } from './inquiry.service';
import type { AppLoggerService } from '../logger/app-logger.service';

function makeService() {
  return {
    list: jest.fn(async () => ({ page: 1, pageSize: 20, total: 0, list: [] })),
    stats: jest.fn(async () => ({ total: 0, pending: 0, today: 0, week: 0 })),
    exportData: jest.fn(async () => ({ buffer: Buffer.from('xlsx-bytes'), count: 2 })),
    detail: jest.fn(async () => ({ id: 1 })),
    updateStatus: jest.fn(async () => ({ id: 1, status: 1 })),
    batch: jest.fn(async () => ({ count: 2 })),
  } as unknown as InquiryService;
}

function makeLogger() {
  return { audit: jest.fn() } as unknown as AppLoggerService;
}

function makeReq(phone?: string): Request {
  return { session: { adminPhone: phone } } as unknown as Request;
}

function makeRes(): Response {
  return { setHeader: jest.fn(), end: jest.fn() } as unknown as Response;
}

describe('InquiryController', () => {
  let controller: InquiryController;
  let service: InquiryService;
  let logger: AppLoggerService;

  beforeEach(() => {
    service = makeService();
    logger = makeLogger();
    controller = new InquiryController(service, logger);
  });

  it('list 透传查询条件', async () => {
    const query = { page: 1, pageSize: 20 };
    await controller.list(query);
    expect(service.list).toHaveBeenCalledWith(query);
  });

  it('stats 透传服务结果', async () => {
    await controller.stats();
    expect(service.stats).toHaveBeenCalled();
  });

  it('detail 透传 id', async () => {
    await controller.detail(1);
    expect(service.detail).toHaveBeenCalledWith(1);
  });

  it('updateStatus 透传并留痕', async () => {
    await controller.updateStatus(2, { status: 1 }, makeReq('13800000000'));
    expect(service.updateStatus).toHaveBeenCalledWith(2, 1);
    expect(logger.audit).toHaveBeenCalledWith('inquiry.status', '13800000000', { id: 2, status: 1 });
  });

  it('batch 透传并留痕', async () => {
    await controller.batch({ ids: [1, 2], action: 'process' }, makeReq('13800000000'));
    expect(service.batch).toHaveBeenCalledWith([1, 2], 'process');
    expect(logger.audit).toHaveBeenCalledWith('inquiry.batch', '13800000000', {
      action: 'process',
      ids: [1, 2],
      count: 2,
    });
  });

  it('export：设置 xlsx 响应头并输出 buffer，随后留痕', async () => {
    const res = makeRes();
    const query = { status: 1 };
    await controller.export(query, makeReq('13800000000'), res);
    expect(res.setHeader).toHaveBeenCalledWith(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    const disposition = (res.setHeader as jest.Mock).mock.calls.find(
      (c: unknown[]) => c[0] === 'Content-Disposition',
    )?.[1] as string;
    expect(disposition).toContain('attachment; filename="inquiries_');
    expect(disposition).toContain("filename*=UTF-8''");
    expect(disposition).toContain(encodeURIComponent('.xlsx'));
    expect(res.end).toHaveBeenCalledWith(Buffer.from('xlsx-bytes'));
    expect(logger.audit).toHaveBeenCalledWith('inquiry.export', '13800000000', { count: 2, filters: query });
  });

  it('export 会话缺失时留痕 unknown', async () => {
    await controller.export({}, makeReq(undefined), makeRes());
    expect(logger.audit).toHaveBeenCalledWith('inquiry.export', 'unknown', { count: 2, filters: {} });
  });
});
