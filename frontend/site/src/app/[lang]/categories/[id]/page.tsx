// 产业类目页（任务 2.5，PRD §6.3）：横幅 + 简介与数量 + 产品/企业双标签列表（各 12/页）。
// 数据：公开类目列表定位类目（上架才可见），产品/企业第 1 页服务端预取；下架或不存在类目 404。
import type { Metadata } from 'next';
import { cache } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import CategoryTabs from '@/components/category/category-tabs';
import Reveal from '@/components/motion/reveal';
import { getApi, pickLang, type Paged, type PublicCategory, type PublicCompany, type PublicProductCard } from '@/lib/api';
import { dict, isLang } from '@/lib/i18n';
import { buildMetadata } from '@/lib/seo';

const PAGE_SIZE = 12;

// cache 保证 generateMetadata 与页面渲染同一请求内只取一次类目列表
const getCategories = cache(() => getApi<PublicCategory[]>('/api/v1/public/categories'));

// 类目页 TDK：类目名 + 简介（任务 2.10）；类目不存在时回退站点默认，页面本身仍走 404 兜底
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
  const categories = await getCategories().catch(() => null);
  const category = categories?.find((item) => item.id === id);
  if (!category) return buildMetadata(lang);
  return buildMetadata(lang, {
    title: pickLang(lang, category.nameZh, category.nameEn),
    description: pickLang(lang, category.introZh, category.introEn).slice(0, 200),
    path: `categories/${id}`,
  });
}

export default async function CategoryPage({
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

  const [categories, products, companies] = await Promise.all([
    getCategories().catch(() => null),
    getApi<Paged<PublicProductCard>>(`/api/v1/public/products?categoryId=${id}&page=1&pageSize=${PAGE_SIZE}`).catch(
      () => null,
    ),
    getApi<Paged<PublicCompany>>(`/api/v1/public/companies?categoryId=${id}&page=1&pageSize=${PAGE_SIZE}`).catch(
      () => null,
    ),
  ]);

  // 公开类目列表仅返回上架类目：找不到即视为不存在（PRD §6.3 仅展示上架类目）
  const category = categories?.find((item) => item.id === id);
  if (!category) {
    notFound();
  }

  const bannerImage = category.iconUrl?.trim();
  const intro = pickLang(lang, category.introZh, category.introEn);
  const productTotal = products?.total ?? 0;
  const companyTotal = companies?.total ?? 0;

  return (
    <>
      <div className="page-banner" style={{ height: 210 }}>
        {bannerImage && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={bannerImage} alt="" />
        )}
        <div className="container">
          <h1 style={{ fontSize: 32 }}>
            {pickLang(lang, category.nameZh, category.nameEn)}
            <span style={{ fontSize: 15, color: 'var(--gold-2)', letterSpacing: 3, marginLeft: 10 }}>
              {category.nameEn}
            </span>
          </h1>
        </div>
      </div>
      <div className="container page-body">
        <div className="crumb container" style={{ padding: '16px 0 0' }}>
          <Link href={`/${lang}`}>{t.nav.home}</Link>
          <span className="sep">›</span>
          <Link href={`/${lang}#sec-cat`}>{t.category.crumbIndustries}</Link>
          <span className="sep">›</span>
          <span className="cur">{pickLang(lang, category.nameZh, category.nameEn)}</span>
        </div>

        <Reveal className="card" style={{ margin: '20px 0 30px', padding: '26px 34px', borderLeft: '4px solid var(--gold)', display: 'flex', gap: 40, alignItems: 'center' }}>
          <p style={{ flex: 1, color: 'var(--body)', lineHeight: 1.9, margin: 0 }}>{intro}</p>
          <div className="cat-stats">
            <div className="s">
              <div className="n">{productTotal}</div>
              <div className="l">{t.category.statProducts}</div>
            </div>
            <div className="s">
              <div className="n">{companyTotal}</div>
              <div className="l">{t.category.statCompanies}</div>
            </div>
          </div>
        </Reveal>

        <CategoryTabs
          lang={lang}
          categoryId={id}
          products={products ?? { page: 1, pageSize: PAGE_SIZE, total: 0, list: [] }}
          companies={companies ?? { page: 1, pageSize: PAGE_SIZE, total: 0, list: [] }}
        />
      </div>
    </>
  );
}
