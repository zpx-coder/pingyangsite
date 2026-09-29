// 官网语言段布局（PRD §5.1 全局框架）：顶栏 + 头部导航 + 内容 + 页脚
// 导航「特色产业」下拉展示上架类目（PRD §6.1 关键规则），接口不可用时降级为占位链接。
import { notFound } from 'next/navigation';
import SiteHeader from '@/components/site-header';
import SiteFooter from '@/components/site-footer';
import { isLang, type Lang } from '@/lib/i18n';
import { getApi, type PageContentMap, type PublicCategory } from '@/lib/api';

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

  // 页脚配置驱动（任务 2.9）：接口不可用时降级占位，不阻塞页面渲染
  const [categories, configs] = await Promise.all([
    getApi<PublicCategory[]>('/api/v1/public/categories').catch(() => null),
    getApi<PageContentMap>('/api/v1/public/pages').catch(() => null),
  ]);

  return (
    <>
      <SiteHeader lang={lang} categories={categories ?? []} />
      <main>{children}</main>
      <SiteFooter lang={lang} categories={categories ?? []} configs={configs} />
    </>
  );
}
