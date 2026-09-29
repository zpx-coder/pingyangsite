// 产品服务单元测试（PRD §7.1，任务 1.12）：Prisma / 翻译服务以 jest.fn 注入，
// 不碰数据库与网络；覆盖状态流转、批量操作、企业关联解除、双语联动与官网详情映射。
import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { PrismaService } from '../prisma/prisma.service';
import type { TranslationService } from '../translation/translation.service';
import { ProductService } from './product.service';

// 翻译 mock：与源码调用签名对齐（translateSafe 接收文本数组，逐条返回映射值或 null）
function makeTranslation(translations: Record<string, string>) {
  return {
    translateSafe: jest.fn(async (texts: string[]) => texts.map((t) => translations[t] ?? null)),
  } as unknown as TranslationService;
}

function makePrisma() {
  return {
    product: {
      findMany: jest.fn(async () => []),
      count: jest.fn(async () => 0),
      findFirst: jest.fn(async () => null),
      create: jest.fn(async ({ data }: { data: Record<string, unknown> }) => ({ id: 7, ...data })),
      update: jest.fn(async ({ data }: { data: Record<string, unknown> }) => ({ id: 1, ...data })),
      updateMany: jest.fn(async () => ({ count: 0 })),
    },
    category: { findFirst: jest.fn(async () => null) },
    company: { findFirst: jest.fn(async () => null) },
  } as unknown as PrismaService;
}

function makeService(translations: Record<string, string> = {}) {
  const prisma = makePrisma();
  const translation = makeTranslation(translations);
  const service = new ProductService(prisma, translation);
  return { service, prisma, translation };
}

const PRODUCT_ROW = {
  id: 1,
  nameZh: '产品A',
  nameEn: 'Product A',
  mainImage: '/main.png',
  images: '["a.jpg","b.jpg"]',
  introZh: '简介',
  introEn: 'Intro',
  detailZh: '详情',
  detailEn: 'Detail',
  priceRef: '10-20元',
  moq: '100件',
  sort: 0,
  status: 1,
  categoryId: 10,
  companyId: 20,
  deletedAt: null,
  machineFields: null,
  category: { id: 10, nameZh: '类目1' },
  company: { id: 20, nameZh: '企业A' },
};

describe('ProductService.list', () => {
  it('默认分页并完成视图映射（images 解析）', async () => {
    const { service, prisma } = makeService();
    (prisma.product.findMany as jest.Mock).mockResolvedValue([PRODUCT_ROW]);
    (prisma.product.count as jest.Mock).mockResolvedValue(9);
    const result = await service.list({});
    expect(result).toEqual(expect.objectContaining({ page: 1, pageSize: 20, total: 9 }));
    expect(result.list[0]).toMatchObject({
      id: 1,
      images: ['a.jpg', 'b.jpg'],
      category: { id: 10, nameZh: '类目1' },
      company: { id: 20, nameZh: '企业A' },
    });
    expect(prisma.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { deletedAt: null }, skip: 0, take: 20 }),
    );
  });

  it('状态/类目/关键词组合筛选（关键词去空格）', async () => {
    const { service, prisma } = makeService();
    await service.list({ status: 0, categoryId: 5, keyword: ' 钢 ' });
    expect(prisma.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          deletedAt: null,
          status: 0,
          categoryId: 5,
          OR: [{ nameZh: { contains: '钢' } }, { nameEn: { contains: '钢' } }],
        },
      }),
    );
  });
});

describe('ProductService.detail', () => {
  it('存在 → 返回视图（images 解析）', async () => {
    const { service, prisma } = makeService();
    (prisma.product.findFirst as jest.Mock).mockResolvedValue(PRODUCT_ROW);
    const result = await service.detail(1);
    expect(result).toMatchObject({ id: 1, images: ['a.jpg', 'b.jpg'], category: { id: 10 } });
  });

  it('不存在（含已删除）→ 404 产品不存在', async () => {
    const { service } = makeService();
    await expect(service.detail(999)).rejects.toThrow(new NotFoundException('产品不存在'));
  });
});

