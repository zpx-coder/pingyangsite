// 首页联系带（PRD §6.1 / 对照设计稿 contact-band）：电话/邮箱来自后台 contact_info，
// 「查看完整联系方式」进入 /contact；配置全空时整带隐藏。
import Link from 'next/link';
import type { ContactInfoConfig } from '../../lib/api';
import type { Dict, Lang } from '../../lib/i18n';

export default function ContactBand({
  contact,
  lang,
  t,
}: {
  contact: ContactInfoConfig | undefined;
  lang: Lang;
  t: Dict;
}) {
  const phone = contact?.phone?.trim();
  const email = contact?.email?.trim();
  if (!phone && !email) return null;
  return (
    <div className="contact-band">
      <div className="container">
        <div>
          <h2>
            {t.home.contactBand.title} <i>{t.home.contactBand.titleAccent}</i>
          </h2>
          <div className="sub">{t.home.contactBand.sub}</div>
        </div>
        <div style={{ display: 'flex', gap: 26, alignItems: 'center' }}>
          <div className="items">
            {phone && (
              <div className="ci">
                <span className="ic">📞</span>
                {phone}
              </div>
            )}
            {email && (
              <div className="ci">
                <span className="ic">✉️</span>
                {email}
              </div>
            )}
          </div>
          <Link className="btn btn-gold" href={`/${lang}/contact`}>
            {t.home.contactBand.cta}
          </Link>
        </div>
      </div>
    </div>
  );
}
