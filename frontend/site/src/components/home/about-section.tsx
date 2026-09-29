// 首页关于平阳区（PRD §6.1）：后台 home_about 配置驱动（图片/标题/摘要），
// 双图错落 + 金色边框装饰 + 迷你数据（字典静态），「了解更多」进入 /about。
import Link from 'next/link';
import Reveal from '../motion/reveal';
import { pickLang, type HomeAboutConfig } from '../../lib/api';
import type { Dict, Lang } from '../../lib/i18n';

export default function AboutSection({
  about,
  lang,
  t,
}: {
  about: HomeAboutConfig | undefined;
  lang: Lang;
  t: Dict;
}) {
  const title = pickLang(lang, about?.titleZh, about?.titleEn) || t.home.secAbout.fallbackTitle;
  const summary = pickLang(lang, about?.summaryZh, about?.summaryEn);
  const image = about?.image?.trim();
  // 图片与摘要均无配置时整区隐藏（后台未运营前首页不显示空区块）
  if (!image && !summary) return null;
  return (
    <div className="section" style={{ background: 'var(--warm)', borderTop: '1px solid var(--line)' }}>
      <div className="container">
        <div className="about-split">
          <Reveal className="about-imgs">
            <div className="frame" />
            {image && (
              <div className="big">
                <img src={image} alt={title} />
              </div>
            )}
            <div className="small">
              <img src="/img/about2.jpg" alt="" />
            </div>
          </Reveal>
          <Reveal delay={2} className="about-txt">
            <div className="kicker">{t.home.secAbout.kicker}</div>
            <h2>{title}</h2>
            {summary && <p>{summary}</p>}
            <div className="mini">
              {t.home.secAbout.mini.map((item) => (
                <div key={item.label}>
                  <div className="mn">
                    {item.value}
                    <span style={{ fontSize: 14 }}>{item.unit}</span>
                  </div>
                  <div className="ml">{item.label}</div>
                </div>
              ))}
            </div>
            <Link className="btn btn-deep" href={`/${lang}/about`}>
              {t.home.secAbout.more} →
            </Link>
          </Reveal>
        </div>
      </div>
    </div>
  );
}
