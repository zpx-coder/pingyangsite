#!/usr/bin/env bash
# 停止本地开发基础设施。默认保留数据卷（再次 dev-up 数据仍在）；
# 加 -v 参数连同数据卷一起删除（清空数据库与缓存）。
# 用法：./scripts/dev-down.sh [-v]
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

ENV_FILE="config/dev.local.env"
ENV_ARGS=()
[[ -f "$ENV_FILE" ]] && ENV_ARGS=(--env-file "$ENV_FILE")

if [[ "${1:-}" == "-v" ]]; then
  echo "[dev-down] 停止并删除数据卷（数据库数据将清空）"
  docker compose "${ENV_ARGS[@]}" down --volumes
else
  docker compose "${ENV_ARGS[@]}" down
  echo "[dev-down] 已停止（数据卷保留，./scripts/dev-up.sh 可恢复）"
fi
