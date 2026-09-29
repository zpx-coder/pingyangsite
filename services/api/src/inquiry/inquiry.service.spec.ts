// 询盘服务单元测试（PRD §6.4 / §7.5 / §9.2，任务 1.10/1.12）
// 重点：验证码一次性消费、限流（分钟/每日/Redis 异常降级）、快照三态、CST 统计边界、
// 筛选 where 构造、状态/批量、导出。Prisma/Redis 以 jest.fn 注入，不碰真实依赖。
import { BadRequestException, HttpException, NotFoundException } from '@nestjs/common';
import type { RedisClientType } from 'redis';
import { InquiryService } from './inquiry.service';
import type { PrismaService } from '../prisma/prisma.service';
import type { CreateInquiryDto } from './dto/create-inquiry.dto';

const CAPTCHA_KEY_PREFIX = 'inquiry:captcha:';
const RATE_KEY_PREFIX = 'inquiry:ip:';

function makePrisma() {
  return {
    product: {
      findFirst: jest.fn(async () => null),
    },
    company: {
      findUnique: jest.fn(async () => null),
    },
    inquiry: {
      findMany: jest.fn(async () => []),
      count: jest.fn(async () => 0),
      create: jest.fn(async ({ data }: { data: Record<string, unknown> }) => ({ id: 7, ...data })),
      findUnique: jest.fn(async () => null),
      update: jest.fn(async ({ data }: { data: Record<string, unknown> }) => ({ id: 1, ...data })),
      updateMany: jest.fn(async () => ({ count: 2 })),
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

function makeService() {
  const prisma = makePrisma();
  const redis = makeRedis();
  const service = new InquiryService(prisma, redis);
  return { service, prisma, redis };
}

function makeDto(overrides: Partial<CreateInquiryDto> = {}): CreateInquiryDto {
  return {
    captchaId: 'cid-1',
    captchaCode: 'AB12',
    name: '张三',
    country: '中国',
    email: 'buyer@example.com',
    phone: '13800138000',
    content: '我想了解产品详情与报价情况',
    ...overrides,
  };
}

describe('InquiryService 验证码', () => {
  it('createCaptcha：4 位码写入 Redis 5 分钟并返回 SVG', async () => {
    const { service, redis } = makeService();
    const result = await service.createCaptcha();
    expect(result.svg).toContain('<svg');
    const setCall = (redis.set as jest.Mock).mock.calls[0];
    expect(setCall[0]).toMatch(new RegExp(`^${CAPTCHA_KEY_PREFIX}[0-9a-f-]{36}$`));
    expect(setCall[1]).toHaveLength(4);
    expect(setCall[2]).toEqual({ EX: 5 * 60 });
  });

  it('captchaImage：按标识渲染 SVG；不存在或过期 → 404', async () => {
    const { service, redis } = makeService();
    (redis.get as jest.Mock).mockResolvedValueOnce('AB12');
    const svg = await service.captchaImage('cid-1');
    expect(svg).toContain('<svg');
    expect(redis.get).toHaveBeenCalledWith(`${CAPTCHA_KEY_PREFIX}cid-1`);

    await expect(service.captchaImage('gone')).rejects.toThrow(new NotFoundException('验证码不存在或已过期'));
  });
});

describe('InquiryService.submit 验证码一次性消费', () => {
  it('验证码正确（大小写不敏感）→ 校验通过即删除', async () => {
    const { service, prisma, redis } = makeService();
    (redis.get as jest.Mock).mockResolvedValueOnce('ab12');
    await service.submit(makeDto({ captchaCode: ' AB12 ' }), '1.2.3.4');
    expect(redis.del).toHaveBeenCalledWith(`${CAPTCHA_KEY_PREFIX}cid-1`);
    expect(prisma.inquiry.create).toHaveBeenCalled();
  });

  it('验证码错误 → 400 且不删除', async () => {
    const { service, prisma, redis } = makeService();
    (redis.get as jest.Mock).mockResolvedValueOnce('AB12');
    await expect(service.submit(makeDto({ captchaCode: 'XX34' }), '1.2.3.4')).rejects.toThrow(
      new BadRequestException('验证码不正确'),
    );
    expect(redis.del).not.toHaveBeenCalled();
    expect(prisma.inquiry.create).not.toHaveBeenCalled();
  });

  it('验证码过期 → 400', async () => {
    const { service, prisma } = makeService();
    await expect(service.submit(makeDto(), '1.2.3.4')).rejects.toThrow(
      new BadRequestException('验证码已过期，请刷新后重试'),
    );
    expect(prisma.inquiry.create).not.toHaveBeenCalled();
  });
});

describe('InquiryService.submit 限流', () => {
  it('1 分钟内超过 3 次 → 429', async () => {
    const { service, prisma, redis } = makeService();
    (redis.get as jest.Mock).mockResolvedValueOnce('AB12');
    (redis.incr as jest.Mock).mockResolvedValueOnce(4);
    const error = await service.submit(makeDto(), '1.2.3.4').catch((e: unknown) => e);
    expect(error).toBeInstanceOf(HttpException);
    expect((error as HttpException).getStatus()).toBe(429);
    expect((error as Error).message).toBe('提交过于频繁，请稍后再试');
    expect(prisma.inquiry.create).not.toHaveBeenCalled();
  });

  it('每日超过 50 次 → 429', async () => {
    const { service, prisma, redis } = makeService();
    (redis.get as jest.Mock).mockResolvedValueOnce('AB12');
    (redis.incr as jest.Mock).mockResolvedValueOnce(1).mockResolvedValueOnce(51);
    const error = await service.submit(makeDto(), '1.2.3.4').catch((e: unknown) => e);
    expect(error).toBeInstanceOf(HttpException);
    expect((error as HttpException).getStatus()).toBe(429);
    expect((error as Error).message).toBe('今日提交次数已达上限，请明日再试');
    expect(prisma.inquiry.create).not.toHaveBeenCalled();
  });

  it('首次请求设置分钟窗口与 CST 自然日过期时间', async () => {
    const { service, redis } = makeService();
    (redis.get as jest.Mock).mockResolvedValueOnce('AB12');
    await service.submit(makeDto(), '1.2.3.4');
    expect(redis.expire).toHaveBeenCalledWith(`${RATE_KEY_PREFIX}1.2.3.4:min`, 60);
    expect(redis.expire).toHaveBeenCalledWith(`${RATE_KEY_PREFIX}1.2.3.4:day`, expect.any(Number));
  });

  it('Redis 计数异常 → 降级放行（不阻断提交）', async () => {
    const { service, prisma, redis } = makeService();
    (redis.get as jest.Mock).mockResolvedValueOnce('AB12');
    (redis.incr as jest.Mock).mockRejectedValueOnce(new Error('redis down'));
    await expect(service.submit(makeDto(), '1.2.3.4')).resolves.toEqual({ id: 7 });
    expect(prisma.inquiry.create).toHaveBeenCalled();
  });
});

describe('InquiryService.submit 快照三态', () => {
  it('有企业：产品与企业名称按提交时快照保存，企业归属由产品推导', async () => {
    const { service, prisma, redis } = makeService();
    (redis.get as jest.Mock).mockResolvedValueOnce('AB12');
    (prisma.product.findFirst as jest.Mock).mockResolvedValueOnce({
      id: 5,
      companyId: 9,
      nameZh: '球阀',
      nameEn: 'Ball Valve',
      status: 1,
    });
    (prisma.company.findUnique as jest.Mock).mockResolvedValueOnce({ id: 9, nameZh: '某某公司', nameEn: 'XX Co.' });
    await service.submit(makeDto({ productId: 5 }), '1.2.3.4');
    expect(prisma.inquiry.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        productId: 5,
        companyId: 9,
        productNameSnapshot: '球阀',
        companyNameSnapshot: '某某公司',
      }),
    });
  });

  it('无企业：产品无归属公司时快照为空且不查公司', async () => {
    const { service, prisma, redis } = makeService();
    (redis.get as jest.Mock).mockResolvedValueOnce('AB12');
    (prisma.product.findFirst as jest.Mock).mockResolvedValueOnce({
      id: 5,
      companyId: null,
      nameZh: '球阀',
      nameEn: null,
    });
    await service.submit(makeDto({ productId: 5 }), '1.2.3.4');
    expect(prisma.company.findUnique).not.toHaveBeenCalled();
    expect(prisma.inquiry.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ companyId: null, companyNameSnapshot: null, productNameSnapshot: '球阀' }),
    });
  });

  it('无产品：不查产品，快照全空', async () => {
    const { service, prisma, redis } = makeService();
    (redis.get as jest.Mock).mockResolvedValueOnce('AB12');
    await service.submit(makeDto(), '1.2.3.4');
    expect(prisma.product.findFirst).not.toHaveBeenCalled();
    expect(prisma.inquiry.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        productId: null,
        companyId: null,
        productNameSnapshot: null,
        companyNameSnapshot: null,
      }),
    });
  });

  it('按提交语言取译文：en 取英文快照，缺译文回退中文', async () => {
    const { service, prisma, redis } = makeService();
    (redis.get as jest.Mock).mockResolvedValueOnce('AB12');
    (prisma.product.findFirst as jest.Mock).mockResolvedValueOnce({
      id: 5,
      companyId: 9,
      nameZh: '球阀',
      nameEn: 'Ball Valve',
    });
    (prisma.company.findUnique as jest.Mock).mockResolvedValueOnce({ id: 9, nameZh: '某某公司', nameEn: null });
    await service.submit(makeDto({ productId: 5, lang: 'en' }), '1.2.3.4');
    expect(prisma.inquiry.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        productNameSnapshot: 'Ball Valve',
        companyNameSnapshot: '某某公司',
        lang: 'en',
      }),
    });
  });

  it('产品不存在或已下架 → 400', async () => {
    const { service, prisma, redis } = makeService();
    (redis.get as jest.Mock).mockResolvedValueOnce('AB12');
    await expect(service.submit(makeDto({ productId: 5 }), '1.2.3.4')).rejects.toThrow(
      new BadRequestException('产品不存在或已下架'),
    );
    expect(prisma.inquiry.create).not.toHaveBeenCalled();
  });

  it('落库字段：文本 trim、公司名可空、默认语言 zh-CN、状态 0、记录 IP', async () => {
    const { service, prisma, redis } = makeService();
    (redis.get as jest.Mock).mockResolvedValueOnce('AB12');
    await service.submit(
      makeDto({
        name: ' 张三 ',
        companyName: '   ',
        country: ' 中国 ',
        email: ' a@b.com ',
        phone: ' 13800138000 ',
      }),
      '1.2.3.4',
    );
    expect(prisma.inquiry.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        name: '张三',
        companyName: null,
        country: '中国',
        email: 'a@b.com',
        phone: '13800138000',
        lang: 'zh-CN',
        status: 0,
        ip: '1.2.3.4',
      }),
    });
  });
});

