// 平阳介绍（任务 2.4 实现富文本 + 视频播放器；当前为路由骨架占位）
import PagePlaceholder from '@/components/page-placeholder';
import { dict, type Lang } from '@/lib/i18n';

export default async function AboutPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  return <PagePlaceholder lang={lang as Lang} title={dict[lang as Lang].nav.about} />;
}
