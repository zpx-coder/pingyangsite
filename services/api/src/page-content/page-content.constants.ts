// 页面内容配置项（PRD §7.4.2）：key 白名单 + 缓存配置
export const PAGE_CONTENT_KEYS = [
  'home_banner',
  'home_about',
  'about_page',
  'contact_info',
  'footer_info',
] as const;

export type PageContentKey = (typeof PAGE_CONTENT_KEYS)[number];

export const PAGE_CONTENT_CACHE_PREFIX = 'page_content:';
// 缓存 24 小时；保存时同步刷新，官网即时生效（任务 1.9 验收「缓存刷新」）
export const PAGE_CONTENT_CACHE_TTL_SECONDS = 24 * 60 * 60;
