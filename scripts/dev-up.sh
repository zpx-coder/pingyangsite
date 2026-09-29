#!/usr/bin/env bash
# 一键启动本地开发基础设施（MySQL 5.6.16 / Redis 7.0.15，与生产同版本）
# 用法：./scripts/dev-up.sh
# 前置：已安装 Docker Desktop（守护进程未运行时自动拉起）
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

ENV_FILE="config/dev.local.env"

# 1. 首次运行从模板生成本地环境文件（已存在则不覆盖，尊重本地修改）
if [[ ! -f "$ENV_FILE" ]]; then
  cp "config/dev.local.env.example" "$ENV_FILE"
  echo "[dev-up] 已生成 ${ENV_FILE}（本地默认值，可自行修改）"
fi

# 2. 确保 Docker 守护进程可用（macOS 自动拉起 Docker Desktop，最长等 3 分钟）
if ! docker info >/dev/null 2>&1; then
  echo "[dev-up] Docker 守护进程未运行，尝试启动 Docker Desktop…"
  open -a Docker 2>/dev/null || true
  for _ in $(seq 1 60); do
    docker info >/dev/null 2>&1 && break
    sleep 3
  done
  if ! docker info >/dev/null 2>&1; then
    echo "[dev-up] Docker 启动失败，请手动打开 Docker Desktop 后重试" >&2
    exit 1
  fi
fi

# 3. 起容器并等待健康检查通过
docker compose --env-file "$ENV_FILE" up -d

wait_healthy() {
  local container="$1" timeout_s="${2:-180}"
  local elapsed=0
  while (( elapsed < timeout_s )); do
    local status
    status="$(docker inspect --format '{{.State.Health.Status}}' "$container" 2>/dev/null || echo "starting")"
    [[ "$status" == "healthy" ]] && return 0
    sleep 3
    elapsed=$((elapsed + 3))
  done
  echo "[dev-up] ${container} 未在 ${timeout_s}s 内就绪，请查看日志：docker compose logs ${container}" >&2
  exit 1
}

wait_healthy pingyangsite-mysql 180
wait_healthy pingyangsite-redis 60

# 4. 验收检查：版本与字符集（MySQL 5.6.16 适配约定要求 utf8mb4）
MYSQL_VER="$(docker compose --env-file "$ENV_FILE" exec -T mysql mysql --version | awk '{print $5}')"
MYSQL_CHARSET="$(docker compose --env-file "$ENV_FILE" exec -T mysql sh -c 'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mysql -uroot -N -e "SELECT DEFAULT_CHARACTER_SET_NAME FROM information_schema.SCHEMATA WHERE SCHEMA_NAME=\"pingyangsite\""' | tr -d '\r')"
REDIS_VER="$(docker compose --env-file "$ENV_FILE" exec -T redis redis-server --version | awk '{print $3}' | cut -d= -f2)"

echo ""
echo "[dev-up] 就绪："
echo "  MySQL  ${MYSQL_VER}   127.0.0.1:$(grep -E '^MYSQL_PORT=' "$ENV_FILE" | cut -d= -f2)  库 pingyangsite（${MYSQL_CHARSET}）"
echo "  Redis  ${REDIS_VER}   127.0.0.1:$(grep -E '^REDIS_PORT=' "$ENV_FILE" | cut -d= -f2)"
[[ "$MYSQL_CHARSET" == "utf8mb4" ]] || { echo "[dev-up] 警告：库字符集为 ${MYSQL_CHARSET}，预期 utf8mb4" >&2; exit 1; }
