// machine_fields 标记工具单元测试（方案 §5.3）
import { isMachineTranslated, markMachineFields, parseMachineFields, unmarkMachineFields } from './machine-fields.util';

describe('parseMachineFields', () => {
  it('解析正常标记数组', () => {
    expect(parseMachineFields('["name_en"]')).toEqual(['name_en']);
  });

  it('空值/非法值/非数组均按空数组处理', () => {
    expect(parseMachineFields(null)).toEqual([]);
    expect(parseMachineFields('not-json')).toEqual([]);
    expect(parseMachineFields('{"a":1}')).toEqual([]);
  });

  it('过滤非字符串元素', () => {
    expect(parseMachineFields('["name_en", 3]')).toEqual(['name_en']);
  });
});

describe('markMachineFields', () => {
  it('追加标记并去重', () => {
    expect(markMachineFields('["name_en"]', ['intro_en', 'name_en'])).toBe('["name_en","intro_en"]');
  });

  it('空标记起步', () => {
    expect(markMachineFields(null, ['name_en'])).toBe('["name_en"]');
  });
});

describe('unmarkMachineFields', () => {
  it('清除指定标记保留其余', () => {
    expect(unmarkMachineFields('["name_en","intro_en"]', ['name_en'])).toBe('["intro_en"]');
  });
});

describe('isMachineTranslated', () => {
  it('判断字段是否处于机器翻译态', () => {
    expect(isMachineTranslated('["name_en"]', 'name_en')).toBe(true);
    expect(isMachineTranslated('["name_en"]', 'intro_en')).toBe(false);
    expect(isMachineTranslated(null, 'name_en')).toBe(false);
  });
});
