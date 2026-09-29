'use client';

// 返回顶部进度环（方案 §4.3）：滚动超过一屏后出现在右下角，圆环表示阅读进度；
// 点击平滑返回顶部；prefers-reduced-motion 下滚动为瞬移。
import { useEffect, useState } from 'react';

const RADIUS = 26;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export default function ScrollProgress() {
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(scrollable > 0 ? window.scrollY / scrollable : 0);
      setVisible(window.scrollY > window.innerHeight);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const backToTop = () => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
  };

  return (
    <button
      type="button"
      className={`back-top${visible ? ' show' : ''}`}
      onClick={backToTop}
      aria-label="返回顶部"
    >
      <svg width="64" height="64" viewBox="0 0 64 64">
        <circle className="back-top-bg" cx="32" cy="32" r={RADIUS} />
        <circle
          className="back-top-fg"
          cx="32"
          cy="32"
          r={RADIUS}
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={CIRCUMFERENCE * (1 - progress)}
        />
      </svg>
      <span className="back-top-arrow">↑</span>
    </button>
  );
}
