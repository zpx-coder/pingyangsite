// TEXT 列 JSON 数组防御解析单元测试（任务 1.7）
import { parseJsonStringArray } from './json-array.util';

describe('parseJsonStringArray', () => {
  it('解析正常 JSON 字符串数组', () => {
    expect(parseJsonStringArray('["a.jpg","b.jpg"]')).toEqual(['a.jpg', 'b.jpg']);
  });

  it('空值按空数组处理', () => {
    expect(parseJsonStringArray(null)).toEqual([]);
    expect(parseJsonStringArray(undefined)).toEqual([]);
    expect(parseJsonStringArray('')).toEqual([]);
  });

  it('过滤非字符串元素（历史脏数据）', () => {
    expect(parseJsonStringArray('["a.jpg", 1, null, "b.jpg"]')).toEqual(['a.jpg', 'b.jpg']);
  });

  it('非数组 JSON 按空数组处理', () => {
    expect(parseJsonStringArray('{"x":1}')).toEqual([]);
  });

  it('非法 JSON 按空数组处理', () => {
    expect(parseJsonStringArray('not-json')).toEqual([]);
  });
});
