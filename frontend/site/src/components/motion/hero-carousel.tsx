'use client';

// Hero 轮播（方案 §4.3）：自动轮播（默认 5s/张，首页由后台配置间隔）+ 左右箭头
// + 指示点 + 悬停暂停；Ken Burns 缓慢缩放 + 文案逐级入场 + 标题金光。
// prefers-reduced-motion：全局降级关闭 Ken Burns 与过渡（文案仍完整呈现）。
import { useCallback, useEffect, useState } from 'react';

export interface HeroSlide {
  image: string;
  title?: string;
  subtitle?: string;
}

export default function HeroCarousel({ slides, intervalMs = 5000 }: { slides: HeroSlide[]; intervalMs?: number }) {
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
          <img className="hero-img" src={slide.image} alt={slide.title ?? ''} />
          {(slide.title || slide.subtitle) && (
            <div className="container hero-cap">
              {slide.title && <h2 className="hero-title">{slide.title}</h2>}
              {slide.subtitle && <p className="hero-sub">{slide.subtitle}</p>}
            </div>
          )}
        </div>
      ))}
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
    </div>
  );
}
