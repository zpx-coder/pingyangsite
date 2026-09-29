'use client';

// 404（PRD §5.1：双语提示 + 返回首页按钮）
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { dict } from '@/lib/i18n';

export default function NotFound() {
  const pathname = usePathname();
  const lang = pathname.startsWith('/en') ? 'en' : 'zh-CN';
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
