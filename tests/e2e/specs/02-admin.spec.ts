import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import {
  ADMIN, SITE, PAGE_CONTENT_BACKUP, TEST_PNG,
  MAIN_ADMIN_PHONE, MAIN_ADMIN_PASSWORD,
  TEST_ADMIN_PASSWORD, TEST_ADMIN_NEW_PASSWORD, getRun,
} from '../helpers/run-data';
import { adminLogin, expectSiteContains, findAdminId, getPublic } from '../helpers/admin-utils';

/** 后台核心流程：登录 / 产品-企业-新闻-类目 CRUD / 询盘处理 / 页面内容配置 / 账号变更 */

/** 读取「未处理」统计卡数值（.num + .lbl 相邻兄弟；先按标签定位再取同卡数值，避免 :has 命中多层容器） */
async function pendingCount(page: Page): Promise<number> {
  const lbl = page.locator('.lbl').filter({ hasText: /^未处理$/ }).first();
  await expect(lbl).toBeVisible();
  const num = lbl.locator('xpath=..').locator('.num');
  return Number(await num.textContent());
}

/** 列表页搜索目标行并点删除（ElMessageBox 二次确认） */
async function searchAndDelete(page: Page, listUrl: string, placeholder: string, marker: string): Promise<void> {
  await page.goto(`${ADMIN}${listUrl}`);
  const kw = page.locator(`input[placeholder="${placeholder}"]`);
  await kw.fill(marker);
  await kw.press('Enter');
  const row = page.locator('tbody tr').filter({ hasText: marker }).first();
  await expect(row).toBeVisible();
  await row.locator('.ops .link:has-text("删除")').click();
  const box = page.locator('.el-message-box');
  await expect(box).toBeVisible();
  // 二次确认按钮文案为「确认」（utils/confirm.ts confirmDanger 统一封装）
  await box.locator('button:has-text("确认")').click();
  await expect(page.locator('.el-message:has-text("已删除")').first()).toBeVisible();
}

/** 断言已删除资源在官网返回设计 404 */
async function expectSite404(page: Page, url: string): Promise<void> {
  const resp = await page.goto(url);
  expect(resp?.status()).toBe(404);
  await expect(page.locator('.not-found')).toBeVisible();
}

test('A1 登录失败提示与成功进入后台', async ({ page }) => {
  await adminLogin(page, MAIN_ADMIN_PHONE, 'WrongPassword123', false);
  await expect(page).toHaveURL(/\/admin\/login/);
  await adminLogin(page, MAIN_ADMIN_PHONE, MAIN_ADMIN_PASSWORD, true);
  await expect(page.locator('button:has-text("退出")')).toBeVisible();
});

test('A2 产品全流程：上传/富文本/发布/官网可见/编辑/删除', async ({ page }) => {
  const M = getRun().M;
  await adminLogin(page, MAIN_ADMIN_PHONE, MAIN_ADMIN_PASSWORD, true);

  // 新建：名称 + 类目 + 主图上传 + 富文本（新建路由为 /admin/products/edit）
  await page.goto(`${ADMIN}/admin/products/edit`);
  await page.locator('input[placeholder="请输入产品名称"]').fill(M.product);
  await page.locator('select').first().selectOption({ index: 1 });
  await page.locator('.upload-row input[type=file]').first().setInputFiles(TEST_PNG);
  await expect(page.locator('.upload-row .img-cell').first()).toBeVisible();
  await page.locator('.rich-wrap').first().locator('[data-slate-editor]').click();
  await page.keyboard.type('E2E 产品详情（中文）');
  await page.locator('button:has-text("保存并发布")').click();
  await expect(page.locator('.el-message:has-text("已保存并发布")').first()).toBeVisible();

  const productId = await findAdminId(page, 'products', M.product, 'nameZh');
  expect(productId).not.toBeNull();
  const id = productId as number;

  // 英文自动翻译 + 官网双语可见（ISR 缓存最长 60s，轮询等待稳定）
  const pub = await getPublic(page, 'products', id);
  expect(String(pub.nameEn ?? '')).not.toBe('');
  await expectSiteContains(page, `${SITE}/zh-CN/products/${id}`, M.product);
  await expectSiteContains(page, `${SITE}/en/products/${id}`, String(pub.nameEn));

  // 编辑改名 → 官网更新
  await page.goto(`${ADMIN}/admin/products/edit/${id}`);
  await page.locator('input[placeholder="请输入产品名称"]').fill(M.productEdit);
  await page.locator('button:has-text("保存并发布")').click();
  await expect(page.locator('.el-message:has-text("已保存并发布")').first()).toBeVisible();
  await expectSiteContains(page, `${SITE}/zh-CN/products/${id}`, M.productEdit);

  // 删除 → 官网 404
  await searchAndDelete(page, '/admin/products', '按产品名称搜索', M.productEdit);
  await expectSite404(page, `${SITE}/zh-CN/products/${id}`);
});

