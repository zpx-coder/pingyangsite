# 平阳产业带官网：单容器 Docker 部署

一个容器运行 Next.js 官网、Vue 后台静态文件、NestJS API、Redis 和 Nginx；
MySQL 连接外部服务器。本机生成 amd64 镜像和 tar，服务器加载后运行，
公网 Tengine 将现有域名的 `/pingyang/` 转到容器。

本文统一替代原 `local-docker/README.md`、`server-docker/README.md`。
数据库密码、会话密钥、管理员密码只填写在私有环境文件中。

## 0. 当前状态与新对话交接

截至 2026-10-09：

| 项目 | 当前值 |
| --- | --- |
| 项目目录 / 分支 | `/Users/lanqi/weiyi/wy_other_code/pingyangsite` / `feature/pingyang-subpath-deploy` |
| 镜像 | `pingyangsite:prod-amd64`，`linux/amd64`，适用于 Intel/AMD x86_64 |
| 本机 tar | 项目旁 `pingyangsite-artifacts/pingyangsite-prod-amd64.tar`，约 944 MiB |
| Docker 服务器 | `10.10.2.21`，CentOS 7，Docker 26.1.4 |
| 容器 / 端口 | `pingyangsite`，`10.10.2.21:18080 → 8080` |
| 外部 MySQL | `10.10.16.179:3306/pingyangsite`，应用账号 `antman` |
| 公网代理 | 另一台服务器上的 Tengine 2.2.0，已有 HTTPS 证书 |
| 官网 | `https://www.iyiwutrade.com/pingyang/` |
| 后台 | `https://www.iyiwutrade.com/pingyang/admin/` |
| API | `https://www.iyiwutrade.com/pingyang/api/v1/` |
| 已确认 | 新容器 `/pingyang/api/v1/health` 返回 JSON、HTTP 200 |
| 待验收 | 公网接口、官网资源、后台登录及数据展示 |

**源码已恢复。** 从上次已验证的生产镜像恢复 `/pingyang` 适配，
并补回 `server-docker/Dockerfile`、`start.sh`、`nginx.conf` 和环境模板。
根 `.dockerignore` 排除密钥与构建产物。后续可按第 7 节重新构建；
服务器仍需由操作者上传、加载并重建容器。

已合并 `origin/develop` 的 `1fb6eef`，同事的新功能与 `/pingyang` 适配均保留。
合并代码已用本地 `pingyangsite:merged-amd64` 验证，真实 MySQL 连接、官网与
后台入口及静态资源通过，容器 `healthy`。生产标签 `pingyangsite:prod-amd64`
及现有 tar 已更新为本次合并版本；服务器仍待上传、加载和重建。
本地新版本入口为 `http://localhost:18081/pingyang/`，原 8080 容器保留。

新对话可直接粘贴：

> 请先阅读仓库根目录 README.md。采用单容器、外部 MySQL，公网入口 /pingyang/。
> 服务器容器健康接口已返回 200，公网访问和后台登录仍待验收。
> Docker 部署文件和 /pingyang 适配源码已经恢复；
> 重新构建按第 7 节执行。服务器操作由我执行。

## 1. 环境文件与数据库

容器内部端口：Nginx `8080`、Next `3000`、API `3001`、Redis `6379`。
只映射 Nginx 端口。MySQL 使用应用读写账号，不使用只读排查账号。

服务器环境文件 `~/pingyangsite-deploy/.env.production`：

```dotenv
NODE_ENV=production
PORT=3001
DATABASE_URL=mysql://antman:<URL编码后的密码>@10.10.16.179:3306/pingyangsite?character_set=utf8mb4&prefer_socket=false
SESSION_SECRET=<随机长字符串>
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
STORAGE_DRIVER=local
STORAGE_PUBLIC_BASE_URL=https://www.iyiwutrade.com/pingyang
MT_MODE=mock
API_BASE_URL=http://127.0.0.1:3001
SITE_URL=https://www.iyiwutrade.com/pingyang
SEED_ADMIN_PHONE=<首次初始化管理员手机号>
SEED_ADMIN_PASSWORD=<首次初始化管理员密码>
```

