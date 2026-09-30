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

// 会话失效（40100）：清空本地状态并回登录页（任务 3.3 的会话过期跳转即由该链路承载）
setUnauthorizedHandler(() => {
  clearSession();
  if (router.currentRoute.value.name !== 'login') {
    void router.push({ name: 'login', query: { expired: '1' } });
  }
});

app.use(router);
app.use(ElementPlus, { locale: zhCn });
app.mount('#app');
