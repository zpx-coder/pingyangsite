// 新闻服务单元测试（PRD §7.4.1 / §6.1 / §6.6 / §6.7，任务 1.12）
// mock 模式：Prisma / 翻译服务均以 jest.fn 注入，不依赖数据库、Redis 与网络。
import { NotFoundException } from '@nestjs/common';
import { NewsService } from './news.service';
import type { PrismaService } from '../prisma/prisma.service';
import type { TranslationService } from '../translation/translation.service';
import type { CreateNewsDto } from './dto/create-news.dto';

const EXISTING = {
  id: 1,
  titleZh: '旧标题',
  titleEn: 'Old Title',
  summaryZh: '旧摘要',
  summaryEn: 'Old Summary',
  contentZh: '旧正文',
  contentEn: 'Old Content',
  machineFields: '["titleEn"]',
  coverUrl: 'https://example.com/old.jpg',
  publishTime: new Date('2026-01-01T00:00:00.000Z'),
  isTop: false,
  status: 0,
  deletedAt: null,
};

function makePrisma() {
  return {
    news: {
      findMany: jest.fn(async () => []),
      count: jest.fn(async () => 0),
      create: jest.fn(async ({ data }: { data: Record<string, unknown> }) => ({ id: 1, ...data })),
      update: jest.fn(async ({ data }: { data: Record<string, unknown> }) => ({ ...EXISTING, ...data })),
      findFirst: jest.fn(async () => null),
    },
  } as unknown as PrismaService;
}

// 翻译替身：仅对映射表中的文本返回译文，其余返回 null（翻译失败保持为空）
function makeTranslation(translations: Record<string, string> = {}) {
  return {
    translateSafe: jest.fn(async (texts: string[]) => texts.map((t) => translations[t] ?? null)),
  } as unknown as TranslationService;
}

function makeService(translations: Record<string, string> = {}) {
  const prisma = makePrisma();
  const translation = makeTranslation(translations);
  const service = new NewsService(prisma, translation);
  return { service, prisma, translation };
}

function makeDto(): CreateNewsDto {
  return {
    titleZh: '新闻标题',
    contentZh: '正文内容'.repeat(5),
    publishTime: '2026-01-01T08:00:00.000Z',
  };
}

describe('NewsService.list', () => {
  it('默认分页：第 1 页 20 条，仅过滤已逻辑删除', async () => {
    const { service, prisma } = makeService();
    (prisma.news.findMany as jest.Mock).mockResolvedValueOnce([{ id: 1 }]);
    (prisma.news.count as jest.Mock).mockResolvedValueOnce(1);
    const result = await service.list({});
    expect(prisma.news.findMany).toHaveBeenCalledWith({
      where: { deletedAt: null },
      orderBy: [{ isTop: 'desc' }, { publishTime: 'desc' }, { id: 'desc' }],
      skip: 0,
      take: 20,
    });
    expect(prisma.news.count).toHaveBeenCalledWith({ where: { deletedAt: null } });
    expect(result).toEqual({ page: 1, pageSize: 20, total: 1, list: [{ id: 1 }] });
  });

  it('关键词去除首尾空格并按中英标题模糊匹配', async () => {
    const { service, prisma } = makeService();
    await service.list({ keyword: '  阀门  ' });
    expect(prisma.news.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          deletedAt: null,
          OR: [{ titleZh: { contains: '阀门' } }, { titleEn: { contains: '阀门' } }],
        },
      }),
    );
  });

  it('状态筛选与分页偏移', async () => {
    const { service, prisma } = makeService();
    await service.list({ status: 1, page: 3, pageSize: 10 });
    expect(prisma.news.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { deletedAt: null, status: 1 }, skip: 20, take: 10 }),
    );
  });
});

describe('NewsService.detail', () => {
  it('返回已存在新闻', async () => {
    const { service, prisma } = makeService();
    (prisma.news.findFirst as jest.Mock).mockResolvedValueOnce(EXISTING);
    await expect(service.detail(1)).resolves.toEqual(EXISTING);
    expect(prisma.news.findFirst).toHaveBeenCalledWith({ where: { id: 1, deletedAt: null } });
  });

  it('不存在或已删除 → 404', async () => {
    const { service } = makeService();
    await expect(service.detail(999)).rejects.toThrow(new NotFoundException('新闻不存在'));
  });
});

