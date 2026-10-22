// 联系我们页（任务 2.9，PRD §6.8）：横幅 + 联系方式卡片组 + 办公地址静态地图 + 工作时间/引导语。
// 数据：contact_info 配置（后台页面内容-联系我们，保存后即时生效）；
// mapCoordinate 仍为预留配置；当前静态底图按已核实的雅河路189号办公地址定位。
import type { Metadata } from 'next';
import Link from 'next/link';
import Reveal from '@/components/motion/reveal';
import { getApi, pickLang, type ContactInfoConfig, type PageContentMap, type PublicCategory } from '@/lib/api';
import { dict, isLang } from '@/lib/i18n';
import { buildMetadata } from '@/lib/seo';
import { mediaUrl } from '@/lib/paths';
import { officeMapPosition } from '@/lib/contact-map';
import mapStyles from '@/components/contact/office-map.module.css';

// 横幅与地图均为本地静态素材（方案 §4.5 素材规范，本地化存储）：
// 2026-10-09 应负责人要求——横幅由地图占位图更换为温州海岸实拍；
// 地图为平阳城区地图（Bing 瓦片 z15 拼接，点位按 WGS84 坐标投影计算）。
const BANNER_IMAGE = '/img/loc-wenzhou.jpg';
const MAP_IMAGE = '/img/map-pingyang-city.jpg';

// 联系我们页 TDK/hreflang（任务 2.10）
export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  if (!isLang(lang)) return {};
  return buildMetadata(lang, { title: dict[lang].seo.contactTitle, path: 'contact' });
}

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
  const mapPosition = officeMapPosition();
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
        <img src={mediaUrl(BANNER_IMAGE)} alt={t.contact.banner} />
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
          {/* 图片裁切锚点与标记使用相同百分比，保持不同屏宽下的地理点位一致。 */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={mediaUrl(MAP_IMAGE)}
            alt={t.contact.pinLabel}
            style={{ objectPosition: `${mapPosition.left} ${mapPosition.top}` }}
          />
          <div className={mapStyles.pin} style={mapPosition}>
            <div className={mapStyles.label}>{t.contact.pinLabel}</div>
            <svg className={mapStyles.marker} viewBox="0 0 34 44" aria-hidden="true">
              <path d="M17 42C13 36 1.5 27 1.5 17a15.5 15.5 0 0 1 31 0C32.5 27 21 36 17 42Z" fill="currentColor" stroke="#fff" strokeWidth="3" />
            </svg>
          </div>
          <span className={mapStyles.credit}>© Bing Maps</span>
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