test('A3 企业全流程：Logo 上传/类目标签/发布/官网可见/删除', async ({ page }) => {
  const M = getRun().M;
  await adminLogin(page, MAIN_ADMIN_PHONE, MAIN_ADMIN_PASSWORD, true);

  await page.goto(`${ADMIN}/admin/companies/edit`);
  await page.locator('input[placeholder="请输入企业名称"]').fill(M.company);
  await page.locator('.upload-row input[type=file]').first().setInputFiles(TEST_PNG);
  await expect(page.locator('.upload-row .img-cell').first()).toBeVisible();
  await page.locator('.cat-chips .chipx').first().click();
  // 中文简介必填：第一个富文本编辑器输入简介（英文简介留空走自动翻译）
  await page.locator('.rich-wrap').first().locator('[data-slate-editor]').click();
  await page.keyboard.type('E2E 企业简介（中文）');
  await page.locator('button:has-text("保存")').click();
  // 保存成功后视图跳转企业列表，消息短暂展示，立即断言
  await expect(page.locator('.el-message:has-text("已保存")').first()).toBeVisible();

  const companyId = await findAdminId(page, 'companies', M.company, 'nameZh');
  expect(companyId).not.toBeNull();
  await expectSiteContains(page, `${SITE}/zh-CN/companies/${companyId}`, M.company);

  await searchAndDelete(page, '/admin/companies', '按企业名称搜索', M.company);
  await expectSite404(page, `${SITE}/zh-CN/companies/${companyId}`);
});

test('A4 新闻全流程：富文本/发布/官网可见/删除', async ({ page }) => {
  const M = getRun().M;
  await adminLogin(page, MAIN_ADMIN_PHONE, MAIN_ADMIN_PASSWORD, true);

  await page.goto(`${ADMIN}/admin/news/edit`);
  await page.locator('input[placeholder="请输入新闻标题"]').fill(M.news);
  await page.locator('textarea[placeholder="新闻列表卡片摘要，最多 200 字"]').fill('E2E 新闻摘要');
  await page.locator('.rich-wrap').first().locator('[data-slate-editor]').click();
  await page.keyboard.type('E2E 新闻正文（中文）');
  await page.locator('button:has-text("保存并发布")').click();
  await expect(page.locator('.el-message:has-text("新闻已发布")').first()).toBeVisible();

  const newsId = await findAdminId(page, 'news', M.news, 'titleZh');
  expect(newsId).not.toBeNull();
  await expectSiteContains(page, `${SITE}/zh-CN/news/${newsId}`, M.news);

  await searchAndDelete(page, '/admin/news', '按新闻标题搜索', M.news);
  await expectSite404(page, `${SITE}/zh-CN/news/${newsId}`);
});

test('A5 类目管理：新增/官网可见/下架/删除', async ({ page }) => {
  const M = getRun().M;
  await adminLogin(page, MAIN_ADMIN_PHONE, MAIN_ADMIN_PASSWORD, true);

  await page.goto(`${ADMIN}/admin/categories`);
  await page.locator('button:has-text("新增类目")').click();
  const dialog = page.locator('.el-dialog');
  await expect(dialog).toBeVisible();
  await dialog.locator('input[placeholder*="宠物用品"]').fill(M.category);
  await dialog.locator('button:has-text("保存")').click();
  await expect(dialog).toBeHidden();
  await expect(page.locator('.el-message:has-text("类目已保存")').first()).toBeVisible();

  const categoryId = await findAdminId(page, 'categories', M.category, 'nameZh');
  expect(categoryId).not.toBeNull();

  // 新类目默认上架 → 官网类目页可见（类目列表 ISR 缓存，轮询等待）
  await expectSiteContains(page, `${SITE}/zh-CN/categories/${categoryId}`, M.category);

  // 下架 → 官网 404
  await page.goto(`${ADMIN}/admin/categories`);
  const row = page.locator('tbody tr').filter({ hasText: M.category }).first();
  await row.locator('.ops .link:has-text("下架")').click();
  await expect(row.locator('.ops .link:has-text("上架")')).toBeVisible();
  await expectSite404(page, `${SITE}/zh-CN/categories/${categoryId}`);

  // 删除（类目列表无关键词筛选，直接按行定位）
  await page.goto(`${ADMIN}/admin/categories`);
  const delRow = page.locator('tbody tr').filter({ hasText: M.category }).first();
  await expect(delRow).toBeVisible();
  await delRow.locator('.ops .link:has-text("删除")').click();
  const box = page.locator('.el-message-box');
  await expect(box).toBeVisible();
  await box.locator('button:has-text("确认")').click();
  await expect(page.locator('.el-message:has-text("已删除")').first()).toBeVisible();
});

