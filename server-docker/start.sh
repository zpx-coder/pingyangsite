#!/usr/bin/env bash
set -euo pipefail

: "${DATABASE_URL:?DATABASE_URL is required}"
: "${SESSION_SECRET:?SESSION_SECRET is required}"
: "${SITE_URL:?SITE_URL is required}"

redis-server --bind 127.0.0.1 --protected-mode yes --appendonly yes --dir /data/redis &
redis_pid=$!

(cd /app/services/api && node dist/main.js) &
api_pid=$!

(cd /app/frontend/site && npm run start -- --hostname 127.0.0.1 --port 3000) &
site_pid=$!

nginx -g 'daemon off;' &
nginx_pid=$!

cleanup() {
  trap - TERM INT
  kill "$nginx_pid" "$site_pid" "$api_pid" "$redis_pid" 2>/dev/null || true
  wait "$nginx_pid" "$site_pid" "$api_pid" "$redis_pid" 2>/dev/null || true
}

trap 'cleanup; exit 0' TERM INT
wait -n "$redis_pid" "$api_pid" "$site_pid" "$nginx_pid" || true
cleanup
exit 1
