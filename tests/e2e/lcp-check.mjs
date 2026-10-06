// 任务 4.3 性能自检：官网 LCP ≤2.5s（先预热去 dev 编译噪声，再以 PerformanceObserver 实测）
// 用法：在 tests/e2e 目录 node lcp-check.mjs [SITE_URL]
import { chromium } from 'playwright';
import { execSync } from 'node:child_process';

const SITE = process.argv[2] ?? 'http://localhost:3999';

const q = (sql) =>
  execSync(
    `docker exec pingyangsite-mysql mysql -uroot -proot123456 pingyangsite -N -e "${sql}" 2>/dev/null`,
    { encoding: 'utf8' },
  ).trim();

const productId = q("SELECT id FROM products WHERE status=1 AND deleted_at IS NULL ORDER BY id LIMIT 1");
const categoryId = q("SELECT id FROM categories WHERE status=1 ORDER BY id LIMIT 1");

const pages = [
  ['首页 zh', `/zh-CN`],
  ['首页 en', `/en`],
  ['产品详情 zh', `/zh-CN/products/${productId}`],
  ['类目详情 zh', `/zh-CN/categories/${categoryId}`],
  ['新闻列表 zh', `/zh-CN/news`],
  ['联系我们 zh', `/zh-CN/contact`],
];

const browser = await chromium.launch();
const page = await browser.newPage();
await page.addInitScript(() => {
  window.__lcp = 0;
  new PerformanceObserver((list) => {
    const last = list.getEntries().pop();
    if (last) window.__lcp = last.startTime;
  }).observe({ type: 'largest-contentful-paint', buffered: true });
});

let fail = false;
for (const [label, url] of pages) {
  await page.goto(`${SITE}${url}`, { waitUntil: 'networkidle' }); // 预热（dev 首次编译）
  await page.goto(`${SITE}${url}`, { waitUntil: 'networkidle' });
  const lcp = await page.evaluate(() => window.__lcp);
  const ok = lcp <= 2500;
  if (!ok) fail = true;
  console.log(`${ok ? '✓' : '✗'} ${label.padEnd(12, '　')} LCP=${(lcp / 1000).toFixed(2)}s  (${SITE}${url})`);
}
await browser.close();
console.log(fail ? 'RESULT: FAIL' : 'RESULT: ALL PASS（LCP ≤ 2.5s，计划 §4.3）');
process.exit(fail ? 1 : 0);
