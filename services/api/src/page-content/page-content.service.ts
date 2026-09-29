// 页面内容服务（PRD §7.4.2 / 计划任务 1.9）：
//   - key-value 配置（5 个白名单 key），config 为 JSON 对象存 TEXT 列；
//   - 保存时校验各 key 的字段形状 + 双语联动（翻译字段打 machineFields 标记，
//     值未变动的字段保持原标记，人工填写清除标记）；
//   - Redis 缓存（24h）：保存即刷新，官网公开读取缓存优先、未命中回源数据库，
//     Redis 故障时自动降级直读数据库，不阻塞读写。
import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { RedisClientType } from 'redis';
import { PrismaService } from '../prisma/prisma.service';
import { REDIS_CLIENT } from '../redis/redis.module';
import { TranslationService } from '../translation/translation.service';
import { translateFields } from '../translation/translate-fields.util';
import type { BilingualFieldPair } from '../translation/translate-fields.util';
import { unmarkMachineFields } from '../translation/machine-fields.util';
import {
  PAGE_CONTENT_CACHE_PREFIX,
  PAGE_CONTENT_CACHE_TTL_SECONDS,
  PAGE_CONTENT_KEYS,
} from './page-content.constants';
import type { PageContentKey } from './page-content.constants';

/** 轮播图单项（PRD §7.4.2 home_banner） */
interface BannerImage {
  image: string;
  titleZh?: string;
  titleEn?: string;
  subtitleZh?: string;
  subtitleEn?: string;
  buttonTextZh?: string;
  buttonTextEn?: string;
}

const BANNER_MAX_COUNT = 5;
const BANNER_INTERVAL_MIN = 2;
const BANNER_INTERVAL_MAX = 30;

