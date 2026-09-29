// 图形验证码生成工具单元测试（PRD §9.2）：
//   - 4 位码、字符集不含易混淆字符（0/O/1/I）；
//   - SVG 含 4 个 <text> 字符节点；多次生成具有随机性。
import { generateCaptchaCode, generateCaptchaSvg } from './captcha.util';

// 抽样 100 次验证字符集约束（随机生成无法用单次断言覆盖字符集全体）
const SAMPLE_COUNT = 100;

describe('generateCaptchaCode', () => {
  it('固定 4 位长度', () => {
    for (let i = 0; i < SAMPLE_COUNT; i++) {
      expect(generateCaptchaCode()).toHaveLength(4);
    }
  });

  it('字符集不含易混淆字符 0/O/1/I，且均在许可字符集内', () => {
    const allowed = new Set('23456789ABCDEFGHJKLMNPQRSTUVWXYZ');
    for (let i = 0; i < SAMPLE_COUNT; i++) {
      for (const char of generateCaptchaCode()) {
        expect(allowed.has(char)).toBe(true);
        expect('0O1I').not.toContain(char);
      }
    }
  });

  it('多次生成具有随机性（100 次不全相同）', () => {
    const codes = new Set(Array.from({ length: SAMPLE_COUNT }, () => generateCaptchaCode()));
    expect(codes.size).toBeGreaterThan(1);
  });
});

describe('generateCaptchaSvg', () => {
  it('SVG 结构完整且包含 4 个字符 <text> 节点', () => {
    const svg = generateCaptchaSvg('AB12');
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg.endsWith('</svg>')).toBe(true);
    // 每个字符一个 <text> 节点（干扰线/点不影响计数）
    expect(svg.match(/<text /g)).toHaveLength(4);
    expect(svg).toContain('>A</text>');
    expect(svg).toContain('>B</text>');
    expect(svg).toContain('>1</text>');
    expect(svg).toContain('>2</text>');
  });

  it('含干扰线与干扰点（防简单 OCR）', () => {
    const svg = generateCaptchaSvg('ABCD');
    expect(svg.match(/<line /g)).toHaveLength(3);
    expect(svg.match(/<circle /g)).toHaveLength(20);
  });

  it('多次渲染具有随机性（旋转角/坐标随机）', () => {
    const svgs = new Set(Array.from({ length: 10 }, () => generateCaptchaSvg('ABCD')));
    expect(svgs.size).toBeGreaterThan(1);
  });
});
