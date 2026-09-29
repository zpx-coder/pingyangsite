// 首页特色产业类目区（PRD §6.1）：仅上架类目、按排序值升序（后端已排），最多 8 个；
// 卡片点击进入类目聚合页 /categories/[id]。
import Link from 'next/link';
import Reveal from '../motion/reveal';
import { pickLang, type PublicCategory } from '../../lib/api';
import type { Dict, Lang } from '../../lib/i18n';

const HOME_CATEGORY_MAX = 8;

export default function CategorySection({
  categories,
  lang,
  t,
}: {
  categories: PublicCategory[];
  lang: Lang;
  t: Dict;
}) {
  const items = categories.slice(0, HOME_CATEGORY_MAX);
  if (items.length === 0) return null;
  return (
    <div className="section" id="sec-cat" style={{ paddingBottom: 40 }}>
      <div className="container">
        <div className="sec-head rv">
          <div className="kicker">{t.home.secCat.kicker}</div>
          <h2>{t.home.secCat.title}</h2>
          <p>{t.home.secCat.desc}</p>
        </div>
        <div className="cat-grid">
          {items.map((category, i) => (
            <Reveal key={category.id} delay={(i % 4) + 1} className="cat-card">
              <Link href={`/${lang}/categories/${category.id}`} aria-label={pickLang(lang, category.nameZh, category.nameEn)}>
                <div className="im">
                  {category.iconUrl && <img src={category.iconUrl} alt="" />}
                  <span className="no">{String(i + 1).padStart(2, '0')}</span>
                </div>
                <div className="bd">
                  <h3>
                    {pickLang(lang, category.nameZh, category.nameEn)} <span className="en">{category.nameEn}</span>
                  </h3>
                  <p>{pickLang(lang, category.introZh, category.introEn)}</p>
                  <div className="more">
                    {t.home.secCat.more} <i>→</i>
                  </div>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </div>
  );
}
