// 官网类目接口单元测试（PRD §6.1，任务 1.12）：公开读取仅透传服务，无会话依赖
import { CategoryPublicController } from './category.public.controller';
import type { CategoryService } from './category.service';

describe('CategoryPublicController', () => {
  it('listPublished 透传服务结果', async () => {
    const service = {
      listPublished: jest.fn(async () => [{ id: 1, nameZh: '类目' }]),
    } as unknown as CategoryService;
    const controller = new CategoryPublicController(service);
    const result = await controller.listPublished();
    expect(service.listPublished).toHaveBeenCalled();
    expect(result).toEqual([{ id: 1, nameZh: '类目' }]);
  });
});
