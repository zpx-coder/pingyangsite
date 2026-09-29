// 分页窗口：≤7 页全列，否则首尾+当前±1 并省略号连接（类目页与产品/企业列表共用）
export function pageNumbers(current: number, total: number): (number | '…')[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  const set = new Set([1, total, current, current - 1, current + 1]);
  const pages = [...set].filter((n) => n >= 1 && n <= total).sort((a, b) => a - b);
  const out: (number | '…')[] = [];
  for (const n of pages) {
    if (out.length && n - (out[out.length - 1] as number) > 1) {
      out.push('…');
    }
    out.push(n);
  }
  return out;
}
