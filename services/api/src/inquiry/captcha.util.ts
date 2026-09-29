// 图形验证码生成工具（PRD §9.2，零依赖）：
//   - 4 位字符，字符集去除易混淆的 0/O/1/I；
//   - SVG 输出：字符随机旋转 + 干扰线 + 干扰点，防简单 OCR；
//   - 验证码一次性使用（Redis 5 分钟），校验不区分大小写。
import { randomInt } from 'node:crypto';

export const CAPTCHA_LENGTH = 4;

const CAPTCHA_CHARSET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
const CHAR_COLORS = ['#1f4e79', '#2e7d32', '#b23c17', '#6a1b9a', '#00695c', '#37474f'];
const SVG_WIDTH = 120;
const SVG_HEIGHT = 40;
const NOISE_LINE_COUNT = 3;
const NOISE_DOT_COUNT = 20;

export function generateCaptchaCode(): string {
  let code = '';
  for (let i = 0; i < CAPTCHA_LENGTH; i++) {
    code += CAPTCHA_CHARSET[randomInt(CAPTCHA_CHARSET.length)];
  }
  return code;
}

/** 由验证码字符渲染 SVG（干扰元素随机生成，仅用于视觉混淆，不参与校验） */
export function generateCaptchaSvg(code: string): string {
  const parts: string[] = [];
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${SVG_WIDTH}" height="${SVG_HEIGHT}" viewBox="0 0 ${SVG_WIDTH} ${SVG_HEIGHT}">`,
  );
  parts.push(`<rect width="${SVG_WIDTH}" height="${SVG_HEIGHT}" fill="#f4f6f8"/>`);

  // 干扰线
  for (let i = 0; i < NOISE_LINE_COUNT; i++) {
    const x1 = Math.random() * SVG_WIDTH;
    const y1 = Math.random() * SVG_HEIGHT;
    const x2 = Math.random() * SVG_WIDTH;
    const y2 = Math.random() * SVG_HEIGHT;
    const opacity = 0.3 + Math.random() * 0.4;
    parts.push(
      `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="#90a4ae" stroke-opacity="${opacity.toFixed(2)}"/>`,
    );
  }

  // 干扰点
  for (let i = 0; i < NOISE_DOT_COUNT; i++) {
    const x = Math.random() * SVG_WIDTH;
    const y = Math.random() * SVG_HEIGHT;
    parts.push(`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="1" fill="#90a4ae"/>`);
  }

  // 字符：逐个随机旋转、随机颜色、随机垂直偏移
  const chars = [...code];
  const charWidth = SVG_WIDTH / (chars.length + 1);
  chars.forEach((char, index) => {
    const x = charWidth * (index + 1);
    const y = SVG_HEIGHT / 2 + (Math.random() * 12 - 6);
    const rotate = Math.random() * 50 - 25;
    const color = CHAR_COLORS[randomInt(CHAR_COLORS.length)];
    const fontSize = 26 + Math.random() * 4;
    parts.push(
      `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" font-size="${fontSize.toFixed(0)}" font-family="Arial, sans-serif" font-weight="bold" fill="${color}" text-anchor="middle" transform="rotate(${rotate.toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)})">${char}</text>`,
    );
  });

  parts.push('</svg>');
  return parts.join('');
}