| 配置 | 用途 |
| --- | --- |
| `DATABASE_URL` | 完整数据库连接串；密码中的特殊字符需要 URL 编码 |
| `SESSION_SECRET` | 会话签名密钥；用 `openssl rand -hex 32` 生成一次并保存，不能留空 |
| `REDIS_HOST/PORT` | 容器内部 Redis，保持 `127.0.0.1:6379` |
| `STORAGE_DRIVER=local` | 上传文件保存在数据卷，不调用 OSS |
| `STORAGE_PUBLIC_BASE_URL` | 新上传文件公开地址前缀，不带结尾 `/` |
| `MT_MODE=mock` | 模拟翻译，不调用付费翻译服务 |
| `API_BASE_URL` | Next 服务端调用容器内部 API 的地址 |
| `SITE_URL` | 官网公开地址；SEO 地址也依赖构建时配置 |
| `SEED_ADMIN_*` | 执行种子脚本时使用，不会随容器启动自动创建账号 |

环境文件逐行填写，值不加引号。本次 MySQL 5.6 连接需要保留
`prefer_socket=false`，否则曾出现 Prisma 读取 socket 值的 panic。

数据库已手工执行 DDL、管理员已初始化时，直接启动。
**不要重复执行建表 SQL 或 `prisma migrate deploy`。**
仅在获准写入、已建表但未初始化的数据库上，填写非空的 `SEED_ADMIN_*`，
启动容器后执行一次（二选一）：

```bash
# 本地容器
docker exec pingyangsite-local sh -lc 'cd /app/services/api && npm run db:seed'
# 服务器容器
sudo docker exec pingyangsite sh -lc 'cd /app/services/api && npm run db:seed'
```

它创建管理员及默认页面配置；同一手机号已存在时不会重置密码，
已有页面配置不会被覆盖。仅修改 `SEED_ADMIN_PASSWORD` 不能修改已有账号密码。

## 2. Mac：本地验证同一个镜像

Docker Desktop 启动后，在项目根目录执行。已有镜像时跳过 `docker load`：

```bash
cd /Users/lanqi/weiyi/wy_other_code/pingyangsite
docker load -i ../pingyangsite-artifacts/pingyangsite-prod-amd64.tar
mkdir -p local-docker
vi local-docker/.env.local
```

按第 1 节填写文件，本地将以下项改为：

```dotenv
NODE_ENV=development
DATABASE_URL=mysql://<应用读写账号>:<URL编码后的密码>@<测试MySQL地址>:3306/pingyangsite?character_set=utf8mb4&prefer_socket=false
STORAGE_PUBLIC_BASE_URL=http://localhost:8080/pingyang
SITE_URL=http://localhost:8080/pingyang
```

本地使用同一个已构建镜像，路由也带 `/pingyang/`。
`NODE_ENV=development` 让 API 支持本地 HTTP 登录会话；官网仍由 `next start`
提供构建产物。生产服务器必须使用 `production`。本地 Next 可能提示 `NODE_ENV` 警告，
这组环境值仅用于 HTTP 调试。镜像构建好的 SEO 域名不会随之重新生成。

```bash
chmod 600 local-docker/.env.local
docker run -d --name pingyangsite-local \
  --platform linux/amd64 \
  -p 127.0.0.1:8080:8080 \
  --env-file "$PWD/local-docker/.env.local" \
  -v pingyangsite-local-uploads:/app/services/api/uploads \
  -v pingyangsite-local-redis:/data/redis \
  pingyangsite:prod-amd64
docker logs --tail 100 pingyangsite-local
curl -i http://localhost:8080/pingyang/api/v1/health
```

健康接口应返回 `200`。打开官网 `http://localhost:8080/pingyang/`、
后台 `http://localhost:8080/pingyang/admin/`，验证图片、登录与数据展示。
Apple Silicon Mac 通过模拟运行 amd64 镜像，启动较慢。

已有同名容器，或修改了环境文件时，先执行 `docker stop pingyangsite-local`、
`docker rm pingyangsite-local`，再重新运行上述 `docker run`。
`pingyangsite-local-*` 是新本地验证卷；已有上传数据时复用原卷名。
删除容器不会删除命名卷。

## 3. Mac：导出并上传 tar

已有最新 tar 时直接上传；需要重新导出时执行：

```bash
cd /Users/lanqi/weiyi/wy_other_code/pingyangsite
mkdir -p ../pingyangsite-artifacts
docker image inspect pingyangsite:prod-amd64 --format '{{.Os}}/{{.Architecture}}'
docker save -o ../pingyangsite-artifacts/pingyangsite-prod-amd64.tar \
  pingyangsite:prod-amd64
```

