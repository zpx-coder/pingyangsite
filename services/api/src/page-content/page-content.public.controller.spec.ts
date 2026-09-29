// 官网页面内容控制器单元测试：全部配置映射 / 单配置项透传
import { PageContentPublicController } from './page-content.public.controller';
import type { PageContentService } from './page-content.service';

function makeService() {
  return {
    publicAll: jest.fn(async () => ({ home_about: { titleZh: '关于' } })),
    publicOne: jest.fn(async () => ({ titleZh: '关于' })),
  } as unknown as PageContentService;
}

describe('PageContentPublicController', () => {
  let controller: PageContentPublicController;
  let service: PageContentService;

  beforeEach(() => {
    service = makeService();
    controller = new PageContentPublicController(service);
  });

  it('publicAll 透传服务结果', async () => {
    await expect(controller.publicAll()).resolves.toEqual({ home_about: { titleZh: '关于' } });
    expect(service.publicAll).toHaveBeenCalled();
  });

  it('publicOne 透传 key', async () => {
    await controller.publicOne('home_about');
    expect(service.publicOne).toHaveBeenCalledWith('home_about');
  });
});
