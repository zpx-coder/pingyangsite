// 首页（任务 2.3，PRD §6.1）：宣传图轮播 / 数据带 / 产业走马灯 / 特色产业类目（≤8）
// / 关于平阳 / 新闻热点（4 条）/ 联系带。数据全部来自后端公开接口（配置驱动），
// 任一接口不可用或为空时对应区块隐藏，页面本身不报错。
import type { Metadata } from 'next';
import HeroSection from '@/components/home/hero-section';
import StatBand from '@/components/home/stat-band';
import Ticker from '@/components/home/ticker';
import CategorySection from '@/components/home/category-section';
import AboutSection from '@/components/home/about-section';
import NewsSection from '@/components/home/news-section';
import ContactBand from '@/components/home/contact-band';
import { getApi, type HomeBannerConfig, type PageContentMap, type PublicCategory, type PublicNews } from '@/lib/api';
import { dict, isLang } from '@/lib/i18n';
import { buildMetadata } from '@/lib/seo';

const HOME_BANNER_DEFAULT_INTERVAL_SECONDS = 5;

// 首页 TDK/hreflang：站点默认标题与描述（任务 2.10）
export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  if (!isLang(lang)) return {};
  return buildMetadata(lang);
}

export default async function HomePage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang: rawLang } = await params;
  if (!isLang(rawLang)) {
    return null; // [lang] 布局已做非法语言 404 兜底
  }
  const lang = rawLang;
  const t = dict[lang];

  const [pages, categories, news] = await Promise.all([
    getApi<PageContentMap>('/api/v1/public/pages').catch(() => null),
    getApi<PublicCategory[]>('/api/v1/public/categories').catch(() => null),
    getApi<PublicNews[]>('/api/v1/public/news/latest').catch(() => null),
  ]);

  const banner: HomeBannerConfig | undefined = pages?.home_banner;
  const interval = Math.max(2, Math.min(30, banner?.interval ?? HOME_BANNER_DEFAULT_INTERVAL_SECONDS));
  // 数据带在视觉上叠在轮播底缘（margin-top:-52px），无轮播图时不渲染避免悬空
  const hasBanner = (banner?.images?.length ?? 0) > 0;

  return (
    <>
      <HeroSection images={banner?.images ?? []} intervalSeconds={interval} lang={lang} t={t} />
      {hasBanner && <StatBand t={t} />}
      <Ticker categories={categories ?? []} lang={lang} t={t} />
      <CategorySection categories={categories ?? []} lang={lang} t={t} />
      <AboutSection about={pages?.home_about} lang={lang} t={t} />
      <NewsSection news={news ?? []} lang={lang} t={t} />
      <ContactBand contact={pages?.contact_info} lang={lang} t={t} />
    </>
  );
}
