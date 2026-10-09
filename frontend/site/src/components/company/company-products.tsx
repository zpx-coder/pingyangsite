'use client';

// 企业详情页产品区（PRD §6.5）：该企业全部已发布产品，每页 12 条分页。
// 第 1 页随企业详情服务端预取（SSR 可见），翻页走客户端 fetch 企业详情接口的分页参数。
import { useState } from 'react';
import Link from 'next/link';
import Reveal from '@/components/motion/reveal';
import { pickLang, type Paged, type PublicCompanyProduct } from '@/lib/api';
import { dict, type Lang } from '@/lib/i18n';
import { pageNumbers } from '@/lib/pagination';
import { browserPath, mediaUrl } from '@/lib/paths';

const PAGE_SIZE = 12;

export default function CompanyProducts({
  lang,
  companyId,
  initial,
}: {
  lang: Lang;
  companyId: number;
  initial: Paged<PublicCompanyProduct>;
}) {
  const t = dict[lang].company;
  const [data, setData] = useState(initial);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const totalPages = Math.max(1, Math.ceil(data.total / PAGE_SIZE));

  const fetchPage = async (targetPage: number) => {
    setLoading(true);
    setError(false);
    try {
      const url = browserPath(`/api/v1/public/companies/${companyId}?page=${targetPage}&pageSize=${PAGE_SIZE}`);
      const res = await fetch(url, {
        cache: 'no-store',
      });
      if (!res.ok) {
        throw new Error(`API HTTP ${res.status}`);
      }
      const body = (await res.json()) as {
        code: number;
        data: { products: Paged<PublicCompanyProduct> };
      };
      if (body.code !== 0) {
        throw new Error('API business error');
      }
      setData(body.data.products);
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

  if (data.list.length === 0 && !error) {
    return (
      <div className="empty">
        <div className="ico">✦</div>
        <p>{t.noProducts}</p>
      </div>
    );
  }

  return (
    <>
      <div className={loading ? 'tabs-zone loading' : 'tabs-zone'}>
        {error ? (
          <div className="empty">
            <p>{dict[lang].category.loadError}</p>
          </div>
        ) : (
          <div className="prod-grid">
            {data.list.map((product, i) => (
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
                    <div className="pr">
                      {product.priceRef && <span className="price">{product.priceRef}</span>}
                      {product.moq && <span className="moq">{dict[lang].category.moqPrefix}{product.moq}</span>}
                    </div>
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
