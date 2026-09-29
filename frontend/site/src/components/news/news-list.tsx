'use client';

// 新闻列表（PRD §6.6）：置顶大卡（第 1 页首条，符合设计稿 news-feat）+ 三列网格 + 每页 12 条分页。
// 第 1 页随页面服务端预取（SSR 可见），翻页走客户端 fetch 新闻列表接口的分页参数。
import { useState } from 'react';
import Link from 'next/link';
import Reveal from '@/components/motion/reveal';
import { formatNewsDate, pickLang, type Paged, type PublicNews } from '@/lib/api';
import { dict, type Lang } from '@/lib/i18n';
import { pageNumbers } from '@/lib/pagination';

const PAGE_SIZE = 12;

export default function NewsList({ lang, initial }: { lang: Lang; initial: Paged<PublicNews> }) {
  const t = dict[lang].news;
  const [data, setData] = useState(initial);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const totalPages = Math.max(1, Math.ceil(data.total / PAGE_SIZE));

  const fetchPage = async (targetPage: number) => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch(`/api/v1/public/news?page=${targetPage}&pageSize=${PAGE_SIZE}`, {
        cache: 'no-store',
      });
      if (!res.ok) {
        throw new Error(`API HTTP ${res.status}`);
      }
      const body = (await res.json()) as { code: number; data: Paged<PublicNews> };
      if (body.code !== 0) {
        throw new Error('API business error');
      }
      setData(body.data);
      setPage(targetPage);
    } catch {
      // 翻页失败保留当前数据并提示，避免静默失败
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const goPage = (n: number) => {
    if (n === page || n < 1 || n > totalPages) {
      return;
    }
    fetchPage(n);
  };

  // 第 1 页首条为置顶大卡（列表按 置顶优先→发布时间倒序，首条即最靠前新闻），其余进三列网格
  const featured = page === 1 ? data.list[0] : null;
  const gridItems = featured ? data.list.slice(1) : data.list;

  if (data.list.length === 0 && !error) {
    return (
      <div className="empty">
        <div className="ico">✦</div>
        <p>{t.noNews}</p>
      </div>
    );
  }

  return (
    <>
      {featured && (
        <Reveal className="news-feat" style={{ marginTop: 20 }}>
          <Link href={`/${lang}/news/${featured.id}`} style={{ display: 'contents' }}>
            <div className="im">
              {featured.coverUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={featured.coverUrl} alt="" />
              )}
            </div>
            <div className="bd">
              <div className="date">
                {featured.isTop && <span className="badge-top">{t.topTag}</span>}
                {formatNewsDate(featured.publishTime)}
              </div>
              <h3>{pickLang(lang, featured.titleZh, featured.titleEn)}</h3>
              <p>{pickLang(lang, featured.summaryZh, featured.summaryEn)}</p>
            </div>
          </Link>
        </Reveal>
      )}

      <div className={loading ? 'tabs-zone loading' : 'tabs-zone'}>
        {error ? (
          <div className="empty">
            <p>{t.loadError}</p>
          </div>
        ) : (
          <div className="news-list2">
            {gridItems.map((item, i) => (
              <Reveal key={item.id} delay={(i % 3) + 1} className="news-card">
                <Link href={`/${lang}/news/${item.id}`}>
                  <div className="im">
                    {item.coverUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.coverUrl} alt="" />
                    )}
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
        )}
      </div>

      {!error && data.total > PAGE_SIZE && (
        <div className="pagination">
          <span className={page <= 1 ? 'dis' : ''} onClick={() => goPage(page - 1)} aria-label="prev">
            ‹
          </span>
          {pageNumbers(page, totalPages).map((n, i) =>
            n === '…' ? (
              <span key={`e${i}`} className="dots">
                …
              </span>
            ) : (
              <span key={n} className={n === page ? 'on' : ''} onClick={() => goPage(n)}>
                {n}
              </span>
            ),
          )}
          <span className={page >= totalPages ? 'dis' : ''} onClick={() => goPage(page + 1)} aria-label="next">
            ›
          </span>
        </div>
      )}
    </>
  );
}
