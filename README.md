# 平阳产业带官网（pingyangsite）

中/英双语 PC 官网 + 管理后台，面向全球采购商展示平阳特色产业集群、产品与
企业，承接海外询盘；运营人员经管理后台独立维护内容与处理询盘。

| 模块 | 技术栈 | 目录 |
| --- | --- | --- |
| 官网 | Next.js 15（TS，App Router，SSR/ISR，`/{lang}` 双语路由） | `frontend/site` |
| 管理后台 | Vue 3 + Vite + TS + Element Plus（SPA，/admin） | `frontend/admin` |
| 后端 API | NestJS（Node 20+）+ Prisma（MySQL 5.6.16 / Redis 7.0.15） | `services/api` |
| 共享包 | 类型定义 / 常量 / JSON 序列化工具 | `packages/shared` |

## 文档

- [产品需求文档（PRD）](docs/prd/产品需求文档.md)
- [开发计划方案（AI 执行基准）](docs/prd/开发计划方案.md)
- [UI 设计稿](docs/design/浏览设计稿.html)（交互稿 [ui.html](docs/design/ui.html)）
- [架构决策记录](docs/adr/)
- 执行记录：Todolist.md（仓库根目录）

## 快速启动（本地）

见《开发计划方案》§10.1：

```bash
./scripts/dev-up.sh    # 一键起 MySQL 5.6.16 / Redis 7.0.15 并建库
```

## 开发规范

遵循仓库根目录 CLAUDE.md（项目开发宪章）：先确认再动手、Conventional
Commits、main 仅 PR 合入、单元测试 ≥80%、安全底线、i18n 规范。
