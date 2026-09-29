// 企业详情页（任务 2.7，PRD §6.5）：横幅 → 企业信息区（Logo/双语名/类目标签/基本信息/成立年份/规模）→
// 企业简介（富文本）→ 荣誉资质墙（有配置才展示）→ 该企业产品（分页 12/页）。
// 数据：公开企业详情接口（随附分页产品）；下架/删除/不存在企业 404。
import type { Metadata } from 'next';
import { cache } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import CompanyProducts from '@/components/company/company-products';
import Reveal from '@/components/motion/reveal';
import { getApi, pickLang, type PublicCompanyDetail } from '@/lib/api';
import { dict, isLang } from '@/lib/i18n';
import { buildMetadata } from '@/lib/seo';

// 企业 Logo 缺失时的字标底色（与类目页 logo-mark 三色轮换一致）
const MARK_COLORS = ['#336065', '#28484C', '#A9713D'];

// 横幅回退图为设计稿静态素材（方案 §4.5 素材规范，本地化存储）
const FALLBACK_COVER = '/img/banner2.jpg';

// cache 保证 generateMetadata 与页面渲染同一请求内只取一次详情
const getCompany = cache((id: number) => getApi<PublicCompanyDetail>(`/api/v1/public/companies/${id}`));

// 企业详情 TDK：实体名称 + 简介（任务 2.10）；取数失败回退站点默认，页面本身仍走 404 兜底
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
  const company = await getCompany(id).catch(() => null);
  if (!company) return buildMetadata(lang);
  return buildMetadata(lang, {
    title: pickLang(lang, company.nameZh, company.nameEn),
    description: pickLang(lang, company.introZh, company.introEn)
      .replace(/<[^>]*>/g, '')
      .trim()
      .slice(0, 200),
    path: `companies/${id}`,
  });
}

