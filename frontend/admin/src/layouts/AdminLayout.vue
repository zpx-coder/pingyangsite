<script setup lang="ts">
// 后台布局（任务 3.1，与原型 adminSide/adminShell 一致）：左侧深蓝导航 + 顶栏 + 内容区
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { logout } from '@/api/auth';
import { request } from '@/api/http';
import { clearSession, sessionState } from '@/stores/session';

const route = useRoute();
const router = useRouter();

// 侧栏条目：group 为分组标题（原型 .group），sub 为缩进子项（原型 .sub）
interface NavItem {
  key: string;
  icon: string;
  label: string;
  to: string;
  sub?: boolean;
}
type NavEntry = NavItem | 'group';
const navItems: NavEntry[] = [
  { key: 'products', icon: '📦', label: '产品管理', to: '/products' },
  { key: 'companies', icon: '🏢', label: '企业管理', to: '/companies' },
  { key: 'categories', icon: '🗂️', label: '类目管理', to: '/categories' },
  'group',
  { key: 'news', icon: '·', label: '新闻管理', to: '/news', sub: true },
  { key: 'pages', icon: '·', label: '页面内容', to: '/pages', sub: true },
  { key: 'inquiries', icon: '✉️', label: '询盘管理', to: '/inquiries' },
  { key: 'account', icon: '👤', label: '账号管理', to: '/account' },
];

// 询盘未处理数（侧栏红标，原型 adminSide 的 cnt 徽标）
const pendingCount = ref(0);
onMounted(async () => {
  try {
    const stats = await request<{ pending: number }>({ url: '/admin/inquiries/stats', method: 'GET' });
    pendingCount.value = stats.pending;
  } catch {
    pendingCount.value = 0; // 统计接口不可用时隐藏徽标，不阻塞后台
  }
});

const maskedPhone = computed(() => {
  const phone = sessionState.phone;
  return /^1\d{10}$/.test(phone) ? `${phone.slice(0, 3)}****${phone.slice(7)}` : phone;
});

async function onLogout() {
  try {
    await logout();
  } catch {
    // 会话已失效等异常不阻塞本地退出
  }
  clearSession();
  ElMessage.success('已退出登录');
  void router.push({ name: 'login' });
}
</script>

<template>
  <div class="admin-body">
    <aside class="admin-side">
      <div class="brand">
        <svg width="30" height="30" viewBox="0 0 40 40">
          <rect width="40" height="40" rx="9" fill="#0E6BA8" />
          <circle cx="20" cy="14" r="6" fill="#D4A017" />
          <path d="M4 28c4-7 9-10 16-10s12 3 16 10v4H4z" fill="#fff" opacity=".92" />
        </svg>
        <span>
          <span class="bt">平阳产业带<br />管理后台</span>
          <span class="bs">ADMIN CONSOLE</span>
        </span>
      </div>
      <nav>
        <div class="group">导航</div>
        <template v-for="item in navItems" :key="item === 'group' ? 'group' : item.key">
          <div v-if="item === 'group'" class="group">内容管理</div>
          <router-link
            v-else
            :to="item.to"
            :class="{ sub: item.sub, on: route.meta.active === item.key }"
          >
            <span class="ic">{{ item.icon }}</span>{{ item.label }}
            <span v-if="item.key === 'inquiries' && pendingCount > 0" class="cnt">{{ pendingCount }}</span>
          </router-link>
        </template>
      </nav>
      <div style="padding: 14px 20px; border-top: 1px solid rgba(255, 255, 255, 0.08); font-size: 11.5px; color: #5f7488">
        v1.0 · 首期单管理员
      </div>
    </aside>
    <div class="admin-main">
      <div class="admin-top">
        <div class="title">{{ route.meta.title }}</div>
        <div class="user">
          <span>超级管理员</span>
          <span>{{ maskedPhone }}</span>
          <span class="av">管</span>
          <button class="btn btn-ghost btn-sm" @click="onLogout">退出</button>
        </div>
      </div>
      <div class="admin-content">
        <router-view />
      </div>
    </div>
  </div>
</template>
