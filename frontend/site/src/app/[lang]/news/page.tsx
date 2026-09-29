// 新闻列表页（任务 2.8，PRD §6.6）：横幅（新闻动态）→ 面包屑 → 置顶大卡 + 三列网格（12/页分页）。
// 数据：公开新闻列表接口（仅已发布且到达发布时间，置顶优先 + 发布时间倒序，后端已排）。
import Link from 'next/link';
import NewsList from '@/components/news/news-list';
import { getApi, type Paged, type PublicNews } from '@/lib/api';
import { dict, isLang } from '@/lib/i18n';

// 横幅回退图为设计稿静态素材（方案 §4.5 素材规范，本地化存储）
const NEWS_BANNER = '/img/n4.jpg';

export default async function NewsPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang: rawLang } = await params;
  if (!isLang(rawLang)) {
    return null; // [lang] 布局已做非法语言 404 兜底
  }
  const lang = rawLang;
  const t = dict[lang];

  const data = await getApi<Paged<PublicNews>>('/api/v1/public/news?page=1&pageSize=12').catch(() => null);

  return (
    <>
      <div className="page-banner" style={{ height: 242 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={NEWS_BANNER} alt="" />
        <div className="container">
          <h1>{t.news.banner}</h1>
        </div>
      </div>
      <div className="container page-body">
        <div className="crumb container" style={{ padding: '16px 0 0' }}>
          <Link href={`/${lang}`}>{t.nav.home}</Link>
          <span className="sep">›</span>
          <span className="cur">{t.news.banner}</span>
        </div>
        {/* 接口失败或空列表由组件内空状态兜底，页面不报错 */}
        <NewsList lang={lang} initial={data ?? { page: 1, pageSize: 12, total: 0, list: [] }} />
      </div>
    </>
  );
}
