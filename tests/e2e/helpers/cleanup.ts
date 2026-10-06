import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { mysqlExec, mysqlRows } from './mysql';

// 前后置共用的测试数据清理：按 E2E 前缀删除上次/本次运行的残留数据行，
// 并顺带删除行内引用的本地上传文件（uploads 本地存储驱动）

const repoRoot = path.resolve(__dirname, '..', '..', '..');
const UPLOAD_DIR = path.join(repoRoot, 'services/api/uploads');

/** 各业务表清理目标：名称列 + 前缀 + 该表实际存在的媒体列（按 Prisma schema） */
const WIPE_TARGETS = [
  { table: 'products', nameCol: 'name_zh', marker: 'E2E产品%', mediaCols: ['main_image', 'images'] },
  { table: 'companies', nameCol: 'name_zh', marker: 'E2E企业%', mediaCols: ['logo_url', 'cover_url', 'honor_images'] },
  { table: 'news', nameCol: 'title_zh', marker: 'E2E新闻%', mediaCols: ['cover_url'] },
  { table: 'categories', nameCol: 'name_zh', marker: 'E2E类目%', mediaCols: ['icon_url'] },
];

/** 行内 uploads 相对路径正则（兼容绝对 URL 与相对路径两种存储形态） */
const UPLOAD_URL_RE = /\/uploads\/[\w./-]+/g;

function removeLocalFiles(paths: Iterable<string>): void {
  for (const rel of paths) {
    const file = path.join(UPLOAD_DIR, rel.replace(/^\/uploads\//, ''));
    if (existsSync(file)) {
      spawnSync('rm', ['-f', file]);
    }
  }
}

/** 删除带 E2E 标记的业务数据行及引用的上传文件（软删除行一并物理清除） */
export function wipeMarkerRows(): void {
  // company_categories 外键为 RESTRICT：企业/类目物理删除前先清关联行，否则报 1451
  mysqlExec(`DELETE FROM company_categories WHERE company_id IN (
    SELECT id FROM companies WHERE name_zh LIKE 'E2E企业%')`);
  mysqlExec(`DELETE FROM company_categories WHERE category_id IN (
    SELECT id FROM categories WHERE name_zh LIKE 'E2E类目%')`);
  for (const { table, nameCol, marker, mediaCols } of WIPE_TARGETS) {
    // 先收集待删行的媒体列引用（JSON 数组列一并按 URL 正则提取），再删行
    const rows = mysqlRows(
      `SELECT id, ${mediaCols.join(', ')} FROM ${table} WHERE ${nameCol} LIKE '${marker}'`,
    );
    for (const row of rows) {
      const urls = row.join(' ').match(UPLOAD_URL_RE) ?? [];
      removeLocalFiles(urls);
    }
    mysqlExec(`DELETE FROM ${table} WHERE ${nameCol} LIKE '${marker}'`);
  }
  // 询盘按留言内容标记清理（中英两种前缀）
  mysqlExec(`DELETE FROM inquiries WHERE content LIKE 'E2E询盘·%' OR content LIKE 'E2E Inquiry%'`);
}
