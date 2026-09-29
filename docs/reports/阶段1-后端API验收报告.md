# 阶段 1 · 后端 API 验收报告

- **日期**：2026-09-29
- **范围**：阶段 0 工程初始化（0.1–0.4）+ 阶段 1 后端 API（1.1–1.13）
- **执行方式**：AI 全量开发，按任务逐项自验收后提交（Conventional Commits），记录见 Todolist.md
- **代码位置**：`services/api`（NestJS 12.1.1 + Prisma 6.19.3），分支 develop 已推送 GitHub

## 一、任务完成总览

| 任务 | 验收结果 | 关键点 |
| --- | --- | --- |
| 0.1 Git 初始化 | ✅ | main 保护分支 + develop；.env* 忽略；远程 SSH 推送 |
| 0.2 根工程与配置 | ✅ | README / .editorconfig / config 模板（dev.local/prod） |
| 0.3 本地基础设施 | ✅ | docker-compose（MySQL 5.6.16 + Redis 7.0.15，与生产同版本），一键起停脚本 + 种子数据 |
| 0.4 数据层 | ✅ | Prisma 8 表 + 索引 + 种子脚本 |
| 1.1 骨架 | ✅ | 多环境配置、统一响应 {code,message,data}、HttpExceptionFilter 状态码映射、日志脱敏（手机号/密码/邮箱） |
| 1.2 认证 | ✅ | 登录/会话（Redis 存储）/失败锁定 15 分钟/8h 过期/退出，bcryptjs 加盐存储 |
| 1.3 存储适配 | ✅ | StorageDriver 接口，Local/Oss 双驱动切换仅改环境变量；上传校验 + sharp 缩略图 |
| 1.4 翻译服务 | ✅ | Aliyun/Mock 双实现，指数退避重试，失败不阻塞保存，machineFields 标记 |
| 1.5 类目 | ✅ | CRUD + 删除保护（非空类目删除被拒 40000） |
| 1.6 企业 | ✅ | CRUD + 类目多选关联（先删后建） |
| 1.7 产品 | ✅ | CRUD + 状态机（草稿→已发布→已下架）+ 逻辑删除 + 批量操作 |
| 1.8 新闻 | ✅ | CRUD + 定时发布（到 publish_time 官网可见）+ 置顶优先 |
| 1.9 页面内容 | ✅ | 5 配置项 key-value JSON + Redis 24h 缓存 + 保存合并语义 + 双语联动四态 |
| 1.10 询盘 | ✅ | 零依赖 SVG 验证码（一次性）/ 同 IP 分钟+日限流 / 提交快照幂等 / 统计 / 筛选 / xlsx 导出（零依赖手写生成器，负责人批准） |
| 1.11 账号管理 | ✅ | 改手机号/改密码（原密码验证），改密强制重登；audit 留痕 |
| 1.12 单元测试 | ✅ | Jest 体系：**64 套件 489 用例全绿**；覆盖率 行 99.4% / 函数 88.82% / 语句 98.37% / 分支 99.43%（阈值 80/80/80/70） |
| 1.13 接口文档 | ✅ | Swagger 自动生成：/docs 41 条路径全部枚举、54 个操作中文分组、25 个 DTO schema 完整；生产环境自动关闭 |

## 二、安全与质量基线

- 密钥/账号全部走环境变量（config/dev.local.env，不入库）；日志全链路脱敏（手机号 138****5678、密码整值替换、邮箱前缀打码）
- SQL 全部 Prisma 参数化；后端独立校验（ValidationPipe whitelist）；会话 Cookie HttpOnly + SameSite=Lax，生产强制 Secure（TLS 1.2+）
- 依赖审计：无新增高危漏洞；deepmerge-ts 3 个高危为既有依赖，已列入跟踪清单，按安全底线要求 1 个迭代内修复或替换

## 三、本次执行中修复的缺陷（含测试锁定回归）

