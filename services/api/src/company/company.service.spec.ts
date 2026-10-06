// 企业服务单元测试（PRD §7.2，任务 1.12）：Prisma / 翻译服务以 jest.fn 注入，
// 不碰数据库与网络；覆盖类目多选整体替换事务、逻辑删除、双语联动与官网视图映射。
import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { PrismaService } from '../prisma/prisma.service';
import type { TranslationService } from '../translation/translation.service';
import { CompanyService } from './company.service';

// 翻译 mock：与源码调用签名对齐（translateSafe 接收文本数组，逐条返回映射值或 null）
function makeTranslation(translations: Record<string, string>) {
  return {
    translateSafe: jest.fn(async (texts: string[]) => texts.map((t) => translations[t] ?? null)),
  } as unknown as TranslationService;
}

function makePrisma() {
  const company = {
    findMany: jest.fn(async () => []),
    count: jest.fn(async () => 0),
    findFirst: jest.fn(async () => null),
    create: jest.fn(async ({ data }: { data: Record<string, unknown> }) => ({ id: 5, ...data })),
    update: jest.fn(async ({ data }: { data: Record<string, unknown> }) => ({ id: 1, ...data })),
  };
  const companyCategory = {
    createMany: jest.fn(async () => ({ count: 1 })),
    deleteMany: jest.fn(async () => ({ count: 0 })),
  };
  return {
    company,
    companyCategory,
    category: { count: jest.fn(async () => 0) },
    product: {
      count: jest.fn(async () => 0),
      findMany: jest.fn(async () => []),
      groupBy: jest.fn(async () => []),
    },
    // create/update 以回调形式使用事务：mock 以共享客户端执行回调，断言落在各模型方法上
    $transaction: jest.fn(async (fn: (tx: unknown) => unknown) => fn({ company, companyCategory })),
  } as unknown as PrismaService;
}

function makeService(translations: Record<string, string> = {}) {
  const prisma = makePrisma();
  const translation = makeTranslation(translations);
  const service = new CompanyService(prisma, translation);
  return { service, prisma, translation };
}

const COMPANY_ROW = {
  id: 1,
  nameZh: '企业A',
  nameEn: 'Company A',
  logoUrl: '/logo.png',
  coverUrl: '/cover.png',
  foundedYear: 2010,
  scale: '100人',
  scaleEn: '100 employees',
  address: '平阳县',
  addressEn: 'Pingyang County',
  contactName: '张三',
  contactNameEn: 'Zhang San',
  phone: '13800000000',
  email: 'a@example.com',
  website: 'https://a.example.com',
  introZh: '企业简介',
  introEn: 'Intro',
  honorImages: '["h1.jpg","h2.jpg"]',
  sort: 0,
  status: 1,
  deletedAt: null,
  machineFields: null,
  companyCategories: [{ category: { id: 10, nameZh: '类目1', nameEn: 'Cat1' } }],
};

describe('CompanyService.list', () => {
  it('默认分页并完成后台视图映射（honorImages 解析、类目标签扁平化、产品数聚合）', async () => {
    const { service, prisma } = makeService();
    (prisma.company.findMany as jest.Mock).mockResolvedValue([COMPANY_ROW]);
    (prisma.company.count as jest.Mock).mockResolvedValue(3);
    (prisma.product.groupBy as jest.Mock).mockResolvedValue([{ companyId: 1, _count: { _all: 6 } }]);
    const result = await service.list({});
    expect(result).toEqual(expect.objectContaining({ page: 1, pageSize: 20, total: 3 }));
    expect(result.list[0]).toMatchObject({
      id: 1,
      honorImages: ['h1.jpg', 'h2.jpg'],
      categories: [{ id: 10, nameZh: '类目1' }],
      productCount: 6,
    });
    expect(result.list[0]).not.toHaveProperty('companyCategories');
    expect(prisma.company.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { deletedAt: null }, skip: 0, take: 20 }),
    );
    expect(prisma.product.groupBy).toHaveBeenCalledWith({
      by: ['companyId'],
      where: { companyId: { in: [1] }, deletedAt: null },
      _count: { _all: true },
    });
  });

  it('产品数聚合：无关联产品补 0（列表页产品数列）', async () => {
    const { service, prisma } = makeService();
    (prisma.company.findMany as jest.Mock).mockResolvedValue([COMPANY_ROW]);
    const result = await service.list({});
    expect(result.list[0].productCount).toBe(0);
  });

  it('状态/类目/关键词组合筛选（关键词去空格）', async () => {
    const { service, prisma } = makeService();
    await service.list({ status: 0, categoryId: 7, keyword: ' 平 ' });
    expect(prisma.company.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          deletedAt: null,
          status: 0,
          companyCategories: { some: { categoryId: 7 } },
          OR: [{ nameZh: { contains: '平' } }, { nameEn: { contains: '平' } }],
        },
      }),
    );
  });
});

