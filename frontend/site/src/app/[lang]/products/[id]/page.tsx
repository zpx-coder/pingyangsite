// 产品详情页（任务 2.6，PRD §6.4）：面包屑 → 图集区+产品信息区（价格/MOQ/参数表/关联企业）→
// 产品详情富文本 → 该企业其他产品（PRD 新增，设计稿无此模块）→ 询盘表单（验证码+成功弹窗）。
// 数据：公开产品详情接口；下架/删除/不存在产品 404（后端按此语义返回）。
// 布局对齐设计稿：详情卡片紧贴面包屑（无上边距）、内边距 24px。
import type { Metadata } from 'next';
import { cache } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import Gallery from '@/components/product/gallery';
import InquiryForm from '@/components/product/inquiry-form';
import Reveal from '@/components/motion/reveal';
import { getApi, pickLang, type PublicProductDetail } from '@/lib/api';
import { dict, isLang } from '@/lib/i18n';
import { buildMetadata } from '@/lib/seo';
import { mediaHtml, mediaUrl } from '@/lib/paths';

// 企业 Logo 缺失时的字标底色（与类目页 logo-mark 三色轮换一致）
const MARK_COLORS = ['#336065', '#28484C', '#A9713D'];

// cache 保证 generateMetadata 与页面渲染同一请求内只取一次详情
const getProduct = cache((id: number) => getApi<PublicProductDetail>(`/api/v1/public/products/${id}`));

// 产品详情 TDK：实体名称 + 简介（任务 2.10）；取数失败回退站点默认，页面本身仍走 404 兜底
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
  const product = await getProduct(id).catch(() => null);
  if (!product) return buildMetadata(lang);
  return buildMetadata(lang, {
    title: pickLang(lang, product.nameZh, product.nameEn),
    description: pickLang(lang, product.introZh, product.introEn)
      .replace(/<[^>]*>/g, '')
      .trim()
      .slice(0, 200),
    path: `products/${id}`,
  });
}