describe('NewsService.create', () => {
  it('英文留空自动翻译并打标记，落库数据完整', async () => {
    const translations = { 新闻标题: 'News Title', [makeDto().contentZh]: 'Content' };
    const { service, prisma, translation } = makeService(translations);
    (prisma.news.findFirst as jest.Mock).mockResolvedValueOnce(EXISTING);
    const dto: CreateNewsDto = {
      ...makeDto(),
      coverUrl: 'https://example.com/a.jpg',
      isTop: true,
      status: 1,
    };
    await service.create(dto);
    expect(translation.translateSafe).toHaveBeenCalledWith(['新闻标题'], 'zh', 'en');
    expect(prisma.news.create).toHaveBeenCalledWith({
      data: {
        coverUrl: 'https://example.com/a.jpg',
        publishTime: new Date('2026-01-01T08:00:00.000Z'),
        isTop: true,
        status: 1,
        titleZh: '新闻标题',
        titleEn: 'News Title',
        summaryZh: null,
        summaryEn: null,
        contentZh: dto.contentZh,
        contentEn: 'Content',
        machineFields: '["titleEn","contentEn"]',
      },
    });
  });

  it('人工填写英文不清除其他字段标记且不触发翻译', async () => {
    const { service, prisma, translation } = makeService({});
    (prisma.news.findFirst as jest.Mock).mockResolvedValueOnce(EXISTING);
    await service.create({ ...makeDto(), titleEn: 'Manual Title', summaryEn: 'Manual Summary' });
    // 人工填写字段不翻译；正文英文为空仍会翻译（映射未命中保持为空）
    expect(translation.translateSafe).toHaveBeenCalledTimes(1);
    expect(prisma.news.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        titleEn: 'Manual Title',
        summaryEn: 'Manual Summary',
        contentEn: null,
      }),
    });
  });

  it('默认草稿状态与不置顶', async () => {
    const { service, prisma } = makeService({});
    (prisma.news.findFirst as jest.Mock).mockResolvedValueOnce(EXISTING);
    await service.create(makeDto());
    expect(prisma.news.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ isTop: false, status: 0 }),
    });
  });
});

describe('NewsService.update', () => {
  it('不存在 → 404', async () => {
    const { service } = makeService();
    await expect(service.update(999, {})).rejects.toThrow(new NotFoundException('新闻不存在'));
  });

  it('仅更新传入字段：未触碰字段保留原值与原标记', async () => {
    const { service, prisma } = makeService({ 新标题: 'New Title' });
    (prisma.news.findFirst as jest.Mock).mockResolvedValue(EXISTING); // 校验 + 详情两次读取
    await service.update(1, { titleZh: '新标题' });
    expect(prisma.news.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: {
        coverUrl: EXISTING.coverUrl,
        publishTime: EXISTING.publishTime,
        isTop: false,
        status: 0,
        titleZh: '新标题',
        titleEn: 'New Title',
        summaryZh: '旧摘要',
        summaryEn: 'Old Summary',
        contentZh: '旧正文',
        contentEn: 'Old Content',
        machineFields: '["titleEn"]',
      },
    });
  });

  it('人工填写英文清除该字段机器翻译标记', async () => {
    const { service, prisma } = makeService({});
    (prisma.news.findFirst as jest.Mock).mockResolvedValue(EXISTING); // 校验 + 详情两次读取
    await service.update(1, { titleEn: 'Manual' });
    expect(prisma.news.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: expect.objectContaining({ titleEn: 'Manual', machineFields: '[]' }),
    });
  });

  it('回传未改动的机器翻译英文值保持原标记（prevEn 原值保留）', async () => {
    const { service, prisma, translation } = makeService({});
    (prisma.news.findFirst as jest.Mock).mockResolvedValue(EXISTING); // 校验 + 详情两次读取
    await service.update(1, { titleZh: '新标题', titleEn: 'Old Title' });
    expect(prisma.news.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: expect.objectContaining({ titleEn: 'Old Title', machineFields: '["titleEn"]' }),
    });
    // 与上次一致的英文不触发翻译，也不判为人工填写
    expect(translation.translateSafe).not.toHaveBeenCalled();
  });

  it('发布时间字符串转为 Date，其余可空字段回退存量', async () => {
    const { service, prisma } = makeService({ 新标题: 'New Title' });
    (prisma.news.findFirst as jest.Mock).mockResolvedValue(EXISTING); // 校验 + 详情两次读取
    await service.update(1, { titleZh: '新标题', publishTime: '2026-02-01T00:00:00.000Z' });
    expect(prisma.news.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: expect.objectContaining({ publishTime: new Date('2026-02-01T00:00:00.000Z') }),
    });
  });
});