describe('InquiryService.list 与筛选', () => {
  it('默认分页与排序', async () => {
    const { service, prisma } = makeService();
    await service.list({});
    expect(prisma.inquiry.findMany).toHaveBeenCalledWith({
      where: {},
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      skip: 0,
      take: 20,
    });
    expect(prisma.inquiry.count).toHaveBeenCalledWith({ where: {} });
  });

  it('状态筛选 + 分页偏移', async () => {
    const { service, prisma } = makeService();
    await service.list({ status: 0, page: 3, pageSize: 10 });
    expect(prisma.inquiry.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { status: 0 }, skip: 20, take: 10 }),
    );
  });

  it('关键词去除首尾空格并按快照模糊匹配', async () => {
    const { service, prisma } = makeService();
    await service.list({ keyword: '  球阀 ' });
    expect(prisma.inquiry.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          OR: [
            { productNameSnapshot: { contains: '球阀' } },
            { companyNameSnapshot: { contains: '球阀' } },
          ],
        },
      }),
    );
  });

  it('时间范围按 CST 自然日边界构造（含当天）', async () => {
    const { service, prisma } = makeService();
    await service.list({ startDate: '2026-09-01', endDate: '2026-09-30' });
    expect(prisma.inquiry.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          createdAt: {
            gte: new Date('2026-08-31T16:00:00.000Z'),
            // 结束日含当天：endDate 当日 CST 零点 + 24h（次日零点开区间）
            lt: new Date('2026-09-30T16:00:00.000Z'),
          },
        },
      }),
    );
  });

  it('仅传开始日期时只设 gte 边界', async () => {
    const { service, prisma } = makeService();
    await service.list({ startDate: '2026-09-01' });
    expect(prisma.inquiry.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { createdAt: { gte: new Date('2026-08-31T16:00:00.000Z') } },
      }),
    );
  });
});

