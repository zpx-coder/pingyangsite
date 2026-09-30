// 后台入口（任务 3.1）：Element Plus 全量引入 + 中文本地化 + 路由与 401 跳转接线
import { createApp } from 'vue';
import ElementPlus from 'element-plus';
import zhCn from 'element-plus/es/locale/lang/zh-cn';
import 'element-plus/dist/index.css';
import App from './App.vue';
import { router } from './router';
import { setUnauthorizedHandler } from './api/http';
import { clearSession } from './stores/session';
import './styles/admin.css';

const app = createApp(App);

// 会话失效（40100，页面内业务请求触发）：清空本地状态并回登录页，带 expired 标记与回跳地址；
// 守卫探活请求的 401 不走此链路（skipAuthHandler），由守卫统一跳转，避免双重导航竞争
setUnauthorizedHandler(() => {
  clearSession();
  const current = router.currentRoute.value;
  if (current.name !== 'login') {
    void router.push({
      name: 'login',
      query: { expired: '1', ...(current.fullPath !== '/' ? { redirect: current.fullPath } : {}) },
    });
  }
});

app.use(router);
app.use(ElementPlus, { locale: zhCn });
app.mount('#app');
