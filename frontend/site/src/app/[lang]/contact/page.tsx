// 联系我们（任务 2.9 实现后台配置驱动；当前为路由骨架占位）
import PagePlaceholder from '@/components/page-placeholder';
import { dict, type Lang } from '@/lib/i18n';

export default async function ContactPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  return <PagePlaceholder lang={lang as Lang} title={dict[lang as Lang].nav.contact} />;
}
