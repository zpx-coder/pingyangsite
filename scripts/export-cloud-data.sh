#!/usr/bin/env bash
# 本地数据导出（阿里云部署数据迁移，2026-10-09）
# 导出本地 MySQL 完整 dump（表结构 + 数据 + _prisma_migrations 迁移历史），
# 供 RDS 空库一次性导入；导入后无需再执行 migrate deploy / db:seed。
# 说明：静态图片 /img/* 随代码部署；uploads 目录文件无 DB 引用、不迁移；Redis 为缓存不迁移。
# 用法（密码经环境变量传入，不写入仓库）：
#   MYSQL_PWD=<本地库密码> bash scripts/export-cloud-data.sh [输出文件，默认 /tmp/pingyangsite-export.sql]
set -euo pipefail

DB_USER="${DB_USER:-root}"
DB_PASSWORD="${MYSQL_PWD:-}"
DB_NAME="${DB_NAME:-pingyangsite}"
CONTAINER="${DB_CONTAINER:-pingyangsite-mysql}"
OUT="${1:-/tmp/pingyangsite-export.sql}"

if [ -z "$DB_PASSWORD" ]; then
  echo "缺少密码：请用 MYSQL_PWD=<本地库密码> 传入" >&2
  exit 1
fi

docker exec -e MYSQL_PWD="$DB_PASSWORD" "$CONTAINER" mysqldump -u"$DB_USER" \
  --default-character-set=utf8mb4 \
  --single-transaction \
  --no-tablespaces \
  --set-gtid-purged=OFF \
  "$DB_NAME" > "$OUT"

echo "导出完成：$OUT（$(du -h "$OUT" | cut -f1)）"
