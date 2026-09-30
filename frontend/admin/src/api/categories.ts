// 类目接口（PRD §7.3）：列表/详情/新增/编辑/删除/一键翻译；列表含产品数/企业数（groupBy 聚合）
import { request } from './http';

export interface CategoryView {
  id: number;
  nameZh: string;
  nameEn: string | null;
  iconUrl: string | null;
  introZh: string | null;
  introEn: string | null;
  sort: number;
  status: 0 | 1;
  productCount: number;
  companyCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CategoryListResult {
  page: number;
  pageSize: number;
  total: number;
  list: CategoryView[];
}

export interface CategoryListQuery {
  page: number;
  pageSize: number;
  status?: 0 | 1;
  keyword?: string;
}

/** 新增/编辑载荷（英文字段留空时由服务端自动翻译） */
export interface CategoryPayload {
  nameZh: string;
  nameEn?: string;
  iconUrl?: string;
  introZh?: string;
  introEn?: string;
  sort?: number;
  status: 0 | 1;
}

/** 编辑载荷：后端更新入参全部可选，仅更新传入字段（列表页上/下架仅传 status） */
export type CategoryUpdatePayload = Partial<CategoryPayload>;

export function listCategories(query: CategoryListQuery): Promise<CategoryListResult> {
  return request<CategoryListResult>({ url: '/admin/categories', method: 'GET', params: query });
}

export function getCategory(id: number): Promise<CategoryView> {
  return request<CategoryView>({ url: `/admin/categories/${id}`, method: 'GET' });
}

export function createCategory(payload: CategoryPayload): Promise<CategoryView> {
  return request<CategoryView>({ url: '/admin/categories', method: 'POST', data: payload });
}

export function updateCategory(id: number, payload: CategoryUpdatePayload): Promise<CategoryView> {
  return request<CategoryView>({ url: `/admin/categories/${id}`, method: 'PUT', data: payload });
}

export function removeCategory(id: number): Promise<void> {
  return request<void>({ url: `/admin/categories/${id}`, method: 'DELETE' });
}

/** 一键翻译（方案 §5.3 重译入口）：重译中英文案并重新打机器翻译标记 */
export function translateCategory(id: number): Promise<CategoryView> {
  return request<CategoryView>({ url: `/admin/categories/${id}/translate`, method: 'PUT' });
}
