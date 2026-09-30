// 询盘接口（PRD §7.5）：列表（状态/快照关键词/时间范围筛选）、统计卡片、详情、单条/批量标记、导出 xlsx
import { request } from './http';

export interface InquiryView {
  id: number;
  productId: number | null;
  companyId: number | null;
  productNameSnapshot: string | null;
  companyNameSnapshot: string | null;
  name: string;
  companyName: string | null;
  country: string | null;
  email: string | null;
  phone: string | null;
  content: string;
  lang: string;
  status: 0 | 1;
  createdAt: string;
}

export interface InquiryListResult {
  page: number;
  pageSize: number;
  total: number;
  list: InquiryView[];
}

export interface InquiryListQuery {
  page: number;
  pageSize: number;
  status?: 0 | 1;
  keyword?: string;
  startDate?: string;
  endDate?: string;
}

export interface InquiryStats {
  total: number;
  pending: number;
  today: number;
  week: number;
}

export function listInquiries(query: InquiryListQuery): Promise<InquiryListResult> {
  return request<InquiryListResult>({ url: '/admin/inquiries', method: 'GET', params: query });
}

export function getInquiryStats(): Promise<InquiryStats> {
  return request<InquiryStats>({ url: '/admin/inquiries/stats', method: 'GET' });
}

export function getInquiry(id: number): Promise<InquiryView> {
  return request<InquiryView>({ url: `/admin/inquiries/${id}`, method: 'GET' });
}

/** 标记已处理（1）/ 未处理（0） */
export function updateInquiryStatus(id: number, status: 0 | 1): Promise<InquiryView> {
  return request<InquiryView>({ url: `/admin/inquiries/${id}/status`, method: 'PUT', data: { status } });
}

export function batchInquiries(ids: number[], action: 'process' | 'unprocess'): Promise<{ count: number }> {
  return request<{ count: number }>({ url: '/admin/inquiries/batch', method: 'POST', data: { ids, action } });
}

/** 导出当前筛选结果为 xlsx（二进制直出，不经信封解包——拦截器对非信封对象原样返回） */
export function exportInquiries(query: Omit<InquiryListQuery, 'page' | 'pageSize'>): Promise<Blob> {
  return request<Blob>({ url: '/admin/inquiries/export', method: 'GET', params: query, responseType: 'blob' });
}
