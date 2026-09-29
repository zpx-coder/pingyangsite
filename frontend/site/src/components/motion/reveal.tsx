'use client';

// 滚动渐入（方案 §4.3）：进入视口后加 .is-in 触发过渡；一次性，不重复触发。
// 用法：<Reveal delay={1}>…</Reveal>，delay 1–5 对应 .d1–.d5 递延。
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';

export default function Reveal({
  children,
  delay = 0,
  className = '',
  style,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
  style?: CSSProperties;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} style={style} className={`rv${inView ? ' is-in' : ''}${delay ? ` d${delay}` : ''} ${className}`}>
      {children}
    </div>
  );
}