架构应为 `linux/amd64`。把 `Docker服务器SSH地址` 换成平时登录的地址：

```bash
ssh fuyou@Docker服务器SSH地址 'mkdir -p ~/pingyangsite-deploy'
scp ../pingyangsite-artifacts/pingyangsite-prod-amd64.tar \
  fuyou@Docker服务器SSH地址:~/pingyangsite-deploy/
```

tar 不包含外部 MySQL 数据、上传文件卷和服务器环境文件。

## 4. Docker 服务器：加载并重建容器

登录 Docker 服务器，在部署目录操作。更新已有容器时先保存当前运行镜像；
首次部署跳过 `docker tag`：

```bash
cd ~/pingyangsite-deploy
sudo docker tag "$(sudo docker inspect pingyangsite --format '{{.Image}}')" \
  pingyangsite:before-update
sudo docker load -i pingyangsite-prod-amd64.tar
sudo docker image inspect pingyangsite:prod-amd64 --format '{{.Os}}/{{.Architecture}}'
sudo docker run --rm --entrypoint sh pingyangsite:prod-amd64 -lc \
  "grep -nF 'location ^~ /pingyang/api/' /etc/nginx/conf.d/pingyang.conf"
```

最后一条必须输出 `/pingyang/api/` 规则；没有输出时先核对 tar，再替换容器。
按第 1 节创建或修改环境文件：

```bash
vi .env.production
chmod 600 .env.production
```

已有容器先核对数据挂载：

```bash
sudo docker inspect pingyangsite \
  --format '{{range .Mounts}}{{println .Name .Source .Destination}}{{end}}'
```

本次使用 `pingyangsite-uploads` → `/app/services/api/uploads`、
`pingyangsite-redis` → `/data/redis`。如果实际挂载不同，复用实际挂载。
已有容器先停止并删除；首次部署跳过这两行：

```bash
sudo docker stop pingyangsite
sudo docker rm pingyangsite
```

创建新容器：

```bash
sudo docker run -d --name pingyangsite \
  --restart unless-stopped \
  -p 10.10.2.21:18080:8080 \
  --env-file "$PWD/.env.production" \
  -v pingyangsite-uploads:/app/services/api/uploads \
  -v pingyangsite-redis:/data/redis \
  pingyangsite:prod-amd64
sudo docker ps --filter name=pingyangsite
sudo docker logs --tail 100 pingyangsite
curl -i http://10.10.2.21:18080/pingyang/api/v1/health
```

健康接口应返回 JSON、HTTP `200`。`health: starting` 是启动阶段，
稍后应变为 `healthy`。错误时先查看容器日志。

## 5. Tengine 服务器：配置 `/pingyang/` 代理

在公网 Tengine 服务器修改现有 `iyiwutrade.com.conf`。
在 `server_name www.iyiwutrade.com` 的 **80 端口 server** 中加入：

```nginx
location = /pingyang {
    return 301 https://www.iyiwutrade.com/pingyang/;
}
location ^~ /pingyang/ {
    return 301 https://www.iyiwutrade.com$request_uri;
}
```

在同一域名的 **443 端口 server** 中加入：

```nginx
location = /pingyang {
    return 301 /pingyang/;
}
location ^~ /pingyang/ {
    proxy_pass http://10.10.2.21:18080;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cookie_path / /pingyang/;
    client_max_body_size 2g;
    proxy_read_timeout 120s;
}
```

放在现有 `location /` 前方便阅读；已有同名规则时替换，不要重复添加。
保留现有证书和其他项目的 `/showroomVisitorUi/`、`/inStuRecruitment/`、`/api/`。

**`proxy_pass` 末尾不能加 `/`。** 外层保留 `/pingyang/`；
容器内部为 API 和上传目录去掉该前缀，Next 接收完整前缀。
平阳接口使用 `/pingyang/api/`，根 `/api/` 已由其他项目使用。

```bash
sudo /opt/app/tengine/sbin/nginx -t && \
  sudo /opt/app/tengine/sbin/nginx -s reload
```

本次代理规则已配置并重载。只更新镜像时无需再次重载 Tengine。

## 6. 按顺序验收

先检查容器入口，在 Docker 服务器执行，均预期 `200`：

```bash
curl -i http://10.10.2.21:18080/pingyang/api/v1/health
curl -I http://10.10.2.21:18080/pingyang/admin/
curl -I http://10.10.2.21:18080/pingyang/img/logo.jpg
curl -I http://10.10.2.21:18080/pingyang/zh-CN
```

