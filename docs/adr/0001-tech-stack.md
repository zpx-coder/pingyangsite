# ADR-0001 技术选型（已确认）

- 状态：已确认（负责人 2026-09-29，开发计划方案 §13 A 组）
- 依据：《开发计划方案》v2.2 §2、《产品需求文档》v1.4

## 决策

| 层 | 选型 | 理由要点 |
| --- | --- | --- |
| 官网前端 | Next.js 15（TS，App Router） | PRD §9.3 要求 SSR；`[lang]` 段原生落地 `/zh-CN`、`/en` 与 hreflang；ISR |
| 后台前端 | Vue 3 + Vite + TS + Element Plus | 无 SEO 需求；与原型交互匹配 |
| 后端 | NestJS（Node 20+）+ Prisma | 与官网同 TS 栈；迁移管理 + 参数化查询 |
| 数据库 | MySQL 5.6.16（负责人指定） | 生产为自建库（RDS 已无 5.6 在售） |
| 缓存 | Redis 7.0.15（负责人指定） | 验证码、IP 限流、服务端会话；本地 Docker 同版本 |
| 存储 | 阿里云 OSS + CDN | 缩略图按需裁剪；本地 `STORAGE_DRIVER=local` 同接口适配 |
| 翻译 | 阿里云机器翻译 | 失败不阻塞保存；本地 `MT_MODE=mock` |
| 富文本 | wangEditor 5 | 图片/视频传 OSS、粘贴样式过滤 |
| 其他 | exceljs、svg-captcha、Playwright | 询盘导出 / 图形验证码 / E2E |
| 部署 | Nginx + PM2（单机）；Docker Compose（本地） | 官网/后台/API 三进程 |
| 代码托管 | GitHub（pingyangsite） | main 仅 PR 合入，日常集成 develop |

## 结果（Consequences）

1. **MySQL 5.6.16 适配约定**：无原生 JSON 类型（5.7.8 才引入），`images`、
   `honor_images`、`machine_fields`、`config` 等 JSON 字段一律以 TEXT 列存储，
   应用层统一序列化/反序列化（封装于 packages/shared）；字符集显式 utf8mb4；
   Prisma DateTime → DATETIME(3)；不使用 5.7+/8.0 独有特性，为升级预留兼容。
2. **MySQL 5.6 EOL 风险**：数据库仅内网访问、不暴露公网；每日备份保留 30 天；
   全量参数化查询；是否升级由负责人决策。
3. **不建审计表**：操作留痕（登录/增删改/导出/账号变更）写应用日志并脱敏。
4. **域名与备案**：使用负责人现有已备案域名，部署生产时接入。
5. **图片素材**：官网自有内容图片由 AI 网络搜索抓取并本地化存储（不考虑授权
   与预算）；产品/企业/新闻图片由运营录入时自带。
