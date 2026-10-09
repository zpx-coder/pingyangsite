// 首页新闻热点区（PRD §6.1）：最新 4 条已发布新闻（置顶优先，后端已排），
// 封面 + 日期徽标 + 标题 + 摘要；「更多新闻」进入 /news。
import Link from 'next/link';
import Reveal from '../motion/reveal';
import { formatNewsDate, pickLang, type PublicNews } from '../../lib/api';
import type { Dict, Lang } from '../../lib/i18n';
import { mediaUrl } from '@/lib/paths';

export default function NewsSection({ news, lang, t }: { news: PublicNews[]; lang: Lang; t: Dict }) {
  if (news.length === 0) return null;
  return (
    <div className="section" style={{ background: 'var(--warm2)' }}>
      <div className="container">
        <Reveal className="sec-head">
          <div className="kicker">{t.home.secNews.kicker}</div>
          <h2>{t.home.secNews.title}</h2>
          <p>{t.home.secNews.desc}</p>
        </Reveal>
        <div className="news-grid">
          {news.slice(0, 4).map((item, i) => (
            <Reveal key={item.id} delay={(i % 4) + 1} className="news-card">
              <Link href={`/${lang}/news/${item.id}`}>
                <div className="im">
                  {item.coverUrl && <img src={mediaUrl(item.coverUrl)} alt="" />}
                  <span className="date">{formatNewsDate(item.publishTime)}</span>
                </div>
                <div className="bd">
                  <h4>{pickLang(lang, item.titleZh, item.titleEn)}</h4>
                  <p>{pickLang(lang, item.summaryZh, item.summaryEn)}</p>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
        <div style={{ textAlign: 'center', marginTop: 44 }}>
          <Link className="btn btn-ghost" href={`/${lang}/news`}>
            {t.home.secNews.more} →
          </Link>
        </div>
      </div>
    </div>
  );
}
