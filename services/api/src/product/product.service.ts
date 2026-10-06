// 产品服务（PRD §7.1）：
//   - 增删改查 + 分页（名称/类目/状态组合筛选）；状态流转 草稿(0)→已发布(1)→已下架(2)；
//   - 删除为逻辑删除（PRD §7.1：已关联询盘的产品仍可删除，询盘保留产品名称快照）；
//   - 企业关联选填：companyId 传 null 解除关联（PRD §6.4 产品可不关联企业）；
//   - 双语联动与机器翻译标记走 translate-fields 公共工具；
//   - images 以 JSON 数组字符串存 TEXT 列，对外返回解析后的数组。
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { parseJsonStringArray } from '../common/json-array.util';
import { PrismaService } from '../prisma/prisma.service';
import { TranslationService } from '../translation/translation.service';
import { translateFields } from '../translation/translate-fields.util';
import type { BilingualFieldPair } from '../translation/translate-fields.util';
import type { CreateProductDto } from './dto/create-product.dto';
import type { UpdateProductDto } from './dto/update-product.dto';
import type { QueryProductDto } from './dto/query-product.dto';

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;
const OTHER_PRODUCTS_LIMIT = 8;

/** 产品 + 类目 + 关联企业 */
type ProductWithRelations = Prisma.ProductGetPayload<{
  include: {
    category: { select: { id: true; nameZh: true } };
    company: { select: { id: true; nameZh: true } };
  };
}>;

