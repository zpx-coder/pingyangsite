// 新闻详情页（任务 2.8，PRD §6.7）：面包屑 → 居中标题 + 发布时间 → 富文本正文 →
// 上一篇/下一篇切换 + 返回列表（设计稿 news-detail 无横幅，与 ui.html 一致）。
// 数据：公开新闻详情接口（未发布/未到时间/已删除 404，prev/next 为列表序邻位）。
import type { Metadata } from 'next';
import { cache } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import Reveal from '@/components/motion/reveal';
import { formatNewsDate, getApi, pickLang, type PublicNewsDetail } from '@/lib/api';
import { dict, isLang } from '@/lib/i18n';
import { buildMetadata } from '@/lib/seo';

// cache 保证 generateMetadata 与页面渲染同一请求内只取一次详情
const getNews = cache((id: number) => getApi<PublicNewsDetail>(`/api/v1/public/news/${id}`));

// 新闻详情 TDK：实体标题 + 摘要（任务 2.10）；取数失败回退站点默认，页面本身仍走 404 兜底
export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string; id: string }>;
}): Promise<Metadata> {
  const { lang: rawLang, id: rawId } = await params;
  if (!isLang(rawLang)) return {};
  const lang = rawLang;
  const id = Number.parseInt(rawId, 10);
  if (!Number.isInteger(id) || id < 1) return buildMetadata(lang);
  const news = await getNews(id).catch(() => null);
  if (!news) return buildMetadata(lang);
  return buildMetadata(lang, {
    title: pickLang(lang, news.titleZh, news.titleEn),
    description: pickLang(lang, news.summaryZh, news.summaryEn).slice(0, 200),
    path: `news/${id}`,
  });
}

export default async function NewsDetailPage({
  params,
}: {
  params: Promise<{ lang: string; id: string }>;
}) {
  const { lang: rawLang, id: rawId } = await params;
  if (!isLang(rawLang)) {
    return null; // [lang] 布局已做非法语言 404 兜底
  }
  const lang = rawLang;
  const t = dict[lang];

  const id = Number.parseInt(rawId, 10);
  if (!Number.isInteger(id) || id < 1) {
    notFound();
  }

  const news = await getNews(id).catch(() => null);
  if (!news) {
    notFound(); // 未发布 / 未到时间 / 已删除 / 不存在：后端 404，页面按不存在处理
  }

  const title = pickLang(lang, news.titleZh, news.titleEn);
  const content = pickLang(lang, news.contentZh, news.contentEn);

  return (
    <div className="container page-body">
      <div className="crumb container" style={{ padding: '16px 0 0' }}>
        <Link href={`/${lang}`}>{t.nav.home}</Link>
        <span className="sep">›</span>
        <Link href={`/${lang}/news`}>{t.news.banner}</Link>
        <span className="sep">›</span>
        <span className="cur">{title}</span>
      </div>

      <Reveal className="article-head">
        <h1>{title}</h1>
        <div className="meta">
          {t.news.publishedAt}：<b>{formatNewsDate(news.publishTime)}</b>
        </div>
      </Reveal>

      <Reveal className="article-body">
        {/* 后台富文本（管理员受信输入，录入端校验）；段落与图片样式见 .rich-content */}
        <div className="rich-content" dangerouslySetInnerHTML={{ __html: content }} />
      </Reveal>

      {/* 上一篇/下一篇（列表序邻位，两端为空置灰）+ 返回列表（PRD §6.7） */}
      <div className="news-nav">
        {news.prev ? (
          <Link className="nv" href={`/${lang}/news/${news.prev.id}`}>
            ‹ {t.news.prevNews}
          </Link>
        ) : (
          <span className="nv dis">‹ {t.news.prevNews}</span>
        )}
        <Link className="btn btn-ghost btn-sm" href={`/${lang}/news`}>
          {t.news.backToList}
        </Link>
        {news.next ? (
          <Link className="nv" href={`/${lang}/news/${news.next.id}`}>
            {t.news.nextNews} ›
          </Link>
        ) : (
          <span className="nv dis">{t.news.nextNews} ›</span>
        )}
      </div>
    </div>
  );
}
