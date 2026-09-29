// 全站 SEO 元数据工具（任务 2.10，PRD §9.3）：统一生成 title/description/keywords、
// canonical 与双语 hreflang（zh-CN / en / x-default 互指）。
// SITE_URL 由环境变量注入（阶段 5 部署时替换为正式域名），本地开发默认回退本机地址。
import type { Metadata } from 'next';
import { dict, type Lang } from './i18n';

/** 站点对外绝对地址前缀（sitemap / canonical / hreflang 使用） */
export const SITE_URL = (process.env.SITE_URL ?? 'http://localhost:3999').replace(/\/+$/, '');

/** 页面级 ISR 重验证周期（秒），与 getApi 的 fetch 级 revalidate 保持一致 */
export const PAGE_REVALIDATE_SECONDS = 60;

/** 组装某语言下的绝对 URL：path 为站点内相对路径（'' 为首页），首尾斜杠自动规整 */
export function langUrl(lang: Lang, path: string): string {
  const trimmed = path.replace(/^\/+|\/+$/g, '');
  return trimmed ? `${SITE_URL}/${lang}/${trimmed}` : `${SITE_URL}/${lang}`;
}

/** 按语言生成页面 Metadata：标题/描述为空时回退站点默认；path 缺省为首页 */
export function buildMetadata(
  lang: Lang,
  { title, description, keywords, path }: { title?: string; description?: string; keywords?: string; path?: string } = {},
): Metadata {
  const t = dict[lang];
  const seoTitle = title?.trim() ? `${title.trim()} - ${t.seo.site}` : t.seo.defaultTitle;
  const seoDescription = description?.trim() ? description : t.seo.defaultDescription;
  const url = langUrl(lang, path ?? '');
  return {
    title: seoTitle,
    description: seoDescription,
    keywords: keywords?.trim() ? keywords : t.seo.defaultKeywords,
    alternates: {
      canonical: url,
      languages: {
        'zh-CN': langUrl('zh-CN', path ?? ''),
        en: langUrl('en', path ?? ''),
        // hreflang x-default：无语言偏好的爬虫回退到中文版
        'x-default': langUrl('zh-CN', path ?? ''),
      },
    },
  };
}