通过后，在 Tengine 服务器或本机检查公网：

```bash
curl -i http://www.iyiwutrade.com/pingyang/
curl -i https://www.iyiwutrade.com/pingyang/api/v1/health
curl -I https://www.iyiwutrade.com/pingyang/admin/
curl -IL --max-redirs 5 https://www.iyiwutrade.com/pingyang/
```

HTTP 入口应 `301` 跳 HTTPS；API、后台应 `200`；
官网跳到 `/pingyang/zh-CN` 或 `/pingyang/en`，最终应 `200`。
浏览器确认图片与站内跳转正常、后台能登录并显示数据、
请求走 `/pingyang/api/v1/`、刷新后台子页面正常。
健康接口 200 不等于业务验收全部完成。

## 7. 后续修改代码：重新构建

构建所需的文件及适配已恢复：

- `server-docker/Dockerfile`、`start.sh`、`nginx.conf`；
- Next `basePath`、后台 Vite `base`、前端路由及 API/资源 URL 的 `/pingyang` 适配；
- 构建参数 `APP_BASE_PATH`、`SITE_URL`，构建上下文排除私有环境文件和密钥。

Next 与后台的资源、路由、API 地址均需带前缀。在 Mac 项目根目录执行：

```bash
docker buildx build --platform linux/amd64 --load \
  --build-arg APP_BASE_PATH=/pingyang \
  --build-arg SITE_URL=https://www.iyiwutrade.com/pingyang \
  -f server-docker/Dockerfile -t pingyangsite:prod-amd64 .
```

随后执行第 2–6 节。路径回归测试：

```bash
node --experimental-strip-types --test tests/deployment/paths.test.mjs
```

`APP_BASE_PATH` 和 SEO 域名参与构建；
只修改服务器环境文件不能改变已构建的前端路径。

## 8. 典型坑：新镜像已加载，容器仍在运行旧镜像

**现象：** `/api/v1/health` 返回 200，`/pingyang/api/v1/health`
却返回官网 HTML 404，页面里的首页链接还是 `/zh-CN`。
直接访问容器和公网都有相同结果。

**原因：** `docker load` 更新镜像标签，已有容器仍绑定创建时的旧镜像。
镜像名相同不代表内容相同。`docker restart` 不会切换镜像，
也不会重新读取 `--env-file`、端口或数据挂载配置。

检查容器和镜像标签的 ID，再分别检查规则：

```bash
sudo docker inspect pingyangsite --format '{{.Image}}'
sudo docker image inspect pingyangsite:prod-amd64 --format '{{.Id}}'
sudo docker exec pingyangsite sh -lc \
  "grep -nF 'location ^~ /pingyang/api/' /etc/nginx/conf.d/pingyang.conf"
sudo docker run --rm --entrypoint sh pingyangsite:prod-amd64 -lc \
  "grep -nF 'location ^~ /pingyang/api/' /etc/nginx/conf.d/pingyang.conf"
```

本次运行中容器没有规则，新镜像有规则；按第 4 节重建容器后，
带前缀的健康接口立即返回 200。处理时复用原环境文件和数据卷。
直接访问容器已出现 404，应先检查容器版本及内部路由。

## 9. 常用操作与回退

```bash
sudo docker logs --tail 100 pingyangsite
sudo docker ps --filter name=pingyangsite
sudo docker restart pingyangsite  # 仅重启当前版本
```

回退：停止并删除新容器，复用第 4 节 `docker run` 的环境文件、端口与数据卷，
将最后的镜像名改为 `pingyangsite:before-update`。不要删除数据卷。
若备份的是最初不支持 `/pingyang` 的旧镜像，只能恢复原根路径服务。

## Git 协作

`develop2.0` 作为后续集成分支，包含同事功能和已验证的 `/pingyang` 部署适配。
新功能分支从最新 `origin/develop2.0` 创建，完成后通过 PR 合回 `develop2.0`。
`feature/pingyang-subpath-deploy` 保留本次适配版本；原 `develop` 保留历史。

## 项目文档

- [产品需求文档](docs/prd/产品需求文档.md)
- [开发计划方案](docs/prd/开发计划方案.md)
- [架构决策记录](docs/adr/)
- [执行记录](Todolist.md)
- [开发规范](CLAUDE.md)
