'use client';

// Hero 轮播（方案 §4.3）：自动轮播（默认 5s/张，首页由后台配置间隔）+ 左右箭头
// + 指示点 + 悬停暂停；Ken Burns 缓慢缩放 + 文案逐级入场 + 标题金光。
// caption 渲染函数可整体接管文案层（首页传入 kicker/标题/副标语/按钮结构）；
// showIndex 显示右下角「01 / 03」计数。
// prefers-reduced-motion：全局降级关闭 Ken Burns 与过渡（文案仍完整呈现）。
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { mediaUrl } from '@/lib/paths';

export interface HeroSlide {
  image: string;
  title?: string;
  subtitle?: string;
}

export default function HeroCarousel({
  slides,
  intervalMs = 5000,
  caption,
  showIndex = false,
}: {
  slides: HeroSlide[];
  intervalMs?: number;
  caption?: (slide: HeroSlide) => ReactNode;
  showIndex?: boolean;
}) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const next = useCallback(() => setIndex((i) => (i + 1) % slides.length), [slides.length]);
  const prev = useCallback(() => setIndex((i) => (i - 1 + slides.length) % slides.length), [slides.length]);

  useEffect(() => {
    if (paused || slides.length <= 1) return;
    const timer = setInterval(next, intervalMs);
    return () => clearInterval(timer);
  }, [paused, slides.length, intervalMs, next]);

  if (slides.length === 0) return null;

  return (
    <div className="hero" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      {slides.map((slide, i) => (
        <div key={slide.image} className={`hero-slide${i === index ? ' on' : ''}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="hero-img" src={mediaUrl(slide.image)} alt={slide.title ?? ''} />
          {(caption || slide.title || slide.subtitle) && (
            <div className="container hero-cap">
              {caption ? (
                caption(slide)
              ) : (
                <>
                  {slide.title && <h2 className="hero-title">{slide.title}</h2>}
                  {slide.subtitle && <p className="hero-sub">{slide.subtitle}</p>}
                </>
              )}
            </div>
          )}
        </div>
      ))}
      <div className="hero-deco" />
      {slides.length > 1 && (
        <>
          <button type="button" className="hero-arrow left" onClick={prev} aria-label="上一张">
            ‹
          </button>
          <button type="button" className="hero-arrow right" onClick={next} aria-label="下一张">
            ›
          </button>
          <div className="hero-dots">
            {slides.map((_, i) => (
              <button
                type="button"
                key={i}
                className={`hero-dot${i === index ? ' on' : ''}`}
                onClick={() => setIndex(i)}
                aria-label={`第 ${i + 1} 张`}
              />
            ))}
          </div>
        </>
      )}
      {showIndex && (
        <div className="hero-idx">
          <b>{String(index + 1).padStart(2, '0')}</b> / {String(slides.length).padStart(2, '0')}
        </div>
      )}
    </div>
  );
}
