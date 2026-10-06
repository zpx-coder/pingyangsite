-- 企业员工规模双语（任务 4.4：阶段 3 报告遗留 #1 缺陷清零）
-- 非破坏性新增可空列，与 address_en/contact_name_en 双语模式一致
ALTER TABLE `companies` ADD COLUMN `scale_en` VARCHAR(100) NULL AFTER `scale`;
