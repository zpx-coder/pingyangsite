import { fileURLToPath, URL } from 'node:url';
import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';

// 后台 SPA 部署于站点 /admin/ 路径（计划 §3.1 拓扑：Nginx /admin/* → 静态产物，/api → 反代后端）
// 开发期经 Vite 代理访问本地 API（127.0.0.1:3001），与生产同域反代拓扑一致（会话 Cookie 同源携带）
export default defineConfig({
  base: '/admin/',
  plugins: [vue()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://127.0.0.1:3001', changeOrigin: true },
      '/uploads': { target: 'http://127.0.0.1:3001', changeOrigin: true },
    },
  },
});
