// 双语字段联动公共工具（方案 §5.3，类目/企业/产品/新闻模块共用）：
//   - 英文字段非空视为人工校对 → 清除该字段机器翻译标记；
//   - 英文字段为空且中文非空 → 自动翻译并打标记；翻译失败保持为空（不阻塞保存）。
import type { TranslationService } from './translation.service';
import { markMachineFields, unmarkMachineFields } from './machine-fields.util';

export interface BilingualFieldPair {
  /** machine_fields 中的字段键（如 "nameEn"） */
  key: string;
  zh: string | null | undefined;
  en: string | null | undefined;
  /**
   * 上次保存的英文值（可选）：本次提交值与上次一致时保持原标记。
   * 用于整表单保存场景（如页面内容配置，管理员提交完整配置对象），
   * 避免「未改动的机器翻译字段被误判为人工填写而清除标记」。
   */
  prevEn?: string | null | undefined;
}

export interface TranslateFieldsResult {
  machineFields: string | null;
  /** key → 最终英文值（null 表示保持为空） */
  enByKey: Map<string, string | null>;
}

export async function translateFields(
  pairs: BilingualFieldPair[],
  machineFields: string | null | undefined,
  translation: TranslationService,
): Promise<TranslateFieldsResult> {
  let marks = machineFields ?? null;
  const enByKey = new Map<string, string | null>();

  for (const pair of pairs) {
    const en = pair.en?.trim() ?? '';
    if (en !== '') {
      // 值与上次保存一致 → 视为未改动，保持原标记（不重复判为人工填写）
      if (pair.prevEn !== undefined && en === (pair.prevEn?.trim() ?? '')) {
        enByKey.set(pair.key, en);
        continue;
      }
      marks = unmarkMachineFields(marks, [pair.key]);
      enByKey.set(pair.key, en);
      continue;
    }
    const zh = pair.zh?.trim() ?? '';
    if (zh !== '') {
      const translated = await translation.translateSafe([zh], 'zh', 'en');
      if (translated?.[0]) {
        enByKey.set(pair.key, translated[0]);
        marks = markMachineFields(marks, [pair.key]);
        continue;
      }
    }
    enByKey.set(pair.key, null);
  }

  return { machineFields: marks, enByKey };
}
