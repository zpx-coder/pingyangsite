// 类目服务（PRD §7.3）：
//   - 增删改查 + 分页（含产品数/企业数统计，groupBy 聚合避免循环查询，性能基线 §7）；
//   - 删除保护：类目下存在未删除产品或未删除企业的关联时拒绝删除；
//   - 双语联动（方案 §5.3）：英文字段留空自动翻译并打 machine_fields 标记，
//     人工填写的英文字段清除标记；「一键翻译」重译并重新标记。
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TranslationService } from '../translation/translation.service';
import { markMachineFields } from '../translation/machine-fields.util';
import { translateFields } from '../translation/translate-fields.util';
import type { BilingualFieldPair } from '../translation/translate-fields.util';
import type { CreateCategoryDto } from './dto/create-category.dto';
import type { UpdateCategoryDto } from './dto/update-category.dto';
import type { QueryCategoryDto } from './dto/query-category.dto';

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;
const DELETE_BLOCKED_MESSAGE = '请先迁移该类目下的产品与企业';

@Injectable()
export class CategoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly translation: TranslationService,
  ) {}

  async list(query: QueryCategoryDto) {
    const page = query.page ?? DEFAULT_PAGE;
    const pageSize = query.pageSize ?? DEFAULT_PAGE_SIZE;
    const where = this.buildWhere(query);

    const [rows, total] = await Promise.all([
      this.prisma.category.findMany({
        where,
        orderBy: [{ sort: 'asc' }, { id: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.category.count({ where }),
    ]);

    const ids = rows.map((row) => row.id);
    const [productCounts, companyCounts] = await Promise.all([
      this.prisma.product.groupBy({
        by: ['categoryId'],
        where: { categoryId: { in: ids }, deletedAt: null },
        _count: { _all: true },
      }),
      // 关联统计只算未删除企业（已逻辑删除的企业不阻塞也不计入）
      this.prisma.companyCategory.groupBy({
        by: ['categoryId'],
        where: { categoryId: { in: ids }, company: { deletedAt: null } },
        _count: { _all: true },
      }),
    ]);

    const productMap = new Map(productCounts.map((item) => [item.categoryId, item._count._all]));
    const companyMap = new Map(companyCounts.map((item) => [item.categoryId, item._count._all]));

    return {
      page,
      pageSize,
      total,
      list: rows.map((row) => ({
        ...row,
        productCount: productMap.get(row.id) ?? 0,
        companyCount: companyMap.get(row.id) ?? 0,
      })),
    };
  }

  async detail(id: number) {
    const category = await this.findOrThrow(id);
    const [productCount, companyCount] = await Promise.all([
      this.prisma.product.count({ where: { categoryId: id, deletedAt: null } }),
      this.prisma.companyCategory.count({ where: { categoryId: id, company: { deletedAt: null } } }),
    ]);
    return { ...category, productCount, companyCount };
  }

  async create(dto: CreateCategoryDto) {
    const { machineFields, enByKey } = await translateFields(
      [
        { key: 'nameEn', zh: dto.nameZh, en: dto.nameEn },
        { key: 'introEn', zh: dto.introZh, en: dto.introEn },
      ],
      null,
      this.translation,
    );
    return this.prisma.category.create({
      data: {
        nameZh: dto.nameZh,
        nameEn: enByKey.get('nameEn') ?? '',
        iconUrl: dto.iconUrl,
        introZh: dto.introZh,
        introEn: enByKey.get('introEn'),
        sort: dto.sort ?? 0,
        status: dto.status ?? 1,
        machineFields,
      },
    });
  }

  async update(id: number, dto: UpdateCategoryDto) {
    const existing = await this.findOrThrow(id);
    // 仅对实际改动过的双语字段做联动：未触碰的字段保留原值与原机器翻译标记，
    // 避免「只改排序却把 nameEn 误判为人工填写而清除标记」。
    // 英文未显式提交时按留空处理：中文改动会自动重译并打标记，不沿用旧英文。
    const pairs: BilingualFieldPair[] = [];
    if (dto.nameZh !== undefined || dto.nameEn !== undefined) {
      pairs.push({ key: 'nameEn', zh: dto.nameZh ?? existing.nameZh, en: dto.nameEn ?? null });
    }
    if (dto.introZh !== undefined || dto.introEn !== undefined) {
      pairs.push({
        key: 'introEn',
        zh: dto.introZh ?? existing.introZh ?? null,
        en: dto.introEn ?? null,
      });
    }
    const { machineFields, enByKey } = await translateFields(pairs, existing.machineFields, this.translation);
    return this.prisma.category.update({
      where: { id },
      data: {
        nameZh: dto.nameZh ?? existing.nameZh,
        nameEn: enByKey.get('nameEn') ?? existing.nameEn,
        iconUrl: dto.iconUrl ?? existing.iconUrl,
        introZh: dto.introZh ?? existing.introZh,
        introEn: enByKey.get('introEn') ?? existing.introEn,
        sort: dto.sort ?? existing.sort,
        status: dto.status ?? existing.status,
        machineFields,
      },
    });
  }

  /**
   * 删除保护（PRD §7.3）：
   *   - 类目下存在未删除产品或未删除企业的关联 → 拒绝删除，提示迁移；
   *   - 已逻辑删除的产品与已删除企业的关联行属「死数据」，其外键仍指向类目，
   *     在删除类目时于事务内一并物理清理，避免外键冲突与不可见的删除陷阱。
   */
  async remove(id: number) {
    await this.findOrThrow(id);
    const [productCount, companyCount] = await Promise.all([
      this.prisma.product.count({ where: { categoryId: id, deletedAt: null } }),
      this.prisma.companyCategory.count({ where: { categoryId: id, company: { deletedAt: null } } }),
    ]);
    if (productCount + companyCount > 0) {
      throw new BadRequestException(DELETE_BLOCKED_MESSAGE);
    }
    await this.prisma.$transaction([
      this.prisma.product.deleteMany({ where: { categoryId: id, deletedAt: { not: null } } }),
      this.prisma.companyCategory.deleteMany({
        where: { categoryId: id, company: { deletedAt: { not: null } } },
      }),
      this.prisma.category.delete({ where: { id } }),
    ]);
  }

  /** 一键翻译（方案 §5.3 重译入口）：重译中英文案并重新打机器翻译标记 */
  async translate(id: number) {
    const existing = await this.findOrThrow(id);
    const [nameEn, introEn] = (await this.translation.translateSafe(
      [existing.nameZh, existing.introZh ?? ''],
      'zh',
      'en',
    )) ?? [null, null];

    const machineFields = markMachineFields(existing.machineFields, [
      ...(nameEn ? ['nameEn'] : []),
      ...(introEn ? ['introEn'] : []),
    ]);
    return this.prisma.category.update({
      where: { id },
      data: {
        nameEn: nameEn ?? existing.nameEn,
        introEn: introEn ?? existing.introEn,
        machineFields,
      },
    });
  }

  /** 官网读取：仅上架类目按排序升序（首页卡片与导航用，PRD §6.1） */
  listPublished() {
    return this.prisma.category.findMany({
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
  }

  private buildWhere(query: QueryCategoryDto) {
    const where: { status?: number; OR?: object[] } = {};
    if (query.status !== undefined) {
      where.status = query.status;
    }
    const keyword = query.keyword?.trim();
    if (keyword) {
      where.OR = [{ nameZh: { contains: keyword } }, { nameEn: { contains: keyword } }];
    }
    return where;
  }

  private async findOrThrow(id: number) {
    const category = await this.prisma.category.findUnique({ where: { id } });
    if (!category) {
      throw new NotFoundException('类目不存在');
    }
    return category;
  }
}
