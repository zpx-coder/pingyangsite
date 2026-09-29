// 全站页脚（PRD §5.1：导航链接 / 联系方式摘要 / ICP 备案号 / 版权，视觉对齐设计稿 ui.html）
// 任务 2.9 起配置驱动：联系方式与工作时间取 contact_info，备案号与版权取 footer_info（后台页面内容管理，保存即生效）；
// 配置缺失或接口不可用时回退 i18n 静态占位（备案号上线前由后台填入真实值）。
import Link from 'next/link';
import { dict, type Lang } from '@/lib/i18n';
import { pickLang, type PageContentMap, type PublicCategory } from '@/lib/api';

export default function SiteFooter({
  lang,
  categories = [],
  configs,
}: {
  lang: Lang;
  categories?: PublicCategory[];
  configs: PageContentMap | null;
}) {
  const t = dict[lang];
  const base = `/${lang}`;

  const info = configs?.contact_info;
  const footerInfo = configs?.footer_info;
  const address = pickLang(lang, info?.addressZh, info?.addressEn);
  const hours = pickLang(lang, info?.workHoursZh, info?.workHoursEn);
  const copyright = pickLang(lang, footerInfo?.copyrightZh, footerInfo?.copyrightEn) || t.footer.copyright;
  const icp = footerInfo?.icp?.trim() || t.footer.icp;

  // 中文用全角冒号、英文用半角（与各语言文案习惯一致）
  const colon = lang === 'en' ? ': ' : '：';
  const contactRows: string[] = [
    info?.phone?.trim() ? `${t.footer.phoneLabel}${colon}${info.phone.trim()}` : t.footer.phone,
    info?.email?.trim() ? `${t.footer.emailLabel}${colon}${info.email.trim()}` : t.footer.email,
    address ? `${t.footer.addressLabel}${colon}${address}` : t.footer.address,
    hours ? `${t.footer.hoursLabel}${colon}${hours}` : t.footer.hours,
  ];

  return (
    <div className="site-footer">
      <div className="container">
        <div className="cols">
          <div>
            {/* 深色背景以白色圆角底衬承载 logo（方案 §4.2） */}
            <span className="logo-tile">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="logo" src="/img/logo.jpg" alt={t.logoAlt} />
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
            {categories.length > 0 ? (
              categories.slice(0, 6).map((category) => (
                <Link key={category.id} href={`${base}/categories/${category.id}`}>
                  {pickLang(lang, category.nameZh, category.nameEn)}
                </Link>
              ))
            ) : (
              // 接口不可用时的降级占位（/categories 索引页为占位页）
              <Link href={`${base}/categories`}>{t.nav.categories}</Link>
            )}
          </div>
          <div>
            <h4>{t.footer.contact}</h4>
            {contactRows.map((row, index) => (
              <a key={index}>{row}</a>
            ))}
          </div>
        </div>
        <div className="bottom">
          <span>{copyright}</span>
          <span>{icp}</span>
        </div>
      </div>
    </div>
  );
}
