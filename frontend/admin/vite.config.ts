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
      // 演示数据图片为站内相对路径 /img/*.jpg，由官网 public/img 提供（生产同域拓扑下
      // 后台与官网同源，/img 自然可达；开发期后台独立端口，须代理到官网 dev server 对齐生产行为）
      '/img': { target: 'http://127.0.0.1:3999', changeOrigin: true },
    },
  },
  // wangEditor 官方 Vue3 建议：排除预打包，避免 editor-for-vue 与 core 各持一份实例
  // （否则报 TypeError: editor.on is not a function，工具栏/编辑区不渲染）
  optimizeDeps: {
    exclude: ['@wangeditor/editor', '@wangeditor/editor-for-vue'],
  },
});
