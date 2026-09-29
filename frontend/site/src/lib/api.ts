// 官网服务端数据读取（方案 §3.1 / PRD §6）：
// 统一封装后端公开接口的 {code,message,data} 结构、超时与错误处理。
// API_BASE 默认指向本机后端（本地部署策略），生产环境经环境变量注入（任务 5.2）。
import type { Lang } from './i18n';

export const API_BASE = process.env.API_BASE_URL ?? 'http://127.0.0.1:3001';

const REQUEST_TIMEOUT_MS = 10_000;

interface ApiEnvelope<T> {
  code: number;
  message: string;
  data: T;
}

/** GET 后端公开接口并解包统一响应；非 0 业务码 / 网络异常一律抛错，由调用方兜底 */
export async function getApi<T>(path: string): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(`${API_BASE}${path}`, { signal: controller.signal, cache: 'no-store' });
    if (!res.ok) {
      throw new Error(`API HTTP ${res.status}`);
    }
    const body = (await res.json()) as ApiEnvelope<T>;
    if (body.code !== 0) {
      throw new Error(body.message || `API code ${body.code}`);
    }
    return body.data;
  } finally {
    clearTimeout(timer);
  }
}

/** 按当前语言取双语字段：英文优先，缺失回落中文（后端自动翻译失败时保证可读） */
export function pickLang(lang: Lang, zh: string | null | undefined, en: string | null | undefined): string {
  if (lang === 'en') {
    return en?.trim() || zh?.trim() || '';
  }
  return zh?.trim() || '';
}

/** 新闻日期徽标：UTC 时间按东八区展示为 YYYY-MM-DD */
export function formatNewsDate(iso: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(iso));
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

// ---- 公开接口数据形状（与后端 select 字段一一对应） ----

export interface BannerSlideConfig {
  image: string;
  titleZh?: string | null;
  titleEn?: string | null;
  subtitleZh?: string | null;
  subtitleEn?: string | null;
  buttonTextZh?: string | null;
  buttonTextEn?: string | null;
}

export interface HomeBannerConfig {
  images: BannerSlideConfig[];
  interval?: number | null;
}

export interface HomeAboutConfig {
  image?: string | null;
  titleZh?: string | null;
  titleEn?: string | null;
  summaryZh?: string | null;
  summaryEn?: string | null;
}

export interface ContactInfoConfig {
  phone?: string | null;
  email?: string | null;
  addressZh?: string | null;
  addressEn?: string | null;
  workHoursZh?: string | null;
  workHoursEn?: string | null;
  mapCoordinate?: string | null;
}

export interface AboutPageConfig {
  bannerImage?: string | null;
  videoUrl?: string | null;
  contentZh?: string | null;
  contentEn?: string | null;
}

export interface PageContentMap {
  home_banner?: HomeBannerConfig;
  home_about?: HomeAboutConfig;
  about_page?: AboutPageConfig;
  contact_info?: ContactInfoConfig;
  [key: string]: unknown;
}

export interface PublicCategory {
  id: number;
  nameZh: string;
  nameEn: string;
  iconUrl: string | null;
  introZh: string | null;
  introEn: string | null;
  sort: number;
}

export interface PublicNews {
  id: number;
  titleZh: string;
  titleEn: string;
  coverUrl: string | null;
  summaryZh: string | null;
  summaryEn: string | null;
  publishTime: string;
  isTop: boolean;
}

/** 分页响应（官网公开列表统一形状 {page,pageSize,total,list}） */
export interface Paged<T> {
  page: number;
  pageSize: number;
  total: number;
  list: T[];
}

/** 官网产品卡片（类目页产品列表项） */
export interface PublicProductCard {
  id: number;
  nameZh: string;
  nameEn: string;
  mainImage: string | null;
  priceRef: string | null;
  moq: string | null;
  company: { id: number; nameZh: string } | null;
}

/** 官网企业（类目页企业列表项 / 企业详情；honorImages 为 JSON 数组解析结果） */
export interface PublicCompany {
  id: number;
  nameZh: string;
  nameEn: string;
  logoUrl: string | null;
  coverUrl: string | null;
  foundedYear: number | null;
  scale: string | null;
  address: string | null;
  contactName: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  introZh: string | null;
  introEn: string | null;
  honorImages: string[];
  categories: { id: number; nameZh: string; nameEn: string }[];
}
