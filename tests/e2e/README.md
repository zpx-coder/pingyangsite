# 平阳产业带官网 E2E 套件（阶段 4 任务 4.2）

Playwright 端到端测试，覆盖核心旅程 15 个场景（≤20）：

| 文件 | 场景 |
| --- | --- |
| `specs/01-site.spec.ts` | S1 首页双语切换 · S2 产品详情双语 · S3 企业详情双语 · S4 新闻列表与详情双语 · S5 非法语言段与不存在详情 404 · S6 中文询盘提交 · S7 英文询盘提交 |
| `specs/02-admin.spec.ts` | A1 登录失败/成功 · A2 产品 CRUD 全流程 · A3 企业 CRUD · A4 新闻 CRUD · A5 类目新增/下架/删除 · A6 询盘处理与统计 · A7 页脚配置即时生效 · A8 改密与重新登录 |

`workers=1` 且文件按字母序执行，保证 01-site 的询盘先产生、02-admin 再消费。

## 前置条件

本地开发环境已启动（见运行手册）：

- 官网 dev 服务 `http://localhost:3999`（`npx next dev -p 3999`）
- 管理后台 `http://localhost:5173`（vite）
- API `http://localhost:3001`（`node dist/main.js`）
- MySQL（`pingyangsite-mysql`）/ Redis 容器运行中

## 运行

```bash
cd tests/e2e
npm install            # 首次
npx playwright install chromium   # 首次（约 120MB）
npm run e2e
```

环境变量可覆盖（默认对齐本地开发端口）：`SITE_URL` / `ADMIN_URL` / `API_URL` / `ADMIN_PHONE` / `ADMIN_PASSWORD`（主管理员）。

## 数据安全

- 所有测试数据带 `E2E·<运行号>` 前缀，`global-setup` 先清残留、`global-teardown` 清理本次数据与上传文件；
- `page_contents` 全量备份于 `.run-data/page-content-backup.json`，teardown 原样恢复；
- 专用测试管理员（`199<运行号>`）由 setup 直插数据库、teardown 删除；
- 询盘按留言内容标记清理，绝不触碰真实业务数据。
