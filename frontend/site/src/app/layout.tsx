// 根布局：仅 html/body 外壳；语言框架与元数据由 [lang] 段布局承担（PRD §5.2）
import type { Metadata } from 'next';
import { headers } from 'next/headers';
import './globals.css';

export const metadata: Metadata = {
  title: '平阳产业带官网',
  description: '平阳特色产业的官方展示与对接平台 · Pingyang Industrial Belt',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // 依据 URL 设置 html lang（/en* → en，其余 zh-CN）；SEO 完整 TDK/hreflang 在任务 2.10 落地
  const pathname = (await headers()).get('x-pathname') ?? '';
  const htmlLang = pathname.startsWith('/en') ? 'en' : 'zh-CN';

  return (
    <html lang={htmlLang}>
      <body>{children}</body>
    </html>
  );
}
