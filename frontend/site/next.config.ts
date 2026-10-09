import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  basePath: process.env.NEXT_PUBLIC_APP_BASE_PATH || '',
  // 本地开发代理（任务 2.1）：/api/v1/* 转发到本机后端；生产由 Nginx 同域反代
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: 'http://127.0.0.1:3001/api/v1/:path*',
      },
    ];
  },
};

export default nextConfig;
