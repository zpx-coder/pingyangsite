// TEXT 列 JSON 数组防御解析（企业荣誉资质 / 产品图集共用，历史脏数据按空数组处理）
export function parseJsonStringArray(raw: string | null | undefined): string[] {
  if (!raw) {
    return [];
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return [];
  }
}
