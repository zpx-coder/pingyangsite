'use client';

// 产业走马灯（方案 §4.3）：CSS 关键帧横向滚动，内容双份拷贝实现无缝循环；
// 悬停暂停；prefers-reduced-motion 下动画时长被全局降级为静态。
import type { ReactNode } from 'react';

export default function Marquee({ children }: { children: ReactNode }) {
  return (
    <div className="marquee" aria-label="industries marquee">
      <div className="marquee-track">
        <div className="marquee-group">{children}</div>
        <div className="marquee-group" aria-hidden="true">
          {children}
        </div>
      </div>
    </div>
  );
}
