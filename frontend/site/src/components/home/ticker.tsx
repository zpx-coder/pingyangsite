// 首页产业走马灯（对照设计稿 ui.html ticker）：前缀 + 上架类目名称循环滚动。
import Marquee from '../motion/marquee';
import { pickLang, type PublicCategory } from '../../lib/api';
import type { Dict, Lang } from '../../lib/i18n';

export default function Ticker({ categories, lang, t }: { categories: PublicCategory[]; lang: Lang; t: Dict }) {
  if (categories.length === 0) return null;
  const names = [t.home.tickerPrefix, ...categories.map((category) => pickLang(lang, category.nameZh, category.nameEn))];
  return (
    <Marquee className="ticker">
      {names.map((name, i) => (
        <span className="item" key={`${name}-${i}`}>
          {name} <i>✦</i>
        </span>
      ))}
    </Marquee>
  );
}
