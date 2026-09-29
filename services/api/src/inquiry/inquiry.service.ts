// 询盘服务（PRD §6.4 / §7.5 / §9.2，任务 1.10）：
//   - 提交：验证码校验（一次性，防重复提交）→ 同 IP 频率限制（1 分钟 ≤3 次、
//     每日 ≤50 次，CST 自然日）→ 落库；产品与企业信息按提交时快照保存，
//     不设外键，产品/企业后续删除不影响已收询盘；
//   - 企业 ID 一律由服务端依据产品推导，不接受客户端传入（防伪造）；
//   - 后台：分页筛选（状态/快照关键词/时间范围）、统计、标记处理、批量处理、
//     Excel 导出（导出当前筛选结果，字段与表格列一致）；
//   - Redis 不可用时验证码环节即失败（阻断提交），限流计数异常时降级放行。
import { BadRequestException, HttpException, HttpStatus, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { RedisClientType } from 'redis';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { REDIS_CLIENT } from '../redis/redis.module';
import { generateXlsx } from '../common/xlsx.util';
import { generateCaptchaCode, generateCaptchaSvg } from './captcha.util';
import type { CreateInquiryDto } from './dto/create-inquiry.dto';
import type { QueryInquiryDto } from './dto/query-inquiry.dto';

const CAPTCHA_KEY_PREFIX = 'inquiry:captcha:';
const CAPTCHA_TTL_SECONDS = 5 * 60; // 验证码 5 分钟有效，一次性

const RATE_KEY_PREFIX = 'inquiry:ip:';
const RATE_MINUTE_WINDOW_SECONDS = 60;
const RATE_MINUTE_LIMIT = 3; // 同 IP 1 分钟 ≤3 次（PRD §9.2）
const RATE_DAY_LIMIT = 50; // 同 IP 每日 ≤50 次（PRD §9.2）

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;

// 导出列（PRD §7.5：字段与后台表格列一致）
const EXPORT_HEADERS = [
  '提交时间',
  '产品名称快照',
  '产品ID',
  '企业名称快照',
  '企业ID',
  '客户姓名',
  '客户公司',
  '国家/地区',
  '邮箱',
  '电话',
  '留言摘要',
  '来源语言',
  '状态',
] as const;

const CST_OFFSET_MS = 8 * 60 * 60 * 1000; // 统计与导出均按中国时区（PRD §7.5）
const DAY_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class InquiryService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(REDIS_CLIENT) private readonly redis: RedisClientType,
  ) {}

  // ---- 官网提交 ----

  /** 生成图形验证码（存 Redis 5 分钟，一次性） */
  async createCaptcha(): Promise<{ captchaId: string; svg: string }> {
    const code = generateCaptchaCode();
    const captchaId = randomUUID();
    await this.redis.set(`${CAPTCHA_KEY_PREFIX}${captchaId}`, code, { EX: CAPTCHA_TTL_SECONDS });
    return { captchaId, svg: generateCaptchaSvg(code) };
  }

  /** 按验证码标识返回 SVG 图片（供 <img> 加载） */
  async captchaImage(captchaId: string): Promise<string> {
    const code = await this.redis.get(`${CAPTCHA_KEY_PREFIX}${captchaId}`);
    if (!code) {
      throw new NotFoundException('验证码不存在或已过期');
    }
    return generateCaptchaSvg(code);
  }

  async submit(dto: CreateInquiryDto, ip: string): Promise<{ id: number }> {
    await this.consumeCaptcha(dto.captchaId, dto.captchaCode);
    await this.assertRateLimit(ip);

    const lang = dto.lang ?? 'zh-CN';
    // 企业归属由服务端依据产品推导；快照按提交时语言取对应译文（缺译文回退中文）
    let productId: number | null = dto.productId ?? null;
    let companyId: number | null = null;
    let productNameSnapshot: string | null = null;
    let companyNameSnapshot: string | null = null;
    if (productId !== null) {
      const product = await this.prisma.product.findFirst({
        where: { id: productId, status: 1, deletedAt: null },
      });
      if (!product) {
        throw new BadRequestException('产品不存在或已下架');
      }
      companyId = product.companyId;
      productNameSnapshot = lang === 'en' ? product.nameEn || product.nameZh : product.nameZh;
      if (companyId !== null) {
        const company = await this.prisma.company.findUnique({ where: { id: companyId } });
        if (company) {
          companyNameSnapshot = lang === 'en' ? company.nameEn || company.nameZh : company.nameZh;
        }
      }
    }

    const created = await this.prisma.inquiry.create({
      data: {
        productId,
        companyId,
        productNameSnapshot,
        companyNameSnapshot,
        name: dto.name.trim(),
        companyName: dto.companyName?.trim() || null,
        country: dto.country.trim(),
        email: dto.email.trim(),
        phone: dto.phone.trim(),
        content: dto.content.trim(),
        lang,
        status: 0,
        ip,
      },
    });
    return { id: created.id };
  }

  // ---- 后台管理 ----

  async list(query: QueryInquiryDto) {
    const page = query.page ?? DEFAULT_PAGE;
    const pageSize = query.pageSize ?? DEFAULT_PAGE_SIZE;
    const where = this.buildWhere(query);

    const [rows, total] = await Promise.all([
      this.prisma.inquiry.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.inquiry.count({ where }),
    ]);
    return { page, pageSize, total, list: rows };
  }

  /** 统计卡片（PRD §7.5）：总数/未处理/今日新增/本周新增（CST） */
  async stats(): Promise<{ total: number; pending: number; today: number; week: number }> {
    const todayStart = this.startOfTodayCst();
    const weekStart = this.startOfWeekCst();
    const [total, pending, today, week] = await Promise.all([
      this.prisma.inquiry.count(),
      this.prisma.inquiry.count({ where: { status: 0 } }),
      this.prisma.inquiry.count({ where: { createdAt: { gte: todayStart } } }),
      this.prisma.inquiry.count({ where: { createdAt: { gte: weekStart } } }),
    ]);
    return { total, pending, today, week };
  }

  async detail(id: number) {
    return this.findOrThrow(id);
  }

  async updateStatus(id: number, status: number) {
    await this.findOrThrow(id);
    await this.prisma.inquiry.update({ where: { id }, data: { status } });
    return this.detail(id);
  }

  async batch(ids: number[], action: 'process' | 'unprocess'): Promise<{ count: number }> {
    const { count } = await this.prisma.inquiry.updateMany({
      where: { id: { in: ids } },
      data: { status: action === 'process' ? 1 : 0 },
    });
    return { count };
  }

  /** 导出当前筛选结果为 xlsx（零依赖最小生成器，字段与表格列一致） */
  async exportData(query: QueryInquiryDto): Promise<{ buffer: Buffer; count: number }> {
    const rows = await this.prisma.inquiry.findMany({
      where: this.buildWhere(query),
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });
    const data = rows.map((row) => [
      formatCstTime(row.createdAt),
      row.productNameSnapshot ?? '',
      row.productId ?? '',
      row.companyNameSnapshot ?? '',
      row.companyId ?? '',
      row.name,
      row.companyName ?? '',
      row.country ?? '',
      row.email ?? '',
      row.phone ?? '',
      row.content,
      row.lang,
      row.status === 1 ? '已处理' : '未处理',
    ]);
    return { buffer: generateXlsx([...EXPORT_HEADERS], data), count: rows.length };
  }

  // ---- 内部实现 ----

  private findOrThrow(id: number) {
    return this.prisma.inquiry.findUnique({ where: { id } }).then((row) => {
      if (!row) {
        throw new NotFoundException('询盘不存在');
      }
      return row;
    });
  }

  /** 验证码校验：大小写不敏感；校验通过即删除（一次性，重复提交被拒 = 幂等） */
  private async consumeCaptcha(captchaId: string, captchaCode: string): Promise<void> {
    const key = `${CAPTCHA_KEY_PREFIX}${captchaId}`;
    const stored = await this.redis.get(key);
    if (!stored) {
      throw new BadRequestException('验证码已过期，请刷新后重试');
    }
    if (stored.toUpperCase() !== captchaCode.trim().toUpperCase()) {
      throw new BadRequestException('验证码不正确');
    }
    await this.redis.del(key);
  }

  /** 同 IP 频率限制（PRD §9.2）：分钟窗口 + CST 自然日窗口，超限返回 42900 */
  private async assertRateLimit(ip: string): Promise<void> {
    try {
      const minuteKey = `${RATE_KEY_PREFIX}${ip}:min`;
      const minuteCount = await this.incrWithTtl(minuteKey, RATE_MINUTE_WINDOW_SECONDS);
      if (minuteCount > RATE_MINUTE_LIMIT) {
        throw new HttpException('提交过于频繁，请稍后再试', HttpStatus.TOO_MANY_REQUESTS);
      }

      const dayKey = `${RATE_KEY_PREFIX}${ip}:day`;
      const dayCount = await this.incrWithTtl(dayKey, this.secondsUntilNextDayCst());
      if (dayCount > RATE_DAY_LIMIT) {
        throw new HttpException('今日提交次数已达上限，请明日再试', HttpStatus.TOO_MANY_REQUESTS);
      }
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      // Redis 异常时降级放行（验证码同为 Redis 存储，Redis 不可用时提交已被验证码环节阻断）
    }
  }

  /** INCR 并为首个计数设置过期；expire 静默失败时删除 key 重置计数，避免无 TTL 的 key 永久封禁该 IP */
  private async incrWithTtl(key: string, ttlSeconds: number): Promise<number> {
    const count = await this.redis.incr(key);
    if (count === 1) {
      const expired = await this.redis.expire(key, ttlSeconds);
      if (!expired) {
        await this.redis.del(key);
      }
    }
    return count;
  }

  /** 列表/导出共用的筛选条件（快照关键词 + 提交时间范围，CST 自然日边界） */
  private buildWhere(query: QueryInquiryDto): Prisma.InquiryWhereInput {
    const where: Prisma.InquiryWhereInput = {};
    if (query.status !== undefined) {
      where.status = query.status;
    }
    const keyword = query.keyword?.trim();
    if (keyword) {
      where.OR = [
        { productNameSnapshot: { contains: keyword } },
        { companyNameSnapshot: { contains: keyword } },
      ];
    }
    if (query.startDate || query.endDate) {
      where.createdAt = {};
      if (query.startDate) {
        where.createdAt.gte = cstDayStart(query.startDate);
      }
      if (query.endDate) {
        where.createdAt.lt = new Date(cstDayStart(query.endDate).getTime() + DAY_MS); // 结束日含当天，次日起点开区间
      }
    }
    return where;
  }

  private secondsUntilNextDayCst(): number {
    const now = Date.now();
    const nextMidnightUtc = cstDayStart(cstDateStamp(new Date(now))).getTime() + DAY_MS;
    return Math.max(1, Math.ceil((nextMidnightUtc - now) / 1000));
  }

  private startOfTodayCst(): Date {
    return cstDayStart(cstDateStamp(new Date()));
  }

  /** 本周起点 = 今日 CST 零点往回推到周一 */
  private startOfWeekCst(): Date {
    const today = this.startOfTodayCst();
    const shifted = new Date(today.getTime() + CST_OFFSET_MS);
    const daysSinceMonday = (shifted.getUTCDay() + 6) % 7;
    return new Date(today.getTime() - daysSinceMonday * DAY_MS);
  }
}

/** YYYY-MM-DD 转当日 CST 零点（UTC 时刻） */
function cstDayStart(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day) - CST_OFFSET_MS);
}

/** 当前时刻的 CST 日期戳 YYYY-MM-DD */
function cstDateStamp(date: Date): string {
  const shifted = new Date(date.getTime() + CST_OFFSET_MS);
  const year = shifted.getUTCFullYear();
  const month = String(shifted.getUTCMonth() + 1).padStart(2, '0');
  const day = String(shifted.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** 提交时间格式化为 CST 文本（导出用） */
function formatCstTime(date: Date): string {
  const shifted = new Date(date.getTime() + CST_OFFSET_MS);
  const pad = (value: number): string => String(value).padStart(2, '0');
  return (
    `${shifted.getUTCFullYear()}-${pad(shifted.getUTCMonth() + 1)}-${pad(shifted.getUTCDate())} ` +
    `${pad(shifted.getUTCHours())}:${pad(shifted.getUTCMinutes())}:${pad(shifted.getUTCSeconds())}`
  );
}
