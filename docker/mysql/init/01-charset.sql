-- MySQL 5.6.16 适配约定（开发计划方案 §5.1）：
-- 建库须显式指定 utf8mb4（5.6 默认非 utf8mb4），本脚本仅在数据卷首次
-- 初始化时由 MySQL 官方镜像入口自动执行。库名默认 pingyangsite，
-- 如需更改请同步修改 config/dev.local.env 的 MYSQL_DATABASE。
ALTER DATABASE `pingyangsite` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