describe('CompanyService.detail', () => {
  it('存在时附带产品数', async () => {
    const { service, prisma } = makeService();
    (prisma.company.findFirst as jest.Mock).mockResolvedValue(COMPANY_ROW);
    (prisma.product.count as jest.Mock).mockResolvedValue(5);
    const result = await service.detail(1);
    expect(result).toMatchObject({
      id: 1,
      productCount: 5,
      honorImages: ['h1.jpg', 'h2.jpg'],
      categories: [{ id: 10, nameZh: '类目1' }],
    });
  });

  it('不存在（含已删除）→ 404 企业不存在', async () => {
    const { service } = makeService();
    await expect(service.detail(999)).rejects.toThrow(new NotFoundException('企业不存在'));
  });
});

describe('CompanyService.create', () => {
  const dto = {
    nameZh: '企业',
    nameEn: 'Manual',
    logoUrl: '/l.png',
    categoryIds: [10, 11],
    introZh: '简介',
    honorImages: ['h1.jpg'],
    sort: 2,
    status: 0,
  };

  it('类目校验通过后事务内创建并回读详情', async () => {
    const { service, prisma } = makeService();
    (prisma.category.count as jest.Mock).mockResolvedValue(2);
    (prisma.company.findFirst as jest.Mock).mockResolvedValue({
      ...COMPANY_ROW,
      id: 5,
      nameZh: '企业',
      nameEn: 'Manual',
      honorImages: '["h1.jpg"]',
    });
    const result = await service.create(dto);
    expect(prisma.category.count).toHaveBeenCalledWith({ where: { id: { in: [10, 11] } } });
    expect(prisma.company.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        nameZh: '企业',
        nameEn: 'Manual',
        honorImages: '["h1.jpg"]',
        machineFields: '[]',
        sort: 2,
        status: 0,
      }),
    });
    expect(prisma.companyCategory.createMany).toHaveBeenCalledWith({
      data: [
        { companyId: 5, categoryId: 10 },
        { companyId: 5, categoryId: 11 },
      ],
    });
    expect(result).toMatchObject({ id: 5, productCount: 0, honorImages: ['h1.jpg'] });
  });

  it('英文留空 → 自动翻译并打标', async () => {
    const { service, prisma } = makeService({ 企业: 'Company' });
    (prisma.category.count as jest.Mock).mockResolvedValue(1);
    (prisma.company.findFirst as jest.Mock).mockResolvedValue({
      ...COMPANY_ROW,
      id: 5,
      nameZh: '企业',
      honorImages: '[]',
    });
    await service.create({ nameZh: '企业', logoUrl: '/l.png', categoryIds: [1], introZh: '简介' });
    expect(prisma.company.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ nameEn: 'Company', machineFields: '["nameEn"]' }),
    });
  });

  it('所选类目不存在 → 400 且不落库', async () => {
    const { service, prisma } = makeService();
    (prisma.category.count as jest.Mock).mockResolvedValue(1);
    await expect(service.create(dto)).rejects.toThrow(new BadRequestException('所选类目不存在'));
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('缺省字段走默认值（荣誉空数组、排序 0、上架）', async () => {
    const { service, prisma } = makeService();
    (prisma.category.count as jest.Mock).mockResolvedValue(1);
    (prisma.company.findFirst as jest.Mock).mockResolvedValue({
      ...COMPANY_ROW,
      id: 5,
      nameZh: '企业',
      honorImages: '[]',
    });
    await service.create({ nameZh: '企业', logoUrl: '/l.png', categoryIds: [1], introZh: '简介' });
    expect(prisma.company.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ honorImages: '[]', sort: 0, status: 1, nameEn: '' }),
    });
  });
});

