// 企业服务（PRD §7.2）：
//   - 增删改查 + 分页（名称/类目/状态筛选，多类目标签展示）；
//   - 类目多选：company_categories 关联表整体替换（create/update 事务保证一致）；
//   - 删除为逻辑删除（产品关联企业被删除后官网展示「未关联」，产品不受影响）；
//   - 双语联动与机器翻译标记走 translate-fields 公共工具；
//   - honorImages 以 JSON 数组字符串存 TEXT 列，对外返回解析后的数组。
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { parseJsonStringArray } from '../common/json-array.util';
import { PrismaService } from '../prisma/prisma.service';
import { TranslationService } from '../translation/translation.service';
import { translateFields } from '../translation/translate-fields.util';
import type { BilingualFieldPair } from '../translation/translate-fields.util';
import type { CreateCompanyDto } from './dto/create-company.dto';
import type { UpdateCompanyDto } from './dto/update-company.dto';
import type { QueryCompanyDto } from './dto/query-company.dto';

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;

/** 企业 + 类目标签（后台视图） */
type CompanyWithCategories = Prisma.CompanyGetPayload<{
  include: {
    companyCategories: {
      include: { category: { select: { id: true; nameZh: true; nameEn: true } } };
    };
  };
}>;

/** 企业其余标量字段（buildData 入参，字段与 DTO 对齐） */
interface CompanyRestFields {
  logoUrl: string | null | undefined;
  coverUrl: string | null | undefined;
  foundedYear: number | null | undefined;
  scale: string | null | undefined;
  address: string | null | undefined;
  contactName: string | null | undefined;
  phone: string | null | undefined;
  email: string | null | undefined;
  website: string | null | undefined;
  honorImages: string[];
  sort: number;
  status: number;
}