describe('ProductService.create', () => {
  const dto = {
    nameZh: '产品',
    nameEn: 'Manual',
    categoryId: 10,
    companyId: 20,
    mainImage: '/m.png',
    images: ['a.jpg'],
    introZh: '简介',
    detailZh: '详情',
    priceRef: 'x',
    moq: '1件',
  };

  it('类目/企业校验通过 → 创建（images 序列化、默认草稿）并回读详情', async () => {
    const { service, prisma } = makeService();
    (prisma.category.findFirst as jest.Mock).mockResolvedValue({ id: 10, status: 1 });
    (prisma.company.findFirst as jest.Mock).mockResolvedValue({ id: 20, nameZh: '企业' });
    (prisma.product.findFirst as jest.Mock).mockResolvedValue({ ...PRODUCT_ROW, id: 7 });
    const result = await service.create(dto);
    expect(prisma.category.findFirst).toHaveBeenCalledWith({ where: { id: 10 } });
    expect(prisma.company.findFirst).toHaveBeenCalledWith({ where: { id: 20, deletedAt: null } });
    expect(prisma.product.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        categoryId: 10,
        companyId: 20,
        images: '["a.jpg"]',
        nameEn: 'Manual',
        machineFields: '[]',
        sort: 0,
        status: 0,
      }),
    });
    expect(result).toMatchObject({ id: 7, images: ['a.jpg', 'b.jpg'] });
  });

  it('companyId 未传 → 不校验企业、落库 null', async () => {
    const { service, prisma } = makeService();
    (prisma.category.findFirst as jest.Mock).mockResolvedValue({ id: 10, status: 1 });
    (prisma.product.findFirst as jest.Mock).mockResolvedValue({ ...PRODUCT_ROW, id: 7 });
    await service.create({
      nameZh: '产品',
      categoryId: 10,
      mainImage: '/m.png',
      detailZh: '详情',
    });
    expect(prisma.company.findFirst).not.toHaveBeenCalled();
    expect(prisma.product.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ companyId: null }),
    });
  });

  it('companyId 显式传 null → 不校验企业、落库 null（与 update 语义一致）', async () => {
    const { service, prisma } = makeService();
    (prisma.category.findFirst as jest.Mock).mockResolvedValue({ id: 10, status: 1 });
    (prisma.product.findFirst as jest.Mock).mockResolvedValue({ ...PRODUCT_ROW, id: 7 });
    await service.create({
      nameZh: '产品',
      categoryId: 10,
      mainImage: '/m.png',
      detailZh: '详情',
      companyId: null,
    } as never);
    expect(prisma.company.findFirst).not.toHaveBeenCalled();
    expect(prisma.product.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ companyId: null }),
    });
  });

  it('companyId 传 0 → 校验企业并拒绝（仅绕过 DTO 直连服务可触发）', async () => {
    const { service, prisma } = makeService();
    (prisma.category.findFirst as jest.Mock).mockResolvedValue({ id: 10, status: 1 });
    await expect(
      service.create({ ...dto, companyId: 0 }),
    ).rejects.toThrow(new BadRequestException('关联企业不存在'));
    expect(prisma.company.findFirst).toHaveBeenCalled();
  });

  it('所属类目不存在 → 400', async () => {
    const { service } = makeService();
    await expect(service.create(dto)).rejects.toThrow(
      new BadRequestException('所属类目不存在或已下架'),
    );
  });

  it('所属类目已下架 → 400', async () => {
    const { service, prisma } = makeService();
    (prisma.category.findFirst as jest.Mock).mockResolvedValue({ id: 10, status: 0 });
    await expect(service.create(dto)).rejects.toThrow('所属类目不存在或已下架');
  });

  it('关联企业不存在 → 400', async () => {
    const { service, prisma } = makeService();
    (prisma.category.findFirst as jest.Mock).mockResolvedValue({ id: 10, status: 1 });
    await expect(service.create(dto)).rejects.toThrow(new BadRequestException('关联企业不存在'));
  });

  it('英文留空 → 自动翻译并打标（intro 中文为空不打标）', async () => {
    const { service, prisma } = makeService({ 产品: 'Product En', 详情: 'Detail En' });
    (prisma.category.findFirst as jest.Mock).mockResolvedValue({ id: 10, status: 1 });
    (prisma.product.findFirst as jest.Mock).mockResolvedValue({ ...PRODUCT_ROW, id: 7 });
    await service.create({ nameZh: '产品', categoryId: 10, mainImage: '/m.png', detailZh: '详情' });
    expect(prisma.product.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        nameEn: 'Product En',
        detailEn: 'Detail En',
        introEn: null,
        machineFields: '["nameEn","detailEn"]',
      }),
    });
  });
});

