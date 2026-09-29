'use client';

// 首页数据带（对照设计稿 ui.html stat-band）：4 组数字增长动画，
// 文案来自字典（官网品牌数据，后台未单独配置）。
import CountUp from '../motion/count-up';
import type { Dict } from '../../lib/i18n';

export default function StatBand({ t }: { t: Dict }) {
  return (
    <div className="container stat-band">
      <div className="inner">
        {t.home.stats.map((stat) => (
          <div className="stat" key={stat.label}>
            <div className="n">
              <CountUp end={stat.end} />
              {stat.suffix && <i>{stat.suffix}</i>}
            </div>
            <div className="l">{stat.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
