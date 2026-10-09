// 平阳介绍页（任务 2.4，PRD §6.2）：横幅 + 区位优势 + 介绍视频（点击加载）+ 富文本正文 + 产业概况。
// 数据：about_page 配置（横幅图/视频/富文本）与上架类目（产业概况）；接口失败/配置为空时对应模块隐藏。
import type { Metadata } from 'next';
import Link from 'next/link';
import VideoPlayer from '@/components/about/video-player';
import Reveal from '@/components/motion/reveal';
import { getApi, pickLang, type AboutPageConfig, type PageContentMap, type PublicCategory } from '@/lib/api';
import { dict, isLang } from '@/lib/i18n';
import { buildMetadata } from '@/lib/seo';
import { mediaHtml, mediaUrl } from '@/lib/paths';

// 封面图与横幅回退图为设计稿静态素材（方案 §4.5 素材规范，本地化存储）
const FALLBACK_BANNER = '/img/banner1.jpg';
const VIDEO_COVER = '/img/poster.jpg';
// 区位优势配图：温州海岸实拍（Pexels 免费商用授权免署名；摄影：柳树无，拍摄地温州；
// 2026-10-08 应负责人要求替换原 about3.jpg 素材）
const LOCATION_IMAGE = '/img/loc-wenzhou.jpg';

// 平阳介绍页 TDK/hreflang（任务 2.10）
export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  if (!isLang(lang)) return {};
  return buildMetadata(lang, { title: dict[lang].seo.aboutTitle, path: 'about' });
}

export default async function AboutPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang: rawLang } = await params;
  if (!isLang(rawLang)) {
    return null; // [lang] 布局已做非法语言 404 兜底
  }
  const lang = rawLang;
  const t = dict[lang];

  const [pages, categories] = await Promise.all([
    getApi<PageContentMap>('/api/v1/public/pages').catch(() => null),
    getApi<PublicCategory[]>('/api/v1/public/categories').catch(() => null),
  ]);

  const about: AboutPageConfig | undefined = pages?.about_page;
  const bannerImage = about?.bannerImage?.trim() || FALLBACK_BANNER;
  const videoUrl = about?.videoUrl?.trim();
  // 富文本为后台编辑内容（管理员受信输入，后台保存时校验），公开接口按语言返回
  const content = pickLang(lang, about?.contentZh, about?.contentEn);

  return (
    <>
      <div className="page-banner">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={mediaUrl(bannerImage)} alt={t.nav.about} />
        <div className="container">
          <h1>{t.nav.about}</h1>
        </div>
      </div>
      <div className="container page-body">
        <div className="crumb container" style={{ padding: '16px 0 0' }}>
          <Link href={`/${lang}`}>{t.nav.home}</Link>
          <span className="sep">›</span>
          <span className="cur">{t.nav.about}</span>
        </div>

        <Reveal className="card" style={{ marginTop: 20, padding: 0, overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr' }}>
            <div style={{ padding: '40px 44px' }}>
              <div className="kicker" style={{ color: 'var(--deep)', letterSpacing: 5, fontSize: 13, fontWeight: 600 }}>
                {t.about.locKicker}
              </div>
              <h2 className="serif" style={{ fontSize: 26, color: 'var(--ink)', margin: '10px 0 16px', letterSpacing: 2 }}>
                {t.about.locTitle}
              </h2>
              <p style={{ color: 'var(--body)' }}>{t.about.locBody}</p>
              <div style={{ display: 'flex', gap: 30, marginTop: 24 }}>
                {t.about.locStats.map((stat) => (
                  <div key={stat.label}>
                    <div className="serif" style={{ fontSize: 24, fontWeight: 800, color: 'var(--deep)' }}>
                      {stat.value}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--muted)', letterSpacing: 2 }}>{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ height: '100%' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={mediaUrl(LOCATION_IMAGE)}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                alt=""
              />
            </div>
          </div>
        </Reveal>

        {videoUrl && (
          <Reveal className="card" style={{ marginTop: 26, position: 'relative', overflow: 'hidden' }}>
            <div className="sec-head" style={{ marginBottom: 26 }}>
              <div className="kicker">{t.about.videoKicker}</div>
              <h2>{t.about.videoTitle}</h2>
            </div>
            <VideoPlayer src={videoUrl} cover={VIDEO_COVER} caption={t.about.videoCaption} ariaLabel={t.about.videoTitle} />
          </Reveal>
        )}

        {content && (
          <Reveal className="card" style={{ marginTop: 26 }}>
            {/* 后台富文本（管理员受信输入，录入端校验）；段落与图片样式见 .rich-content */}
            <div className="rich-content" dangerouslySetInnerHTML={{ __html: mediaHtml(content) }} />
          </Reveal>
        )}

        {(categories?.length ?? 0) > 0 && (
          <Reveal className="card" style={{ marginTop: 26 }}>
            <div className="sec-head" style={{ marginBottom: 30 }}>
              <div className="kicker">{t.about.overviewKicker}</div>
              <h2>{t.about.overviewTitle}</h2>
            </div>
            <div className="cat-grid">
              {categories!.map((category, i) => (
                <Reveal key={category.id} delay={(i % 4) + 1} className="cat-card">
                  <Link href={`/${lang}/categories/${category.id}`}>
                    <div className="im">
                      {category.iconUrl && <img src={mediaUrl(category.iconUrl)} alt="" />}
                      <span className="no">{String(i + 1).padStart(2, '0')}</span>
                    </div>
                    <div className="bd">
                      <h3>
                        {pickLang(lang, category.nameZh, category.nameEn)} <span className="en">{category.nameEn}</span>
                      </h3>
                      <p>{pickLang(lang, category.introZh, category.introEn)}</p>
                    </div>
                  </Link>
                </Reveal>
              ))}
            </div>
          </Reveal>
        )}
      </div>
    </>
  );
}