| 缺陷 | 修复 | 提交 |
| --- | --- | --- |
| HttpException 字符串消息体未按状态码映射业务码（限流 429 误报 50000） | 过滤器字符串分支补状态码映射 | fix(api) f36e454 |
| news.update 编辑回传未改动的机器翻译英文被误判「人工校对」清标记（§5.3 原值保留语义缺失） | 构造翻译对时补传 prevEn，与页面内容模块对齐 | fix(news) 8c963f9 |
| inquiry 限流 expire 静默失败时计数 key 无 TTL，该 IP 会被永久限流 | expire 失败时删除 key 重置计数（降级放行方向） | fix(inquiry) 674cdb9 |

## 四、遗留问题（测试过程中发现，共 9 条）

**2026-09-29 负责人决策：优先修复 → 已修复 4 条**（#1/#2 fix(product) 7628d60，#6/#7 fix(page-content) 26a05c3，均含回归测试，全量 494 用例通过）。

| # | 位置 | 问题 | 风险 | 状态 |
| --- | --- | --- | --- | --- |
| 1 | product.service create | companyId 校验语义与 update 不一致（显式 null 误查企业） | 低 | ✅ 已修复（统一为 null/undefined 免校验、0 拒绝） |
| 2 | product.service update | truthy 判断对 0 跳过校验 | 低 | ✅ 已修复（并入 #1 统一语义） |
| 3 | product.service publicDetail | 冗余 select logoUrl（无害） | 无 | 搁置 |
| 4 | category.service translate | 全部翻译失败时 machineFields 重序列化为 '[]'（行为可接受） | 无 | 搁置 |
| 5 | company/product update | 图片字段未传时冗余 parse→stringify 往返（安全） | 无 | 搁置 |
| 6 | page-content readCache | 缓存被污染为字符串时原样返回 | 低 | ✅ 已修复（config 非对象视为未命中回源） |
| 7 | page-content applyPairs | home_banner 原地修改调用方 config（隐性副作用） | 低 | ✅ 已修复（images 元素浅拷贝后回写） |
| 8 | oss.driver publicUrl | cdnDomain 配置值若带 scheme 会拼出双 scheme URL | 低 | 搁置（上线配置时在 configuration 归一化即可规避） |
| 9 | upload.controller | `req.session.adminPhone` 未用可选链（守卫前置兜底，不可达） | 无 | 搁置 |

## 五、技术决策记录（按负责人要求入报告）

| 决策 | 结论 | 说明 |
| --- | --- | --- |
| xlsx 导出实现 | 零依赖手写最小 ZIP+XML 生成器 | 2026-09-29 负责人批准；避免引入 exceljs/xlsx 体积依赖 |
| sharp 缩略图 | 引入 sharp（存储模块图像处理） | 方案既定技术栈，阶段评审已确认 |
| ali-oss SDK | 引入 ali-oss（OssDriver） | 方案既定技术栈，阶段评审已确认；生产 OSS 账号走环境变量 |
| 测试框架 | Jest 29 + ts-jest（devDependencies） | 2026-09-29 负责人批准；@nestjs 纯 ESM 包经 moduleNameMapper 测试替身解决 |
| 接口文档 | @nestjs/swagger 12 + swagger-ui-express 5 | 2026-09-29 负责人批准；开发/预发启用，生产关闭 |

## 六、当前环境与状态

- **本地环境**：Docker MySQL 5.6.16（pingyangsite-mysql）+ Redis 7.0.15（pingyangsite-redis）；storage=local、mt=mock，零云依赖
- **数据库基线**：admin_users 1 条（13800000000 / Admin@123456，种子值）、page_contents 5 条种子配置，其余表空
- **服务**：`http://127.0.0.1:3001`，接口文档 `/docs`（会话 Cookie 登录后可直测管理端接口）

## 七、审查与放行

按开发宪章「AI 生成内容须经人类审查方可合入」，请负责人评审本报告，确认后可进入阶段 2（官网前端，任务 2.1–2.12）。
