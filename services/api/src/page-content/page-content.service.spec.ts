// 页面内容服务单元测试（PRD §7.4.2 / 任务 1.9，任务 1.12）
// 覆盖：各 key 形状校验、保存合并语义、缓存命中/回源/降级、
// 双语联动四态（自动打标/原值保留/人工清标/删图清标）。
// Prisma/Redis/翻译均以 jest.fn 注入，不碰真实数据库与 Redis。
import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { RedisClientType } from 'redis';
import { PageContentService } from './page-content.service';
import { PAGE_CONTENT_CACHE_PREFIX, PAGE_CONTENT_CACHE_TTL_SECONDS } from './page-content.constants';
import type { PrismaService } from '../prisma/prisma.service';
import type { TranslationService } from '../translation/translation.service';

const DATE = new Date('2026-01-01T00:00:00.000Z');

function makePrisma() {
  return {
    pageContent: {
      findMany: jest.fn(async () => []),
      findUnique: jest.fn(async () => null),
      upsert: jest.fn(
        async (args: { where: { key: string }; create?: { config: string }; update?: { config: string } }) => ({
        key: args.where.key,
        config: args.create?.config ?? args.update?.config ?? '{}',
        updatedAt: DATE,
      })),
    },
  } as unknown as PrismaService;
}

function makeRedis() {
  return {
    get: jest.fn(async () => null),
    set: jest.fn(async () => 'OK'),
    del: jest.fn(async () => 1),
    incr: jest.fn(async () => 1),
    expire: jest.fn(async () => true),
    ttl: jest.fn(async () => -2),
  } as unknown as RedisClientType;
}

function makeTranslation(translations: Record<string, string> = {}) {
  return {
    translateSafe: jest.fn(async (texts: string[]) => texts.map((t) => translations[t] ?? null)),
  } as unknown as TranslationService;
}

function makeService(translations: Record<string, string> = {}) {
  const prisma = makePrisma();
  const redis = makeRedis();
  const translation = makeTranslation(translations);
  const service = new PageContentService(prisma, translation, redis);
  return { service, prisma, redis, translation };
}

/** 由 upsert 落库的 JSON 字符串还原配置对象（断言保存结果用） */
function savedConfig(prisma: PrismaService): Record<string, unknown> {
  const upsert = prisma.pageContent.upsert as jest.Mock;
  const args = upsert.mock.calls.at(-1)?.[0] as { create?: { config: string }; update?: { config: string } };
  return JSON.parse(args.create?.config ?? args.update?.config ?? '{}');
}

describe('PageContentService.list', () => {
  it('按 key 升序返回并解析 config（脏数据按空对象）', async () => {
    const { service, prisma } = makeService();
    (prisma.pageContent.findMany as jest.Mock).mockResolvedValueOnce([
      { key: 'home_about', config: '{"titleZh":"关于"}', updatedAt: DATE },
      { key: 'footer_info', config: 'not-json', updatedAt: DATE },
      { key: 'contact_info', config: '[1,2]', updatedAt: DATE }, // 数组脏数据按空对象
    ]);
    const result = await service.list();
    expect(prisma.pageContent.findMany).toHaveBeenCalledWith({ orderBy: { key: 'asc' } });
    expect(result).toEqual([
      { key: 'home_about', config: { titleZh: '关于' }, updatedAt: DATE },
      { key: 'footer_info', config: {}, updatedAt: DATE },
      { key: 'contact_info', config: {}, updatedAt: DATE },
    ]);
  });
});

describe('PageContentService.get', () => {
  it('未知 key → 400', async () => {
    const { service } = makeService();
    await expect(service.get('unknown_key')).rejects.toThrow(new BadRequestException('配置项不存在'));
  });

  it('缓存未命中回源数据库并回填缓存（含 machineFields）', async () => {
    const { service, prisma, redis } = makeService();
    (prisma.pageContent.findUnique as jest.Mock).mockResolvedValueOnce({
      key: 'home_about',
      config: JSON.stringify({ titleZh: '关于', machineFields: '["titleEn"]' }),
      updatedAt: DATE,
    });
    const result = await service.get('home_about');
    expect(result).toEqual({
      key: 'home_about',
      config: { titleZh: '关于', machineFields: '["titleEn"]' },
      updatedAt: DATE,
    });
    expect(redis.set).toHaveBeenCalledWith(
      `${PAGE_CONTENT_CACHE_PREFIX}home_about`,
      JSON.stringify({
        key: 'home_about',
        config: { titleZh: '关于', machineFields: '["titleEn"]' },
        updatedAt: DATE,
      }),
      { EX: PAGE_CONTENT_CACHE_TTL_SECONDS },
    );
  });

  it('配置未初始化 → 404', async () => {
    const { service } = makeService();
    await expect(service.get('contact_info')).rejects.toThrow(new NotFoundException('配置项不存在'));
  });
});

