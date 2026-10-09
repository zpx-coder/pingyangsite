'use client';

// 类目页双标签列表（PRD §6.3）：产品/企业切换 + 每页 12 条分页。
// 首屏两 Tab 第 1 页由服务端预取注入（SSR 可见），翻页走客户端 fetch（经 next rewrites 同域代理）。
import { useState } from 'react';
import Link from 'next/link';
import Reveal from '@/components/motion/reveal';
import { pickLang, type Paged, type PublicCompany, type PublicProductCard } from '@/lib/api';
import { dict, type Lang } from '@/lib/i18n';
import { pageNumbers } from '@/lib/pagination';
import { browserPath, mediaUrl } from '@/lib/paths';

const PAGE_SIZE = 12;

// 企业 Logo 缺失时的字标底色（与设计稿 logo-mark 三色轮换一致）
const MARK_COLORS = ['#336065', '#28484C', '#A9713D'];

export default function CategoryTabs({
  lang,
  categoryId,
  products,
  companies,
}: {
  lang: Lang;
  categoryId: number;
  products: Paged<PublicProductCard>;
  companies: Paged<PublicCompany>;
}) {
  const t = dict[lang].category;
  const [tab, setTab] = useState<'products' | 'companies'>('products');
  const [data, setData] = useState({ products, companies });
  const [page, setPage] = useState({ products: 1, companies: 1 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const current = data[tab];
  const totalPages = Math.max(1, Math.ceil(current.total / PAGE_SIZE));

  const fetchPage = async (target: typeof tab, targetPage: number) => {
    setLoading(true);
    setError(false);
    try {
      const path =
        target === 'products' ? '/api/v1/public/products' : '/api/v1/public/companies';
      const url = browserPath(`${path}?categoryId=${categoryId}&page=${targetPage}&pageSize=${PAGE_SIZE}`);
      const res = await fetch(url, {
        cache: 'no-store',
      });
      if (!res.ok) {
        throw new Error(`API HTTP ${res.status}`);
      }
      const body = (await res.json()) as { code: number; data: Paged<PublicProductCard> | Paged<PublicCompany> };
      if (body.code !== 0) {
        throw new Error('API business error');
      }
      setData((prev) => ({ ...prev, [target]: body.data }));
      setPage((prev) => ({ ...prev, [target]: targetPage }));
    } catch {
      // 翻页失败保留当前数据并提示，避免静默失败
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const goPage = (n: number) => {
    if (n === page[tab] || n < 1 || n > totalPages) {
      return;
    }
    fetchPage(tab, n);
  };

  return (
    <>
      <Reveal className="tabs">
        <button type="button" className={tab === 'products' ? 'on' : ''} onClick={() => setTab('products')}>
          {t.tabProducts}
        </button>
        <button type="button" className={tab === 'companies' ? 'on' : ''} onClick={() => setTab('companies')}>
          {t.tabCompanies}
        </button>
      </Reveal>

      <div className={loading ? 'tabs-zone loading' : 'tabs-zone'}>
        {error ? (
          <div className="empty">
            <p>{t.loadError}</p>
          </div>
        ) : current.list.length === 0 ? (
          <div className="empty">
            <div className="ico">✦</div>
            <p>{tab === 'products' ? t.noProducts : t.noCompanies}</p>
          </div>
        ) : tab === 'products' ? (
          <div className="prod-grid">
            {(current.list as PublicProductCard[]).map((product, i) => (
              <Reveal key={product.id} delay={(i % 4) + 1} className="prod-card">
                <Link href={`/${lang}/products/${product.id}`} style={{ display: 'block' }}>
                  <div className="im">
                    {product.mainImage && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={mediaUrl(product.mainImage)} alt="" />
                    )}
                  </div>
                  <div className="bd">
                    <h4>{pickLang(lang, product.nameZh, product.nameEn)}</h4>
                    <div className="co">
                      {product.company ? pickLang(lang, product.company.nameZh, product.company.nameEn) : t.unlinkedCompany}
                    </div>
                    <div className="pr">
                      {product.priceRef && <span className="price">{product.priceRef}</span>}
                      {product.moq && <span className="moq">{t.moqPrefix}{product.moq}</span>}
                    </div>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        ) : (
          <div className="comp-grid">
            {(current.list as PublicCompany[]).map((company, i) => (
              <Reveal key={company.id} delay={(i % 2) + 1} className="comp-card">
                <Link href={`/${lang}/companies/${company.id}`} style={{ display: 'flex', gap: 18, flex: 1 }}>
                  {company.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img className="logo-img" src={mediaUrl(company.logoUrl)} alt="" />
                  ) : (
                    <div className="logo-mark" style={{ background: MARK_COLORS[company.id % MARK_COLORS.length] }}>
                      {/* 字标取品牌名首字：企业名通常带地域前缀（温州/浙江…），跳过前缀取第 3 字，与设计稿一致 */}
                      {company.nameZh.length > 2 ? company.nameZh.charAt(2) : company.nameZh.charAt(0)}
                    </div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h4>{pickLang(lang, company.nameZh, company.nameEn)}</h4>
                    <div className="en">{company.nameEn}</div>
                    <p>{(pickLang(lang, company.introZh, company.introEn) || '').slice(0, 52)}…</p>
                    <div className="tags">
                      {company.categories.map((category) => (
                        <span key={category.id} className="chip">
                          {pickLang(lang, category.nameZh, category.nameEn)}
                        </span>
                      ))}
                    </div>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        )}
      </div>

      {!error && current.total > PAGE_SIZE && (
        <div className="pagination">
          <span className={page[tab] <= 1 ? 'dis' : ''} onClick={() => goPage(page[tab] - 1)} aria-label="prev">
            ‹
          </span>
          {pageNumbers(page[tab], totalPages).map((n, i) =>
            n === '…' ? (
              <span key={`e${i}`} className="dots">
                …
              </span>
            ) : (
              <span key={n} className={n === page[tab] ? 'on' : ''} onClick={() => goPage(n)}>
                {n}
              </span>
            ),
          )}
          <span className={page[tab] >= totalPages ? 'dis' : ''} onClick={() => goPage(page[tab] + 1)} aria-label="next">
            ›
          </span>
        </div>
      )}
    </>
  );
}