export default async function ProductDetailPage({
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

  const product = await getProduct(id).catch(() => null);
  if (!product) {
    notFound(); // 下架 / 删除 / 不存在：后端 404，页面按不存在处理
  }

  const name = pickLang(lang, product.nameZh, product.nameEn);
  const subName = lang === 'zh-CN' ? product.nameEn : product.nameZh;
  const intro = pickLang(lang, product.introZh, product.introEn);
  const detail = pickLang(lang, product.detailZh, product.detailEn);
  const company = product.company;
  const companyName = company ? pickLang(lang, company.nameZh, company.nameEn) : '';

  // 图集 = 主图 + 图集，去重去空（公开接口 gallery 已含主图时防重复）
  const images = Array.from(new Set([product.mainImage, ...product.gallery].filter((s): s is string => !!s?.trim())));

  // 详情富文本 = 产品简介段 + 后台编辑的正文（设计稿：简介段落位于正文之前）
  const richHtml = [intro && `<p>${intro}</p>`, detail].filter(Boolean).join('');

  return (
    <>
      <div className="container page-body">
        <div className="crumb container" style={{ padding: '16px 0 0' }}>
          <Link href={`/${lang}`}>{t.nav.home}</Link>
          <span className="sep">›</span>
          <Link href={`/${lang}/categories/${product.category.id}`}>
            {pickLang(lang, product.category.nameZh, product.category.nameEn)}
          </Link>
          <span className="sep">›</span>
          <span className="cur">{name}</span>
        </div>

        <Reveal className="card" style={{ marginTop: 0, padding: 24 }}>
          <div className="detail-grid">
            {images.length > 0 && <Gallery images={images} alt={name} />}
            <div className="detail-info">
              <h1>
                {name}
                {subName && <span className="en">{subName}</span>}
              </h1>
              {(product.priceRef || product.moq) && (
                <div className="price">
                  {product.priceRef && <strong>{product.priceRef}</strong>}
                  {product.moq && <span>{t.product.specMoq}：{product.moq}</span>}
                </div>
              )}
              <table className="spec">
                <tbody>
                  <tr>
                    <td>{t.product.specCategory}</td>
                    <td>
                      <Link href={`/${lang}/categories/${product.category.id}`}>
                        {pickLang(lang, product.category.nameZh, product.category.nameEn)}
                      </Link>
                    </td>
                  </tr>
                  {product.priceRef && (
                    <tr>
                      <td>{t.product.specPrice}</td>
                      <td>{product.priceRef}</td>
                    </tr>
                  )}
                  {product.moq && (
                    <tr>
                      <td>{t.product.specMoq}</td>
                      <td>{product.moq}</td>
                    </tr>
                  )}
                </tbody>
              </table>
              <div className="acts">
                <a href="#inq" className="btn btn-gold">
                  {t.product.inquiryBtn}
                </a>
                {company && (
                  <Link href={`/${lang}/companies/${company.id}`} className="btn btn-deep">
                    {t.product.linkedCompanyBtn}
                  </Link>
                )}
              </div>
              {company ? (
                <Link href={`/${lang}/companies/${company.id}`} className="co-mini">
                  <div className="logo-mark sm" style={{ background: MARK_COLORS[company.id % MARK_COLORS.length] }}>
                    {/* 字标取品牌名首字：企业名通常带地域前缀（温州/浙江…），跳过前缀取第 3 字，与类目页一致 */}
                    {company.nameZh.length > 2 ? company.nameZh.charAt(2) : company.nameZh.charAt(0)}
                  </div>
                  <div className="cx">
                    <div className="n">{companyName}</div>
                    <div className="en">{company.nameEn}</div>
                  </div>
                  <span className="go">{t.product.viewCompany} →</span>
                </Link>
              ) : (
                <div className="co-mini none">{t.product.unlinkedCompany}</div>
              )}
            </div>
          </div>
        </Reveal>

        {richHtml && (
          <Reveal className="card detail-sec" style={{ padding: '36px 44px' }}>
            <div className="tabs" style={{ marginBottom: 22 }}>
              <button type="button" className="on">
                {t.product.detailTitle}
              </button>
            </div>
            {/* 后台富文本（管理员受信输入，录入端校验）；段落与图片样式见 .rich-content */}
            <div className="rich-content" dangerouslySetInnerHTML={{ __html: mediaHtml(richHtml) }} />
          </Reveal>
        )}

        {company && product.otherProducts.length > 0 && (
          <Reveal className="card detail-sec">
            <div className="sec-head" style={{ marginBottom: 26 }}>
              <div className="kicker">{t.product.otherKicker}</div>
              <h2>{t.product.otherTitle}</h2>
            </div>
            <div className="prod-grid">
              {product.otherProducts.map((other, i) => (
                <Reveal key={other.id} delay={(i % 4) + 1} className="prod-card">
                  <Link href={`/${lang}/products/${other.id}`} style={{ display: 'block' }}>
                    <div className="im">
                      {other.mainImage && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={mediaUrl(other.mainImage)} alt="" />
                      )}
                    </div>
                    <div className="bd">
                      <h4>{pickLang(lang, other.nameZh, other.nameEn)}</h4>
                      <div className="pr">
                        {other.priceRef && <span className="price">{other.priceRef}</span>}
                        {other.moq && <span className="moq">{t.category.moqPrefix}{other.moq}</span>}
                      </div>
                    </div>
                  </Link>
                </Reveal>
              ))}
            </div>
          </Reveal>
        )}

        <div id="inq" style={{ scrollMarginTop: 110 }}>
          <Reveal className="card detail-sec">
            <div className="sec-head" style={{ marginBottom: 30 }}>
              <div className="kicker">{t.product.formKicker}</div>
              <h2>{t.product.formTitle}</h2>
            </div>
            <InquiryForm lang={lang} productId={product.id} nameZh={product.nameZh} nameEn={product.nameEn} />
          </Reveal>
        </div>
      </div>
    </>
  );
}