describe('PageContentService 缓存策略', () => {
  it('缓存命中直接返回，不查询数据库', async () => {
    const { service, prisma, redis } = makeService();
    (redis.get as jest.Mock).mockResolvedValueOnce(
      JSON.stringify({ key: 'home_about', config: { titleZh: '缓存' }, updatedAt: DATE.toISOString() }),
    );
    const result = await service.get('home_about');
    expect(result.config).toEqual({ titleZh: '缓存' });
    expect(prisma.pageContent.findUnique).not.toHaveBeenCalled();
  });

  it('缓存内容损坏（非 JSON / 缺 key）→ 回源数据库', async () => {
    const { service, prisma, redis } = makeService();
    (redis.get as jest.Mock).mockResolvedValueOnce('not-json');
    (prisma.pageContent.findUnique as jest.Mock).mockResolvedValue({
      key: 'home_about',
      config: '{"titleZh":"回源"}',
      updatedAt: DATE,
    });
    const result = await service.get('home_about');
    expect(result.config).toEqual({ titleZh: '回源' });

    (redis.get as jest.Mock).mockResolvedValueOnce('{"config":{}}');
    await service.get('home_about');
    expect(prisma.pageContent.findUnique).toHaveBeenCalledTimes(2);
  });

  it('Redis 读取异常 → 降级直读数据库；写入异常 → 不阻塞读取', async () => {
    const { service, prisma, redis } = makeService();
    (redis.get as jest.Mock).mockRejectedValueOnce(new Error('redis down'));
    (redis.set as jest.Mock).mockRejectedValueOnce(new Error('redis down'));
    (prisma.pageContent.findUnique as jest.Mock).mockResolvedValueOnce({
      key: 'home_about',
      config: '{"titleZh":"降级"}',
      updatedAt: DATE,
    });
    const result = await service.get('home_about');
    expect(result.config).toEqual({ titleZh: '降级' });
  });
});

describe('PageContentService.save 校验', () => {
  it('未知 key → 400', async () => {
    const { service, prisma } = makeService();
    await expect(service.save('unknown_key', {})).rejects.toThrow(new BadRequestException('配置项不存在'));
    expect(prisma.pageContent.upsert).not.toHaveBeenCalled();
  });

  it('home_banner：images 缺失/非数组/超 5 张', async () => {
    const { service, prisma } = makeService();
    await expect(service.save('home_banner', {})).rejects.toThrow(
      new BadRequestException('首页宣传图不能为空'),
    );
    await expect(service.save('home_banner', { images: 'x' })).rejects.toThrow(
      new BadRequestException('首页宣传图格式不正确'),
    );
    await expect(service.save('home_banner', { images: [1, 2, 3, 4, 5, 6] })).rejects.toThrow(
      new BadRequestException('首页宣传图最多 5 张'),
    );
    expect(prisma.pageContent.upsert).not.toHaveBeenCalled();
  });

  it('home_banner：单项形状与图片地址校验', async () => {
    const { service, prisma } = makeService();
    await expect(service.save('home_banner', { images: [null] })).rejects.toThrow(
      new BadRequestException('第 1 张宣传图格式不正确'),
    );
    await expect(service.save('home_banner', { images: [{}] })).rejects.toThrow(
      new BadRequestException('第 1 张宣传图缺少图片地址'),
    );
    await expect(service.save('home_banner', { images: [{ image: '   ' }] })).rejects.toThrow(
      new BadRequestException('第 1 张宣传图缺少图片地址'),
    );
    await expect(service.save('home_banner', { images: [{ image: 'a.jpg', titleZh: 123 }] })).rejects.toThrow(
      new BadRequestException('字段 titleZh 格式不正确'),
    );
    expect(prisma.pageContent.upsert).not.toHaveBeenCalled();
  });

  it('home_banner：轮播间隔须为 2–30 秒（数字）', async () => {
    const { service, prisma } = makeService();
    const okImages = [{ image: 'a.jpg' }];
    await expect(service.save('home_banner', { images: okImages, interval: 1 })).rejects.toThrow(
      new BadRequestException('轮播间隔须为 2–30 秒'),
    );
    await expect(service.save('home_banner', { images: okImages, interval: 31 })).rejects.toThrow(
      new BadRequestException('轮播间隔须为 2–30 秒'),
    );
    await expect(service.save('home_banner', { images: okImages, interval: '5' })).rejects.toThrow(
      new BadRequestException('轮播间隔须为 2–30 秒'),
    );
    expect(prisma.pageContent.upsert).not.toHaveBeenCalled();
  });

  it('各 key 可选字符串字段的类型校验', async () => {
    const { service } = makeService();
    await expect(service.save('home_about', { image: 1 })).rejects.toThrow(
      new BadRequestException('字段 image 格式不正确'),
    );
    await expect(service.save('about_page', { bannerImage: {} })).rejects.toThrow(
      new BadRequestException('字段 bannerImage 格式不正确'),
    );
    await expect(service.save('contact_info', { phone: 123 })).rejects.toThrow(
      new BadRequestException('字段 phone 格式不正确'),
    );
    await expect(service.save('footer_info', { copyrightZh: [] })).rejects.toThrow(
      new BadRequestException('字段 copyrightZh 格式不正确'),
    );
  });

  it('footer_info：备案号须为不超过 100 字的字符串', async () => {
    const { service, prisma } = makeService();
    await expect(service.save('footer_info', { icp: 123 })).rejects.toThrow(
      new BadRequestException('备案号格式不正确或超过 100 字'),
    );
    await expect(service.save('footer_info', { icp: 'x'.repeat(101) })).rejects.toThrow(
      new BadRequestException('备案号格式不正确或超过 100 字'),
    );
    // null/undefined 合法（可清空），字符串合法
    await service.save('footer_info', { icp: null });
    expect(prisma.pageContent.upsert).toHaveBeenCalledTimes(1);
  });
});

