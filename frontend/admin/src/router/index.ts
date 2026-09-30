// 路由（任务 3.1）：11 个后台页面（PRD 附录 A.2 / 原型 ROUTES）
// 除登录页外均嵌套于 AdminLayout；守卫经 /admin/session 校验，未登录跳登录页并携带回跳地址
import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';
import AdminLayout from '@/layouts/AdminLayout.vue';
import { ensureSession } from '@/stores/session';

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/LoginView.vue'),
    meta: { title: '登录', active: 'login', public: true },
  },
  {
    path: '/',
    component: AdminLayout,
    children: [
      { path: '', redirect: '/inquiries' },
      {
        path: 'inquiries',
        name: 'inquiries',
        component: () => import('@/views/InquiryListView.vue'),
        meta: { title: '询盘管理', active: 'inquiries' },
      },
      {
        path: 'products',
        name: 'products',
        component: () => import('@/views/ProductListView.vue'),
        meta: { title: '产品管理', active: 'products' },
      },
      {
        path: 'products/edit/:id?',
        name: 'product-edit',
        component: () => import('@/views/ProductEditView.vue'),
        meta: { title: '产品管理 / 编辑产品', active: 'products' },
      },
      {
        path: 'companies',
        name: 'companies',
        component: () => import('@/views/CompanyListView.vue'),
        meta: { title: '企业管理', active: 'companies' },
      },
      {
        path: 'companies/edit/:id?',
        name: 'company-edit',
        component: () => import('@/views/CompanyEditView.vue'),
        meta: { title: '企业管理 / 编辑企业', active: 'companies' },
      },
      {
        path: 'categories',
        name: 'categories',
        component: () => import('@/views/CategoryListView.vue'),
        meta: { title: '类目管理', active: 'categories' },
      },
      {
        path: 'news',
        name: 'news',
        component: () => import('@/views/NewsListView.vue'),
        meta: { title: '内容管理 / 新闻管理', active: 'news' },
      },
      {
        path: 'news/edit/:id?',
        name: 'news-edit',
        component: () => import('@/views/NewsEditView.vue'),
        meta: { title: '内容管理 / 新闻管理 / 编辑', active: 'news' },
      },
      {
        path: 'pages',
        name: 'pages',
        component: () => import('@/views/PageContentView.vue'),
        meta: { title: '内容管理 / 页面内容', active: 'pages' },
      },
      {
        path: 'account',
        name: 'account',
        component: () => import('@/views/AccountView.vue'),
        meta: { title: '账号管理', active: 'account' },
      },
    ],
  },
  { path: '/:pathMatch(.*)*', redirect: '/inquiries' },
];

export const router = createRouter({
  history: createWebHistory('/admin/'),
  routes,
});

router.beforeEach(async (to) => {
  // 登录页公开访问；其余路由校验会话（并发守卫共享同一 /session 请求）
  if (to.meta.public) return true;
  const ok = await ensureSession();
  if (!ok) {
    return { name: 'login', query: to.fullPath !== '/' ? { redirect: to.fullPath } : {} };
  }
  return true;
});
