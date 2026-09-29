// 多环境配置（任务 1.1）：
//   - development：加载 services/api/.env（Prisma 连接等）+ 仓库根 config/dev.local.env
//     （本地 Docker 基础设施参数，scripts/dev-up.sh 自动生成）；
//   - production：加载仓库根 config/prod.env（部署时复制模板并填写真实值，不入库）。
// 生产环境强制注入 SESSION_SECRET，缺失即拒绝启动（安全底线：不落默认密钥）。
import { existsSync } from 'node:fs';
import { join } from 'node:path';

export function resolveEnvFilePaths(): string[] {
  const paths: string[] = [join(process.cwd(), '.env')];
  const envName = process.env.NODE_ENV === 'production' ? 'prod.env' : 'dev.local.env';
  // npm 脚本 cwd=services/api，依次尝试 <cwd>/config/ 与 <cwd>/../config/（仓库根）
  for (const base of [process.cwd(), join(process.cwd(), '..')]) {
    const candidate = join(base, 'config', envName);
    if (existsSync(candidate)) {
      paths.push(candidate);
      break;
    }
  }
  return paths;
}

export type StorageDriver = 'local' | 'oss';
export type MtMode = 'mock' | 'real';

export interface AppConfig {
  env: string;
  port: number;
  sessionSecret: string;
  storageDriver: StorageDriver;
  mtMode: MtMode;
  redis: { host: string; port: number };
}

export default (): AppConfig => {
  const env = process.env.NODE_ENV ?? 'development';
  const isProd = env === 'production';

  const sessionSecret = process.env.SESSION_SECRET;
  if (isProd && !sessionSecret) {
    throw new Error('[config] 生产环境必须注入 SESSION_SECRET（config/prod.env）');
  }

  return {
    env,
    port: Number(process.env.PORT ?? 3001),
    // 本地开发默认值；生产由环境变量注入（见上）
    sessionSecret: sessionSecret ?? 'dev-only-insecure-secret',
    storageDriver: (process.env.STORAGE_DRIVER as StorageDriver | undefined) ?? (isProd ? 'oss' : 'local'),
    mtMode: (process.env.MT_MODE as MtMode | undefined) ?? (isProd ? 'real' : 'mock'),
    redis: {
      host: process.env.REDIS_HOST ?? '127.0.0.1',
      port: Number(process.env.REDIS_PORT ?? 6379),
    },
  };
};