describe('NewsService.updateStatus', () => {
  it('发布/下线并返回最新详情', async () => {
    const { service, prisma } = makeService({});
    (prisma.news.findFirst as jest.Mock).mockResolvedValue(EXISTING); // 校验 + 详情两次读取
    await service.updateStatus(1, 1);
    expect(prisma.news.update).toHaveBeenCalledWith({ where: { id: 1 }, data: { status: 1 } });
    expect(prisma.news.findFirst).toHaveBeenCalledTimes(2); // 校验一次 + 详情一次
  });

  it('不存在 → 404', async () => {
    const { service } = makeService({});
    await expect(service.updateStatus(999, 1)).rejects.toThrow(new NotFoundException('新闻不存在'));
  });
});

describe('NewsService.remove', () => {
  it('逻辑删除：写入 deletedAt 而非物理删除', async () => {
    const { service, prisma } = makeService({});
    (prisma.news.findFirst as jest.Mock).mockResolvedValueOnce(EXISTING);
    await service.remove(1);
    expect(prisma.news.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { deletedAt: expect.any(Date) },
    });
  });

  it('不存在 → 404', async () => {
    const { service } = makeService({});
    await expect(service.remove(999)).rejects.toThrow(new NotFoundException('新闻不存在'));
  });
});

describe('NewsService 官网公开读取', () => {
  it('listPublished：已发布且到达发布时间，置顶优先，仅返回展示字段', async () => {
    const { service, prisma } = makeService({});
    (prisma.news.findMany as jest.Mock).mockResolvedValueOnce([{ id: 1 }]);
    (prisma.news.count as jest.Mock).mockResolvedValueOnce(1);
    const result = await service.listPublished(2, 12);
    const where = { status: 1, deletedAt: null, publishTime: { lte: expect.any(Date) } };
    expect(prisma.news.findMany).toHaveBeenCalledWith({
      where,
      orderBy: [{ isTop: 'desc' }, { publishTime: 'desc' }, { id: 'desc' }],
      skip: 12,
      take: 12,
      select: {
        id: true,
        titleZh: true,
        titleEn: true,
        coverUrl: true,
        summaryZh: true,
        summaryEn: true,
        publishTime: true,
        isTop: true,
      },
    });
    expect(prisma.news.count).toHaveBeenCalledWith({ where });
    expect(result).toEqual({ page: 2, pageSize: 12, total: 1, list: [{ id: 1 }] });
  });

  it('latest：首页固定取 4 条，同样遵循定时发布可见性', async () => {
    const { service, prisma } = makeService({});
    await service.latest();
    expect(prisma.news.findMany).toHaveBeenCalledWith({
      where: { status: 1, deletedAt: null, publishTime: { lte: expect.any(Date) } },
      orderBy: [{ isTop: 'desc' }, { publishTime: 'desc' }, { id: 'desc' }],
      take: 4,
      select: expect.objectContaining({ id: true, publishTime: true }),
    });
  });

  it('publicDetail：可见即返回，不可见 → 404', async () => {
    const { service, prisma } = makeService({});
    (prisma.news.findFirst as jest.Mock).mockResolvedValueOnce(EXISTING);
    await expect(service.publicDetail(1)).resolves.toEqual(EXISTING);
    expect(prisma.news.findFirst).toHaveBeenCalledWith({
      where: { id: 1, status: 1, deletedAt: null, publishTime: { lte: expect.any(Date) } },
    });

    (prisma.news.findFirst as jest.Mock).mockResolvedValueOnce(null);
    await expect(service.publicDetail(2)).rejects.toThrow(new NotFoundException('新闻不存在'));
  });
});
