// 后台页面内容控制器单元测试：透传与 audit 留痕
import type { Request } from 'express';
import { PageContentController } from './page-content.controller';
import type { PageContentService } from './page-content.service';
import type { AppLoggerService } from '../logger/app-logger.service';

function makeService() {
  return {
    list: jest.fn(async () => []),
    get: jest.fn(async () => ({ key: 'home_about', config: {} })),
    save: jest.fn(async () => ({ key: 'home_about', config: {} })),
  } as unknown as PageContentService;
}

function makeLogger() {
  return { audit: jest.fn() } as unknown as AppLoggerService;
}

function makeReq(phone?: string): Request {
  return { session: { adminPhone: phone } } as unknown as Request;
}

describe('PageContentController', () => {
  let controller: PageContentController;
  let service: PageContentService;
  let logger: AppLoggerService;

  beforeEach(() => {
    service = makeService();
    logger = makeLogger();
    controller = new PageContentController(service, logger);
  });

  it('list 透传服务结果', async () => {
    await controller.list();
    expect(service.list).toHaveBeenCalled();
  });

  it('get 透传 key', async () => {
    await controller.get('home_about');
    expect(service.get).toHaveBeenCalledWith('home_about');
  });

  it('save 透传 key 与 config 并留痕', async () => {
    const config = { titleZh: '关于' };
    await controller.save('home_about', { config }, makeReq('13800000000'));
    expect(service.save).toHaveBeenCalledWith('home_about', config);
    expect(logger.audit).toHaveBeenCalledWith('page.save', '13800000000', { key: 'home_about' });
  });

  it('save 会话缺失时留痕 unknown', async () => {
    await controller.save('home_about', { config: {} }, makeReq(undefined));
    expect(logger.audit).toHaveBeenCalledWith('page.save', 'unknown', { key: 'home_about' });
  });
});
