// 类目服务单元测试（PRD §7.3，任务 1.12）：Prisma / 翻译服务以 jest.fn 注入，
// 不碰数据库与网络，测试可独立运行、无状态共享。
// 覆盖：列表 groupBy 统计聚合（性能基线 §7 禁止循环查询）、删除保护、双语联动与一键翻译。
import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { PrismaService } from '../prisma/prisma.service';
import type { TranslationService } from '../translation/translation.service';
import { CategoryService } from './category.service';

// 翻译 mock：与源码调用签名对齐（translateSafe 接收文本数组，逐条返回映射值或 null）
function makeTranslation(translations: Record<string, string>) {
  return {
    translateSafe: jest.fn(async (texts: string[]) => texts.map((t) => translations[t] ?? null)),
  } as unknown as TranslationService;
}

function makePrisma() {
  return {
    category: {
      findMany: jest.fn(async () => []),
      count: jest.fn(async () => 0),
      findUnique: jest.fn(async () => null),
      create: jest.fn(async ({ data }: { data: Record<string, unknown> }) => ({ id: 9, ...data })),
      update: jest.fn(async ({ data }: { data: Record<string, unknown> }) => ({ id: 1, ...data })),
      delete: jest.fn(async () => ({ id: 1 })),
    },
    product: {
      groupBy: jest.fn(async () => []),
      count: jest.fn(async () => 0),
      deleteMany: jest.fn(async () => ({ count: 0 })),
    },
    companyCategory: {
      groupBy: jest.fn(async () => []),
      count: jest.fn(async () => 0),
      deleteMany: jest.fn(async () => ({ count: 0 })),
    },
    // remove 以数组形式传入事务操作，mock 原样回传便于断言调用
    $transaction: jest.fn(async (ops: unknown[]) => ops),
  } as unknown as PrismaService;
}

function makeService(translations: Record<string, string> = {}) {
  const prisma = makePrisma();
  const translation = makeTranslation(translations);
  const service = new CategoryService(prisma, translation);
  return { service, prisma, translation };
}

const CATEGORY_ROW = { id: 1, nameZh: '机械设备', nameEn: 'Machinery', sort: 0, status: 1 };

describe('CategoryService.list', () => {
  it('默认分页兜底并将产品数/企业数聚合到行', async () => {
    const { service, prisma } = makeService();
    (prisma.category.findMany as jest.Mock).mockResolvedValue([CATEGORY_ROW]);
    (prisma.category.count as jest.Mock).mockResolvedValue(7);
    (prisma.product.groupBy as jest.Mock).mockResolvedValue([{ categoryId: 1, _count: { _all: 3 } }]);
    (prisma.companyCategory.groupBy as jest.Mock).mockResolvedValue([{ categoryId: 1, _count: { _all: 2 } }]);
    const result = await service.list({});
    expect(result).toEqual({
      page: 1,
      pageSize: 20,
      total: 7,
      list: [{ ...CATEGORY_ROW, productCount: 3, companyCount: 2 }],
    });
    expect(prisma.category.findMany).toHaveBeenCalledWith({
      where: {},
      orderBy: [{ sort: 'asc' }, { id: 'desc' }],
      skip: 0,
      take: 20,
    });
  });

  it('状态与关键词组合筛选（关键词去空格、中英名 OR 匹配）', async () => {
    const { service, prisma } = makeService();
    await service.list({ status: 1, keyword: ' 机器 ' });
    expect(prisma.category.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          status: 1,
          OR: [{ nameZh: { contains: '机器' } }, { nameEn: { contains: '机器' } }],
        },
      }),
    );
  });

  it('纯空白关键词不参与筛选', async () => {
    const { service, prisma } = makeService();
    await service.list({ keyword: '   ' });
    expect(prisma.category.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: {} }));
  });

  it('无统计数据的行计数回退为 0', async () => {
    const { service, prisma } = makeService();
    (prisma.category.findMany as jest.Mock).mockResolvedValue([CATEGORY_ROW]);
    const result = await service.list({});
    expect(result.list).toEqual([{ ...CATEGORY_ROW, productCount: 0, companyCount: 0 }]);
  });

  it('自定义分页按页码计算 skip', async () => {
    const { service, prisma } = makeService();
    await service.list({ page: 3, pageSize: 10 });
    expect(prisma.category.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 20, take: 10 }),
    );
  });
});