describe('CompanyService.update', () => {
  it('只改 scale：scale 已双语化——自动翻译 scaleEn 打标，其余双语字段保留原值', async () => {
    const { service, prisma, translation } = makeService({ '200人': '200 people' });
    (prisma.company.findFirst as jest.Mock).mockResolvedValue(COMPANY_ROW);
    await service.update(1, { scale: '200人' });
    expect(translation.translateSafe).toHaveBeenCalledWith(['200人'], 'zh', 'en');
    expect(prisma.company.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: expect.objectContaining({
        scale: '200人',
        scaleEn: '200 people',
        nameEn: 'Company A',
        honorImages: '["h1.jpg","h2.jpg"]',
        machineFields: '["scaleEn"]',
      }),
    });
    expect(prisma.companyCategory.deleteMany).not.toHaveBeenCalled();
  });

  it('categoryIds 传入 → 整体替换关联（先删后建）', async () => {
    const { service, prisma } = makeService();
    (prisma.company.findFirst as jest.Mock).mockResolvedValue(COMPANY_ROW);
    (prisma.category.count as jest.Mock).mockResolvedValue(1);
    await service.update(1, { categoryIds: [20] });
    expect(prisma.company.update).toHaveBeenCalled();
    expect(prisma.companyCategory.deleteMany).toHaveBeenCalledWith({ where: { companyId: 1 } });
    expect(prisma.companyCategory.createMany).toHaveBeenCalledWith({
      data: [{ companyId: 1, categoryId: 20 }],
    });
  });

  it('替换的类目不存在 → 400 且不更新', async () => {
    const { service, prisma } = makeService();
    (prisma.company.findFirst as jest.Mock).mockResolvedValue(COMPANY_ROW);
    (prisma.category.count as jest.Mock).mockResolvedValue(0);
    await expect(service.update(1, { categoryIds: [20] })).rejects.toThrow('所选类目不存在');
    expect(prisma.company.update).not.toHaveBeenCalled();
  });

  it('改简介中文未传英文 → 简介自动重译并打标', async () => {
    const { service, prisma } = makeService({ 新简介: 'New Intro' });
    (prisma.company.findFirst as jest.Mock).mockResolvedValue(COMPANY_ROW);
    await service.update(1, { introZh: '新简介' });
    expect(prisma.company.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: expect.objectContaining({ introZh: '新简介', introEn: 'New Intro', machineFields: '["introEn"]' }),
    });
  });

  it('改地址中文未传英文 → 地址自动重译并打标（遗留 #2 双语联动）', async () => {
    const { service, prisma } = makeService({ 新地址: 'New Address' });
    (prisma.company.findFirst as jest.Mock).mockResolvedValue(COMPANY_ROW);
    await service.update(1, { address: '新地址' });
    expect(prisma.company.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: expect.objectContaining({
        address: '新地址',
        addressEn: 'New Address',
        contactNameEn: 'Zhang San',
        machineFields: '["addressEn"]',
      }),
    });
  });

  it('只改 scale：地址/联系人英文保留原值', async () => {
    const { service, prisma } = makeService();
    (prisma.company.findFirst as jest.Mock).mockResolvedValue(COMPANY_ROW);
    await service.update(1, { scale: '200人' });
    expect(prisma.company.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: expect.objectContaining({ addressEn: 'Pingyang County', contactNameEn: 'Zhang San' }),
    });
  });

  it('改中文未传英文 → 自动重译并打标', async () => {
    const { service, prisma } = makeService({ 新名称: 'New Co' });
    (prisma.company.findFirst as jest.Mock).mockResolvedValue(COMPANY_ROW);
    await service.update(1, { nameZh: '新名称' });
    expect(prisma.company.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: expect.objectContaining({ nameZh: '新名称', nameEn: 'New Co', machineFields: '["nameEn"]' }),
    });
  });

  it('企业不存在 → 404', async () => {
    const { service } = makeService();
    await expect(service.update(999, { scale: '200人' })).rejects.toThrow('企业不存在');
  });
});

describe('CompanyService.remove', () => {
  it('逻辑删除：更新 deletedAt 时间戳', async () => {
    const { service, prisma } = makeService();
    (prisma.company.findFirst as jest.Mock).mockResolvedValue(COMPANY_ROW);
    await service.remove(1);
    expect(prisma.company.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { deletedAt: expect.any(Date) },
    });
  });

  it('企业不存在 → 404', async () => {
    const { service } = makeService();
    await expect(service.remove(999)).rejects.toThrow('企业不存在');
  });
});

describe('CompanyService.listPublished', () => {
  it('指定类目 → 仅上架未删除且带类目关联过滤', async () => {
    const { service, prisma } = makeService();
    (prisma.company.findMany as jest.Mock).mockResolvedValue([COMPANY_ROW]);
    (prisma.company.count as jest.Mock).mockResolvedValue(1);
    const result = await service.listPublished(3, 1, 12);
    expect(prisma.company.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          status: 1,
          deletedAt: null,
          companyCategories: { some: { categoryId: 3 } },
        },
      }),
    );
    expect(result.list[0]).toMatchObject({
      nameEn: 'Company A',
      honorImages: ['h1.jpg', 'h2.jpg'],
      categories: [{ id: 10, nameZh: '类目1', nameEn: 'Cat1' }],
    });
  });

  it('categoryId 为 0 → 不按类目过滤', async () => {
    const { service, prisma } = makeService();
    await service.listPublished(0, 1, 12);
    expect(prisma.company.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { status: 1, deletedAt: null } }),
    );
  });
});

describe('CompanyService.publicDetail', () => {
  it('存在 → 返回公开视图与分页产品', async () => {
    const { service, prisma } = makeService();
    (prisma.company.findFirst as jest.Mock).mockResolvedValue(COMPANY_ROW);
    (prisma.product.findMany as jest.Mock).mockResolvedValue([{ id: 7, nameZh: '产品A' }]);
    (prisma.product.count as jest.Mock).mockResolvedValue(4);
    const result = await service.publicDetail(1, 2, 12);
    expect(result).toMatchObject({
      id: 1,
      nameEn: 'Company A',
      products: { page: 2, pageSize: 12, total: 4, list: [{ id: 7, nameZh: '产品A' }] },
    });
  });

  it('下架/删除/不存在 → 404 企业不存在', async () => {
    const { service } = makeService();
    await expect(service.publicDetail(999, 1, 12)).rejects.toThrow(
      new NotFoundException('企业不存在'),
    );
  });
});
