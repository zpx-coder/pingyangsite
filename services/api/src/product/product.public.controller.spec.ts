// 官网产品接口单元测试（PRD §6.3/§6.4，任务 1.12）：缺省参数兜底（12/页）与透传
import { ProductPublicController } from './product.public.controller';
import type { ProductService } from './product.service';

function makeService() {
  return {
    listPublished: jest.fn(async () => ({ page: 1, pageSize: 12, total: 0, list: [] })),
    publicDetail: jest.fn(async () => ({ id: 1 })),
  } as unknown as ProductService;
}

describe('ProductPublicController', () => {
  let controller: ProductPublicController;
  let service: ProductService;

  beforeEach(() => {
    service = makeService();
    controller = new ProductPublicController(service);
  });

  it('listPublished 缺省参数 → (0, 1, 12)', async () => {
    await controller.listPublished(undefined, undefined, undefined);
    expect(service.listPublished).toHaveBeenCalledWith(0, 1, 12);
  });

  it('listPublished 显式参数透传', async () => {
    await controller.listPublished(2, 3, 24);
    expect(service.listPublished).toHaveBeenCalledWith(2, 3, 24);
  });

  it('publicDetail 透传 id', async () => {
    expect(await controller.publicDetail(5)).toEqual({ id: 1 });
    expect(service.publicDetail).toHaveBeenCalledWith(5);
  });
});
