'use client';

// 首页宣传图轮播（PRD §6.1）：后台 home_banner 配置驱动（1–5 张、间隔秒数），
// 文案层含 kicker/主标语/副标语/按钮组，右下角 01/0N 计数（对照设计稿 ui.html 首页 Hero）。
import Link from 'next/link';
import HeroCarousel, { type HeroSlide } from '../motion/hero-carousel';
import { pickLang, type BannerSlideConfig } from '../../lib/api';
import type { Dict, Lang } from '../../lib/i18n';

export default function HeroSection({
  images,
  intervalSeconds,
  lang,
  t,
}: {
  images: BannerSlideConfig[];
  intervalSeconds: number;
  lang: Lang;
  t: Dict;
}) {
  const slides: HeroSlide[] = images
    .filter((item) => item.image)
    .map((item) => ({
      image: item.image,
      title: pickLang(lang, item.titleZh, item.titleEn),
      subtitle: pickLang(lang, item.subtitleZh, item.subtitleEn),
    }));
  if (slides.length === 0) return null;

  const scrollToCategories = () => {
    document.getElementById('sec-cat')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <HeroCarousel
      slides={slides}
      intervalMs={intervalSeconds * 1000}
      showIndex
      caption={(slide) => {
        const source = images[slides.indexOf(slide)];
        const buttonText = pickLang(lang, source?.buttonTextZh, source?.buttonTextEn);
        return (
          <>
            <div className="kicker">{t.home.heroKicker}</div>
            {slide.title && <h1 className="hero-title">{slide.title}</h1>}
            {slide.subtitle && <p className="hero-sub">{slide.subtitle}</p>}
            <div className="ctas">
              {buttonText && (
                <Link className="btn btn-gold" href={`/${lang}/about`}>
                  {buttonText}
                </Link>
              )}
              <button type="button" className="btn btn-ghost-w" onClick={scrollToCategories}>
                {t.home.heroExplore}
              </button>
            </div>
          </>
        );
      }}
    />
  );
}
