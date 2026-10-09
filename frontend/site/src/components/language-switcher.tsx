'use client';

// 语言切换（PRD §5.1）：切换后当前页以另一语言重新渲染；选择持久化（LocalStorage + Cookie）
import { usePathname, useRouter } from 'next/navigation';
import { LANGS, type Lang } from '@/lib/i18n';
import { APP_BASE_PATH } from '@/lib/paths';

export default function LanguageSwitcher({ lang }: { lang: Lang }) {
  const pathname = usePathname();
  const router = useRouter();

  function switchTo(target: Lang) {
    if (target === lang) return;
    // /zh-CN/news -> /en/news：仅替换 [lang] 段，保持其余路径
    const rest = pathname.replace(new RegExp(`^/${lang}(?=/|$)`), '');
    localStorage.setItem('lang', target);
    const cookiePath = APP_BASE_PATH ? `${APP_BASE_PATH}/` : '/';
    document.cookie = `lang=${target}; path=${cookiePath}; max-age=31536000; samesite=lax`;
    // <html lang> 由服务端根布局按请求路径渲染，SPA 切换不重渲文档属性——
    // 客户端同步修正，避免切换后 documentElement.lang 停留在旧语言
    document.documentElement.lang = target;
    router.push(`/${target}${rest}`);
  }

  return (
    <span className="lang-pill" aria-label="language switch">
      {LANGS.map((item) => (
        <b key={item} className={item === lang ? 'on' : ''} onClick={() => switchTo(item)}>
          {item === 'zh-CN' ? '中文' : 'EN'}
        </b>
      ))}
    </span>
  );
}
