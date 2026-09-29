// 新闻服务（PRD §7.4.1）：
//   - 增删改查 + 分页（标题关键词/状态筛选）+ 发布/下线 + 逻辑删除；
//   - 定时发布：官网可见 = 已发布(1) 且 publish_time ≤ 当前时间（查询时判定，
//     无需定时任务，到达时间自然可见）；
//   - 双语联动与机器翻译标记走 translate-fields 公共工具。
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TranslationService } from '../translation/translation.service';
import { translateFields } from '../translation/translate-fields.util';
import type { BilingualFieldPair } from '../translation/translate-fields.util';
import type { CreateNewsDto } from './dto/create-news.dto';
import type { UpdateNewsDto } from './dto/update-news.dto';
import type { QueryNewsDto } from './dto/query-news.dto';

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;
const HOME_NEWS_COUNT = 4;

@Injectable()
export class NewsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly translation: TranslationService,
  ) {}

  async list(query: QueryNewsDto) {
    const page = query.page ?? DEFAULT_PAGE;
    const pageSize = query.pageSize ?? DEFAULT_PAGE_SIZE;
    const where = this.buildWhere(query);

    const [rows, total] = await Promise.all([
      this.prisma.news.findMany({
        where,
        orderBy: [{ isTop: 'desc' }, { publishTime: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.news.count({ where }),
    ]);

    return { page, pageSize, total, list: rows };
  }

  async detail(id: number) {
    return this.findOrThrow(id);
  }

  async create(dto: CreateNewsDto) {
    const data = await this.buildData(
      [
        { key: 'titleEn', zh: dto.titleZh, en: dto.titleEn },
        { key: 'summaryEn', zh: dto.summaryZh ?? null, en: dto.summaryEn },
        { key: 'contentEn', zh: dto.contentZh, en: dto.contentEn },
      ],
      {
        titleZh: dto.titleZh,
        summaryZh: dto.summaryZh ?? null,
        contentZh: dto.contentZh,
        titleEn: dto.titleEn ?? null,
        summaryEn: dto.summaryEn ?? null,
        contentEn: dto.contentEn ?? null,
        machineFields: null,
      },
      {
        coverUrl: dto.coverUrl,
        publishTime: new Date(dto.publishTime),
        isTop: dto.isTop ?? false,
        status: dto.status ?? 0,
      },
    );
    const created = await this.prisma.news.create({ data });
    return this.detail(created.id);
  }

  async update(id: number, dto: UpdateNewsDto) {
    const existing = await this.findOrThrow(id);
    // 仅对实际改动过的双语字段做联动（同企业/类目/产品：未触碰字段保留原值与原标记）
    const pairs: BilingualFieldPair[] = [];
    if (dto.titleZh !== undefined || dto.titleEn !== undefined) {
      // prevEn：表单回传未改动的机器翻译英文时保持原翻译标记（方案 §5.3 原值保留）
      pairs.push({ key: 'titleEn', zh: dto.titleZh ?? existing.titleZh, en: dto.titleEn ?? null, prevEn: existing.titleEn });
    }
    if (dto.summaryZh !== undefined || dto.summaryEn !== undefined) {
      pairs.push({
        key: 'summaryEn',
        zh: dto.summaryZh ?? existing.summaryZh ?? null,
        en: dto.summaryEn ?? null,
        prevEn: existing.summaryEn,
      });
    }
    if (dto.contentZh !== undefined || dto.contentEn !== undefined) {
      pairs.push({
        key: 'contentEn',
        zh: dto.contentZh ?? existing.contentZh ?? null,
        en: dto.contentEn ?? null,
        prevEn: existing.contentEn,
      });
    }
    const data = await this.buildData(
      pairs,
      {
        titleZh: dto.titleZh ?? existing.titleZh,
        summaryZh: dto.summaryZh ?? existing.summaryZh,
        contentZh: dto.contentZh ?? existing.contentZh ?? '',
        titleEn: existing.titleEn,
        summaryEn: existing.summaryEn,
        contentEn: existing.contentEn,
        machineFields: existing.machineFields,
      },
      {
        coverUrl: dto.coverUrl ?? existing.coverUrl,
        publishTime: dto.publishTime ? new Date(dto.publishTime) : existing.publishTime,
        isTop: dto.isTop ?? existing.isTop,
        status: dto.status ?? existing.status,
      },
    );
    await this.prisma.news.update({ where: { id }, data });
    return this.detail(id);
  }

  /** 发布(1) / 下线转草稿(0)（PRD §7.4.1） */
  async updateStatus(id: number, status: number) {
    await this.findOrThrow(id);
    await this.prisma.news.update({ where: { id }, data: { status } });
    return this.detail(id);
  }

  /** 逻辑删除（PRD §7.4.1） */
  async remove(id: number) {
    await this.findOrThrow(id);
    await this.prisma.news.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  // ---- 官网公开读取 ----

  /** 新闻列表页（PRD §6.6）：已发布且到达发布时间；置顶优先，其次发布时间倒序，12/页 */
  async listPublished(page: number, pageSize: number) {
    const where = { status: 1, deletedAt: null, publishTime: { lte: new Date() } };
    const [rows, total] = await Promise.all([
      this.prisma.news.findMany({
        where,
        orderBy: [{ isTop: 'desc' }, { publishTime: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
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
      }),
      this.prisma.news.count({ where }),
    ]);
    return { page, pageSize, total, list: rows };
  }

  /** 首页新闻 4 条（PRD §6.1），同样遵循定时发布可见性 */
  latest() {
    return this.prisma.news.findMany({
      where: { status: 1, deletedAt: null, publishTime: { lte: new Date() } },
      orderBy: [{ isTop: 'desc' }, { publishTime: 'desc' }, { id: 'desc' }],
      take: HOME_NEWS_COUNT,
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
  }

  /** 新闻详情页（PRD §6.7）：未发布/未到发布时间/已删除均 404 */
  async publicDetail(id: number) {
    const news = await this.prisma.news.findFirst({
      where: { id, status: 1, deletedAt: null, publishTime: { lte: new Date() } },
    });
    if (!news) {
      throw new NotFoundException('新闻不存在');
    }
    return news;
  }

  /** 双语联动 */
  private async buildData(
    pairs: BilingualFieldPair[],
    current: {
      titleZh: string;
      summaryZh: string | null | undefined;
      contentZh: string;
      titleEn: string | null | undefined;
      summaryEn: string | null | undefined;
      contentEn: string | null | undefined;
      machineFields: string | null;
    },
    rest: { coverUrl: string | null | undefined; publishTime: Date | null; isTop: boolean; status: number },
  ) {
    const { machineFields: marks, enByKey } = await translateFields(pairs, current.machineFields, this.translation);
    return {
      ...rest,
      titleZh: current.titleZh,
      titleEn: enByKey.get('titleEn') ?? current.titleEn ?? '',
      summaryZh: current.summaryZh,
      summaryEn: enByKey.get('summaryEn') ?? current.summaryEn ?? null,
      contentZh: current.contentZh,
      contentEn: enByKey.get('contentEn') ?? current.contentEn ?? null,
      machineFields: marks,
    };
  }

  private buildWhere(query: QueryNewsDto) {
    const where: { status?: number; deletedAt: null; OR?: object[] } = { deletedAt: null };
    if (query.status !== undefined) {
      where.status = query.status;
    }
    const keyword = query.keyword?.trim();
    if (keyword) {
      where.OR = [{ titleZh: { contains: keyword } }, { titleEn: { contains: keyword } }];
    }
    return where;
  }

  private async findOrThrow(id: number) {
    const news = await this.prisma.news.findFirst({ where: { id, deletedAt: null } });
    if (!news) {
      throw new NotFoundException('新闻不存在');
    }
    return news;
  }
}
