// sitemap.xml（任务 2.10，PRD §9.3）：静态页 × 双语 + 公开实体（类目/产品/企业/新闻）全量枚举，
// 每项携带双语 alternates 互指；实体接口不可用时降级为仅静态页，不抛错。
import type { MetadataRoute } from 'next';
import {
  getApi,
  type Paged,
  type PublicCategory,
  type PublicCompany,
  type PublicNews,
  type PublicProductCard,
} from '@/lib/api';
import { langUrl } from '@/lib/seo';

// 路由级重验证 1 小时；构建产物实际按 fetch 级 60s 生效，实体增删最长 1 分钟内进图
export const revalidate = 3600;

const PAGE_SIZE = 100;

/** 分页拉取接口全量实体；接口异常或空页即停，页数上限防御异常数据死循环 */
async function collectAll<T extends { id: number }>(path: string): Promise<T[]> {
  const all: T[] = [];
  for (let page = 1; page <= 100; page += 1) {
    const data = await getApi<Paged<T>>(`${path}?page=${page}&pageSize=${PAGE_SIZE}`).catch(() => null);
    if (!data || data.list.length === 0) break;
    all.push(...data.list);
    if (all.length >= data.total) break;
  }
  return all;
}

type SitemapEntry = MetadataRoute.Sitemap[number];

/** 组装一项：url 按语言，alternates 携带双语互指 + x-default */
function entry(
  lang: 'zh-CN' | 'en',
  path: string,
  extra: { lastModified?: string; priority?: number } = {},
): SitemapEntry {
  return {
    url: langUrl(lang, path),
    ...(extra.lastModified ? { lastModified: extra.lastModified } : {}),
    changeFrequency: 'weekly',
    priority: extra.priority ?? 0.6,
    alternates: {
      languages: {
        'zh-CN': langUrl('zh-CN', path),
        en: langUrl('en', path),
        'x-default': langUrl('zh-CN', path),
      },
    },
  };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: SitemapEntry[] = [];

  // 静态页（首页 priority 1.0，其余 0.8）× 双语
  const statics: [string, number][] = [
    ['', 1.0],
    ['about', 0.8],
    ['news', 0.8],
    ['contact', 0.8],
  ];
  for (const lang of ['zh-CN', 'en'] as const) {
    for (const [path, priority] of statics) {
      entries.push(entry(lang, path, { priority }));
    }
  }

  const [categories, products, companies, news] = await Promise.all([
    getApi<PublicCategory[]>('/api/v1/public/categories').catch(() => null),
    collectAll<PublicProductCard>('/api/v1/public/products'),
    collectAll<PublicCompany>('/api/v1/public/companies'),
    collectAll<PublicNews>('/api/v1/public/news'),
  ]);

  for (const category of categories ?? []) {
    for (const lang of ['zh-CN', 'en'] as const) entries.push(entry(lang, `categories/${category.id}`));
  }
  for (const product of products) {
    for (const lang of ['zh-CN', 'en'] as const) entries.push(entry(lang, `products/${product.id}`));
  }
  for (const company of companies) {
    for (const lang of ['zh-CN', 'en'] as const) entries.push(entry(lang, `companies/${company.id}`));
  }
  for (const item of news) {
    for (const lang of ['zh-CN', 'en'] as const) {
      entries.push(entry(lang, `news/${item.id}`, { lastModified: item.publishTime }));
    }
  }

  return entries;
}