describe('CategoryService.detail', () => {
  it('存在时附带产品数与企业数', async () => {
    const { service, prisma } = makeService();
    (prisma.category.findUnique as jest.Mock).mockResolvedValue(CATEGORY_ROW);
    (prisma.product.count as jest.Mock).mockResolvedValue(5);
    (prisma.companyCategory.count as jest.Mock).mockResolvedValue(2);
    const result = await service.detail(1);
    expect(result).toEqual({ ...CATEGORY_ROW, productCount: 5, companyCount: 2 });
  });

  it('不存在 → 404 类目不存在', async () => {
    const { service } = makeService();
    await expect(service.detail(999)).rejects.toThrow(new NotFoundException('类目不存在'));
  });
});

describe('CategoryService.create', () => {
  it('人工填写英文 → 不调用翻译并清除标记', async () => {
    const { service, prisma, translation } = makeService();
    await service.create({
      nameZh: '机械设备',
      nameEn: 'Manual Name',
      iconUrl: '/icon.png',
      introZh: '简介',
      introEn: 'Manual Intro',
      sort: 2,
      status: 1,
    });
    expect(translation.translateSafe).not.toHaveBeenCalled();
    expect(prisma.category.create).toHaveBeenCalledWith({
      data: {
        nameZh: '机械设备',
        nameEn: 'Manual Name',
        iconUrl: '/icon.png',
        introZh: '简介',
        introEn: 'Manual Intro',
        sort: 2,
        status: 1,
        machineFields: '[]',
      },
    });
  });

  it('英文留空 → 自动翻译并打机器翻译标记，排序/状态走默认值', async () => {
    const { service, prisma } = makeService({ 机械设备: 'Machinery', 简介: 'Intro' });
    await service.create({ nameZh: '机械设备', introZh: '简介' });
    expect(prisma.category.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        nameEn: 'Machinery',
        introEn: 'Intro',
        sort: 0,
        status: 1,
        machineFields: '["nameEn","introEn"]',
      }),
    });
  });

  it('翻译失败不阻塞保存（nameEn 兜底空串、introEn null、标记 null）', async () => {
    const { service, prisma } = makeService();
    await service.create({ nameZh: '机械设备', introZh: '简介' });
    expect(prisma.category.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ nameEn: '', introEn: null, machineFields: null }),
    });
  });
});

describe('CategoryService.update', () => {
  const existing = {
    id: 1,
    nameZh: '机械设备',
    nameEn: 'Machinery',
    iconUrl: '/icon.png',
    introZh: '简介',
    introEn: 'Intro',
    sort: 1,
    status: 1,
    machineFields: '["nameEn"]',
  };

  it('类目不存在 → 404', async () => {
    const { service } = makeService();
    await expect(service.update(999, {})).rejects.toThrow(new NotFoundException('类目不存在'));
  });

  it('只改 sort：未触碰字段保留原值与原机器翻译标记', async () => {
    const { service, prisma, translation } = makeService();
    (prisma.category.findUnique as jest.Mock).mockResolvedValue(existing);
    await service.update(1, { sort: 5 });
    expect(translation.translateSafe).not.toHaveBeenCalled();
    expect(prisma.category.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: {
        nameZh: '机械设备',
        nameEn: 'Machinery',
        iconUrl: '/icon.png',
        introZh: '简介',
        introEn: 'Intro',
        sort: 5,
        status: 1,
        machineFields: '["nameEn"]',
      },
    });
  });

  it('改中文未传英文 → 自动重译并打标', async () => {
    const { service, prisma } = makeService({ 新名称: 'New Name' });
    (prisma.category.findUnique as jest.Mock).mockResolvedValue(existing);
    await service.update(1, { nameZh: '新名称' });
    expect(prisma.category.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: expect.objectContaining({
        nameZh: '新名称',
        nameEn: 'New Name',
        machineFields: '["nameEn"]',
      }),
    });
  });

  it('改简介中文未传英文 → 简介自动重译并打标', async () => {
    const { service, prisma } = makeService({ 新简介: 'New Intro' });
    (prisma.category.findUnique as jest.Mock).mockResolvedValue(existing);
    await service.update(1, { introZh: '新简介' });
    expect(prisma.category.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: expect.objectContaining({
        introZh: '新简介',
        introEn: 'New Intro',
        machineFields: '["nameEn","introEn"]',
      }),
    });
  });

  it('人工填写英文 → 清除该字段标记', async () => {
    const { service, prisma } = makeService();
    (prisma.category.findUnique as jest.Mock).mockResolvedValue(existing);
    await service.update(1, { nameEn: 'Manual' });
    expect(prisma.category.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: expect.objectContaining({ nameEn: 'Manual', machineFields: '[]' }),
    });
  });

  it('空 dto 全部保留原值', async () => {
    const { service, prisma } = makeService();
    (prisma.category.findUnique as jest.Mock).mockResolvedValue(existing);
    await service.update(1, {});
    expect(prisma.category.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: expect.objectContaining({
        nameZh: '机械设备',
        nameEn: 'Machinery',
        machineFields: '["nameEn"]',
      }),
    });
  });
});

