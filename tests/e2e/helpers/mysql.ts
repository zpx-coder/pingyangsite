import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';

// 从 services/api/.env 解析 DATABASE_URL，docker exec 进 mysql 容器执行 SQL
// （与运行手册一致：容器名 pingyangsite-mysql，凭据不落盘到测试代码）
const repoRoot = path.resolve(__dirname, '..', '..', '..');
const envText = readFileSync(path.join(repoRoot, 'services/api/.env'), 'utf8');
const m = envText.match(/DATABASE_URL="mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/([^?"]+)/);
if (!m) throw new Error('无法解析 services/api/.env 中的 DATABASE_URL');

const MYSQL = { user: m[1], password: m[2], database: m[5] };

/** 执行 SQL 并返回 stdout（mysql -e 输出：表头行 + \t 分隔数据行）
 *  经 shell 拼接（与运行手册一致的 docker exec 形态），SQL 单引号转义防破坏外壳 */
export function mysqlExec(sql: string): string {
  const safeSql = sql.replace(/'/g, "'\\''");
  const cmd =
    `docker exec -i pingyangsite-mysql mysql -u${MYSQL.user} -p${MYSQL.password} ${MYSQL.database} ` +
    `--default-character-set=utf8mb4 -e '${safeSql}' 2>&1`;
  const out = execSync(cmd, { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
  if (/^ERROR \d+/m.test(out)) throw new Error(`mysql 执行失败: ${out}`);
  return out.replace(/^Warning: Using a password on the command line interface can be insecure\.\n/, '');
}

/** 执行查询并返回数据行数组（跳过表头，\t 分隔；空结果返回 []） */
export function mysqlRows(sql: string): string[][] {
  const out = mysqlExec(sql).trim();
  if (!out) return [];
  const lines = out.split('\n');
  const rows: string[][] = [];
  for (const line of lines.slice(1)) {
    if (!line.trim()) continue;
    rows.push(line.split('\t'));
  }
  return rows;
}

/** 执行查询并返回首行首列（无结果返回 null） */
export function mysqlCell(sql: string): string | null {
  return mysqlRows(sql)[0]?.[0] ?? null;
}
