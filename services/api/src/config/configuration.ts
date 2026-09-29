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

export interface OssConfig {
  region: string;
  bucket: string;
  accessKeyId: string;
  accessKeySecret: string;
  endpoint?: string;
  cdnDomain?: string;
}

export interface AppConfig {
  env: string;
  port: number;
  sessionSecret: string;
  storageDriver: StorageDriver;
  storage: {
    driver: StorageDriver;
    local: { dir: string; baseUrl: string };
    oss: OssConfig;
  };
  mtMode: MtMode;
  redis: { host: string; port: number };
}

// STORAGE_DRIVER=oss 时启动前强制校验四要素（安全底线：密钥经环境变量注入，不入库）
const OSS_REQUIRED_VARS = ['OSS_REGION', 'OSS_BUCKET', 'OSS_ACCESS_KEY_ID', 'OSS_ACCESS_KEY_SECRET'] as const;

export default (): AppConfig => {
  const env = process.env.NODE_ENV ?? 'development';
  const isProd = env === 'production';
  const port = Number(process.env.PORT ?? 3001);

  const sessionSecret = process.env.SESSION_SECRET;
  if (isProd && !sessionSecret) {
    throw new Error('[config] 生产环境必须注入 SESSION_SECRET（config/prod.env）');
  }

  const storageDriver: StorageDriver =
    (process.env.STORAGE_DRIVER as StorageDriver | undefined) ?? (isProd ? 'oss' : 'local');

  if (storageDriver === 'oss') {
    const missing = OSS_REQUIRED_VARS.filter((key) => !process.env[key]);
    if (missing.length > 0) {
      throw new Error(`[config] STORAGE_DRIVER=oss 必须注入 ${missing.join('、')}（config/prod.env）`);
    }
  }

  return {
    env,
    port,
    // 本地开发默认值；生产由环境变量注入（见上）
    sessionSecret: sessionSecret ?? 'dev-only-insecure-secret',
    storageDriver,
    storage: {
      driver: storageDriver,
      local: {
        // 本地驱动落盘目录（/uploads 静态目录由此目录服务）
        dir: process.env.UPLOAD_DIR ?? join(process.cwd(), 'uploads'),
        // 入库的公开地址前缀；本地默认指向本服务，官网/后台直连可用
        baseUrl: process.env.STORAGE_PUBLIC_BASE_URL ?? `http://127.0.0.1:${port}`,
      },
      oss: {
        region: process.env.OSS_REGION ?? '',
        bucket: process.env.OSS_BUCKET ?? '',
        accessKeyId: process.env.OSS_ACCESS_KEY_ID ?? '',
        accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET ?? '',
        endpoint: process.env.OSS_ENDPOINT || undefined,
        cdnDomain: process.env.OSS_CDN_DOMAIN || undefined,
      },
    },
    mtMode: (process.env.MT_MODE as MtMode | undefined) ?? (isProd ? 'real' : 'mock'),
    redis: {
      host: process.env.REDIS_HOST ?? '127.0.0.1',
      port: Number(process.env.REDIS_PORT ?? 6379),
    },
  };
};