@Injectable()
export class PageContentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly translation: TranslationService,
    @Inject(REDIS_CLIENT) private readonly redis: RedisClientType,
  ) {}

  /** 全部配置项（后台编辑列表） */
  async list() {
    const rows = await this.prisma.pageContent.findMany({ orderBy: { key: 'asc' } });
    return rows.map((row) => ({ key: row.key, config: parseJsonObject(row.config), updatedAt: row.updatedAt }));
  }

  /** 单配置项（含 machineFields，供后台编辑页展示机器翻译标记） */
  async get(key: string) {
    this.assertKey(key);
    return this.readPage(key);
  }

  /** 保存：合并存量（未提交字段保留原值）→ 校验 → 双语联动 → upsert → 刷新缓存 */
  async save(key: string, config: Record<string, unknown>) {
    this.assertKey(key);
    const storedRow = await this.prisma.pageContent.findUnique({ where: { key } });
    const storedConfig = storedRow ? parseJsonObject(storedRow.config) : {};
    // 顶层字段合并：仅提交部分字段不会丢失未提交内容（images 等数组按整体替换语义）
    const merged = { ...storedConfig, ...config };
    this.validateConfig(key, merged);
    const translated = await this.translateConfig(key, merged, storedConfig);

    const row = await this.prisma.pageContent.upsert({
      where: { key },
      update: { config: JSON.stringify(translated) },
      create: { key, config: JSON.stringify(translated) },
    });
    const result = { key, config: translated, updatedAt: row.updatedAt };
    await this.writeCache(key, result);
    return result;
  }

  // ---- 官网公开读取（缓存优先） ----

  /** 全部配置项，返回 { key: 配置对象 } 映射（官网各页取用） */
  async publicAll(): Promise<Record<string, Record<string, unknown>>> {
    const pages = await Promise.all(PAGE_CONTENT_KEYS.map((key) => this.readPage(key)));
    const result: Record<string, Record<string, unknown>> = {};
    for (const page of pages) {
      result[page.key] = stripMachineFields(page.config);
    }
    return result;
  }

  async publicOne(key: string): Promise<Record<string, unknown>> {
    this.assertPublicKey(key);
    const page = await this.readPage(key);
    return stripMachineFields(page.config);
  }

  // ---- 内部实现 ----

  private assertKey(key: string): asserts key is PageContentKey {
    if (!(PAGE_CONTENT_KEYS as readonly string[]).includes(key)) {
      throw new BadRequestException('配置项不存在');
    }
  }

  private assertPublicKey(key: string): asserts key is PageContentKey {
    if (!(PAGE_CONTENT_KEYS as readonly string[]).includes(key)) {
      throw new NotFoundException('配置项不存在');
    }
  }

  /** 缓存优先读取：Redis 命中直接返回；未命中回源数据库并回填缓存；Redis 故障降级直读数据库 */
  private async readPage(key: PageContentKey): Promise<{ key: string; config: Record<string, unknown>; updatedAt: Date }> {
    const cached = await this.readCache(key);
    if (cached) {
      return cached;
    }
    const row = await this.prisma.pageContent.findUnique({ where: { key } });
    if (!row) {
      throw new NotFoundException('配置项不存在');
    }
    const result = { key, config: parseJsonObject(row.config), updatedAt: row.updatedAt };
    await this.writeCache(key, result);
    return result;
  }

  private cacheKey(key: string): string {
    return `${PAGE_CONTENT_CACHE_PREFIX}${key}`;
  }

  private async readCache(key: string): Promise<{ key: string; config: Record<string, unknown>; updatedAt: Date } | null> {
    try {
      const raw = await this.redis.get(this.cacheKey(key));
      if (!raw) {
        return null;
      }
      const parsed: unknown = JSON.parse(raw);
      if (typeof parsed !== 'object' || parsed === null || !('key' in parsed)) {
        return null;
      }
      const value = parsed as { key: string; config: unknown; updatedAt: string };
      return { key, config: value.config as Record<string, unknown>, updatedAt: new Date(value.updatedAt) };
    } catch {
      return null;
    }
  }

  private async writeCache(key: string, value: { key: string; config: Record<string, unknown>; updatedAt: Date }): Promise<void> {
    try {
      await this.redis.set(this.cacheKey(key), JSON.stringify(value), { EX: PAGE_CONTENT_CACHE_TTL_SECONDS });
    } catch {
      // Redis 不可用不阻塞保存与读取（回源数据库兜底）
    }
  }

  /** 各 key 的字段形状校验（后端独立校验，PRD §7.4.2） */
  private validateConfig(key: PageContentKey, config: Record<string, unknown>): void {
    switch (key) {
      case 'home_banner':
        this.validateHomeBanner(config);
        break;
      case 'home_about':
        this.assertOptionalStrings(config, ['image', 'titleZh', 'titleEn', 'summaryZh', 'summaryEn']);
        break;
      case 'about_page':
        this.assertOptionalStrings(config, ['bannerImage', 'videoUrl', 'contentZh', 'contentEn']);
        break;
      case 'contact_info':
        this.assertOptionalStrings(config, [
          'phone',
          'email',
          'addressZh',
          'addressEn',
          'workHoursZh',
          'workHoursEn',
          'mapCoordinate',
        ]);
        break;
      case 'footer_info': {
        this.assertOptionalStrings(config, ['copyrightZh', 'copyrightEn']);
        const icp = config.icp;
        if (icp !== undefined && icp !== null && (typeof icp !== 'string' || icp.length > 100)) {
          throw new BadRequestException('备案号格式不正确或超过 100 字');
        }
        break;
      }
    }
  }

  private validateHomeBanner(config: Record<string, unknown>): void {
    const images = config.images;
    if (images === undefined || images === null) {
      throw new BadRequestException('首页宣传图不能为空');
    }
    if (!Array.isArray(images)) {
      throw new BadRequestException('首页宣传图格式不正确');
    }
    if (images.length > BANNER_MAX_COUNT) {
      throw new BadRequestException('首页宣传图最多 5 张');
    }
    images.forEach((item, index) => {
      if (typeof item !== 'object' || item === null) {
        throw new BadRequestException(`第 ${index + 1} 张宣传图格式不正确`);
      }
      const image = item as Record<string, unknown>;
      if (typeof image.image !== 'string' || image.image.trim() === '') {
        throw new BadRequestException(`第 ${index + 1} 张宣传图缺少图片地址`);
      }
      this.assertOptionalStrings(image, [
        'titleZh',
        'titleEn',
        'subtitleZh',
        'subtitleEn',
        'buttonTextZh',
        'buttonTextEn',
      ]);
    });
    const interval = config.interval;
    if (interval !== undefined && interval !== null) {
      if (typeof interval !== 'number' || !Number.isFinite(interval) || interval < BANNER_INTERVAL_MIN || interval > BANNER_INTERVAL_MAX) {
        throw new BadRequestException('轮播间隔须为 2–30 秒');
      }
    }
  }

  private assertOptionalStrings(config: Record<string, unknown>, fields: string[]): void {
    for (const field of fields) {
      const value = config[field];
      if (value !== undefined && value !== null && typeof value !== 'string') {
        throw new BadRequestException(`字段 ${field} 格式不正确`);
      }
    }
  }

  /**
   * 双语联动（方案 §5.3）：英文留空自动翻译并打标记；人工填写非空清除标记；
   * 与上次保存值一致的字段保持原标记（整表单保存场景，不误判为人工填写）。
   * 返回带有翻译结果与 machineFields 的新配置对象。
   */
  private async translateConfig(
    key: PageContentKey,
    config: Record<string, unknown>,
    storedConfig: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const pairs = this.buildPairs(key, config, storedConfig);
    const { machineFields: marks, enByKey } = await translateFields(
      pairs,
      storedConfig.machineFields as string | null | undefined,
      this.translation,
    );
    const result: Record<string, unknown> = { ...config };
    this.applyPairs(key, result, enByKey);

    // 删除轮播图后清理残留标记（避免旧图标记永远存在）
    if (key === 'home_banner') {
      const newImages = (result.images ?? []) as BannerImage[];
      const oldImages = (storedConfig.images ?? []) as BannerImage[];
      const removedKeys: string[] = [];
      for (let i = newImages.length; i < oldImages.length; i++) {
        removedKeys.push(`b${i}TitleEn`, `b${i}SubtitleEn`, `b${i}ButtonEn`);
      }
      if (removedKeys.length > 0) {
        result.machineFields = unmarkMachineFields(marks, removedKeys);
        return result;
      }
    }
    result.machineFields = marks;
    return result;
  }

  private buildPairs(key: PageContentKey, config: Record<string, unknown>, stored: Record<string, unknown>): BilingualFieldPair[] {
    switch (key) {
      case 'home_banner': {
        const pairs: BilingualFieldPair[] = [];
        const images = (config.images ?? []) as BannerImage[];
        const oldImages = (stored.images ?? []) as BannerImage[];
        images.forEach((image, index) => {
          const old = oldImages[index] ?? {};
          pairs.push({ key: `b${index}TitleEn`, zh: image.titleZh, en: image.titleEn, prevEn: old.titleEn });
          pairs.push({ key: `b${index}SubtitleEn`, zh: image.subtitleZh, en: image.subtitleEn, prevEn: old.subtitleEn });
          pairs.push({ key: `b${index}ButtonEn`, zh: image.buttonTextZh, en: image.buttonTextEn, prevEn: old.buttonTextEn });
        });
        return pairs;
      }
      case 'home_about':
        return [
          { key: 'titleEn', zh: config.titleZh as string, en: config.titleEn as string, prevEn: stored.titleEn as string },
          { key: 'summaryEn', zh: config.summaryZh as string, en: config.summaryEn as string, prevEn: stored.summaryEn as string },
        ];
      case 'about_page':
        return [{ key: 'contentEn', zh: config.contentZh as string, en: config.contentEn as string, prevEn: stored.contentEn as string }];
      case 'contact_info':
        return [
          { key: 'addressEn', zh: config.addressZh as string, en: config.addressEn as string, prevEn: stored.addressEn as string },
          { key: 'workHoursEn', zh: config.workHoursZh as string, en: config.workHoursEn as string, prevEn: stored.workHoursEn as string },
        ];
      case 'footer_info':
        return [{ key: 'copyrightEn', zh: config.copyrightZh as string, en: config.copyrightEn as string, prevEn: stored.copyrightEn as string }];
    }
  }

  private applyPairs(key: PageContentKey, config: Record<string, unknown>, enByKey: Map<string, string | null>): void {
    if (key === 'home_banner') {
      const images = (config.images ?? []) as BannerImage[];
      images.forEach((image, index) => {
        image.titleEn = enByKey.get(`b${index}TitleEn`) ?? image.titleEn ?? '';
        image.subtitleEn = enByKey.get(`b${index}SubtitleEn`) ?? image.subtitleEn ?? '';
        image.buttonTextEn = enByKey.get(`b${index}ButtonEn`) ?? image.buttonTextEn ?? '';
      });
      return;
    }
    if (key === 'home_about') {
      config.titleEn = enByKey.get('titleEn') ?? (config.titleEn as string) ?? '';
      config.summaryEn = enByKey.get('summaryEn') ?? (config.summaryEn as string) ?? '';
      return;
    }
    if (key === 'about_page') {
      config.contentEn = enByKey.get('contentEn') ?? (config.contentEn as string) ?? '';
      return;
    }
    if (key === 'contact_info') {
      config.addressEn = enByKey.get('addressEn') ?? (config.addressEn as string) ?? '';
      config.workHoursEn = enByKey.get('workHoursEn') ?? (config.workHoursEn as string) ?? '';
      return;
    }
    config.copyrightEn = enByKey.get('copyrightEn') ?? (config.copyrightEn as string) ?? '';
  }
}

/** TEXT 列 JSON 对象防御解析（历史脏数据按空对象处理） */
function parseJsonObject(raw: string | null | undefined): Record<string, unknown> {
  if (!raw) {
    return {};
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

/** 官网视图不暴露 machineFields（仅后台编辑页使用） */
function stripMachineFields(config: Record<string, unknown>): Record<string, unknown> {
  const { machineFields, ...rest } = config;
  void machineFields;
  return rest;
}
