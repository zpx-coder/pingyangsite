// 根布局：仅 html/body 外壳；语言框架与元数据由 [lang] 段布局承担（PRD §5.2）
import type { Metadata } from 'next';
import { headers } from 'next/headers';
import './globals.css';

// 兜底元数据：各页面 TDK/hreflang 由任务 2.10 的 generateMetadata 提供，
// 此处仅覆盖 404 等无语言上下文的场景（[lang] 布局未匹配到页面时）。
export const metadata: Metadata = {
  title: '平阳产业带官网',
  description: '平阳特色产业的官方展示与对接平台 · Pingyang Industrial Belt',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // 依据 URL 设置 html lang（/en* → en，其余 zh-CN）
  const pathname = (await headers()).get('x-pathname') ?? '';
  const htmlLang = pathname.startsWith('/en') ? 'en' : 'zh-CN';

  return (
    <html lang={htmlLang}>
      <body>{children}</body>
    </html>
  );
}
