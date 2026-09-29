// 语言与文案字典（PRD §5.2）：[lang] 段原生落地 /zh-CN、/en；切换后当前页以另一语言重新渲染。
export const LANGS = ['zh-CN', 'en'] as const;
export type Lang = (typeof LANGS)[number];

export function isLang(value: string): value is Lang {
  return (LANGS as readonly string[]).includes(value);
}

export const dict = {
  'zh-CN': {
    topbarTag: '链接全球 · 服务采购商',
    hotlineLabel: '全国服务热线',
    contactCta: '联系我们',
    nav: { home: '首页', about: '平阳介绍', categories: '特色产业', news: '新闻动态', contact: '联系我们' },
    footer: {
      quickLinks: '快速链接',
      categories: '特色产业',
      contact: '联系方式',
      desc: '平阳产业带官网是平阳特色产业的官方展示与对接平台，集中展示平阳特色产业、优势产品与优质企业，链接全球贸易商机。',
      phone: '电话：0577-6372 8888',
      email: '邮箱：info@pycy.example.com',
      address: '地址：浙江省温州市平阳县昆阳镇县前街 1 号（示例）',
      hours: '时间：周一至周五 8:30–17:30',
      copyright: '© 2026 平阳产业带官网 · 版权所有',
      icp: '浙ICP备XXXXXXXX号（示例，上线前替换为真实备案号）',
    },
    notFound: { title: '页面不存在', back: '返回首页' },
    placeholder: '页面建设中，敬请期待',
  },
  en: {
    topbarTag: 'Connecting the World · Serving Buyers',
    hotlineLabel: 'Service Hotline',
    contactCta: 'Contact Us',
    nav: { home: 'Home', about: 'About Pingyang', categories: 'Industries', news: 'News', contact: 'Contact' },
    footer: {
      quickLinks: 'Quick Links',
      categories: 'Industries',
      contact: 'Contact',
      desc: 'The official showcase and matchmaking platform for Pingyang characteristic industries — presenting industries, quality products and premium enterprises, connecting global trade opportunities.',
      phone: 'Tel: 0577-6372 8888',
      email: 'Email: info@pycy.example.com',
      address: 'Add: No.1 Xianqian Street, Kunyang Town, Pingyang County, Wenzhou, Zhejiang (sample)',
      hours: 'Hours: Mon–Fri 8:30–17:30',
      copyright: '© 2026 Pingyang Industrial Belt · All rights reserved',
      icp: 'Zhejiang ICP XXXXXXXX (sample, replace before launch)',
    },
    notFound: { title: 'Page Not Found', back: 'Back to Home' },
    placeholder: 'This page is under construction',
  },
} as const satisfies Record<Lang, unknown>;

export type Dict = (typeof dict)['zh-CN'];
