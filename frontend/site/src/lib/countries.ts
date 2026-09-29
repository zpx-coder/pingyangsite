// 询盘表单国家/地区下拉（PRD §6.4）：常用国家置顶 + 全部国家列表，双语展示。
// common=true 的常用国家排前；其余按地区排序。
export interface Country {
  zh: string;
  en: string;
  common?: boolean;
}

export const COMMON_COUNTRIES: Country[] = [
  { zh: '中国', en: 'China', common: true },
  { zh: '美国', en: 'United States', common: true },
  { zh: '德国', en: 'Germany', common: true },
  { zh: '英国', en: 'United Kingdom', common: true },
  { zh: '法国', en: 'France', common: true },
  { zh: '意大利', en: 'Italy', common: true },
  { zh: '西班牙', en: 'Spain', common: true },
  { zh: '荷兰', en: 'Netherlands', common: true },
  { zh: '俄罗斯', en: 'Russia', common: true },
  { zh: '日本', en: 'Japan', common: true },
  { zh: '韩国', en: 'South Korea', common: true },
  { zh: '印度', en: 'India', common: true },
  { zh: '澳大利亚', en: 'Australia', common: true },
  { zh: '加拿大', en: 'Canada', common: true },
  { zh: '巴西', en: 'Brazil', common: true },
  { zh: '墨西哥', en: 'Mexico', common: true },
  { zh: '阿联酋', en: 'United Arab Emirates', common: true },
  { zh: '沙特阿拉伯', en: 'Saudi Arabia', common: true },
  { zh: '土耳其', en: 'Türkiye', common: true },
  { zh: '泰国', en: 'Thailand', common: true },
];

export const OTHER_COUNTRIES: Country[] = [
  { zh: '越南', en: 'Vietnam' },
  { zh: '马来西亚', en: 'Malaysia' },
  { zh: '新加坡', en: 'Singapore' },
  { zh: '印度尼西亚', en: 'Indonesia' },
  { zh: '菲律宾', en: 'Philippines' },
  { zh: '巴基斯坦', en: 'Pakistan' },
  { zh: '孟加拉国', en: 'Bangladesh' },
  { zh: '伊朗', en: 'Iran' },
  { zh: '以色列', en: 'Israel' },
  { zh: '埃及', en: 'Egypt' },
  { zh: '南非', en: 'South Africa' },
  { zh: '尼日利亚', en: 'Nigeria' },
  { zh: '肯尼亚', en: 'Kenya' },
  { zh: '摩洛哥', en: 'Morocco' },
  { zh: '波兰', en: 'Poland' },
  { zh: '捷克', en: 'Czechia' },
  { zh: '匈牙利', en: 'Hungary' },
  { zh: '奥地利', en: 'Austria' },
  { zh: '瑞士', en: 'Switzerland' },
  { zh: '比利时', en: 'Belgium' },
  { zh: '瑞典', en: 'Sweden' },
  { zh: '挪威', en: 'Norway' },
  { zh: '丹麦', en: 'Denmark' },
  { zh: '芬兰', en: 'Finland' },
  { zh: '葡萄牙', en: 'Portugal' },
  { zh: '希腊', en: 'Greece' },
  { zh: '爱尔兰', en: 'Ireland' },
  { zh: '乌克兰', en: 'Ukraine' },
  { zh: '罗马尼亚', en: 'Romania' },
  { zh: '智利', en: 'Chile' },
  { zh: '阿根廷', en: 'Argentina' },
  { zh: '哥伦比亚', en: 'Colombia' },
  { zh: '秘鲁', en: 'Peru' },
  { zh: '新西兰', en: 'New Zealand' },
  { zh: '哈萨克斯坦', en: 'Kazakhstan' },
  { zh: '乌兹别克斯坦', en: 'Uzbekistan' },
  { zh: '伊拉克', en: 'Iraq' },
  { zh: '卡塔尔', en: 'Qatar' },
  { zh: '科威特', en: 'Kuwait' },
  { zh: '约旦', en: 'Jordan' },
  { zh: '阿尔及利亚', en: 'Algeria' },
  { zh: '加纳', en: 'Ghana' },
  { zh: '坦桑尼亚', en: 'Tanzania' },
  { zh: '埃塞俄比亚', en: 'Ethiopia' },
];

export const COUNTRIES: Country[] = [...COMMON_COUNTRIES, ...OTHER_COUNTRIES];