describe('PageContentService.save 合并与联动', () => {
  it('合并存量：未提交字段保留原值', async () => {
    const { service, prisma } = makeService();
    (prisma.pageContent.findUnique as jest.Mock).mockResolvedValueOnce({
      key: 'home_about',
      config: JSON.stringify({ titleZh: '旧', extra: 'keep-me' }),
      updatedAt: DATE,
    });
    await service.save('home_about', { titleZh: '新' });
    const config = savedConfig(prisma);
    expect(config.extra).toBe('keep-me');
    expect(config.titleZh).toBe('新');
  });

  it('翻译联动四态之自动打标：英文留空 → 翻译并写入 machineFields', async () => {
    const { service, prisma, translation } = makeService({ 关于我们: 'About Us' });
    await service.save('home_about', { titleZh: '关于我们' });
    const config = savedConfig(prisma);
    expect(config.titleEn).toBe('About Us');
    expect(config.machineFields).toBe('["titleEn"]');
    expect(translation.translateSafe).toHaveBeenCalledWith(['关于我们'], 'zh', 'en');
  });

  it('翻译联动四态之原值保留：英文与上次一致 → 保持原标记', async () => {
    const { service, prisma } = makeService({});
    (prisma.pageContent.findUnique as jest.Mock).mockResolvedValueOnce({
      key: 'home_about',
      config: JSON.stringify({ titleZh: '关于我们', titleEn: 'About Us', machineFields: '["titleEn"]' }),
      updatedAt: DATE,
    });
    await service.save('home_about', { titleZh: '关于我们', titleEn: 'About Us' });
    const config = savedConfig(prisma);
    expect(config.machineFields).toBe('["titleEn"]');
  });

  it('翻译联动四态之人工清标：英文改动 → 清除该字段标记', async () => {
    const { service, prisma } = makeService({});
    (prisma.pageContent.findUnique as jest.Mock).mockResolvedValueOnce({
      key: 'home_about',
      config: JSON.stringify({ titleZh: '关于我们', titleEn: 'About Us', machineFields: '["titleEn"]' }),
      updatedAt: DATE,
    });
    await service.save('home_about', { titleZh: '关于我们', titleEn: 'New About' });
    const config = savedConfig(prisma);
    expect(config.titleEn).toBe('New About');
    expect(config.machineFields).toBe('[]');
  });

  it('翻译联动四态之删图清标：轮播图减少 → 清理残留标记', async () => {
    const { service, prisma } = makeService({ 图一: 'One' });
    const oldImages = [
      { image: 'a.jpg', titleZh: '图一', titleEn: 'One' },
      { image: 'b.jpg', titleZh: '图二', titleEn: 'Two' },
    ];
    (prisma.pageContent.findUnique as jest.Mock).mockResolvedValueOnce({
      key: 'home_banner',
      config: JSON.stringify({ images: oldImages, machineFields: '["b0TitleEn","b1TitleEn","b1SubtitleEn"]' }),
      updatedAt: DATE,
    });
    // 只保留第一张：第二张的 b1* 标记应被清理
    await service.save('home_banner', { images: [{ image: 'a.jpg', titleZh: '图一', titleEn: 'One' }] });
    const config = savedConfig(prisma);
    expect(config.machineFields).toBe('["b0TitleEn"]');
    expect((config.images as { titleEn: string }[])[0].titleEn).toBe('One');
  });

  it('about_page：contentEn 留空自动翻译并打标', async () => {
    const { service, prisma } = makeService({ 企业介绍: 'Company Intro' });
    await service.save('about_page', { contentZh: '企业介绍' });
    const config = savedConfig(prisma);
    expect(config.contentEn).toBe('Company Intro');
    expect(config.machineFields).toBe('["contentEn"]');
  });

  it('contact_info：addressEn/workHoursEn 联动（自动 + 人工混合）', async () => {
    const { service, prisma } = makeService({ 浙江省温州市: 'Wenzhou, Zhejiang' });
    await service.save('contact_info', {
      addressZh: '浙江省温州市',
      workHoursZh: '周一至周五 9:00-18:00',
      workHoursEn: 'Mon-Fri 9:00-18:00', // 人工填写
    });
    const config = savedConfig(prisma);
    expect(config.addressEn).toBe('Wenzhou, Zhejiang');
    expect(config.workHoursEn).toBe('Mon-Fri 9:00-18:00');
    expect(config.machineFields).toBe('["addressEn"]');
  });

  it('footer_info：人工填写英文清除原标记', async () => {
    const { service, prisma } = makeService({});
    (prisma.pageContent.findUnique as jest.Mock).mockResolvedValueOnce({
      key: 'footer_info',
      config: JSON.stringify({ copyrightZh: '版权', copyrightEn: 'Rights', machineFields: '["copyrightEn"]' }),
      updatedAt: DATE,
    });
    await service.save('footer_info', { copyrightZh: '版权', copyrightEn: 'Manual Rights' });
    const config = savedConfig(prisma);
    expect(config.copyrightEn).toBe('Manual Rights');
    expect(config.machineFields).toBe('[]');
  });

  it('upsert 以 key 为条件并返回结果与刷新缓存', async () => {
    const { service, prisma, redis } = makeService({ 关于我们: 'About Us' });
    const result = await service.save('home_about', { titleZh: '关于我们' });
    expect(prisma.pageContent.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { key: 'home_about' } }),
    );
    expect(result.key).toBe('home_about');
    expect(result.updatedAt).toBe(DATE);
    expect(redis.set).toHaveBeenCalledWith(
      `${PAGE_CONTENT_CACHE_PREFIX}home_about`,
      expect.any(String),
      { EX: PAGE_CONTENT_CACHE_TTL_SECONDS },
    );
  });

  it('Redis 写入异常不阻塞保存', async () => {
    const { service, redis } = makeService({ 关于我们: 'About Us' });
    (redis.set as jest.Mock).mockRejectedValueOnce(new Error('redis down'));
    await expect(service.save('home_about', { titleZh: '关于我们' })).resolves.toMatchObject({ key: 'home_about' });
  });
});

