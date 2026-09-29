// machine_fields 字段标记工具（方案 §5.3）：
//   - TEXT 列存 JSON 数组字符串，元素为「由机器翻译自动生成、未经人工校对」的英文字段名
//     （如 ["name_en","intro_en"]）；
//   - 保存时自动翻译 → 标记；人工编辑对应字段 → 清除标记；官网/后台据此展示「机器翻译」角标。
// 防御性解析：历史脏数据/空值一律按空数组处理。

export function parseMachineFields(raw: string | null | undefined): string[] {
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

/** 追加机器翻译标记（自动去重） */
export function markMachineFields(raw: string | null | undefined, keys: string[]): string {
  return JSON.stringify([...new Set([...parseMachineFields(raw), ...keys])]);
}

/** 清除指定字段的机器翻译标记（人工编辑后调用；返回新序列化值） */
export function unmarkMachineFields(raw: string | null | undefined, keys: string[]): string {
  return JSON.stringify(parseMachineFields(raw).filter((key) => !keys.includes(key)));
}

/** 给定英文字段是否仍为机器翻译态 */
export function isMachineTranslated(raw: string | null | undefined, key: string): boolean {
  return parseMachineFields(raw).includes(key);
}
