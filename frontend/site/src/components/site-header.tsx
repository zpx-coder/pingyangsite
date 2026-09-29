'use client';

// 全站顶栏 + 头部 + 导航（PRD §5.1，视觉对齐设计稿 ui.html）
// 当前页高亮；「特色产业」悬停下拉（CSS :hover）；语言切换见 language-switcher
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import LanguageSwitcher from './language-switcher';
import { dict, type Lang } from '@/lib/i18n';
import { pickLang, type PublicCategory } from '@/lib/api';

export default function SiteHeader({ lang, categories = [] }: { lang: Lang; categories?: PublicCategory[] }) {
  const pathname = usePathname();
  const t = dict[lang];

  const items: { key: string; href: string; label: string; drop?: boolean }[] = [
    { key: 'home', href: '', label: t.nav.home },
    { key: 'about', href: 'about', label: t.nav.about },
    { key: 'categories', href: 'categories', label: t.nav.categories, drop: true },
    { key: 'news', href: 'news', label: t.nav.news },
    { key: 'contact', href: 'contact', label: t.nav.contact },
  ];

  // 以 /lang 段后的首段判断当前页（子路径归属主菜单项，如 /news/1 高亮「新闻动态」）
  const current = pathname.replace(/^\/[^/]+/, '').split('/')[1] ?? '';
  const base = `/${lang}`;

  return (
    <>
      <div className="topbar">
        <div className="container">
          <div className="l">
            <span>{lang === 'zh-CN' ? '平阳产业带官方网站' : 'Pingyang Industrial Belt Official Site'}</span>
            <span>｜</span>
            <span>{t.topbarTag}</span>
          </div>
          <div className="r">
            <LanguageSwitcher lang={lang} />
          </div>
        </div>
      </div>
      <div className="site-head">
        <div className="container">
          <Link className="brand" href={base} aria-label="home">
            {/* 白底位置直接展示官方 logo（方案 §4.2：整体使用不可裁剪） */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="logo" src="/img/logo.jpg" alt="平阳 logo" />
            <div>
              <div className="t1">
                {lang === 'zh-CN' ? (
                  <>
                    平阳<i>·</i>产业带
                  </>
                ) : (
                  'Pingyang Industrial Belt'
                )}
              </div>
              <div className="t2">{lang === 'zh-CN' ? 'Pingyang Industrial Belt' : '平阳产业带'}</div>
            </div>
          </Link>
          <div className="head-cta">
            <div className="tel">
              <span>📞</span>
              <div>
                {t.hotlineLabel}
                <br />
                <span className="n">0577-6372 8888</span>
              </div>
            </div>
            <Link className="btn btn-deep btn-sm" href={`${base}/contact`}>
              {t.contactCta}
            </Link>
          </div>
        </div>
      </div>
      <div className="nav">
        <div className="container">
          {items.map((item) =>
            item.drop ? (
              <div key={item.key} className="drop">
                <a className={current === item.key ? 'on' : ''} href={`${base}/categories`}>
                  {item.label}
                </a>
                <div className="drop-panel">
                  {categories.length > 0 ? (
                    categories.slice(0, 8).map((category, i) => (
                      <Link key={category.id} href={`${base}/categories/${category.id}`}>
                        <i>{String(i + 1).padStart(2, '0')}</i>
                        <div>
                          <b>{pickLang(lang, category.nameZh, category.nameEn)}</b>
                          <span>{category.nameEn}</span>
                        </div>
                      </Link>
                    ))
                  ) : (
                    <Link href={`${base}/categories`}>
                      <i>◆</i>
                      <div>
                        <b>{item.label}</b>
                        <span>{lang === 'zh-CN' ? '查看全部上架类目' : 'View all industries'}</span>
                      </div>
                    </Link>
                  )}
                </div>
              </div>
            ) : (
              <Link
                key={item.key}
                className={current === item.key ? 'on' : ''}
                href={`${base}/${item.href}`}
              >
                {item.label}
              </Link>
            ),
          )}
        </div>
      </div>
      <div className="nav-line" />
    </>
  );
}
