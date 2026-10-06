// 根级 404（PRD §5.1：双语提示 + 返回首页按钮）。
// 必须是服务端组件：客户端边界无法捕获页面/布局抛出的服务端 notFound()，
// 会退化为 NEXT_HTTP_ERROR_FALLBACK 裸错误页（Next 15.5 实测）。
// 语言从 middleware 注入的 x-pathname 头推断。
import Link from 'next/link';
import { headers } from 'next/headers';
import { dict, isLang, type Lang } from '@/lib/i18n';

export default async function NotFound() {
  const pathname = (await headers()).get('x-pathname') ?? '';
  const seg = pathname.split('/')[1];
  const lang: Lang = isLang(seg) ? (seg as Lang) : 'zh-CN';
  const t = dict[lang];

  return (
    <div className="not-found">
      <div className="code">404</div>
      <div className="msg">{t.notFound.title}</div>
      <Link className="btn btn-gold" href={`/${lang}`}>
        {t.notFound.back}
      </Link>
    </div>
  );
}
