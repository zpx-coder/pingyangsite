// 内页占位（任务 2.1 路由骨架；各页真实内容在后续任务实现）
import { dict, type Lang } from '@/lib/i18n';

export default function PagePlaceholder({ lang, title }: { lang: Lang; title: string }) {
  const t = dict[lang];
  return (
    <div className="container page-body">
      <div className="crumb">
        <span className="cur">{title}</span>
      </div>
      <h1 className="serif" style={{ fontSize: 30, color: 'var(--ink)', letterSpacing: 2 }}>
        {title}
      </h1>
      <p style={{ marginTop: 14, color: 'var(--muted)' }}>{t.placeholder}</p>
    </div>
  );
}