@Injectable()
export class ProductService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly translation: TranslationService,
  ) {}

  async list(query: QueryProductDto) {
    const page = query.page ?? DEFAULT_PAGE;
    const pageSize = query.pageSize ?? DEFAULT_PAGE_SIZE;
    const where = this.buildWhere(query);

    const [rows, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        orderBy: [{ sort: 'asc' }, { updatedAt: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { category: { select: { id: true, nameZh: true } }, company: { select: { id: true, nameZh: true } } },
      }),
      this.prisma.product.count({ where }),
    ]);

    return { page, pageSize, total, list: rows.map((row) => this.toView(row)) };
  }

  async detail(id: number) {
    return this.toView(await this.findOrThrow(id));
  }

  async create(dto: CreateProductDto) {
    await this.assertCategoryUsable(dto.categoryId);
    // 企业关联选填：null/undefined 均跳过校验（null 落库为不关联），与 update 语义一致
    if (dto.companyId != null) {
      await this.assertCompanyExists(dto.companyId);
    }
    const data = await this.buildData(
      [
        { key: 'nameEn', zh: dto.nameZh, en: dto.nameEn },
        { key: 'introEn', zh: dto.introZh ?? null, en: dto.introEn },
        { key: 'detailEn', zh: dto.detailZh, en: dto.detailEn },
      ],
      {
        nameZh: dto.nameZh,
        introZh: dto.introZh ?? null,
        detailZh: dto.detailZh,
        nameEn: dto.nameEn ?? null,
        introEn: dto.introEn ?? null,
        detailEn: dto.detailEn ?? null,
        machineFields: null,
      },
      {
        categoryId: dto.categoryId,
        companyId: dto.companyId ?? null,
        mainImage: dto.mainImage,
        images: dto.images ?? [],
        priceRef: dto.priceRef,
        moq: dto.moq,
        sort: dto.sort ?? 0,
        status: dto.status ?? 0,
      },
    );
    const created = await this.prisma.product.create({ data });
    return this.detail(created.id);
  }

  async update(id: number, dto: UpdateProductDto) {
    const existing = await this.findOrThrow(id);
    if (dto.categoryId !== undefined) {
      await this.assertCategoryUsable(dto.categoryId);
    }
    if (dto.companyId != null) {
      await this.assertCompanyExists(dto.companyId);
    }
    // 仅对实际改动过的双语字段做联动（同企业/类目：未触碰字段保留原值与原标记，
    // 英文未显式提交按留空处理，中文改动自动重译并打标）
    const pairs: BilingualFieldPair[] = [];
    if (dto.nameZh !== undefined || dto.nameEn !== undefined) {
      // prevEn：表单回传未改动的机器翻译英文时保持原标记（方案 §5.3 原值保留）
      pairs.push({ key: 'nameEn', zh: dto.nameZh ?? existing.nameZh, en: dto.nameEn ?? null, prevEn: existing.nameEn });
    }
    if (dto.introZh !== undefined || dto.introEn !== undefined) {
      pairs.push({ key: 'introEn', zh: dto.introZh ?? existing.introZh ?? null, en: dto.introEn ?? null, prevEn: existing.introEn });
    }
    if (dto.detailZh !== undefined || dto.detailEn !== undefined) {
      pairs.push({ key: 'detailEn', zh: dto.detailZh ?? existing.detailZh ?? null, en: dto.detailEn ?? null, prevEn: existing.detailEn });
    }
    const data = await this.buildData(
      pairs,
      {
        nameZh: dto.nameZh ?? existing.nameZh,
        introZh: dto.introZh ?? existing.introZh,
        detailZh: dto.detailZh ?? existing.detailZh ?? '',
        nameEn: existing.nameEn,
        introEn: existing.introEn,
        detailEn: existing.detailEn,
        machineFields: existing.machineFields,
      },
      {
        categoryId: dto.categoryId ?? existing.categoryId,
        // companyId 显式传 null = 解除企业关联（企业选填，PRD §6.4/7.1）
        companyId: dto.companyId !== undefined ? dto.companyId : existing.companyId,
        mainImage: dto.mainImage ?? existing.mainImage,
        images: dto.images ?? parseJsonStringArray(existing.images),
        priceRef: dto.priceRef ?? existing.priceRef,
        moq: dto.moq ?? existing.moq,
        sort: dto.sort ?? existing.sort,
        status: dto.status ?? existing.status,
      },
    );
    await this.prisma.product.update({ where: { id }, data });
    return this.detail(id);
  }

  /** 状态流转（PRD §7.1）：草稿(0) → 已发布(1) → 已下架(2) →（重新）已发布(1) */
  async updateStatus(id: number, status: number) {
    await this.findOrThrow(id);
    await this.prisma.product.update({ where: { id }, data: { status } });
    return this.detail(id);
  }

  /** 批量操作（PRD §7.1 列表页）：删除 / 上架 / 下架，仅作用于未删除产品 */
  async batch(ids: number[], action: 'delete' | 'publish' | 'unpublish') {
    const where = { id: { in: ids }, deletedAt: null };
    if (action === 'delete') {
      const result = await this.prisma.product.updateMany({ where, data: { deletedAt: new Date() } });
      return { count: result.count };
    }
    const result = await this.prisma.product.updateMany({
      where,
      data: { status: action === 'publish' ? 1 : 2 },
    });
    return { count: result.count };
  }

  /** 逻辑删除（PRD §7.1）：询盘记录保留并展示产品名称快照，不受影响 */
  async remove(id: number) {
    await this.findOrThrow(id);
    await this.prisma.product.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  // ---- 官网公开读取 ----

  /** 类目页产品列表（PRD §6.3）：仅已发布，排序值升序 + 更新时间倒序兜底，12/页 */
  async listPublished(categoryId: number, page: number, pageSize: number) {
    const where = {
      status: 1,
      deletedAt: null,
      ...(categoryId ? { categoryId } : {}),
    };
    const [rows, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        orderBy: [{ sort: 'asc' }, { updatedAt: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { company: { select: { id: true, nameZh: true, nameEn: true } } },
      }),
      this.prisma.product.count({ where }),
    ]);
    return {
      page,
      pageSize,
      total,
      list: rows.map((row) => ({
        id: row.id,
        nameZh: row.nameZh,
        nameEn: row.nameEn,
        mainImage: row.mainImage,
        priceRef: row.priceRef,
        moq: row.moq,
        company: row.company ? { id: row.company.id, nameZh: row.company.nameZh, nameEn: row.company.nameEn } : null,
      })),
    };
  }

  /** 产品详情（PRD §6.4）：仅已发布可见，下架/删除后 404；附该企业其他产品 */
  async publicDetail(id: number) {
    const product = await this.prisma.product.findFirst({
      where: { id, status: 1, deletedAt: null },
      include: {
        category: { select: { id: true, nameZh: true, nameEn: true } },
        company: { select: { id: true, nameZh: true, nameEn: true, logoUrl: true } },
      },
    });
    if (!product) {
      throw new NotFoundException('产品不存在');
    }
    const otherProducts = product.companyId
      ? await this.prisma.product.findMany({
          where: { companyId: product.companyId, status: 1, deletedAt: null, id: { not: id } },
          orderBy: [{ sort: 'asc' }, { updatedAt: 'desc' }],
          take: OTHER_PRODUCTS_LIMIT,
          select: { id: true, nameZh: true, nameEn: true, mainImage: true, priceRef: true, moq: true },
        })
      : [];
    return {
      id: product.id,
      nameZh: product.nameZh,
      nameEn: product.nameEn,
      category: { id: product.category.id, nameZh: product.category.nameZh, nameEn: product.category.nameEn },
      company: product.company
        ? { id: product.company.id, nameZh: product.company.nameZh, nameEn: product.company.nameEn }
        : null,
      mainImage: product.mainImage,
      gallery: parseJsonStringArray(product.images),
      introZh: product.introZh,
      introEn: product.introEn,
      detailZh: product.detailZh,
      detailEn: product.detailEn,
      priceRef: product.priceRef,
      moq: product.moq,
      otherProducts,
    };
  }

  /** 双语联动 + images 序列化；pairs 之外的字段沿用 current 原值（含原标记） */
  private async buildData(
    pairs: BilingualFieldPair[],
    current: {
      nameZh: string;
      introZh: string | null | undefined;
      detailZh: string;
      nameEn: string | null | undefined;
      introEn: string | null | undefined;
      detailEn: string | null | undefined;
      machineFields: string | null;
    },
    rest: {
      categoryId: number;
      companyId: number | null;
      mainImage: string | null | undefined;
      images: string[];
      priceRef: string | null | undefined;
      moq: string | null | undefined;
      sort: number;
      status: number;
    },
  ) {
    const { machineFields: marks, enByKey } = await translateFields(pairs, current.machineFields, this.translation);
    return {
      ...rest,
      nameZh: current.nameZh,
      nameEn: enByKey.get('nameEn') ?? current.nameEn ?? '',
      introZh: current.introZh,
      introEn: enByKey.get('introEn') ?? current.introEn ?? null,
      detailZh: current.detailZh,
      detailEn: enByKey.get('detailEn') ?? current.detailEn ?? null,
      machineFields: marks,
      images: JSON.stringify(rest.images),
    };
  }

  /** 类目校验（PRD §7.1 下拉单选上架类目）：存在且已上架 */
  private async assertCategoryUsable(categoryId: number): Promise<void> {
    const category = await this.prisma.category.findFirst({ where: { id: categoryId } });
    if (!category || category.status !== 1) {
      throw new BadRequestException('所属类目不存在或已下架');
    }
  }

  private async assertCompanyExists(companyId: number): Promise<void> {
    const company = await this.prisma.company.findFirst({ where: { id: companyId, deletedAt: null } });
    if (!company) {
      throw new BadRequestException('关联企业不存在');
    }
  }

  private buildWhere(query: QueryProductDto) {
    const where: { status?: number; deletedAt: null; categoryId?: number; OR?: object[] } = { deletedAt: null };
    if (query.status !== undefined) {
      where.status = query.status;
    }
    if (query.categoryId !== undefined) {
      where.categoryId = query.categoryId;
    }
    const keyword = query.keyword?.trim();
    if (keyword) {
      where.OR = [{ nameZh: { contains: keyword } }, { nameEn: { contains: keyword } }];
    }
    return where;
  }

  private async findOrThrow(id: number): Promise<ProductWithRelations> {
    const product = await this.prisma.product.findFirst({
      where: { id, deletedAt: null },
      include: { category: { select: { id: true, nameZh: true } }, company: { select: { id: true, nameZh: true } } },
    });
    if (!product) {
      throw new NotFoundException('产品不存在');
    }
    return product;
  }

  private toView(row: ProductWithRelations) {
    const { images, ...rest } = row;
    return {
      ...rest,
      images: parseJsonStringArray(images),
      category: row.category,
      company: row.company,
    };
  }
}
