// 企业接口（任务 3.5，PRD §7.2）：列表/详情/新增/编辑/删除；产品表单关联企业远程搜索复用列表
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
  addressEn: string | null;
  contactName: string | null;
  contactNameEn: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  introZh: string;
  introEn: string | null;
  honorImages: string[];
  sort: number;
  status: 0 | 1;
  categories: { id: number; nameZh: string }[];
  /** 列表/详情「产品数」列（列表页聚合、详情页 count） */
  productCount?: number;
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

/** 新增/编辑载荷（英文字段留空时由服务端自动翻译，见 buildData） */
export interface CompanyPayload {
  nameZh: string;
  nameEn?: string;
  logoUrl: string;
  coverUrl?: string;
  categoryIds: number[];
  foundedYear?: number | null;
  scale?: string;
  address?: string;
  addressEn?: string;
  contactName?: string;
  contactNameEn?: string;
  phone?: string;
  email?: string;
  website?: string;
  introZh: string;
  introEn?: string;
  honorImages?: string[];
  sort?: number;
  status: 0 | 1;
}

export function listCompanies(query: CompanyListQuery): Promise<CompanyListResult> {
  return request<CompanyListResult>({ url: '/admin/companies', method: 'GET', params: query });
}

export function getCompany(id: number): Promise<CompanyView & { productCount: number }> {
  return request<CompanyView & { productCount: number }>({ url: `/admin/companies/${id}`, method: 'GET' });
}

export function createCompany(payload: CompanyPayload): Promise<CompanyView> {
  return request<CompanyView>({ url: '/admin/companies', method: 'POST', data: payload });
}

/** 编辑载荷：后端更新入参全部可选，仅更新传入字段（列表页上/下架仅传 status） */
export type CompanyUpdatePayload = Partial<CompanyPayload>;

export function updateCompany(id: number, payload: CompanyUpdatePayload): Promise<CompanyView> {
  return request<CompanyView>({ url: `/admin/companies/${id}`, method: 'PUT', data: payload });
}

export function removeCompany(id: number): Promise<void> {
  return request<void>({ url: `/admin/companies/${id}`, method: 'DELETE' });
}
