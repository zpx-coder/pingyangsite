// 企业接口（任务 3.4 起用：产品表单关联企业远程搜索；完整增删改在任务 3.5 企业管理补齐）
import { request } from './http';

export interface CompanyView {
  id: number;
  nameZh: string;
  nameEn: string | null;
  logoUrl: string | null;
  coverUrl: string | null;
  foundedYear: number | null;
  scale: string | null;
  address: string | null;
  contactName: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  honorImages: string[];
  sort: number;
  status: 0 | 1;
  categories: { id: number; nameZh: string }[];
  createdAt: string;
  updatedAt: string;
}

export interface CompanyListResult {
  page: number;
  pageSize: number;
  total: number;
  list: CompanyView[];
}

export interface CompanyListQuery {
  page: number;
  pageSize: number;
  status?: 0 | 1;
  categoryId?: number;
  keyword?: string;
}

export function listCompanies(query: CompanyListQuery): Promise<CompanyListResult> {
  return request<CompanyListResult>({ url: '/admin/companies', method: 'GET', params: query });
}

export function getCompany(id: number): Promise<CompanyView & { productCount: number }> {
  return request<CompanyView & { productCount: number }>({ url: `/admin/companies/${id}`, method: 'GET' });
}
