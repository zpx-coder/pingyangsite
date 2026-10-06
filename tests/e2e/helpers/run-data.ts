import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

/** 三个服务的地址（可用环境变量覆盖，默认对齐本地开发端口） */
export const SITE = process.env.SITE_URL ?? 'http://localhost:3999';
export const ADMIN = process.env.ADMIN_URL ?? 'http://localhost:5173';
export const API = process.env.API_URL ?? 'http://127.0.0.1:3001';

/** 本次运行数据目录（种子/备份/测试图片，运行结束后保留便于排查） */
export const DATA_DIR = path.join(__dirname, '..', '.run-data');
export const SEED_FILE = path.join(DATA_DIR, 'seed.json');
export const PAGE_CONTENT_BACKUP = path.join(DATA_DIR, 'page-content-backup.json');
export const TEST_PNG = path.join(DATA_DIR, 'e2e-test.png');
/** 运行标记共享文件：global-setup 进程写入，specs/teardown 进程读取（Playwright 各阶段分属不同进程） */
export const RUN_FILE = path.join(DATA_DIR, 'run.json');

/** 测试数据命名标记（按 RUN 生成，保证跨运行唯一） */
export function markers(run: string): Record<string, string> {
  return {
    product: `E2E产品·${run}`,
    productEdit: `E2E产品改·${run}`,
    company: `E2E企业·${run}`,
    news: `E2E新闻·${run}`,
    category: `E2E类目·${run}`,
    inquiryZh: `E2E询盘·zh·${run}`,
    inquiryEn: `E2E Inquiry en ${run}`,
    footer: `E2E版权·${run}`,
  };
}

export interface RunData {
  /** 运行标记：纯数字时间戳尾 8 位 */
  run: string;
  /** 专用测试管理员手机号（global-setup 直插 admin_users，global-teardown 删除） */
  phone: string;
  /** 测试数据命名标记 */
  M: Record<string, string>;
}

let cachedRun: RunData | null = null;

/** 读取运行标记（惰性：模块加载先于 global-setup 完成，须在测试体内调用） */
export function getRun(): RunData {
  if (!cachedRun) {
    const { run } = JSON.parse(readFileSync(RUN_FILE, 'utf8')) as { run: string };
    cachedRun = { run, phone: `199${run}`, M: markers(run) };
  }
  return cachedRun;
}

/** 专用测试管理员密码（不随 RUN 变化） */
export const TEST_ADMIN_PASSWORD = 'E2e@123456';
export const TEST_ADMIN_NEW_PASSWORD = 'NewE2e@12345';

/** 主管理员（种子账号，登录成败场景使用；可用环境变量覆盖） */
export const MAIN_ADMIN_PHONE = process.env.ADMIN_PHONE ?? '13800000000';
export const MAIN_ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? 'Admin@123456';

export function ensureDataDir(): void {
  mkdirSync(DATA_DIR, { recursive: true });
}

export function readJson<T>(file: string): T {
  return JSON.parse(readFileSync(file, 'utf8')) as T;
}

export function writeJson(file: string, data: unknown): void {
  ensureDataDir();
  writeFileSync(file, JSON.stringify(data, null, 2));
}
