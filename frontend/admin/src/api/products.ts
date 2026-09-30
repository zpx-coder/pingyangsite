// 产品管理接口（任务 3.4，PRD §7.1）：列表/详情/新增/编辑/状态流转/批量/删除
import { request } from './http';

/** 产品状态：0 草稿 / 1 已发布 / 2 已下架 */
export type ProductStatus = 0 | 1 | 2;

export interface ProductView {
  id: number;
  nameZh: string;
  nameEn: string | null;
  categoryId: number;
  companyId: number | null;
  mainImage: string;
  images: string[];
  introZh: string | null;
  introEn: string | null;
  detailZh: string;
  detailEn: string | null;
  priceRef: string | null;
  moq: string | null;
  sort: number;
  status: ProductStatus;
  createdAt: string;
  updatedAt: string;
  category: { id: number; nameZh: string } | null;
  company: { id: number; nameZh: string } | null;
}

export interface ProductListResult {
  page: number;
  pageSize: number;
  total: number;
  list: ProductView[];
}

export interface ProductListQuery {
  page: number;
  pageSize: number;
  keyword?: string;
  categoryId?: number;
  status?: ProductStatus;
}

export interface ProductPayload {
  nameZh: string;
  nameEn?: string;
  categoryId: number;
  companyId?: number | null;
  mainImage: string;
  images?: string[];
  introZh?: string;
  introEn?: string;
  detailZh: string;
  detailEn?: string;
  priceRef?: string;
  moq?: string;
  sort?: number;
  status?: ProductStatus;
}

export function listProducts(query: ProductListQuery): Promise<ProductListResult> {
  return request<ProductListResult>({ url: '/admin/products', method: 'GET', params: query });
}

export function getProduct(id: number): Promise<ProductView> {
  return request<ProductView>({ url: `/admin/products/${id}`, method: 'GET' });
}

export function createProduct(payload: ProductPayload): Promise<ProductView> {
  return request<ProductView>({ url: '/admin/products', method: 'POST', data: payload });
}

export function updateProduct(id: number, payload: ProductPayload): Promise<ProductView> {
  return request<ProductView>({ url: `/admin/products/${id}`, method: 'PUT', data: payload });
}

export function updateProductStatus(id: number, status: ProductStatus): Promise<ProductView> {
  return request<ProductView>({ url: `/admin/products/${id}/status`, method: 'PUT', data: { status } });
}

export type BatchAction = 'delete' | 'publish' | 'unpublish';

export function batchProducts(ids: number[], action: BatchAction): Promise<{ count: number }> {
  return request<{ count: number }>({ url: '/admin/products/batch', method: 'POST', data: { ids, action } });
}

export function removeProduct(id: number): Promise<null> {
  return request<null>({ url: `/admin/products/${id}`, method: 'DELETE' });
}
