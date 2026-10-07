import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { getRun, SEED_FILE, SITE } from '../helpers/run-data';
import { readCaptcha } from '../helpers/admin-utils';

/** 官网核心旅程：双语切换全站 + 404 边界 + 询盘提交链路（01-* 先于 02-admin 执行） */

interface Seed {
  product: { id: number; nameZh: string; nameEn: string };
  company: { id: number; nameZh: string; nameEn: string };
  news: { id: number; titleZh: string; titleEn: string };
  category: { id: number; nameZh: string; nameEn: string };
}
/** 惰性读取（global-setup 写入；顶层读取会破坏 playwright --list） */
const seed = (): Seed => JSON.parse(readFileSync(SEED_FILE, 'utf8')) as Seed;

/** 断言指定 URL 返回设计好的 404 页 */
async function expectDesigned404(page: Page, url: string): Promise<void> {
  const resp = await page.goto(url);
  expect(resp?.status()).toBe(404);
  await expect(page.locator('.not-found')).toBeVisible();
  await expect(page.locator('.not-found')).toContainText('404');
}

/** 填写并提交询盘表单（双语通用） */
async function submitInquiry(
  page: Page,
  lang: 'zh-CN' | 'en',
  marker: string,
  successText: string,
): Promise<void> {
  await page.goto(`${SITE}/${lang}/products/${seed().product.id}`);
  await page.locator('#inq-name').fill(lang === 'zh-CN' ? 'E2E客户' : 'E2E Customer');
  await page.locator('#inq-company').fill(lang === 'zh-CN' ? 'E2E客户公司' : 'E2E Customer Co.');
  // 国家：跳过占位选项，取第一个实际国家（中英文文案兼容）
  const optionTexts = await page.locator('#inq-country option').allTextContents();
  const idx = optionTexts.findIndex((t) => /中国|China/i.test(t.trim()));
  await page.locator('#inq-country').selectOption({ index: idx >= 0 ? idx : 1 });
  await page.locator('#inq-email').fill('e2e@example.com');
  await page.locator('#inq-phone').fill('13800009999');
  await page.locator('#inq-content').fill(marker);
  await page.locator('#inq-captcha').fill(await readCaptcha(page));
  await page.locator('form button[type=submit]').click();
  await expect(page.locator('.modal-mask')).toBeVisible();
  await expect(page.locator('.modal-mask')).toContainText(successText);
}

test('S1 首页双语切换与语言属性', async ({ page }) => {
  await page.goto(`${SITE}/zh-CN`);
  await expect(page.locator('html')).toHaveAttribute('lang', 'zh-CN');
  await expect(page.locator('h1, .hero-title').first()).not.toBeEmpty();
  // 类目区块标题必须真实可见（textContent 断言查不出 .rv 未触发 is-in 的 opacity:0 隐藏，4.4 后回归）
  await page.locator('#sec-cat').scrollIntoViewIfNeeded();
  await expect(page.locator('#sec-cat h2:has-text("平阳特色产业类目")')).toBeVisible();
  // 语言切换器为 .lang-pill 内 <b> 文本项（非 <a> 链接）；
  // SPA 切换即同步 <html lang>（切换器客户端修正，任务 4.4 缺陷修复）
  await page.locator('.lang-pill b:has-text("EN")').click();
  await page.waitForURL(/\/en/);
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.locator('h1, .hero-title').first()).not.toBeEmpty();
});

test('S2 产品详情双语展示', async ({ page }) => {
  await page.goto(`${SITE}/zh-CN/products/${seed().product.id}`);
  await expect(page.locator('html')).toHaveAttribute('lang', 'zh-CN');
  await expect(page.locator('body')).toContainText(seed().product.nameZh);
  await page.goto(`${SITE}/en/products/${seed().product.id}`);
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.locator('body')).toContainText(seed().product.nameEn);
});

test('S3 企业详情双语展示', async ({ page }) => {
  await page.goto(`${SITE}/zh-CN/companies/${seed().company.id}`);
  await expect(page.locator('html')).toHaveAttribute('lang', 'zh-CN');
  await expect(page.locator('body')).toContainText(seed().company.nameZh);
  await page.goto(`${SITE}/en/companies/${seed().company.id}`);
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.locator('body')).toContainText(seed().company.nameEn);
});

test('S4 新闻列表与详情双语', async ({ page }) => {
  await page.goto(`${SITE}/zh-CN/news`);
  const firstLink = page.locator('a[href*="/news/"]').first();
  await expect(firstLink).toBeVisible();
  await firstLink.click();
  await page.waitForURL(/\/(zh-CN|en)\/news\/\d+/);
  await expect(page.locator('body')).toContainText(seed().news.titleZh);
  await page.goto(`${SITE}/en/news`);
  await expect(page.locator('a[href*="/news/"]').first()).toBeVisible();
});

test('S5 非法语言段与不存在详情返回设计 404', async ({ page }) => {
  await expectDesigned404(page, `${SITE}/fr/products/1`);
  await expectDesigned404(page, `${SITE}/zh-CN/products/999999999`);
});

test('S6 中文询盘提交成功（后台 A6 消费）', async ({ page }) => {
  await submitInquiry(page, 'zh-CN', getRun().M.inquiryZh, '感谢您的关注');
});

test('S7 英文询盘提交成功（后台 A6 消费）', async ({ page }) => {
  await submitInquiry(page, 'en', getRun().M.inquiryEn, 'Thank you for your interest');
});