@Injectable()
export class CompanyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly translation: TranslationService,
  ) {}

  async list(query: QueryCompanyDto) {
    const page = query.page ?? DEFAULT_PAGE;
    const pageSize = query.pageSize ?? DEFAULT_PAGE_SIZE;
    const where = this.buildWhere(query);

    const [rows, total] = await Promise.all([
      this.prisma.company.findMany({
        where,
        orderBy: [{ sort: 'asc' }, { id: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { companyCategories: { include: { category: { select: { id: true, nameZh: true, nameEn: true } } } } },
      }),
      this.prisma.company.count({ where }),
    ]);
    // 列表页「产品数」列（原型 adminCompanies）：按页内企业一次聚合，避免循环查询（性能基线 §7）
    const productCounts = await this.prisma.product.groupBy({
      by: ['companyId'],
      where: { companyId: { in: rows.map((row) => row.id) }, deletedAt: null },
      _count: { _all: true },
    });
    const productMap = new Map(productCounts.map((item) => [item.companyId, item._count._all]));

    return {
      page,
      pageSize,
      total,
      list: rows.map((row) => ({ ...this.toView(row), productCount: productMap.get(row.id) ?? 0 })),
    };
  }

  async detail(id: number) {
    const company = await this.findOrThrow(id);
    const productCount = await this.prisma.product.count({
      where: { companyId: id, deletedAt: null },
    });
    return { ...this.toView(company), productCount };
  }

  async create(dto: CreateCompanyDto) {
    await this.assertCategoriesExist(dto.categoryIds);
    const data = await this.buildData(
      [
        { key: 'nameEn', zh: dto.nameZh, en: dto.nameEn },
        { key: 'introEn', zh: dto.introZh, en: dto.introEn },
        { key: 'addressEn', zh: dto.address, en: dto.addressEn },
        { key: 'contactNameEn', zh: dto.contactName, en: dto.contactNameEn },
      ],
      {
        nameZh: dto.nameZh,
        introZh: dto.introZh,
        nameEn: dto.nameEn ?? null,
        introEn: dto.introEn ?? null,
        addressEn: dto.addressEn ?? null,
        contactNameEn: dto.contactNameEn ?? null,
        machineFields: null,
      },
      {
        logoUrl: dto.logoUrl,
        coverUrl: dto.coverUrl,
        foundedYear: dto.foundedYear,
        scale: dto.scale,
        address: dto.address,
        contactName: dto.contactName,
        phone: dto.phone,
        email: dto.email,
        website: dto.website,
        honorImages: dto.honorImages ?? [],
        sort: dto.sort ?? 0,
        status: dto.status ?? 1,
      },
    );

    const created = await this.prisma.$transaction(async (tx) => {
      const company = await tx.company.create({ data });
      await tx.companyCategory.createMany({
        data: dto.categoryIds.map((categoryId) => ({ companyId: company.id, categoryId })),
      });
      return company;
    });
    // 事务结束后再读（含关联），避免事务外客户端读不到未提交写入
    return this.detail(created.id);
  }

  async update(id: number, dto: UpdateCompanyDto) {
    const existing = await this.findOrThrow(id);
    if (dto.categoryIds) {
      await this.assertCategoriesExist(dto.categoryIds);
    }
    // 仅对管理员实际改动过的双语字段做联动：未触碰的字段保留原值与原机器翻译标记，
    // 避免「只改 scale 却把 nameEn 误判为人工填写而清除标记」。
    // 英文未显式提交时按留空处理：中文改动会自动重译并打标记，不沿用旧英文。
    const pairs: BilingualFieldPair[] = [];
    if (dto.nameZh !== undefined || dto.nameEn !== undefined) {
      // prevEn：表单回传未改动的机器翻译英文时保持原标记（方案 §5.3 原值保留）
      pairs.push({ key: 'nameEn', zh: dto.nameZh ?? existing.nameZh, en: dto.nameEn ?? null, prevEn: existing.nameEn });
    }
    if (dto.introZh !== undefined || dto.introEn !== undefined) {
      pairs.push({
        key: 'introEn',
        zh: dto.introZh ?? existing.introZh ?? '',
        en: dto.introEn ?? null,
        prevEn: existing.introEn,
      });
    }
    if (dto.address !== undefined || dto.addressEn !== undefined) {
      pairs.push({ key: 'addressEn', zh: dto.address ?? existing.address ?? '', en: dto.addressEn ?? null, prevEn: existing.addressEn });
    }
    if (dto.contactName !== undefined || dto.contactNameEn !== undefined) {
      pairs.push({
        key: 'contactNameEn',
        zh: dto.contactName ?? existing.contactName ?? '',
        en: dto.contactNameEn ?? null,
        prevEn: existing.contactNameEn,
      });
    }
    const data = await this.buildData(
      pairs,
      {
        nameZh: dto.nameZh ?? existing.nameZh,
        introZh: dto.introZh ?? existing.introZh ?? '',
        nameEn: existing.nameEn,
        introEn: existing.introEn,
        addressEn: existing.addressEn,
        contactNameEn: existing.contactNameEn,
        machineFields: existing.machineFields,
      },
      {
        logoUrl: dto.logoUrl ?? existing.logoUrl,
        coverUrl: dto.coverUrl ?? existing.coverUrl,
        foundedYear: dto.foundedYear ?? existing.foundedYear,
        scale: dto.scale ?? existing.scale,
        address: dto.address ?? existing.address,
        contactName: dto.contactName ?? existing.contactName,
        phone: dto.phone ?? existing.phone,
        email: dto.email ?? existing.email,
        website: dto.website ?? existing.website,
        honorImages: dto.honorImages ?? parseJsonStringArray(existing.honorImages),
        sort: dto.sort ?? existing.sort,
        status: dto.status ?? existing.status,
      },
    );

    await this.prisma.$transaction(async (tx) => {
      await tx.company.update({ where: { id }, data });
      if (dto.categoryIds) {
        await tx.companyCategory.deleteMany({ where: { companyId: id } });
        await tx.companyCategory.createMany({
          data: dto.categoryIds.map((categoryId) => ({ companyId: id, categoryId })),
        });
      }
    });
    return this.detail(id);
  }

  /** 逻辑删除（PRD §7.2）：关联产品不删除，官网展示「未关联」 */
  async remove(id: number) {
    await this.findOrThrow(id);
    await this.prisma.company.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  // ---- 官网公开读取 ----

  /** 类目页企业列表（仅上架，按排序升序，分页 12/页，计划 §5.2） */
  async listPublished(categoryId: number, page: number, pageSize: number) {
    const where = {
      status: 1,
      deletedAt: null,
      ...(categoryId ? { companyCategories: { some: { categoryId } } } : {}),
    };
    const [rows, total] = await Promise.all([
      this.prisma.company.findMany({
        where,
        orderBy: [{ sort: 'asc' }, { id: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { companyCategories: { include: { category: { select: { id: true, nameZh: true, nameEn: true } } } } },
      }),
      this.prisma.company.count({ where }),
    ]);
    return { page, pageSize, total, list: rows.map((row) => this.toPublicView(row)) };
  }

  /** 企业详情（官网）：含类目标签与分页关联产品（PRD §6.5 企业详情） */
  async publicDetail(id: number, page: number, pageSize: number) {
    const company = await this.prisma.company.findFirst({
      where: { id, status: 1, deletedAt: null },
      include: { companyCategories: { include: { category: { select: { id: true, nameZh: true, nameEn: true } } } } },
    });
    if (!company) {
      throw new NotFoundException('企业不存在');
    }
    const [products, productTotal] = await Promise.all([
      this.prisma.product.findMany({
        where: { companyId: id, status: 1, deletedAt: null },
        orderBy: [{ sort: 'asc' }, { id: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          nameZh: true,
          nameEn: true,
          mainImage: true,
          priceRef: true,
          moq: true,
        },
      }),
      this.prisma.product.count({ where: { companyId: id, status: 1, deletedAt: null } }),
    ]);
    return { ...this.toPublicView(company), products: { page, pageSize, total: productTotal, list: products } };
  }

  /** 双语联动 + honorImages 序列化；pairs 之外的字段沿用 current 原值（含原标记） */
  private async buildData(
    pairs: BilingualFieldPair[],
    current: {
      nameZh: string;
      introZh: string;
      nameEn: string | null | undefined;
      introEn: string | null | undefined;
      addressEn: string | null | undefined;
      contactNameEn: string | null | undefined;
      machineFields: string | null;
    },
    rest: CompanyRestFields,
  ) {
    const { machineFields: marks, enByKey } = await translateFields(pairs, current.machineFields, this.translation);
    return {
      ...rest,
      nameZh: current.nameZh,
      introZh: current.introZh,
      nameEn: enByKey.get('nameEn') ?? current.nameEn ?? '',
      introEn: enByKey.get('introEn') ?? current.introEn ?? null,
      addressEn: enByKey.get('addressEn') ?? current.addressEn ?? null,
      contactNameEn: enByKey.get('contactNameEn') ?? current.contactNameEn ?? null,
      machineFields: marks,
      honorImages: JSON.stringify(rest.honorImages),
    };
  }

  private async assertCategoriesExist(categoryIds: number[]): Promise<void> {
    const count = await this.prisma.category.count({ where: { id: { in: categoryIds } } });
    if (count !== categoryIds.length) {
      throw new BadRequestException('所选类目不存在');
    }
  }

  private buildWhere(query: QueryCompanyDto) {
    const where: {
      status?: number;
      deletedAt: null;
      OR?: object[];
      companyCategories?: { some: { categoryId: number } };
    } = { deletedAt: null };
    if (query.status !== undefined) {
      where.status = query.status;
    }
    if (query.categoryId !== undefined) {
      where.companyCategories = { some: { categoryId: query.categoryId } };
    }
    const keyword = query.keyword?.trim();
    if (keyword) {
      where.OR = [{ nameZh: { contains: keyword } }, { nameEn: { contains: keyword } }];
    }
    return where;
  }

  private async findOrThrow(id: number): Promise<CompanyWithCategories> {
    const company = await this.prisma.company.findFirst({
      where: { id, deletedAt: null },
      include: { companyCategories: { include: { category: { select: { id: true, nameZh: true, nameEn: true } } } } },
    });
    if (!company) {
      throw new NotFoundException('企业不存在');
    }
    return company;
  }

  /** 后台视图：honorImages 解析为数组，类目标签扁平化 */
  private toView(row: CompanyWithCategories) {
    const { companyCategories, honorImages, ...rest } = row;
    return {
      ...rest,
      honorImages: parseJsonStringArray(honorImages),
      categories: companyCategories.map((link) => ({
        id: link.category.id,
        nameZh: link.category.nameZh,
      })),
    };
  }

  /** 官网视图：仅暴露公开字段 */
  private toPublicView(row: CompanyWithCategories) {
    return {
      id: row.id,
      nameZh: row.nameZh,
      nameEn: row.nameEn,
      logoUrl: row.logoUrl,
      coverUrl: row.coverUrl,
      foundedYear: row.foundedYear,
      scale: row.scale,
      address: row.address,
      addressEn: row.addressEn,
      contactName: row.contactName,
      contactNameEn: row.contactNameEn,
      phone: row.phone,
      email: row.email,
      website: row.website,
      introZh: row.introZh,
      introEn: row.introEn,
      honorImages: parseJsonStringArray(row.honorImages),
      categories: row.companyCategories.map((link) => ({
        id: link.category.id,
        nameZh: link.category.nameZh,
        nameEn: link.category.nameEn,
      })),
    };
  }
}
