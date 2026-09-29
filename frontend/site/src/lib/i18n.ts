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
    home: {
      heroKicker: 'PINGYANG · ZHEJIANG · CHINA',
      heroExplore: '探索特色产业',
      stats: [
        { end: 6, suffix: '', label: '特色产业集群' },
        { end: 3000, suffix: '+', label: '制造企业' },
        { end: 80, suffix: '+', label: '出口国家地区' },
        { end: 200, suffix: '亿+', label: '塑编产业年产值' },
      ],
      tickerPrefix: '平阳特色产业集群',
      secCat: {
        kicker: '特色产业',
        title: '平阳特色产业类目',
        desc: '六大特色产业集群 · 点击卡片查看该类目下的优势产品与优质企业',
        more: '进入产业类目',
      },
      secAbout: {
        kicker: 'ABOUT PINGYANG',
        fallbackTitle: '关于平阳 · 山海之城',
        more: '了解更多',
        mini: [
          { value: '1051', unit: 'km²', label: '陆域面积' },
          { value: '90', unit: '万', label: '常住人口' },
          { value: '40', unit: 'min', label: '距机场车程' },
        ],
      },
      secNews: {
        kicker: '新闻热点',
        title: '平阳产业带动态',
        desc: '产业要闻 · 展会动态 · 政策速递',
        more: '更多新闻',
      },
      contactBand: {
        title: '欢迎来到',
        titleAccent: '平阳产业带',
        sub: '如需采购合作，请在产品详情页发送询盘，我们将在 1–2 个工作日内与您联系',
        cta: '查看完整联系方式',
      },
    },
    about: {
      videoKicker: '影像平阳',
      videoTitle: '平阳产业带宣传片',
      videoCaption: '山海之城 · 制造之都 —— 认识平阳，从这里开始',
      locKicker: '区位优势',
      locTitle: '浙江东南沿海 · 温州南部副中心',
      locBody:
        '平阳县位于浙江省东南沿海，隶属温州市，陆地面积约 1051 平方公里，常住人口约 90 万。县境依山面海，海岸线绵长，距温州龙湾国际机场约 40 分钟车程，甬台温高速、温福铁路穿境而过，交通区位优越。',
      locStats: [
        { value: '5', label: '高速互通' },
        { value: '2', label: '铁路站点' },
        { value: '1', label: '深水港区' },
      ],
      overviewKicker: '产业概况',
      overviewTitle: '六大特色产业集群',
    },
    category: {
      crumbIndustries: '特色产业',
      tabProducts: '产品列表',
      tabCompanies: '企业列表',
      statProducts: '产品',
      statCompanies: '企业',
      unlinkedCompany: '未关联企业',
      noProducts: '该类目下暂无产品，敬请期待',
      noCompanies: '该类目下暂无企业，敬请期待',
      loadError: '数据加载失败，请稍后重试',
      moqPrefix: 'MOQ ',
    },
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
    home: {
      heroKicker: 'PINGYANG · ZHEJIANG · CHINA',
      heroExplore: 'Explore Industries',
      stats: [
        { end: 6, suffix: '', label: 'Featured Industry Clusters' },
        { end: 3000, suffix: '+', label: 'Manufacturing Enterprises' },
        { end: 80, suffix: '+', label: 'Export Countries & Regions' },
        { end: 20, suffix: 'B+', label: 'Annual Woven Packaging Output' },
      ],
      tickerPrefix: 'Pingyang Featured Industries',
      secCat: {
        kicker: 'INDUSTRIES',
        title: 'Featured Industry Categories',
        desc: 'Six featured industry clusters · click a card to explore products and enterprises',
        more: 'Explore Category',
      },
      secAbout: {
        kicker: 'ABOUT PINGYANG',
        fallbackTitle: 'About Pingyang · City by the Sea',
        more: 'Learn More',
        mini: [
          { value: '1051', unit: 'km²', label: 'Land Area' },
          { value: '0.9', unit: 'M', label: 'Residents' },
          { value: '40', unit: 'min', label: 'To Airport' },
        ],
      },
      secNews: {
        kicker: 'NEWS',
        title: 'Pingyang Industry News',
        desc: 'Industry Updates · Exhibitions · Policies',
        more: 'More News',
      },
      contactBand: {
        title: 'Welcome to',
        titleAccent: 'Pingyang Industrial Belt',
        sub: 'For sourcing cooperation, please send an inquiry from the product detail page; we will contact you within 1–2 business days',
        cta: 'View Full Contact Info',
      },
    },
    about: {
      videoKicker: 'PINGYANG IN MOTION',
      videoTitle: 'Pingyang Industrial Belt Promo',
      videoCaption: 'City by the sea · A manufacturing powerhouse — get to know Pingyang',
      locKicker: 'LOCATION',
      locTitle: 'Southeast Zhejiang Coast · Southern Hub of Wenzhou',
      locBody:
        'Pingyang County is located on the southeast coast of Zhejiang Province, under the jurisdiction of Wenzhou. It covers about 1,051 km² of land with a resident population of around 0.9 million. Bordered by mountains and sea with a long coastline, it is about 40 minutes by car from Wenzhou Longwan International Airport, with the Yong-Tai-Wen Expressway and the Wenzhou-Fuzhou Railway passing through.',
      locStats: [
        { value: '5', label: 'Expressway Interchanges' },
        { value: '2', label: 'Railway Stations' },
        { value: '1', label: 'Deep-water Ports' },
      ],
      overviewKicker: 'INDUSTRY OVERVIEW',
      overviewTitle: 'Six Featured Industry Clusters',
    },
    category: {
      crumbIndustries: 'Industries',
      tabProducts: 'Products',
      tabCompanies: 'Enterprises',
      statProducts: 'Products',
      statCompanies: 'Enterprises',
      unlinkedCompany: 'Unlinked',
      noProducts: 'No products in this category yet',
      noCompanies: 'No enterprises in this category yet',
      loadError: 'Failed to load data, please try again later',
      moqPrefix: 'MOQ ',
    },
  },
} as const satisfies Record<Lang, unknown>;

/** 文案字典结构（字面量拓宽为宽类型，zh-CN 与 en 两种语言实例均可赋值） */
type Widen<T> = T extends string
  ? string
  : T extends number
    ? number
    : T extends boolean
      ? boolean
      : T extends readonly (infer U)[]
        ? readonly Widen<U>[]
        : { -readonly [K in keyof T]: Widen<T[K]> };

export type Dict = Widen<(typeof dict)['zh-CN']>;
