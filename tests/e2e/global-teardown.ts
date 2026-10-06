import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { PAGE_CONTENT_BACKUP } from './helpers/run-data';
import { mysqlExec } from './helpers/mysql';
import { wipeMarkerRows } from './helpers/cleanup';

/** Redis 页面内容缓存前缀（与 services/api/src/page-content/page-content.constants.ts 对齐） */
const PAGE_CONTENT_CACHE_PREFIX = 'page_content:';

export default async function globalTeardown(): Promise<void> {
  // 1. 清理本次运行产生的 E2E 数据行与上传文件
  wipeMarkerRows();

  // 2. 恢复 page_contents（E2E 修改过页脚配置；与备份一致走 HEX 往返）
  const backup = JSON.parse(readFileSync(PAGE_CONTENT_BACKUP, 'utf8')) as Record<string, unknown>;
  for (const [key, config] of Object.entries(backup)) {
    const hex = Buffer.from(JSON.stringify(config), 'utf8').toString('hex');
    mysqlExec(`UPDATE page_contents SET config = UNHEX('${hex}') WHERE \`key\` = '${key}'`);
  }
  console.log('[teardown] ✓ page_contents 已从备份恢复');

  // 2b. 失效 Redis 页面内容缓存（TTL 24h）：仅恢复 DB 会让官网继续读 E2E 旧值
  const keys = Object.keys(backup).map((key) => `${PAGE_CONTENT_CACHE_PREFIX}${key}`).join(' ');
  if (keys) {
    execSync(`docker exec pingyangsite-redis redis-cli DEL ${keys}`, { stdio: 'ignore' });
    console.log('[teardown] ✓ Redis 页面内容缓存已失效');
  }

  // 3. 删除专用测试管理员（199 前缀为测试号段；按前缀清除亦兜底历史运行残留）
  mysqlExec(`DELETE FROM admin_users WHERE phone LIKE '199%'`);
  console.log('[teardown] ✓ 测试管理员已删除');
}
