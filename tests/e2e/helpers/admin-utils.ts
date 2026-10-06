import { expect, type Page } from '@playwright/test';
import { ADMIN, API } from './run-data';

/** 后台登录（成功时等待跳转 /admin/inquiries；失败时等待错误提示出现） */
export async function adminLogin(
  page: Page,
  phone: string,
  password: string,
  expectSuccess: boolean,
): Promise<void> {
  await page.goto(`${ADMIN}/admin/login`);
  const inputs = page.locator('.login-card input');
  await inputs.nth(0).fill(phone);
  await inputs.nth(1).fill(password);
  await page.locator('.login-card button[type=submit]').click();
  if (expectSuccess) {
    await page.waitForURL('**/admin/inquiries');
  } else {
    await expect(page.locator('.el-message').first()).toBeVisible();
  }
}

/** 读取询盘表单验证码（SVG 文本节点拼接，4 个字符；等待字符渲染完成） */
export async function readCaptcha(page: Page): Promise<string> {
  const svg = page.locator('.captcha-box svg');
  await expect(svg).toBeVisible();
  await expect.poll(async () => (await svg.locator('text').allTextContents()).join('').length)
    .toBeGreaterThanOrEqual(4);
  return (await svg.locator('text').allTextContents()).join('');
}

/** 通过后台会话（page.request 共享 cookie）按名称查列表记录 id（轮询等待索引可见）。
 *  走 vite 代理（ADMIN 源）而非直连 API：会话 cookie 域为 :5173，直连 :3001 不带 cookie（401）。 */
export async function findAdminId(
  page: Page,
  listPath: string,
  keyword: string,
  field: 'nameZh' | 'titleZh',
): Promise<number | null> {
  for (let i = 0; i < 20; i++) {
    const resp = await page.request.get(`${ADMIN}/api/v1/admin/${listPath}?keyword=${encodeURIComponent(keyword)}`);
    if (!resp.ok()) throw new Error(`后台列表接口异常: ${resp.status()} ${listPath}`);
    const body = (await resp.json()) as { data?: { list?: unknown[]; items?: unknown[] } };
    const items = (body.data?.list ?? body.data?.items ?? []) as Array<Record<string, unknown>>;
    const hit = items.find((it) => it[field] === keyword);
    if (hit) return Number(hit.id);
    await new Promise((r) => setTimeout(r, 1000));
  }
  return null;
}

/** 查询公开接口（用于断言英文自动翻译结果与站点 404 依据） */
export async function getPublic(page: Page, kind: string, id: number | string): Promise<Record<string, unknown>> {
  const resp = await page.request.get(`${API}/api/v1/public/${kind}/${id}`);
  if (!resp.ok()) throw new Error(`公开接口异常: ${resp.status()} ${kind}/${id}`);
  const body = (await resp.json()) as { data?: Record<string, unknown> };
  return body.data ?? {};
}

/** 断言官网页面最终包含/不包含指定文本。
 *  官网 ISR 页面缓存最长 60s（后台修改后站点可能短暂读旧数据），
 *  故轮询刷新直到内容稳定；negative 用于「恢复原状」类断言。 */
export async function expectSiteContains(
  page: Page,
  url: string,
  text: string,
  options: { negative?: boolean; timeout?: number } = {},
): Promise<void> {
  const { negative = false, timeout = 90_000 } = options;
  await page.goto(url);
  const poll = expect.poll(
    async () => {
      await page.reload();
      return (await page.locator('body').textContent()) ?? '';
    },
    { timeout, message: `官网 ${url} ${negative ? '不应' : '应'}包含「${text}」` },
  );
  if (negative) await poll.not.toContain(text);
  else await poll.toContain(text);
}
