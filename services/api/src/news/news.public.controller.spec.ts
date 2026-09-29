// 官网新闻读取控制器单元测试：分页默认值（首页 4 条 / 列表 12 条）透传语义
import { NewsPublicController } from './news.public.controller';
import type { NewsService } from './news.service';

function makeService() {
  return {
    latest: jest.fn(async () => [{ id: 1 }]),
    listPublished: jest.fn(async () => ({ page: 1, pageSize: 12, total: 0, list: [] })),
    publicDetail: jest.fn(async () => ({ id: 1 })),
  } as unknown as NewsService;
}

describe('NewsPublicController', () => {
  let controller: NewsPublicController;
  let service: NewsService;

  beforeEach(() => {
    service = makeService();
    controller = new NewsPublicController(service);
  });

  it('latest 透传服务结果', async () => {
    await expect(controller.latest()).resolves.toEqual([{ id: 1 }]);
    expect(service.latest).toHaveBeenCalled();
  });

  it('listPublished 未传参使用默认分页（第 1 页 12 条）', async () => {
    await controller.listPublished(undefined, undefined);
    expect(service.listPublished).toHaveBeenCalledWith(1, 12);
  });

  it('listPublished 透传分页参数', async () => {
    await controller.listPublished(2, 12);
    expect(service.listPublished).toHaveBeenCalledWith(2, 12);
  });

  it('publicDetail 透传 id', async () => {
    await controller.publicDetail(5);
    expect(service.publicDetail).toHaveBeenCalledWith(5);
  });
});
