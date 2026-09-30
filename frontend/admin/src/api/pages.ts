// 页面内容接口（PRD §7.4.2）：5 个白名单配置项（key-value JSON），保存后服务端刷新缓存官网即时生效
import { request } from './http';

export type PageContentKey = 'home_banner' | 'home_about' | 'about_page' | 'contact_info' | 'footer_info';

export interface PageContentItem {
  key: PageContentKey;
  config: Record<string, unknown>;
  updatedAt: string;
}

/** 查询全部配置项（后台编辑页一次加载，左栏切换不重复请求） */
export function listPages(): Promise<PageContentItem[]> {
  return request<PageContentItem[]>({ url: '/admin/pages', method: 'GET' });
}

export function getPage(key: PageContentKey): Promise<PageContentItem> {
  return request<PageContentItem>({ url: `/admin/pages/${key}`, method: 'GET' });
}

/** 保存：与存量顶层字段合并（未提交字段保留），校验 + 双语联动 + 刷新缓存 */
export function savePage(key: PageContentKey, config: Record<string, unknown>): Promise<PageContentItem> {
  return request<PageContentItem>({ url: `/admin/pages/${key}`, method: 'PUT', data: { config } });
}