test('A6 询盘管理：官网提交的两条询盘可见/详情/标记已处理/统计递减', async ({ page }) => {
  const M = getRun().M;
  await adminLogin(page, MAIN_ADMIN_PHONE, MAIN_ADMIN_PASSWORD, true);

  await page.goto(`${ADMIN}/admin/inquiries`);
  // 官网 S6/S7 提交的询盘进入后台（询盘链路验收）
  const zhRow = page.locator('tbody tr').filter({ hasText: M.inquiryZh }).first();
  const enRow = page.locator('tbody tr').filter({ hasText: M.inquiryEn }).first();
  await expect(zhRow).toBeVisible();
  await expect(enRow).toBeVisible();

  const before = await pendingCount(page);
  const dialog = page.locator('.el-dialog');

  // 中文询盘：查看详情 → 标记已处理
  await zhRow.locator('.ops .link:has-text("查看")').click();
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText(M.inquiryZh);
  await dialog.locator('button:has-text("标记为已处理")').click();
  await expect(page.locator('.el-message:has-text("已标记为已处理")').first()).toBeVisible();
  const closeBtn = dialog.locator('.el-dialog__headerbtn');
  if (await closeBtn.isVisible().catch(() => false)) await closeBtn.click();
  await expect(dialog).toBeHidden();

  // 英文询盘：同样标记
  await enRow.locator('.ops .link:has-text("查看")').click();
  await expect(dialog).toBeVisible();
  await dialog.locator('button:has-text("标记为已处理")').click();
  await expect(page.locator('.el-message:has-text("已标记为已处理")').first()).toBeVisible();
  if (await dialog.locator('.el-dialog__headerbtn').isVisible().catch(() => false)) {
    await dialog.locator('.el-dialog__headerbtn').click();
  }
  await expect(dialog).toBeHidden();

  // 未处理统计递减 2；行内状态变为「标记未处理」（已处理态）
  await expect.poll(async () => pendingCount(page)).toBe(before - 2);
  await expect(zhRow.locator('.ops .link:has-text("标记未处理")')).toBeVisible();
});

test('A7 页面内容配置：页脚版权修改→官网即时生效→恢复', async ({ page }) => {
  const M = getRun().M;
  await adminLogin(page, MAIN_ADMIN_PHONE, MAIN_ADMIN_PASSWORD, true);
  const backup = JSON.parse(readFileSync(PAGE_CONTENT_BACKUP, 'utf8')) as Record<string, { copyrightZh?: string }>;
  const original = backup.footer_info?.copyrightZh ?? '';

  // 修改版权文字并保存
  await page.goto(`${ADMIN}/admin/pages`);
  await page.locator('.pk:has-text("页脚信息")').click();
  const copyrightInput = page.locator('.form-group:has-text("版权文字（中文）") input').first();
  await copyrightInput.fill(M.footer);
  await page.locator('button:has-text("保存")').first().click();
  await expect(page.locator('.el-message:has-text("已保存")').first()).toBeVisible();

  // 官网页脚即时生效（页脚为 .site-footer 容器；footer_info 缓存刷新链路）
  await expectSiteContains(page, `${SITE}/zh-CN`, M.footer);

  // 恢复原文（teardown 亦有兜底恢复）
  await page.goto(`${ADMIN}/admin/pages`);
  await page.locator('.pk:has-text("页脚信息")').click();
  await page.locator('.form-group:has-text("版权文字（中文）") input').first().fill(original);
  await page.locator('button:has-text("保存")').first().click();
  await expect(page.locator('.el-message:has-text("已保存")').first()).toBeVisible();
  await expectSiteContains(page, `${SITE}/zh-CN`, M.footer, { negative: true });
});

test('A8 账号变更：改密后强制退出/新密码登录/旧密码失效', async ({ page }) => {
  const { phone } = getRun();
  // 专用测试管理员登录（global-setup 创建）
  await adminLogin(page, phone, TEST_ADMIN_PASSWORD, true);

  // 修改密码（右卡「修改密码」面板）
  await page.goto(`${ADMIN}/admin/account`);
  const pwdPanel = page.locator('.panel').nth(1);
  await expect(pwdPanel.locator('.p-head')).toContainText('修改密码');
  await pwdPanel.locator('input[placeholder="请输入当前密码"]').fill(TEST_ADMIN_PASSWORD);
  await pwdPanel.locator('input[placeholder*="8 位"]').fill(TEST_ADMIN_NEW_PASSWORD);
  await pwdPanel.locator('input[placeholder="请再次输入新密码"]').fill(TEST_ADMIN_NEW_PASSWORD);
  await pwdPanel.locator('button:has-text("提交修改")').click();
  await expect(page.locator('.el-message:has-text("密码修改成功")').first()).toBeVisible();

  // 改密后强制退出（产品行为：重新登录）
  try {
    await page.waitForURL('**/admin/login', { timeout: 10_000 });
  } catch {
    await page.goto(`${ADMIN}/admin/login`);
  }

  // 新密码登录成功 → 手动退出
  await adminLogin(page, phone, TEST_ADMIN_NEW_PASSWORD, true);
  await page.locator('button:has-text("退出")').click();
  await page.waitForURL('**/admin/login');

  // 旧密码失效
  await adminLogin(page, phone, TEST_ADMIN_PASSWORD, false);
  await expect(page).toHaveURL(/\/admin\/login/);
});