describe('InquiryService.stats', () => {
  it('总数/未处理/今日/本周按 CST 边界统计（周二样例：本周自周一零点起）', async () => {
    // 固定系统时间到 2026-09-29 02:00 UTC（= CST 10:00，周二），使 CST 边界断言确定化
    jest.useFakeTimers().setSystemTime(new Date('2026-09-29T02:00:00.000Z'));
    try {
      const { service, prisma } = makeService();
      (prisma.inquiry.count as jest.Mock)
        .mockResolvedValueOnce(10)
        .mockResolvedValueOnce(3)
        .mockResolvedValueOnce(2)
        .mockResolvedValueOnce(5);
      const result = await service.stats();
      expect(result).toEqual({ total: 10, pending: 3, today: 2, week: 5 });
      expect(prisma.inquiry.count).toHaveBeenNthCalledWith(1);
      expect(prisma.inquiry.count).toHaveBeenNthCalledWith(2, { where: { status: 0 } });
      // CST 2026-09-29 零点 = UTC 2026-09-28 16:00；本周一 = 前一日
      expect(prisma.inquiry.count).toHaveBeenNthCalledWith(3, {
        where: { createdAt: { gte: new Date('2026-09-28T16:00:00.000Z') } },
      });
      expect(prisma.inquiry.count).toHaveBeenNthCalledWith(4, {
        where: { createdAt: { gte: new Date('2026-09-27T16:00:00.000Z') } },
      });
    } finally {
      jest.useRealTimers();
    }
  });
});