export default async function CompanyDetailPage({
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

  const company = await getCompany(id).catch(() => null);
  if (!company) {
    notFound(); // 下架 / 删除 / 不存在：后端 404，页面按不存在处理
  }

  const name = pickLang(lang, company.nameZh, company.nameEn);
  const intro = pickLang(lang, company.introZh, company.introEn);
  const cover = company.coverUrl?.trim() || FALLBACK_COVER;

  // 基本信息（PRD §6.5：成立年份/规模/地址/联系人/电话/邮箱/官网），仅展示有值的项
  const facts: { label: string; value: string; href?: string }[] = [];
  if (company.address) facts.push({ label: t.company.address, value: company.address });
  if (company.contactName) facts.push({ label: t.company.contactName, value: company.contactName });
  if (company.phone) facts.push({ label: t.company.phone, value: company.phone });
  if (company.email) facts.push({ label: t.company.email, value: company.email });
  if (company.website) {
    const href = /^https?:\/\//i.test(company.website) ? company.website : `https://${company.website}`;
    facts.push({ label: t.company.website, value: company.website, href });
  }

  const firstCategory = company.categories[0];

  return (
    <>
      <div className="page-banner" style={{ height: 210 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={cover} alt="" />
        <div className="container">
          <h1 style={{ fontSize: 32 }}>{name}</h1>
        </div>
      </div>
      <div className="container page-body">
        <div className="crumb container" style={{ padding: '16px 0 0' }}>
          <Link href={`/${lang}`}>{t.nav.home}</Link>
          {firstCategory && (
            <>
              <span className="sep">›</span>
              <Link href={`/${lang}/categories/${firstCategory.id}`}>
                {pickLang(lang, firstCategory.nameZh, firstCategory.nameEn)}
              </Link>
            </>
          )}
          <span className="sep">›</span>
          <span className="cur">{name}</span>
        </div>

        <Reveal className="card" style={{ marginTop: 20, padding: '34px 40px' }}>
          <div style={{ display: 'flex', gap: 28, alignItems: 'center' }}>
            {company.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img className="logo-img" src={company.logoUrl} alt="" style={{ width: 88, height: 88 }} />
            ) : (
              <div className="logo-mark" style={{ width: 88, height: 88, fontSize: 34, background: MARK_COLORS[company.id % MARK_COLORS.length] }}>
                {/* 字标取品牌名首字：企业名通常带地域前缀（温州/浙江…），跳过前缀取第 3 字，与类目页一致 */}
                {company.nameZh.length > 2 ? company.nameZh.charAt(2) : company.nameZh.charAt(0)}
              </div>
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <h1 className="serif" style={{ fontSize: 25, color: 'var(--ink)', letterSpacing: 1, margin: 0 }}>
                {name}
              </h1>
              <div className="en" style={{ color: 'var(--muted)', fontSize: 13, margin: '6px 0 12px' }}>
                {company.nameEn}
              </div>
              <div className="tags">
                {company.categories.map((category) => (
                  <span key={category.id} className="chip">
                    {pickLang(lang, category.nameZh, category.nameEn)}
                  </span>
                ))}
              </div>
            </div>
            <div style={{ textAlign: 'center', borderLeft: '1px solid var(--line)', paddingLeft: 30 }}>
              <div className="serif" style={{ fontSize: 26, fontWeight: 800, color: 'var(--deep)' }}>
                {company.foundedYear ?? '—'}
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>{t.company.foundedLabel}</div>
            </div>
            <div style={{ textAlign: 'center', borderLeft: '1px solid var(--line)', paddingLeft: 30 }}>
              <div className="serif" style={{ fontSize: 26, fontWeight: 800, color: 'var(--deep)' }}>
                {company.scale?.split(' ')[0] ?? '—'}
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>{t.company.scaleLabel}</div>
            </div>
            <a href="#products" className="btn btn-gold btn-sm" style={{ marginLeft: 10, flex: 'none' }}>
              {t.product.formKicker}
            </a>
          </div>
          {facts.length > 0 && (
            <div className="co-facts">
              {facts.map((fact) => (
                <div key={fact.label} className="f">
                  <div className="l">{fact.label}</div>
                  <div className="v">
                    {fact.href ? (
                      <a href={fact.href} target="_blank" rel="noopener noreferrer">
                        {fact.value}
                      </a>
                    ) : (
                      fact.value
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Reveal>

        {/* 简介：白底直接排布（设计稿 05 无卡片） */}
        {intro && (
          <Reveal style={{ marginTop: 26 }}>
            <div className="sec-head" style={{ marginBottom: 20, textAlign: 'left' }}>
              <div className="kicker" style={{ marginLeft: 0 }}>
                {t.company.aboutKicker}
              </div>
              <h2 style={{ fontSize: 26 }}>{t.company.aboutTitle}</h2>
            </div>
            {/* 后台富文本（管理员受信输入，录入端校验）；段落与图片样式见 .rich-content */}
            <div className="rich-content" dangerouslySetInnerHTML={{ __html: intro }} />
          </Reveal>
        )}

        {/* 荣誉资质墙（设计稿 05）：白底直排，标题居中、证书 4 列大图无卡片底；
            设计稿标题位于证书列中部，数据量不定时以页眉形式置于上方（任务 2.12 走查结论） */}
        {company.honorImages.length > 0 && (
          <Reveal style={{ marginTop: 26 }}>
            <div className="sec-head" style={{ marginBottom: 26 }}>
              <div className="kicker">{t.company.honorKicker}</div>
              <h2>{t.company.honorTitle}</h2>
            </div>
            <div className="honor-grid">
              {company.honorImages.map((image, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={`${image}-${i}`} src={image} alt={`${t.company.honorTitle} ${i + 1}`} />
              ))}
            </div>
          </Reveal>
        )}

        <div id="products" style={{ scrollMarginTop: 110 }}>
          <Reveal className="card" style={{ marginTop: 26 }}>
            <div className="sec-head" style={{ marginBottom: 30 }}>
              <div className="kicker">{t.company.productsKicker}</div>
              <h2>{t.company.productsTitle}</h2>
            </div>
            <CompanyProducts lang={lang} companyId={company.id} initial={company.products} />
          </Reveal>
        </div>
      </div>
    </>
  );
}
