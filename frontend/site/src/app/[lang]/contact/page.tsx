// 联系我们页（任务 2.9，PRD §6.8）：横幅 + 联系方式卡片组 + 地图静态占位 + 工作时间/引导语。
// 数据：contact_info 配置（后台页面内容-联系我们，保存后即时生效）；
// mapCoordinate 首期仅存储备用（坐标为后台配置项，后续接入地图 API），页面仍展示静态地图占位图。
import Link from 'next/link';
import Reveal from '@/components/motion/reveal';
import { getApi, pickLang, type ContactInfoConfig, type PageContentMap, type PublicCategory } from '@/lib/api';
import { dict, isLang } from '@/lib/i18n';

// 横幅与地图占位均为设计稿静态素材（方案 §4.5 素材规范，本地化存储）
const MAP_IMAGE = '/img/map.jpg';

export default async function ContactPage({ params }: { params: Promise<{ lang: string }> }) {
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

  const info: ContactInfoConfig | undefined = pages?.contact_info;
  const address = pickLang(lang, info?.addressZh, info?.addressEn);
  const workHours = pickLang(lang, info?.workHoursZh, info?.workHoursEn);
  // 在线询盘按钮引导至首个上架类目（产品入口），无类目时不展示按钮
  const firstCategory = categories?.[0];

  // 卡片按配置有值才渲染（与基本信息「仅展示有值项」同一约定）
  const cards = [
    { icon: '📞', title: t.contact.cardPhone, text: info?.phone?.trim(), delay: 0 },
    { icon: '✉️', title: t.contact.cardEmail, text: info?.email?.trim(), delay: 2 },
    { icon: '📍', title: t.contact.cardAddress, text: address, delay: 3 },
  ].filter((card) => card.text);

  return (
    <>
      <div className="page-banner">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={MAP_IMAGE} alt={t.contact.banner} />
        <div className="container">
          <h1>{t.contact.banner}</h1>
        </div>
      </div>
      <div className="container page-body">
        <div className="crumb container" style={{ padding: '16px 0 0' }}>
          <Link href={`/${lang}`}>{t.nav.home}</Link>
          <span className="sep">›</span>
          <span className="cur">{t.nav.contact}</span>
        </div>

        {cards.length > 0 && (
          <div className="contact-cards">
            {cards.map((card) => (
              <Reveal key={card.title} delay={card.delay} className="contact-card">
                <div className="ic">{card.icon}</div>
                <h4>{card.title}</h4>
                <p>{card.text}</p>
              </Reveal>
            ))}
          </div>
        )}

        <Reveal className="map-card">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={MAP_IMAGE} alt={t.contact.pinLabel} />
          <div className="pin">
            <div className="lb">{t.contact.pinLabel}</div>
            <div className="p" />
          </div>
        </Reveal>

        <Reveal className="card contact-bar">
          <div className="lbl">{t.contact.hoursLabel}</div>
          <div className="txt">
            {workHours && <div className="hrs">{workHours}</div>}
            <div>{t.contact.guide}</div>
          </div>
          {firstCategory && (
            <Link className="btn btn-deep btn-sm" href={`/${lang}/categories/${firstCategory.id}`}>
              {t.contact.inquiryBtn}
            </Link>
          )}
        </Reveal>
      </div>
    </>
  );
}