describe('InquiryService.detail / updateStatus / batch', () => {
  it('detail：存在返回，不存在 → 404', async () => {
    const { service, prisma } = makeService();
    (prisma.inquiry.findUnique as jest.Mock).mockResolvedValueOnce({ id: 1 });
    await expect(service.detail(1)).resolves.toEqual({ id: 1 });
    await expect(service.detail(2)).rejects.toThrow(new NotFoundException('询盘不存在'));
  });

  it('updateStatus：校验存在后更新并返回最新详情', async () => {
    const { service, prisma } = makeService();
    (prisma.inquiry.findUnique as jest.Mock).mockResolvedValue({ id: 1 });
    await service.updateStatus(1, 1);
    expect(prisma.inquiry.update).toHaveBeenCalledWith({ where: { id: 1 }, data: { status: 1 } });
    expect(prisma.inquiry.findUnique).toHaveBeenCalledTimes(2);
  });

  it('updateStatus：不存在 → 404', async () => {
    const { service } = makeService();
    await expect(service.updateStatus(99, 1)).rejects.toThrow(new NotFoundException('询盘不存在'));
  });

  it('batch：批量标记已处理/未处理并返回条数', async () => {
    const { service, prisma } = makeService();
    await expect(service.batch([1, 2, 3], 'process')).resolves.toEqual({ count: 2 });
    expect(prisma.inquiry.updateMany).toHaveBeenCalledWith({ where: { id: { in: [1, 2, 3] } }, data: { status: 1 } });
    await service.batch([4], 'unprocess');
    expect(prisma.inquiry.updateMany).toHaveBeenCalledWith({ where: { id: { in: [4] } }, data: { status: 0 } });
  });
});

describe('InquiryService.exportData', () => {
  it('导出：buffer 含表头与数据行（CST 时间、状态文案、空快照兜底）', async () => {
    const { service, prisma } = makeService();
    (prisma.inquiry.findMany as jest.Mock).mockResolvedValueOnce([
      {
        id: 1,
        createdAt: new Date('2026-09-01T00:00:00.000Z'),
        productNameSnapshot: '球阀',
        productId: 5,
        companyNameSnapshot: null,
        companyId: null,
        name: '张三',
        companyName: null,
        country: '中国',
        email: 'a@b.com',
        phone: '13800138000',
        content: '报价咨询',
        lang: 'zh-CN',
        status: 1,
      },
      {
        id: 2,
        createdAt: new Date('2026-09-01T01:02:03.000Z'),
        productNameSnapshot: null,
        productId: null,
        companyNameSnapshot: '某某公司',
        companyId: 9,
        name: 'Li Si',
        companyName: 'ABC Co.',
        country: 'US',
        email: 'li@c.com',
        phone: '+1 202 555 0100',
        content: 'Please quote',
        lang: 'en',
        status: 0,
      },
    ]);
    const { buffer, count } = await service.exportData({ status: 1, keyword: '球阀' });
    expect(prisma.inquiry.findMany).toHaveBeenCalledWith({
      where: {
        status: 1,
        OR: [
          { productNameSnapshot: { contains: '球阀' } },
          { companyNameSnapshot: { contains: '球阀' } },
        ],
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });
    expect(count).toBe(2);
    const utf8 = buffer.toString('utf8');
    for (const header of ['提交时间', '产品名称快照', '企业名称快照', '来源语言', '状态']) {
      expect(utf8).toContain(header);
    }
    expect(utf8).toContain('2026-09-01 08:00:00'); // CST 时间格式化
    expect(utf8).toContain('2026-09-01 09:02:03');
    expect(utf8).toContain('已处理');
    expect(utf8).toContain('未处理');
    expect(utf8).toContain('报价咨询');
    expect(utf8).toContain('Please quote');
  });

  it('无数据时仅表头且 count 为 0', async () => {
    const { service } = makeService();
    const { buffer, count } = await service.exportData({});
    expect(count).toBe(0);
    expect(buffer.length).toBeGreaterThan(0);
  });
});
