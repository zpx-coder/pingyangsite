import { defineConfig } from '@playwright/test';

// 阶段 4 任务 4.2：核心旅程 E2E（询盘链路 / 双语切换全站 / 后台全流程 / 账号变更）
// 前置：官网(:3999)、管理后台(:5173)、API(:3001)、MySQL/Redis 容器已启动（见 README.md）
// workers=1 保证 01-site 先于 02-admin 执行（询盘先产生、后台后消费，与真实时序一致）
export default defineConfig({
  testDir: './specs',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 120_000,
  expect: { timeout: 15_000 },
  reporter: [['list']],
  globalSetup: './global-setup.ts',
  globalTeardown: './global-teardown.ts',
  use: {
    baseURL: process.env.SITE_URL ?? 'http://localhost:3999',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
});
