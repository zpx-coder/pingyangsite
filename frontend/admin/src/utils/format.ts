// 展示格式化工具（后台通用）
/** 时间格式化为 YYYY-MM-DD HH:mm（列表「更新时间」列等） */
export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}
