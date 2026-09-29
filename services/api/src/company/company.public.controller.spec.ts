// 官网企业接口单元测试（PRD §6.5，任务 1.12）：缺省参数兜底（12/页）与显式参数透传
import { CompanyPublicController } from './company.public.controller';
import type { CompanyService } from './company.service';

function makeService() {
  return {
    listPublished: jest.fn(async () => ({ page: 1, pageSize: 12, total: 0, list: [] })),
    publicDetail: jest.fn(async () => ({ id: 1 })),
  } as unknown as CompanyService;
}

describe('CompanyPublicController', () => {
  let controller: CompanyPublicController;
  let service: CompanyService;

  beforeEach(() => {
    service = makeService();
    controller = new CompanyPublicController(service);
  });

  it('listPublished 缺省参数 → (0, 1, 12)', async () => {
    await controller.listPublished(undefined, undefined, undefined);
    expect(service.listPublished).toHaveBeenCalledWith(0, 1, 12);
  });

  it('listPublished 显式参数透传', async () => {
    await controller.listPublished(2, 3, 24);
    expect(service.listPublished).toHaveBeenCalledWith(2, 3, 24);
  });

  it('publicDetail 缺省分页 → (id, 1, 12)', async () => {
    await controller.publicDetail(5, undefined, undefined);
    expect(service.publicDetail).toHaveBeenCalledWith(5, 1, 12);
  });

  it('publicDetail 显式分页透传', async () => {
    await controller.publicDetail(5, 2, 24);
    expect(service.publicDetail).toHaveBeenCalledWith(5, 2, 24);
  });
});