describe('PageContentService 官网公开读取', () => {
  it('publicAll：聚合全部 key 并剥离 machineFields', async () => {
    const { service, prisma } = makeService();
    (prisma.pageContent.findUnique as jest.Mock).mockImplementation(
      async ({ where }: { where: { key: string } }) => ({
        key: where.key,
        config: JSON.stringify({ a: 1, machineFields: '["x"]' }),
        updatedAt: DATE,
      }),
    );
    const result = await service.publicAll();
    expect(Object.keys(result)).toHaveLength(5);
    expect(result.home_banner).toEqual({ a: 1 }); // machineFields 已剥离
    expect(result['home_banner']).not.toHaveProperty('machineFields');
  });

  it('publicOne：未知 key → 404；已知 key 返回剥离标记的配置', async () => {
    const { service, prisma } = makeService();
    await expect(service.publicOne('unknown')).rejects.toThrow(new NotFoundException('配置项不存在'));
    (prisma.pageContent.findUnique as jest.Mock).mockResolvedValueOnce({
      key: 'footer_info',
      config: JSON.stringify({ copyrightZh: '©', machineFields: '["copyrightEn"]' }),
      updatedAt: DATE,
    });
    const result = await service.publicOne('footer_info');
    expect(result).toEqual({ copyrightZh: '©' });
  });
});
