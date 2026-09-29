// 官网语言段布局（PRD §5.1 全局框架）：顶栏 + 头部导航 + 内容 + 页脚
import { notFound } from 'next/navigation';
import SiteHeader from '@/components/site-header';
import SiteFooter from '@/components/site-footer';
import { isLang, type Lang } from '@/lib/i18n';

export default async function LangLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang: raw } = await params;
  if (!isLang(raw)) {
    notFound();
  }
  const lang: Lang = raw;

  return (
    <>
      <SiteHeader lang={lang} />
      <main>{children}</main>
      <SiteFooter lang={lang} />
    </>
  );
}
