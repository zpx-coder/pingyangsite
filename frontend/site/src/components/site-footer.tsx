// 全站页脚（PRD §5.1：导航链接 / 联系方式摘要 / ICP 备案号 / 版权，视觉对齐设计稿 ui.html）
// 备案号与联系方式由后台「页面内容-页脚信息」配置，任务 2.9 接入 API 后替换静态占位
import Link from 'next/link';
import { dict, type Lang } from '@/lib/i18n';

export default function SiteFooter({ lang }: { lang: Lang }) {
  const t = dict[lang];
  const base = `/${lang}`;

  return (
    <div className="site-footer">
      <div className="container">
        <div className="cols">
          <div>
            {/* 深色背景以白色圆角底衬承载 logo（方案 §4.2） */}
            <span className="logo-tile">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="logo" src="/img/logo.jpg" alt="平阳 logo" />
            </span>
            <p className="desc">{t.footer.desc}</p>
          </div>
          <div>
            <h4>{t.footer.quickLinks}</h4>
            <Link href={`${base}/about`}>{t.nav.about}</Link>
            <Link href={`${base}/news`}>{t.nav.news}</Link>
            <Link href={`${base}/contact`}>{t.nav.contact}</Link>
          </div>
          <div>
            <h4>{t.footer.categories}</h4>
            {/* 类目列表任务 2.5 接入 API 后替换 */}
            <Link href={`${base}/categories`}>{t.nav.categories}</Link>
          </div>
          <div>
            <h4>{t.footer.contact}</h4>
            <a>{t.footer.phone}</a>
            <a>{t.footer.email}</a>
            <a>{t.footer.address}</a>
            <a>{t.footer.hours}</a>
          </div>
        </div>
        <div className="bottom">
          <span>{t.footer.copyright}</span>
          <span>{t.footer.icp}</span>
        </div>
      </div>
    </div>
  );
}