describe('CategoryService.remove', () => {
  it('类目下存在未删除产品 → 拒绝删除', async () => {
    const { service, prisma } = makeService();
    (prisma.category.findUnique as jest.Mock).mockResolvedValue(CATEGORY_ROW);
    (prisma.product.count as jest.Mock).mockResolvedValue(2);
    await expect(service.remove(1)).rejects.toThrow(
      new BadRequestException('请先迁移该类目下的产品与企业'),
    );
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('类目下存在未删除企业关联 → 拒绝删除', async () => {
    const { service, prisma } = makeService();
    (prisma.category.findUnique as jest.Mock).mockResolvedValue(CATEGORY_ROW);
    (prisma.companyCategory.count as jest.Mock).mockResolvedValue(1);
    await expect(service.remove(1)).rejects.toThrow('请先迁移该类目下的产品与企业');
  });

  it('空类目 → 事务内清理死数据后物理删除', async () => {
    const { service, prisma } = makeService();
    (prisma.category.findUnique as jest.Mock).mockResolvedValue(CATEGORY_ROW);
    await service.remove(1);
    const ops = (prisma.$transaction as jest.Mock).mock.calls[0][0] as unknown[];
    expect(ops).toHaveLength(3);
    expect(prisma.product.deleteMany).toHaveBeenCalledWith({
      where: { categoryId: 1, deletedAt: { not: null } },
    });
    expect(prisma.companyCategory.deleteMany).toHaveBeenCalledWith({
      where: { categoryId: 1, company: { deletedAt: { not: null } } },
    });
    expect(prisma.category.delete).toHaveBeenCalledWith({ where: { id: 1 } });
  });

  it('类目不存在 → 404', async () => {
    const { service } = makeService();
    await expect(service.remove(999)).rejects.toThrow('类目不存在');
  });
});

describe('CategoryService.translate', () => {
  const existing = {
    id: 1,
    nameZh: '机械设备',
    introZh: '简介',
    nameEn: 'Old',
    introEn: 'Old Intro',
    machineFields: '["nameEn"]',
  };

  it('一键翻译：重译中英文案并重新打标', async () => {
    const { service, prisma, translation } = makeService({ 机械设备: 'Machinery', 简介: 'Intro' });
    (prisma.category.findUnique as jest.Mock).mockResolvedValue(existing);
    await service.translate(1);
    expect(translation.translateSafe).toHaveBeenCalledWith(['机械设备', '简介'], 'zh', 'en');
    expect(prisma.category.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { nameEn: 'Machinery', introEn: 'Intro', machineFields: '["nameEn","introEn"]' },
    });
  });

  it('部分翻译失败 → 保留原英文、已成功字段仍打标', async () => {
    const { service, prisma } = makeService({ 机械设备: 'Machinery' });
    (prisma.category.findUnique as jest.Mock).mockResolvedValue(existing);
    await service.translate(1);
    expect(prisma.category.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { nameEn: 'Machinery', introEn: 'Old Intro', machineFields: '["nameEn"]' },
    });
  });

  it('类目不存在 → 404', async () => {
    const { service } = makeService();
    await expect(service.translate(999)).rejects.toThrow('类目不存在');
  });
});

describe('CategoryService.listPublished', () => {
  it('仅上架类目、排序升序、字段裁剪', async () => {
    const { service, prisma } = makeService();
    (prisma.category.findMany as jest.Mock).mockResolvedValue([{ id: 1, nameZh: '类目' }]);
    const result = await service.listPublished();
    expect(prisma.category.findMany).toHaveBeenCalledWith({
      where: { status: 1 },
      orderBy: [{ sort: 'asc' }, { id: 'asc' }],
      select: {
        id: true,
        nameZh: true,
        nameEn: true,
        iconUrl: true,
        introZh: true,
        introEn: true,
        sort: true,
      },
    });
    expect(result).toEqual([{ id: 1, nameZh: '类目' }]);
  });
});
