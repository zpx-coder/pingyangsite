FROM node:22-bookworm

RUN apt-get update \
    && apt-get install -y --no-install-recommends nginx redis-server \
    && rm -rf /var/lib/apt/lists/* \
    && rm -f /etc/nginx/sites-enabled/default

WORKDIR /app
COPY services/api/package.json services/api/package-lock.json /app/services/api/
COPY services/api/prisma /app/services/api/prisma
COPY frontend/site/package.json frontend/site/package-lock.json /app/frontend/site/
COPY frontend/admin/package.json frontend/admin/package-lock.json /app/frontend/admin/

# 补齐 API 锁文件缺失的 CLI 依赖，仅修改镜像层。
RUN cd /app/services/api \
    && npm install --package-lock-only --ignore-scripts --no-audit --no-fund \
    && npm ci --no-audit --no-fund
RUN npm ci --prefix frontend/site --no-audit --no-fund \
    && npm ci --prefix frontend/admin --no-audit --no-fund

COPY services/api/src /app/services/api/src
COPY services/api/tsconfig.json /app/services/api/tsconfig.json
COPY frontend/site/src /app/frontend/site/src
COPY frontend/site/public /app/frontend/site/public
COPY frontend/site/next.config.ts frontend/site/tsconfig.json /app/frontend/site/
COPY frontend/admin/src /app/frontend/admin/src
COPY frontend/admin/index.html frontend/admin/vite.config.ts frontend/admin/env.d.ts /app/frontend/admin/
COPY frontend/admin/tsconfig*.json /app/frontend/admin/

ARG APP_BASE_PATH=
ENV APP_BASE_PATH=${APP_BASE_PATH} \
    NEXT_PUBLIC_APP_BASE_PATH=${APP_BASE_PATH}
RUN cd /app/services/api \
    && DATABASE_URL='mysql://ignored:ignored@127.0.0.1:3306/pingyangsite' npx prisma generate \
    && npm run build
RUN cd /app/frontend/admin && npm run build
ARG SITE_URL=http://localhost:8080
RUN cd /app/frontend/site \
    && SITE_URL="$SITE_URL" API_BASE_URL=http://127.0.0.1:3001 npm run build

COPY server-docker/nginx.conf /etc/nginx/conf.d/pingyang.conf
COPY server-docker/start.sh /usr/local/bin/pingyang-start
RUN chmod +x /usr/local/bin/pingyang-start \
    && mkdir -p /app/services/api/uploads /data/redis

ENV NODE_ENV=production
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=90s \
    CMD node -e 'fetch("http://127.0.0.1:8080/api/v1/health").then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))'
CMD ["/usr/local/bin/pingyang-start"]