describe('ProductService.update', () => {
  it('只改 priceRef：未触碰双语字段保留原值、翻译不触发', async () => {
    const { service, prisma, translation } = makeService();
    (prisma.product.findFirst as jest.Mock).mockResolvedValue(PRODUCT_ROW);
    await service.update(1, { priceRef: '20元' });
    expect(translation.translateSafe).not.toHaveBeenCalled();
    expect(prisma.product.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: expect.objectContaining({
        priceRef: '20元',
        companyId: 20,
        nameEn: 'Product A',
        images: '["a.jpg","b.jpg"]',
        machineFields: null,
      }),
    });
  });

  it('companyId 显式传 null → 解除关联且不校验企业', async () => {
    const { service, prisma } = makeService();
    (prisma.product.findFirst as jest.Mock).mockResolvedValue(PRODUCT_ROW);
    await service.update(1, { companyId: null });
    expect(prisma.company.findFirst).not.toHaveBeenCalled();
    expect(prisma.product.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: expect.objectContaining({ companyId: null }),
    });
  });

  it('companyId 传正整数 → 校验存在后更新', async () => {
    const { service, prisma } = makeService();
    (prisma.product.findFirst as jest.Mock).mockResolvedValue(PRODUCT_ROW);
    (prisma.company.findFirst as jest.Mock).mockResolvedValue({ id: 30, nameZh: '企业B' });
    await service.update(1, { companyId: 30 });
    expect(prisma.company.findFirst).toHaveBeenCalledWith({ where: { id: 30, deletedAt: null } });
    expect(prisma.product.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: expect.objectContaining({ companyId: 30 }),
    });
  });

  it('关联企业不存在 → 400', async () => {
    const { service, prisma } = makeService();
    (prisma.product.findFirst as jest.Mock).mockResolvedValue(PRODUCT_ROW);
    await expect(service.update(1, { companyId: 30 })).rejects.toThrow('关联企业不存在');
  });

  it('companyId 传 0 → 校验企业并拒绝（不再跳过校验）', async () => {
    const { service, prisma } = makeService();
    (prisma.product.findFirst as jest.Mock).mockResolvedValue(PRODUCT_ROW);
    await expect(service.update(1, { companyId: 0 })).rejects.toThrow(
      new BadRequestException('关联企业不存在'),
    );
    expect(prisma.company.findFirst).toHaveBeenCalled();
  });

  it('切换类目不存在/下架 → 400', async () => {
    const { service, prisma } = makeService();
    (prisma.product.findFirst as jest.Mock).mockResolvedValue(PRODUCT_ROW);
    (prisma.category.findFirst as jest.Mock).mockResolvedValue({ id: 99, status: 0 });
    await expect(service.update(1, { categoryId: 99 })).rejects.toThrow('所属类目不存在或已下架');
  });

  it('改简介中文 → 简介自动重译并打标', async () => {
    const { service, prisma } = makeService({ 新简介: 'New Intro' });
    (prisma.product.findFirst as jest.Mock).mockResolvedValue(PRODUCT_ROW);
    await service.update(1, { introZh: '新简介' });
    expect(prisma.product.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: expect.objectContaining({
        introZh: '新简介',
        introEn: 'New Intro',
        machineFields: '["introEn"]',
      }),
    });
  });

  it('改详情中文 → 详情自动重译并打标', async () => {
    const { service, prisma } = makeService({ 新详情: 'New Detail' });
    (prisma.product.findFirst as jest.Mock).mockResolvedValue(PRODUCT_ROW);
    await service.update(1, { detailZh: '新详情' });
    expect(prisma.product.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: expect.objectContaining({
        detailZh: '新详情',
        detailEn: 'New Detail',
        machineFields: '["detailEn"]',
      }),
    });
  });

  it('改中文未传英文 → 自动重译并打标', async () => {
    const { service, prisma } = makeService({ 新产品: 'New Product' });
    (prisma.product.findFirst as jest.Mock).mockResolvedValue(PRODUCT_ROW);
    await service.update(1, { nameZh: '新产品' });
    expect(prisma.product.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: expect.objectContaining({ nameZh: '新产品', nameEn: 'New Product' }),
    });
  });

  it('产品不存在 → 404', async () => {
    const { service } = makeService();
    await expect(service.update(999, { priceRef: 'x' })).rejects.toThrow('产品不存在');
  });
});

describe('ProductService.updateStatus', () => {
  it('状态流转成功并回读详情', async () => {
    const { service, prisma } = makeService();
    (prisma.product.findFirst as jest.Mock).mockResolvedValue(PRODUCT_ROW);
    const result = await service.updateStatus(1, 2);
    expect(prisma.product.update).toHaveBeenCalledWith({ where: { id: 1 }, data: { status: 2 } });
    expect(result).toMatchObject({ id: 1, status: 1 });
  });

  it('产品不存在 → 404', async () => {
    const { service } = makeService();
    await expect(service.updateStatus(999, 1)).rejects.toThrow('产品不存在');
  });
});

