// 新闻列表页（任务 2.8 实现列表 + 详情；当前为路由骨架占位）
import PagePlaceholder from '@/components/page-placeholder';
import { dict, type Lang } from '@/lib/i18n';

export default async function NewsPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  return <PagePlaceholder lang={lang as Lang} title={dict[lang as Lang].nav.news} />;
}
