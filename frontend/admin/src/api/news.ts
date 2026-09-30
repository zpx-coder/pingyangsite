// 新闻接口（PRD §7.4）：列表/详情/新增/编辑/发布·下线/删除（逻辑删除）；英文字段留空时服务端自动翻译
import { request } from './http';

export interface NewsView {
  id: number;
  titleZh: string;
  titleEn: string | null;
  coverUrl: string | null;
  summaryZh: string | null;
  summaryEn: string | null;
  contentZh: string;
  contentEn: string | null;
  publishTime: string;
  isTop: boolean;
  status: 0 | 1;
  createdAt: string;
  updatedAt: string;
}

export interface NewsListResult {
  page: number;
  pageSize: number;
  total: number;
  list: NewsView[];
}

export interface NewsListQuery {
  page: number;
  pageSize: number;
  status?: 0 | 1;
  keyword?: string;
}

/** 新增/编辑载荷（发布时间为 ISO 字符串；置顶与状态 0/1 数值，与 RadioPills 一致） */
export interface NewsPayload {
  titleZh: string;
  titleEn?: string;
  coverUrl?: string;
  summaryZh?: string;
  summaryEn?: string;
  contentZh: string;
  contentEn?: string;
  publishTime: string;
  isTop?: boolean;
  status?: 0 | 1;
}

/** 编辑载荷：后端更新入参全部可选，仅更新传入字段 */
export type NewsUpdatePayload = Partial<NewsPayload>;

export function listNews(query: NewsListQuery): Promise<NewsListResult> {
  return request<NewsListResult>({ url: '/admin/news', method: 'GET', params: query });
}

export function getNews(id: number): Promise<NewsView> {
  return request<NewsView>({ url: `/admin/news/${id}`, method: 'GET' });
}

export function createNews(payload: NewsPayload): Promise<NewsView> {
  return request<NewsView>({ url: '/admin/news', method: 'POST', data: payload });
}

export function updateNews(id: number, payload: NewsUpdatePayload): Promise<NewsView> {
  return request<NewsView>({ url: `/admin/news/${id}`, method: 'PUT', data: payload });
}

/** 发布（status 1）/ 下线转草稿（status 0） */
export function updateNewsStatus(id: number, status: 0 | 1): Promise<NewsView> {
  return request<NewsView>({ url: `/admin/news/${id}/status`, method: 'PUT', data: { status } });
}

export function removeNews(id: number): Promise<void> {
  return request<void>({ url: `/admin/news/${id}`, method: 'DELETE' });
}
