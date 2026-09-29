// 双语字段联动工具单元测试（方案 §5.3，任务 1.6 修正语义后固化）：
//   - 英文非空且与上次不同 → 人工校对，清除标记；
//   - 英文与上次一致 → 保持原标记（整表单保存不误判）；
//   - 英文为空中文非空 → 自动翻译并打标；翻译失败保持空（不阻塞保存）。
import { translateFields } from './translate-fields.util';
import type { TranslationService } from './translation.service';

function makeTranslation(translations: Record<string, string>): TranslationService {
  return {
    translateSafe: jest.fn(async (texts: string[]) => texts.map((t) => translations[t] ?? null)),
  } as unknown as TranslationService;
}

describe('translateFields', () => {
  it('人工填写英文（与上次不同）→ 清除标记', async () => {
    const translation = makeTranslation({});
    const result = await translateFields(
      [{ key: 'nameEn', zh: '企业', en: 'Company A', prevEn: 'Company' }],
      '["nameEn"]',
      translation,
    );
    expect(result.enByKey.get('nameEn')).toBe('Company A');
    expect(JSON.parse(result.machineFields ?? '[]')).toEqual([]);
    expect(translation.translateSafe).not.toHaveBeenCalled();
  });

  it('英文与上次一致 → 保持原标记（不误判为人工填写）', async () => {
    const translation = makeTranslation({});
    const result = await translateFields(
      [{ key: 'nameEn', zh: '企业', en: 'Company A', prevEn: 'Company A' }],
      '["nameEn"]',
      translation,
    );
    expect(result.enByKey.get('nameEn')).toBe('Company A');
    expect(JSON.parse(result.machineFields ?? '[]')).toEqual(['nameEn']);
  });

  it('英文为空且中文非空 → 自动翻译并打标', async () => {
    const translation = makeTranslation({ 企业: 'Company' });
    const result = await translateFields([{ key: 'nameEn', zh: '企业', en: null }], null, translation);
    expect(result.enByKey.get('nameEn')).toBe('Company');
    expect(JSON.parse(result.machineFields ?? '[]')).toEqual(['nameEn']);
  });

  it('翻译失败 → 保持为空且不抛错', async () => {
    const translation = makeTranslation({});
    const result = await translateFields([{ key: 'nameEn', zh: '企业', en: null }], null, translation);
    expect(result.enByKey.get('nameEn')).toBeNull();
    expect(result.machineFields).toBeNull();
  });

  it('中英均为空 → 保持为空不打标', async () => {
    const translation = makeTranslation({});
    const result = await translateFields([{ key: 'nameEn', zh: null, en: null }], '["other_en"]', translation);
    expect(result.enByKey.get('nameEn')).toBeNull();
    expect(JSON.parse(result.machineFields ?? '[]')).toEqual(['other_en']);
    expect(translation.translateSafe).not.toHaveBeenCalled();
  });

  it('多字段混合语义互不影响', async () => {
    const translation = makeTranslation({ 简介: 'Intro' });
    const result = await translateFields(
      [
        { key: 'nameEn', zh: '企业', en: 'Manual Name' }, // 人工
        { key: 'introEn', zh: '简介', en: null }, // 自动翻译
        { key: 'detailEn', zh: '详情', en: '' }, // 翻译失败
      ],
      '["nameEn","introEn","detailEn"]',
      translation,
    );
    expect(result.enByKey.get('nameEn')).toBe('Manual Name');
    expect(result.enByKey.get('introEn')).toBe('Intro');
    expect(result.enByKey.get('detailEn')).toBeNull();
    // 翻译失败时保留原标记（下次保存可重试），故 detailEn 仍带旧标记
    expect(JSON.parse(result.machineFields ?? '[]')).toEqual(['introEn', 'detailEn']);
  });

  it('无 prevEn 的非空英文仍视为人工填写', async () => {
    const translation = makeTranslation({});
    const result = await translateFields([{ key: 'nameEn', zh: '企业', en: 'X' }], '["nameEn"]', translation);
    expect(JSON.parse(result.machineFields ?? '[]')).toEqual([]);
  });
});