describe('ProductService.batch', () => {
  it('批量删除：仅作用未删除产品并写 deletedAt', async () => {
    const { service, prisma } = makeService();
    (prisma.product.updateMany as jest.Mock).mockResolvedValue({ count: 3 });
    const result = await service.batch([1, 2, 3], 'delete');
    expect(prisma.product.updateMany).toHaveBeenCalledWith({
      where: { id: { in: [1, 2, 3] }, deletedAt: null },
      data: { deletedAt: expect.any(Date) },
    });
    expect(result).toEqual({ count: 3 });
  });

  it('批量上架 → status 1', async () => {
    const { service, prisma } = makeService();
    (prisma.product.updateMany as jest.Mock).mockResolvedValue({ count: 2 });
    const result = await service.batch([1, 2], 'publish');
    expect(prisma.product.updateMany).toHaveBeenCalledWith({
      where: { id: { in: [1, 2] }, deletedAt: null },
      data: { status: 1 },
    });
    expect(result).toEqual({ count: 2 });
  });

  it('批量下架 → status 2', async () => {
    const { service, prisma } = makeService();
    await service.batch([1], 'unpublish');
    expect(prisma.product.updateMany).toHaveBeenCalledWith({
      where: { id: { in: [1] }, deletedAt: null },
      data: { status: 2 },
    });
  });
});

describe('ProductService.remove', () => {
  it('逻辑删除：更新 deletedAt 时间戳', async () => {
    const { service, prisma } = makeService();
    (prisma.product.findFirst as jest.Mock).mockResolvedValue(PRODUCT_ROW);
    await service.remove(1);
    expect(prisma.product.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { deletedAt: expect.any(Date) },
    });
  });

  it('产品不存在 → 404', async () => {
    const { service } = makeService();
    await expect(service.remove(999)).rejects.toThrow('产品不存在');
  });
});

describe('ProductService.listPublished', () => {
  it('指定类目 → 仅已发布未删除且按类目过滤', async () => {
    const { service, prisma } = makeService();
    (prisma.product.findMany as jest.Mock).mockResolvedValue([
      { ...PRODUCT_ROW, company: { id: 20, nameZh: '企业A', nameEn: 'Co A' } },
    ]);
    (prisma.product.count as jest.Mock).mockResolvedValue(1);
    const result = await service.listPublished(5, 1, 12);
    expect(prisma.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { status: 1, deletedAt: null, categoryId: 5 } }),
    );
    expect(result.list[0]).toMatchObject({
      id: 1,
      company: { id: 20, nameZh: '企业A', nameEn: 'Co A' },
    });
    expect(result.list[0]).not.toHaveProperty('images');
  });

  it('categoryId 为 0 → 不按类目过滤；无企业产品 company 为 null', async () => {
    const { service, prisma } = makeService();
    (prisma.product.findMany as jest.Mock).mockResolvedValue([{ ...PRODUCT_ROW, company: null }]);
    await service.listPublished(0, 1, 12);
    expect(prisma.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { status: 1, deletedAt: null } }),
    );
    const result = await service.listPublished(0, 1, 12);
    expect(result.list[0].company).toBeNull();
  });
});

describe('ProductService.publicDetail', () => {
  const publishedRow = {
    ...PRODUCT_ROW,
    category: { id: 10, nameZh: '类目1', nameEn: 'Cat1' },
    company: { id: 20, nameZh: '企业A', nameEn: 'Co A', logoUrl: '/logo.png' },
  };

  it('存在 → 公开字段 + 图集解析 + 该企业其他产品', async () => {
    const { service, prisma } = makeService();
    (prisma.product.findFirst as jest.Mock).mockResolvedValue(publishedRow);
    (prisma.product.findMany as jest.Mock).mockResolvedValue([]);
    const result = await service.publicDetail(1);
    expect(result).toMatchObject({
      id: 1,
      gallery: ['a.jpg', 'b.jpg'],
      category: { id: 10, nameZh: '类目1', nameEn: 'Cat1' },
      company: { id: 20, nameZh: '企业A', nameEn: 'Co A' },
      otherProducts: [],
    });
    expect(prisma.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { companyId: 20, status: 1, deletedAt: null, id: { not: 1 } },
        take: 8,
      }),
    );
  });

  it('未关联企业 → otherProducts 为空且不发起查询', async () => {
    const { service, prisma } = makeService();
    (prisma.product.findFirst as jest.Mock).mockResolvedValue({
      ...publishedRow,
      companyId: null,
      company: null,
    });
    const result = await service.publicDetail(1);
    expect(result.company).toBeNull();
    expect(result.otherProducts).toEqual([]);
    expect(prisma.product.findMany).not.toHaveBeenCalled();
  });

  it('下架/删除/不存在 → 404 产品不存在', async () => {
    const { service } = makeService();
    await expect(service.publicDetail(999)).rejects.toThrow(new NotFoundException('产品不存在'));
  });
});
