// 类目接口（任务 3.4 起用：筛选下拉 / 产品表单类目选择；完整增删改在任务 3.6 类目管理补齐）
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

export function listCategories(query: CategoryListQuery): Promise<CategoryListResult> {
  return request<CategoryListResult>({ url: '/admin/categories', method: 'GET', params: query });
}
