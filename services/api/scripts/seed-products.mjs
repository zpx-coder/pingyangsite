/**
 * 六大类目产品数据种子脚本（负责人 2026-10-07 需求：每个产品类目下生成 10 个真实产品）
 *
 * 功能：
 *  1. 清理历史测试垃圾数据（测试产品/编辑器探针/复现测试产品/连通性探测 开头草稿）
 *  2. 校正 8 个演示产品的类目内排序与 companyId
 *  3. 按 name_zh 幂等写入 52 个新产品（status=1 已发布，配图 /img/p9.jpg~p60.jpg）
 *
 * 运行：cd services/api && node scripts/seed-products.mjs
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 历史测试垃圾数据的 name_zh 前缀
const JUNK_PREFIXES = ['测试产品', '编辑器探针', '复现测试产品', '连通性探测'];

// 类目 → 类目卡片配图（详情画廊第 2 张）
const CAT_CARD = { 9: '/img/cat1.jpg', 10: '/img/cat2.jpg', 11: '/img/cat3.jpg', 12: '/img/cat4.jpg', 13: '/img/cat5.jpg', 14: '/img/cat6.jpg' };

// 演示产品（id）在类目内的最终排序：新产品从其后顺延
const DEMO_SORTS = [
  { id: 1, categoryId: 9, sort: 1 },
  { id: 7, categoryId: 9, sort: 2 },
  { id: 2, categoryId: 10, sort: 1 },
  { id: 3, categoryId: 10, sort: 2 },
  { id: 5, categoryId: 11, sort: 1 },
  { id: 4, categoryId: 12, sort: 1 },
  { id: 6, categoryId: 13, sort: 1 },
  { id: 8, categoryId: 14, sort: 1 },
];

// 52 个新产品：cat=类目, sort=类目内排序, img=配图文件名, nameZh/nameEn, price/moq,
// introZh/introEn 一句话简介, advZh/advEn 产品优势段落, useZh/useEn 应用场景段落
const PRODUCTS = [
  // ─────────── cat9 宠物用品（公司 1 温州宠乐宠物用品有限公司）───────────
  { cat: 9, sort: 3, img: 'p09', nameZh: '橡胶发声宠物球', nameEn: 'Rubber Squeaky Pet Ball', price: '$0.45–0.85 / pc', moq: '2000 pcs',
    introZh: '高弹天然橡胶一体成型，内置双音发声装置，滚动时自动发声，表面防滑纹路设计，是水头镇宠物玩具产线的出口热销单品。',
    introEn: 'One-piece molded natural rubber ball with dual built-in squeakers and anti-slip surface texture, a best-selling export item from the pet toy production lines in Shuitou Town.',
    advZh: '采用高弹天然橡胶一体注塑成型，内置双重发声哨片，滚动即响，耐咬不变形；通过欧盟 EN71 与美国 ASTM F963 玩具安全标准，可定制颜色、尺寸与品牌 Logo 印刷。',
    advEn: 'Molded in one piece from high-elasticity natural rubber with dual squeaker inserts that sound on rolling; bite-resistant and shape-stable. Certified to EU EN71 and US ASTM F963 toy safety standards. Colors, sizes and brand logo printing are customizable.',
    useZh: '适合中小型犬、幼犬的互动玩耍与运动训练，广泛应用于宠物连锁店零售、跨境电商平台（亚马逊、速卖通）与品牌商贴牌定制。',
    useEn: 'Ideal for interactive play and exercise of small to medium dogs and puppies; widely used in pet chain retail, cross-border e-commerce platforms (Amazon, AliExpress) and OEM branding programs.' },
  { cat: 9, sort: 4, img: 'p10', nameZh: '宠物互动网球', nameEn: 'Interactive Tennis Ball for Pets', price: '$0.28–0.55 / pc', moq: '5000 pcs',
    introZh: '高密度环保毛毡包裹橡胶内芯，弹跳稳定、绒毛耐磨，适合抛接、寻回等互动训练，支持多规格混装定制。',
    introEn: 'Dense eco-friendly felt wrapped around a rubber core for stable bounce and abrasion-resistant nap; perfect for fetch and retrieval training, with mixed-size packaging options.',
    advZh: '橡胶内芯搭配高密度环保毛毡，弹跳高度稳定、球面绒毛耐啃耐磨，重量控制精准；经 SGS 环保检测，无刺激性气味，支持 5 种直径规格与混色装箱。',
    advEn: 'Rubber core with high-density eco felt cover offering stable bounce, chew-resistant nap and precise weight control; SGS-tested with no pungent odor. Five diameters and mixed-color cartons available.',
    useZh: '用于宠物抛接、寻回、敏捷训练等互动场景，适合犬舍、宠物训练机构批量采购，以及零售渠道家庭装销售。',
    useEn: 'For interactive fetch, retrieval and agility training; suited to bulk purchasing by kennels and pet training centers as well as family-pack retail channels.' },
  { cat: 9, sort: 5, img: 'p11', nameZh: '宠物玩具套装', nameEn: 'Pet Toy Gift Set', price: '$1.85–3.20 / set', moq: '1000 sets',
    introZh: '集发声球、绳结、磨牙棒于一体的三件式礼盒套装，主题配色统一，适合节庆促销与订阅礼盒渠道，可整柜混装。',
    introEn: 'A three-piece gift set combining a squeaky ball, rope knot and chew stick with a unified theme palette; ideal for holiday promotions and subscription boxes, available in mixed container loads.',
    advZh: '三件式组合覆盖发声、拔河、磨牙三类玩法，全系采用食品接触级原料，经 EN71 与 REACH 双认证；包装可定制礼盒、彩卡与节日主题（圣诞、万圣节等）。',
    advEn: 'Three-piece combo covering squeaking, tug-of-war and chewing play, all made from food-contact-grade materials with EN71 and REACH certifications. Customizable gift boxes, color cards and holiday themes (Christmas, Halloween, etc.).',
    useZh: '面向宠物用品买手店、电商节日大促组合装与订阅制礼盒客户，是欧美市场圣诞季的常青款。',
    useEn: 'Aimed at pet boutique retailers, holiday e-commerce bundles and subscription-box customers; an evergreen SKU for the Christmas season in European and American markets.' },
  { cat: 9, sort: 6, img: 'p12', nameZh: '乳胶磨牙玩具', nameEn: 'Natural Latex Chew Toy', price: '$0.65–1.40 / pc', moq: '2000 pcs',
    introZh: '100% 天然乳胶材质，柔韧耐咬、回弹迅速，表面凸点设计按摩牙龈，幼犬换牙期与成犬日常磨牙皆宜。',
    introEn: 'Made of 100% natural latex — flexible, bite-resistant with fast rebound; raised massage dots clean gums during teething and daily chewing.',
    advZh: '采用泰国进口 100% 天然乳胶，柔韧耐咬、拉伸 3 倍不断裂，表面按摩凸点帮助清洁牙垢；无 BPA、无塑化剂，通过 FDA 食品接触级检测，可定制异形模具。',
    advEn: '100% natural latex imported from Thailand, stretchable to 3x without breaking; massage dots help remove tartar. BPA-free and plasticizer-free with FDA food-contact certification; custom molds available.',
    useZh: '适用于幼犬换牙期磨牙、成年犬日常口腔保健，常见于宠物医院推荐单品、连锁门店与品牌贴牌渠道。',
    useEn: 'For puppy teething and daily dental care of adult dogs; a commonly recommended item in pet hospitals, chain stores and OEM channels.' },
  { cat: 9, sort: 7, img: 'p13', nameZh: '宠物毛绒玩具', nameEn: 'Plush Pet Toy', price: '$1.10–2.60 / pc', moq: '1000 pcs',
    introZh: '短毛绒面料配合双车缝加固工艺，内置发声器与响纸，耐撕扯不掉毛，造型设计超百款可选。',
    introEn: 'Short-pile plush with double-stitched reinforcement, built-in squeaker and crinkle paper; tear-resistant and lint-free with 120+ animal molds to choose from.',
    advZh: '选用 300g 短毛绒面料，双层车缝加固抗撕扯，内置发声器与响纸双重吸引；面料通过偶氮染料检测，水洗不掉色，现有动物造型模具 120 余款。',
    advEn: '300g short-pile fabric with double-layer stitching against tearing, dual attractors of a squeaker and crinkle paper; azo-dye-tested with colorfast washing. More than 120 existing animal molds.',
    useZh: '适合宠物陪伴安抚与互动拔河，是宠物店毛绒玩具货架的走量款，支持客户来图定制造型。',
    useEn: 'For pet companionship, calming and tug play — a volume seller on pet-store plush shelves; custom designs from customer artwork are supported.' },
  { cat: 9, sort: 8, img: 'p14', nameZh: '反光尼龙牵引绳', nameEn: 'Reflective Nylon Dog Leash', price: '$1.60–3.40 / pc', moq: '1000 pcs',
    introZh: '高密度尼龙织带嵌入 3M 反光纱线，夜间可视距离 30 米，锌合金挂扣承重 80kg，长度 1.2–2 米可选。',
    introEn: 'High-density nylon webbing interwoven with 3M reflective yarn, visible from 30 m at night; zinc-alloy swivel snap tested to 80 kg; lengths 1.2–2 m.',
    advZh: '高密度尼龙织带织入 3M 反光纱线，夜间 30 米外清晰可见；锌合金旋转挂扣经 80kg 拉力测试，车缝位包边加固，通过 REACH 与加州 65 提案检测。',
    advEn: 'High-density nylon webbing with 3M reflective yarn woven in, clearly visible from 30 m at night; zinc-alloy swivel snap passed 80 kg pull tests, reinforced stitching edges. REACH and California Proposition 65 compliant.',
    useZh: '适合日常遛狗、夜间出行与户外徒步，主打欧美宠物用品商超与线上品牌客户，支持印织 Logo 与多色定织。',
    useEn: 'For daily walks, night outings and hiking; targeting supermarkets and online brands in Europe and America, with woven-in logos and custom colors available.' },
  { cat: 9, sort: 9, img: 'p15', nameZh: '不锈钢链式项圈', nameEn: 'Stainless Steel Chain Collar', price: '$2.20–4.80 / pc', moq: '500 pcs',
    introZh: '304 不锈钢链节抛光处理，永不生锈、强度高，训练控制力强，含皮质内衬舒适款可选。',
    introEn: 'Mirror-polished 304 stainless steel links that never rust with high tensile strength for effective training control; padded comfort versions available.',
    advZh: '304 不锈钢链节经镜面抛光，抗拉强度超 300kg，接口焊接牢固不脱节；提供 5 种链宽与皮革/尼龙内衬舒适版本，SGS 盐雾测试 72 小时无锈蚀。',
    advEn: '304 stainless steel links with mirror polish and 300 kg+ tensile strength, firmly welded joints; five chain widths plus leather/nylon-padded comfort versions. 72-hour SGS salt-spray test with no corrosion.',
    useZh: '用于大型犬训练牵引与宠物展会展示，常见于专业训犬师装备清单与高端宠物用品品牌合作定制。',
    useEn: 'For large-dog training and pet show display; a standard in professional trainers equipment lists and premium pet-brand co-branding programs.' },
  { cat: 9, sort: 10, img: 'p16', nameZh: '宠物美容护理套装', nameEn: 'Pet Grooming Care Kit', price: '$3.80–6.90 / set', moq: '800 sets',
    introZh: '七件套组合含针梳、排梳、指甲剪、磨甲器等，ABS 手柄防滑设计，适合家庭日常护理与美容店使用。',
    introEn: 'A 7-piece kit including slicker brush, comb, nail clipper and nail file with anti-slip ABS handles, for home care and grooming salons.',
    advZh: '七件套含针梳、排梳、指甲剪、磨甲器、清洁刷等，ABS 防滑手柄与不锈钢梳齿，圆头设计不伤皮肤；通过 SGS 重金属与邻苯检测，可定制 PVC 收纳袋与品牌色。',
    advEn: 'Seven pieces including slicker brush, comb, nail clipper, nail file and cleaning brush; anti-slip ABS handles with stainless steel teeth and rounded tips that protect the skin. SGS-tested for heavy metals and phthalates; customizable PVC pouches and brand colors.',
    useZh: '面向家庭宠物日常护理、宠物美容院配套与礼品采购渠道，是水头宠物用品基地出口中东与东南亚市场的走量套装。',
    useEn: 'For home pet care, pet salon supplies and gifting channels — a volume set exported to the Middle East and Southeast Asia from the Shuitou pet products base.' },

  // ─────────── cat10 塑编包装（公司 2 浙江恒达塑业有限公司）───────────
  { cat: 10, sort: 3, img: 'p17', nameZh: '彩色编织布卷', nameEn: 'Colored Woven Fabric Rolls', price: '$0.30–0.55 / m²', moq: '5000 m²',
    introZh: 'PP/HDPE 圆织基布，幅宽 45–210cm 可定制，每平方米克重 60–200g，颜色多达 24 色，适合复合、涂膜与制袋深加工。',
    introEn: 'PP/HDPE circular-woven base fabric with customizable width 45–210 cm and weight 60–200 g/m² in up to 24 colors, for lamination, coating and bag-making.',
    advZh: '采用全新 PP/HDPE 粒子圆织而成，幅宽 45–210cm、克重 60–200g/㎡ 自由定制，拉伸强度按 GB/T 8946 检测；配色库 24 色，支持阻燃、抗紫外线等功能助剂添加。',
    advEn: 'Circular-woven from virgin PP/HDPE pellets with free customization of width (45–210 cm) and weight (60–200 g/m²); tensile strength tested per GB/T 8946. A 24-color library plus optional flame-retardant and UV-stabilized additives.',
    useZh: '作为编织袋、吨袋、篷布等产品的基布原料，供应国内外制袋工厂，亦可用于农业覆盖与工地围挡。',
    useEn: 'Base fabric for woven bags, FIBC and tarpaulins, supplied to bag-making plants at home and abroad; also used for agricultural covers and construction fencing.' },
  { cat: 10, sort: 4, img: 'p18', nameZh: '工艺编织拎袋', nameEn: 'Woven Handle Tote Bag', price: '$0.55–1.20 / pc', moq: '3000 pcs',
    introZh: '彩条编织袋身配提手设计，可重复使用，支持单色印刷与满版彩印，是商超购物袋与展会赠品的环保选择。',
    introEn: 'Striped woven bag body with reinforced handles, reusable and eco-friendly; supports spot-color and full-surface printing for supermarket and trade-fair use.',
    advZh: '彩条编织袋身配合加固提手，可承重 15kg 反复使用；印刷支持 1-4 色胶版印刷与整袋彩印覆膜，符合欧盟 REACH 与食品接触材料要求。',
    advEn: 'Striped woven body with reinforced handles carrying 15 kg for repeated use; 1–4 color flexo printing and full-surface printed lamination available. Compliant with EU REACH and food-contact material requirements.',
    useZh: '用作商超购物袋、展会伴手礼与品牌推广袋，出口欧美及日韩市场，可按客户稿件定制图案。',
    useEn: 'As supermarket shopping bags, trade-show giveaways and promotional bags; exported to Europe, America, Japan and Korea with custom artwork support.' },
  { cat: 10, sort: 5, img: 'p19', nameZh: '天然黄麻绳卷', nameEn: 'Natural Jute Rope Roll', price: '$0.45–0.95 / roll', moq: '5000 rolls',
    introZh: '三股捻制黄麻绳，直径 3–20mm，天然可降解，广泛用于园艺绑扎、包装捆扎与手工艺品制作。',
    introEn: 'Three-strand twisted jute rope, 3–20 mm diameter, natural and biodegradable, widely used for garden tying, packing and crafts.',
    advZh: '优质黄麻三股捻制，直径 3–20mm、长度 10–100m 规格齐全，拉力均匀不打滑；天然纤维可降解，通过 SGS 环保检测，可定制卷装与标签。',
    advEn: 'Premium jute three-strand twist with full specs of 3–20 mm diameter and 10–100 m length, even tension without slipping; biodegradable natural fiber, SGS eco-tested, with custom spools and labels available.',
    useZh: '用于园艺绑扎、农产品捆扎、快递打包与手工艺编织，是欧美花园用品渠道的常备耗材。',
    useEn: 'For garden tying, produce binding, parcel packing and handicraft weaving — a staple consumable in European and American garden-supply channels.' },
  { cat: 10, sort: 6, img: 'p20', nameZh: '农用编织绳网', nameEn: 'Agricultural Braided Rope Net', price: '$0.35–0.80 / m²', moq: '10000 m²',
    introZh: '高强 PP 绳编织网，网孔 2–10cm 可选，抗撕裂耐老化，用于果园防鸟、蔬菜爬藤与牧场围栏。',
    introEn: 'High-strength PP rope netting with 2–10 cm mesh options, tear- and aging-resistant, for orchard bird-proofing, vegetable climbing and pasture fencing.',
    advZh: '高强 PP 圆丝绳编织，网孔 2–10cm 多规格可选，边角包绳加固；添加抗紫外线母粒，户外使用寿命 3 年以上，支持定制幅宽与颜色。',
    advEn: 'Braided from high-strength PP monofilament rope with multiple mesh options (2–10 cm) and rope-bound edges; UV-stabilized masterbatch gives 3+ years outdoor life. Custom widths and colors supported.',
    useZh: '应用于果园防鸟网、蔬菜爬藤网、牧场围网与建筑防坠网等场景，供应农资经销商与工程公司。',
    useEn: 'For orchard bird netting, vegetable trellis nets, pasture fencing and construction debris nets; supplied to agricultural distributors and engineering companies.' },
  { cat: 10, sort: 7, img: 'p21', nameZh: '彩色编织网绳', nameEn: 'Colored Braided Netting', price: '$0.30–0.70 / m²', moq: '10000 m²',
    introZh: '多色交织编织网，色彩鲜艳抗褪色，用于体育场地围网、儿童游乐设施与装饰挂网。',
    introEn: 'Multi-color interwoven netting with vivid fade-resistant colors for sports fencing, playground facilities and decorative hanging.',
    advZh: '多色丝线交织编织，色牢度达 4 级以上，日晒不褪色；网体柔软可折叠，边缘缝制包边，通过甲醛与重金属安全检测，可定制配色方案。',
    advEn: 'Multi-color yarns interwoven with colorfastness above grade 4, no fading under sunlight; soft foldable net body with stitched edges. Passed formaldehyde and heavy-metal safety tests; custom color schemes available.',
    useZh: '用于体育场馆围网、游乐场安全网、商业空间装饰与临时分区，出口东南亚与中东工程市场。',
    useEn: 'For stadium fencing, playground safety nets, commercial space decoration and temporary partitioning; exported to engineering markets in Southeast Asia and the Middle East.' },
  { cat: 10, sort: 8, img: 'p22', nameZh: '编织渔网', nameEn: 'Woven Fishing Net', price: '$1.20–3.50 / kg', moq: '2000 kg',
    introZh: '尼龙与聚乙烯网线编织渔网，网目 1–20cm，适用于捕捞、养殖围网与防逃网，支持定制网目与规格。',
    introEn: 'Nylon and polyethylene woven fishing nets with 1–20 cm mesh for catching, aquaculture fencing and escape prevention; custom mesh and specs available.',
    advZh: '选用 PA 尼龙与 HDPE 网线，单结编织强度高、水阻小，网目 1–20cm 任意定制；经海水浸泡测试，抗老化性能优异，支持按渔场图纸定制成型。',
    advEn: 'PA nylon and HDPE twines with single-knot weaving for high strength and low water drag; any mesh from 1–20 cm. Excellent anti-aging after seawater immersion tests; custom shaping per fishery drawings supported.',
    useZh: '用于近海捕捞、淡水养殖围网、防逃网与体育用网，长期供应东南沿海渔业公司与出口贸易商。',
    useEn: 'For inshore fishing, freshwater aquaculture fencing, escape-proof nets and sports nets; long-term supplier to coastal fishery companies and export traders.' },
  { cat: 10, sort: 9, img: 'p23', nameZh: '编织安全防护网', nameEn: 'Woven Safety Net', price: '$0.60–1.40 / m²', moq: '5000 m²',
    introZh: '建筑用高强防护网，网目细密、承重力强，符合建筑工地围护与防坠要求，阻燃款可选。',
    introEn: 'High-strength construction safety netting with fine dense mesh and strong load capacity for site enclosure and fall protection; flame-retardant version available.',
    advZh: '高强 PE 丝编织，细目高密结构有效拦截坠落物，附阻燃母粒款通过 GB 5725 建筑安全网标准检测；四边包绳带挂钩，安装便捷，可重复使用。',
    advEn: 'Woven from high-strength PE filament with a fine dense structure that stops falling objects; the flame-retardant version passes GB 5725 construction safety net tests. Rope-bound edges with hooks for easy installation and reuse.',
    useZh: '用于建筑工地外架防护、市政工程围护与仓储分隔，广泛供应建筑公司与工程承包商。',
    useEn: 'For scaffolding protection, municipal works enclosure and warehouse partitioning; widely supplied to construction companies and engineering contractors.' },
  { cat: 10, sort: 10, img: 'p24', nameZh: '船用编织绳缆', nameEn: 'Marine Mooring Ropes', price: '$1.50–4.20 / kg', moq: '1000 kg',
    introZh: '八股与十二股编织绳缆，直径 8–80mm，断裂强力高、耐海水腐蚀，用于船舶系泊与港口作业。',
    introEn: 'Eight- and twelve-strand braided mooring ropes, 8–80 mm diameter, high breaking strength and seawater resistance for ship mooring and port operations.',
    advZh: 'PP/涤纶混编绳缆，八股、十二股编织结构，直径 8–80mm，断裂强力按 CCS 规范检测；抗海水腐蚀、抗紫外老化，支持按船东要求定制长度与端部处理。',
    advEn: 'PP/polyester blended braids in eight- and twelve-strand constructions, 8–80 mm diameter with breaking strength tested per CCS specifications; seawater- and UV-resistant. Custom lengths and end treatments per ship-owner requirements.',
    useZh: '用于货船、渔船系泊缆与港口拖带作业，长期供应沿海船厂、港务公司与船舶配套商。',
    useEn: 'For mooring lines of cargo ships and fishing vessels and port towing operations; long-term supplier to coastal shipyards, port authorities and marine outfitters.' },

  // ─────────── cat11 印刷包装（公司 3 温州瑞丰印刷包装有限公司）───────────
  { cat: 11, sort: 2, img: 'p25', nameZh: '三层瓦楞纸箱', nameEn: 'Triple-Wall Corrugated Box', price: '$0.35–1.60 / pc', moq: '1000 pcs',
    introZh: 'B/C 瓦三层结构，抗压强度高，克重配比可定制，适合家电、日化等重物运输包装，支持印刷开槽一体成型。',
    introEn: 'Triple-wall B/C flute structure with high compressive strength and customizable paper grades, ideal for heavy-goods shipping such as home appliances and daily chemicals.',
    advZh: 'B/C 瓦三层瓦楞结构，边压强度 8kN/m 起，五层、七层加重款可选；水墨印刷环保无味，支持印刷、开槽、模切一体成型，按 ISTA 标准通过跌落测试。',
    advEn: 'Triple-wall B/C flute construction with edge crush strength from 8 kN/m, plus five- and seven-ply heavy-duty options; water-based ink printing is eco-friendly and odorless. Print, slotting and die-cutting in one pass, ISTA drop-test compliant.',
    useZh: '用于家电、日化、农产品外销运输包装，长期配套本地制造企业与跨境电商大件卖家。',
    useEn: 'For export shipping packaging of appliances, daily chemicals and agricultural products; long-term partner to local manufacturers and cross-border e-commerce bulk sellers.' },
  { cat: 11, sort: 3, img: 'p26', nameZh: '彩印天地盖礼品盒', nameEn: 'Printed Lid-and-Base Gift Box', price: '$0.85–2.60 / pc', moq: '3000 pcs',
    introZh: '灰板裱 157g 铜版纸四色印刷，覆哑膜配烫金工艺，天地盖结构，用于食品、化妆品与节庆礼品包装。',
    introEn: 'Greyboard wrapped with 157 gsm art paper, four-color printing with matte lamination and hot-foil stamping; lid-and-base structure for food, cosmetics and festive gifts.',
    advZh: '灰板内衬裱 157g 铜版纸，海德堡四色胶印，覆哑膜/触感膜可选，烫金、击凸、UV 局部上光工艺齐全；自动糊盒线日产 5 万只，尺寸按需定制。',
    advEn: 'Greyboard core with 157 gsm art paper, Heidelberg four-color offset printing, matte/soft-touch lamination options, plus hot-foil, embossing and spot UV finishes; auto box-gluing line produces 50,000 units daily with custom sizes.',
    useZh: '应用于食品礼盒、化妆品套装与节庆伴手礼包装，服务品牌商与礼品公司，支持从设计稿到成品的全套打样。',
    useEn: 'For food gift boxes, cosmetic sets and festive gift packaging; serving brand owners and gift companies with full prototyping from artwork to finished product.' },
  { cat: 11, sort: 4, img: 'p27', nameZh: '精品缎带礼盒', nameEn: 'Premium Ribbon Gift Box', price: '$1.40–3.80 / pc', moq: '2000 pcs',
    introZh: '珠光纸裱面搭配手工缎带蝴蝶结，内衬 EVA 植绒，质感细腻，是高端礼品与珠宝包装的热门款式。',
    introEn: 'Pearlescent paper surface with hand-tied satin ribbon bow and flocked EVA insert — a popular style for premium gifts and jewelry packaging.',
    advZh: '珠光/触感纸裱面，手工缎带蝴蝶结工艺，内衬 EVA 植绒开槽精准；支持烫金 Logo、UV 浮雕与磁吸翻盖结构，出货前 100% 全检。',
    advEn: 'Pearlescent/soft-touch paper wrapping, hand-tied satin bows, precisely slotted flocked EVA inserts; hot-foil logos, UV relief and magnetic flip lids available. 100% inspection before shipment.',
    useZh: '面向珠宝首饰、腕表、高端美妆与商务伴手礼客户，适用于电商礼盒与门店陈列场景。',
    useEn: 'For jewelry, watches, premium beauty and corporate gifting customers; fits e-commerce gift boxes and in-store display.' },
  { cat: 11, sort: 5, img: 'p28', nameZh: '折叠快递纸箱', nameEn: 'Foldable Shipping Carton', price: '$0.12–0.45 / pc', moq: '5000 pcs',
    introZh: '三层瓦楞免胶折叠结构，平张储运省空间，抗压 300kg 以上，支持彩色印刷，是电商发货包装的走量款。',
    introEn: 'Triple-wall glue-free folding structure shipped flat to save 70% storage volume, compressive strength 300 kg+, with color printing — a volume shipping-carton SKU.',
    advZh: '三层瓦楞免胶折叠成型，平张交付节省 70% 储运体积，抗压 300kg 以上；印刷支持单色至四色，出口欧洲可提供 FSC 认证纸张。',
    advEn: 'Glue-free folding construction delivered flat, saving 70% storage and freight volume with 300 kg+ compressive strength; 1–4 color printing, FSC-certified paper available for European exports.',
    useZh: '用于电商包裹、快递发货与仓储周转，长期配套跨境电商卖家与国内电商产业园企业。',
    useEn: 'For e-commerce parcels, express shipping and warehouse turnover; long-term partner to cross-border sellers and e-commerce park enterprises.' },
  { cat: 11, sort: 6, img: 'p29', nameZh: '巧克力包装礼盒', nameEn: 'Chocolate Packaging Gift Box', price: '$0.60–1.80 / pc', moq: '3000 pcs',
    introZh: '食品级白卡纸印刷，内衬食品级 PET 托，密封性能好，支持定制开窗与烫金，适用于巧克力与糖果品牌。',
    introEn: 'Food-grade white card with food-safe PET trays, good sealing and customizable windows and foiling — designed for chocolate and candy brands.',
    advZh: '食品级白卡纸配食品级 PET 内托，印刷油墨通过 FDA 食品包装检测；可定制开窗贴膜、烫金与丝带提手，按客户产品尺寸一对一开模。',
    advEn: 'Food-grade white card with food-safe PET trays; inks pass FDA food-packaging tests. Custom window patching, hot-foil stamping and ribbon handles available, with one-to-one mold making per product dimensions.',
    useZh: '用于巧克力、曲奇、糖果等食品包装，服务食品厂、烘焙连锁与节庆礼品市场。',
    useEn: 'For chocolate, cookie and candy packaging; serving food factories, bakery chains and festive gift markets.' },
  { cat: 11, sort: 7, img: 'p30', nameZh: '糖果礼品包装盒', nameEn: 'Candy Gift Packaging Box', price: '$0.45–1.20 / pc', moq: '5000 pcs',
    introZh: '抽屉式与翻盖式糖果盒，250g 铜版纸覆膜印刷，花色清新，支持小批量快速打样，适合婚庆与伴手礼市场。',
    introEn: 'Drawer-type and flip-top candy boxes in laminated 250 gsm art paper with fresh color palettes; quick small-batch sampling for weddings and gifting.',
    advZh: '抽屉式、翻盖式结构齐全，250g 铜版纸覆膜，四色印刷色彩饱和；7 天快速打样，小批量 500 只起做，支持婚庆定制姓名与日期印刷。',
    advEn: 'Complete drawer and flip-top structures in laminated 250 gsm art paper with saturated four-color printing; 7-day sampling, minimum 500 units, with personalized names and dates for wedding orders.',
    useZh: '用于婚庆喜糖、会议伴手礼与商超促销装，满足短周期、多花色的市场节奏。',
    useEn: 'For wedding candies, conference favors and supermarket promotions — matching the market short cycles and multiple designs.' },
  { cat: 11, sort: 8, img: 'p31', nameZh: '节日礼品包装纸', nameEn: 'Festive Gift Wrapping Paper', price: '$0.08–0.22 / sheet', moq: '10000 sheets',
    introZh: '80g 双胶纸与珠光纸包装纸，双面图案设计，圣诞、新年等节庆主题 200 余款，可定制专属图案。',
    introEn: '80 gsm offset and pearlescent wrapping paper with double-sided designs — 200+ festive themes for Christmas and New Year, with custom patterns available.',
    advZh: '80g 双胶纸/珠光纸材质，四色+专色印刷，节庆主题花型库 200 余款；抗撕裂、折痕平整，可定制品牌专属图案，支持卷装与平张两种包装。',
    advEn: '80 gsm offset/pearlescent paper with four-color plus spot-color printing and a library of 200+ festive patterns; tear-resistant with clean fold lines. Brand-exclusive designs supported in roll or sheet packaging.',
    useZh: '用于礼品包装、节庆装饰与零售耗材，供应欧美礼品渠道与国内文创门店。',
    useEn: 'For gift wrapping, festive decoration and retail consumables; supplied to gift channels in Europe and America and domestic cultural-creative stores.' },
  { cat: 11, sort: 9, img: 'p32', nameZh: '礼品包装与标签定制', nameEn: 'Custom Gift Wrap & Tags', price: '$0.06–0.18 / pc', moq: '10000 pcs',
    introZh: '礼品吊牌、贴纸与丝带一站式定制，专色印刷加烫金工艺，最小起订灵活，是品牌礼品包装的点睛之选。',
    introEn: 'One-stop customization of gift tags, stickers and ribbons with spot-color printing and hot foiling, flexible MOQs — the finishing touch for branded gift packaging.',
    advZh: '吊牌、贴纸、丝带一体化供应，300g 白卡/牛皮纸材质可选，专色印刷、烫金烫银、异形模切工艺齐全；支持来图定制，最小起订量灵活。',
    advEn: 'Integrated supply of tags, stickers and ribbons in 300 gsm white card or kraft paper; spot-color printing, gold/silver foiling and die-cut shapes all available. Artwork-to-product customization with flexible minimums.',
    useZh: '用于品牌礼品包装配套、服装吊牌与电商包裹装饰，服务礼品公司与零售品牌。',
    useEn: 'For brand gift packaging accessories, garment hang tags and e-commerce parcel decoration; serving gifting companies and retail brands.' },
  { cat: 11, sort: 10, img: 'p33', nameZh: '高端彩印礼盒', nameEn: 'Luxury Printed Gift Box', price: '$2.20–5.60 / pc', moq: '1000 pcs',
    introZh: '特种纸裱面、多层结构设计，融合烫金、UV、植绒等工艺，用于高端酒品、茶叶与收藏品包装。',
    introEn: 'Specialty paper surfaces with multi-layer construction combining foiling, UV and flocking processes — for premium liquor, tea and collectibles packaging.',
    advZh: '特种纸（触感纸、珠光纸、皮革纹）裱面，五层灰板结构挺括有型；烫金、UV 浮雕、植绒、磁吸开合工艺全系支持，全检出货，适合高单价产品。',
    advEn: 'Specialty papers (soft-touch, pearlescent, leather-grain) over a rigid five-ply greyboard core; full support for hot foiling, UV relief, flocking and magnetic closures, with 100% inspection for high-value products.',
    useZh: '应用于高端酒水、茶叶礼盒、收藏品与奢侈品包装，是品牌旗舰款包装的优选供应商。',
    useEn: 'For premium liquor, tea gift boxes, collectibles and luxury packaging — the preferred supplier for brand flagship packaging.' },

  // ─────────── cat12 礼品文具（公司 4 温州博文文具有限公司）───────────
  { cat: 12, sort: 2, img: 'p34', nameZh: '金属商务钢笔', nameEn: 'Metal Business Fountain Pen', price: '$1.85–4.50 / pc', moq: '2000 pcs',
    introZh: '黄铜笔身电镀工艺，铱金笔尖书写顺滑，配吸墨器与礼盒，是商务礼品与企业定制文具的热门款。',
    introEn: 'Brass body with electroplated finish and smooth iridium nib, with converter and gift box — a popular choice for business gifts and corporate custom stationery.',
    advZh: '黄铜笔杆经多层电镀（金、银、枪色可选），铱金笔尖书写顺滑不断墨；配旋转吸墨器与磁吸礼盒，支持激光镭雕企业 Logo，SGS 无铅检测。',
    advEn: 'Brass barrel with multi-layer electroplating (gold, silver, gunmetal), smooth iridium nib without ink skipping; includes converter and magnetic gift box, laser-engraved corporate logos supported, SGS lead-free tested.',
    useZh: '用于商务馈赠、企业周年定制与会议纪念品，常见于礼品公司与企业采购渠道。',
    useEn: 'For business gifting, corporate anniversary sets and conference souvenirs; common in gifting companies and corporate procurement channels.' },
  { cat: 12, sort: 3, img: 'p35', nameZh: '商务笔记本', nameEn: 'Business Notebook', price: '$0.85–2.40 / pc', moq: '3000 pcs',
    introZh: 'PU 皮封面配 80g 米黄道林纸，锁线装订可 180° 平摊，烫金工艺可选，是会议记录与品牌伴手礼的常青款。',
    introEn: 'PU leather cover with 80 gsm cream writing paper, sewn binding that lays flat at 180°, optional hot-foil stamping — an evergreen for meetings and brand gifts.',
    advZh: 'PU 皮封面手感细腻，内页 80g 米黄道林纸书写不洇墨，锁线胶装可 180° 平摊；支持压印、烫金 Logo 与活页结构定制，通过 REACH 检测。',
    advEn: 'Fine-touch PU cover, non-bleeding 80 gsm cream paper, sewn-and-glued binding laying flat at 180°; embossing, foil-stamped logos and loose-leaf structures customizable, REACH compliant.',
    useZh: '用于会议记录、企业礼品与文创零售，供应连锁文具品牌与企事业单位采购。',
    useEn: 'For meeting notes, corporate gifts and cultural-retail; supplying stationery chain brands and institutional procurement.' },
  { cat: 12, sort: 4, img: 'p36', nameZh: '学生文具套装', nameEn: 'Student Stationery Set', price: '$1.50–3.60 / set', moq: '2000 sets',
    introZh: '铅笔、橡皮、尺子、卷笔刀等 10 件组合装，附收纳盒，图案主题可定制，是开学季与跨境电商的爆款套装。',
    introEn: 'A 10-piece combo of pencils, eraser, ruler, sharpener and more in a storage box with customizable themes — a bestseller for back-to-school and cross-border e-commerce.',
    advZh: '10 件套含铅笔、橡皮、直尺、卷笔刀、便签本等，ABS 收纳盒分格整齐；环保水漆印花，通过 EN71-3 与 ASTM D4236 检测，支持卡通形象授权定制。',
    advEn: 'Ten pieces including pencils, eraser, ruler, sharpener and sticky notes in a compartmentalized ABS box; eco water-based paint prints pass EN71-3 and ASTM D4236, with licensed cartoon customization supported.',
    useZh: '面向开学季促销、亚马逊与速卖通学生文具类目，以及零售连锁的套装陈列。',
    useEn: 'For back-to-school promotions, Amazon/AliExpress student stationery categories and retail chain set displays.' },
  { cat: 12, sort: 5, img: 'p37', nameZh: '学生作业本', nameEn: 'Student Exercise Book', price: '$0.12–0.35 / pc', moq: '10000 pcs',
    introZh: '60g 双胶纸 40 页骑马订装订，内页横线、方格、拼音格多规格，封面覆膜耐折，支持学校定制印刷。',
    introEn: '40-page saddle-stitched exercise book in 60 gsm paper with ruled, grid, pinyin and four-line layouts; laminated cover resists folding; school customization available.',
    advZh: '60g 双胶纸内页，横线、方格、拼音、英语四线多规格可选，骑马订装订牢固；封面覆亮膜耐折耐脏，油墨通过中国环境标志认证，支持校名与班级定制。',
    advEn: '60 gsm pages in ruled, grid, pinyin and English four-line layouts with sturdy saddle stitching; glossy-laminated cover resists folding and soiling, inks certified by China Environmental Labeling, school names and classes customizable.',
    useZh: '用于中小学教学配套、文具批发与政企采购，长期供应本县及周边教育市场。',
    useEn: 'For primary and secondary school supplies, stationery wholesale and institutional procurement; long-term supplier to the local and surrounding education markets.' },
  { cat: 12, sort: 6, img: 'p38', nameZh: '办公文具套装', nameEn: 'Office Stationery Kit', price: '$2.60–5.80 / set', moq: '1000 sets',
    introZh: '订书机、剪刀、胶带座、回形针等 8 件组合，ABS 与不锈钢材质，适合新办公室布置与企业福利采购。',
    introEn: 'An 8-piece combo of stapler, scissors, tape dispenser, paperclip holder and more in ABS and stainless steel — for new office setup and corporate welfare procurement.',
    advZh: '8 件套含订书机、剪刀、胶带座、回形针盒、笔筒等，ABS 外壳配不锈钢刀片，开合顺滑；通过 BSCI 验厂体系，支持企业 Logo 丝印与礼盒包装。',
    advEn: 'Eight pieces including stapler, scissors, tape dispenser, clip box and pen holder; ABS shells with stainless steel blades for smooth operation. BSCI-audited factory, corporate logo silk-screen and gift-box packaging supported.',
    useZh: '用于新办公室布置、企业福利与展会赠品，常见于办公用品连锁与企业集采招标。',
    useEn: 'For new-office outfitting, corporate welfare and trade-show giveaways; common in office-supply chains and corporate procurement tenders.' },
  { cat: 12, sort: 7, img: 'p39', nameZh: '创意文具', nameEn: 'Creative Stationery', price: '$0.55–1.50 / pc', moq: '3000 pcs',
    introZh: '造型橡皮、异形回形针、趣味贴纸等创意小文具，色彩活泼，是文创门店与礼品渠道的高毛利单品。',
    introEn: 'Shaped erasers, novelty clips, fun stickers and more creative stationery in lively colors — high-margin items for cultural stores and gifting channels.',
    advZh: '造型橡皮、异形回形针、趣味贴纸、伸缩书签等创意品类，色彩饱和度高、细节圆润无毛刺；食品级硅胶与环保 PVC 材质，通过 EN71 检测，支持买断造型开发。',
    advEn: 'Creative categories including shaped erasers, novelty clips, stickers and retractable bookmarks with saturated colors and burr-free detail; food-grade silicone and eco PVC, EN71-tested, exclusive mold development supported.',
    useZh: '面向文创书店、精品礼品店与电商文创类目，适合节日礼赠与冲动消费陈列。',
    useEn: 'For cultural bookstores, boutique gift shops and e-commerce creative categories; ideal for festive gifting and impulse-purchase displays.' },
  { cat: 12, sort: 8, img: 'p40', nameZh: '文具收纳袋', nameEn: 'Stationery Storage Pouch', price: '$0.45–1.10 / pc', moq: '3000 pcs',
    introZh: '帆布与牛津布材质笔袋，大容量多隔层设计，印刷色彩鲜艳，是学生用品与定制礼品的走量款。',
    introEn: 'Canvas and oxford-fabric pencil pouches with large capacity and multiple compartments, vibrant printing — a volume item for students and custom gifts.',
    advZh: '帆布/牛津布双材质可选，多隔层大容量设计，拉链顺滑耐用；丝网印刷与数码热转印工艺可选，色彩鲜艳不褪色，支持班级与品牌定制。',
    advEn: 'Canvas or oxford fabric options with multi-compartment large capacity and smooth durable zippers; silk-screen or digital heat-transfer printing with fade-resistant colors, class and brand customization supported.',
    useZh: '用于学生文具收纳、办公桌面整理与品牌促销礼品，供应批发市场与跨境电商卖家。',
    useEn: 'For student stationery storage, desk organization and brand promotional gifts; supplied to wholesale markets and cross-border sellers.' },
  { cat: 12, sort: 9, img: 'p41', nameZh: '办公桌面套装', nameEn: 'Desk Organizer Set', price: '$3.20–6.50 / set', moq: '500 sets',
    introZh: '笔筒、文件架、收纳盒、手机支架五件套，配色统一，材质加厚，是企业礼品与桌面收纳的热销组合。',
    introEn: 'A five-piece set of pen holder, file rack, organizer boxes and phone stand with unified colors and thickened materials — a hot-selling combo for corporate gifts and desk organization.',
    advZh: '五件套含笔筒、文件架、多层收纳盒、手机支架等，加厚 PS 材质一体成型；配色方案 6 套可选，支持 Logo 丝印与彩盒包装，通过跌落与承重测试。',
    advEn: 'Five pieces including pen holder, file rack, multi-layer organizer and phone stand, injection-molded from thickened PS; six color schemes, logo silk-screen and color-box packaging supported, drop- and load-tested.',
    useZh: '用于办公桌面整理、企业开业礼与员工福利，常见于企业采购平台与礼品展会。',
    useEn: 'For desk organization, corporate opening gifts and employee benefits; common on enterprise procurement platforms and gift fairs.' },
  { cat: 12, sort: 10, img: 'p42', nameZh: '螺旋装订笔记本', nameEn: 'Spiral-Bound Notebook', price: '$0.65–1.85 / pc', moq: '3000 pcs',
    introZh: '金属双线圈装订，翻页 360° 不折页，内页可选横线、点阵、方格，封面 350g 白卡覆膜，支持企业定制。',
    introEn: 'Metal twin-ring binding turns 360° without page damage; ruled, dot-grid and grid pages with laminated 350 gsm covers, corporate customization available.',
    advZh: '金属双线圈装订，可 360° 翻折不损伤内页；内页横线、点阵、方格三种版式可选，封面 350g 白卡覆哑膜，支持丝印与烫金 Logo 定制。',
    advEn: 'Twin metal rings allow 360° folding without page damage; three page layouts (ruled, dot-grid, grid), 350 gsm matte-laminated covers, silk-screen and hot-foil logo customization.',
    useZh: '用于会议记录、学习笔记与品牌推广赠品，供应欧美办公文具市场与国内文创品牌。',
    useEn: 'For meeting notes, study journals and brand promotional gifts; supplied to European and American office markets and domestic creative brands.' },

  // ─────────── cat13 汽摩配（公司 5 浙江力拓汽配有限公司）───────────
  { cat: 13, sort: 2, img: 'p43', nameZh: '汽车机油泵', nameEn: 'Automotive Oil Pump', price: '$6.50–18.00 / pc', moq: '500 pcs',
    introZh: '铝合金壳体机油泵，适配日系、德系主流车型，流量与压力按 OE 标准标定，100% 台架测试出厂。',
    introEn: 'Aluminum-housing oil pump fitting mainstream Japanese and German models, with OE-standard flow and pressure calibration and 100% bench testing.',
    advZh: 'ADC12 铝合金壳体，转子副高精度配对，流量压力按 OE 标准标定；每条产线 100% 台架测试并附检测报告，工厂通过 IATF 16949 认证，支持客户商标包装。',
    advEn: 'ADC12 aluminum housing with high-precision rotor pairs calibrated to OE flow and pressure standards; every line runs 100% bench tests with reports, IATF 16949 certified plant, customer-brand packaging supported.',
    useZh: '用于发动机润滑系统维修更换与配套供应，适配丰田、本田、大众等主流车系，长期出口中东与南美市场。',
    useEn: 'For engine lubrication system replacement and OE supply, fitting Toyota, Honda, Volkswagen and other mainstream makes; long-term exports to the Middle East and South America.' },
  { cat: 13, sort: 3, img: 'p44', nameZh: '通风制动盘', nameEn: 'Ventilated Brake Disc', price: '$4.20–9.80 / pc', moq: '1000 pcs',
    introZh: 'HT250 灰铸铁制动盘，通风槽设计散热快，动平衡精度高，适配 500 余款车型，支持打孔划线定制。',
    introEn: 'HT250 grey cast iron brake disc with ventilated slots for fast heat dissipation and high dynamic balance precision, fitting 500+ models; drilled and slotted versions available.',
    advZh: 'HT250 灰铸铁材质，通风槽结构散热效率提升 40%，CNC 加工动平衡精度 0.1g·cm 以内；全检平面度与跳动，支持打孔、划线高性能定制款，IATF 16949 体系生产。',
    advEn: 'HT250 grey cast iron with ventilated slots improving heat dissipation by 40%, CNC-machined dynamic balance within 0.1 g·cm; full flatness and runout inspection, drilled/slotted high-performance versions, IATF 16949 production.',
    useZh: '用于乘用车制动系统维修市场与改装市场，适配 500 余款车型，出口欧洲、东南亚与北美售后渠道。',
    useEn: 'For passenger-car braking system aftermarket and tuning markets, fitting 500+ models; exported to aftermarket channels in Europe, Southeast Asia and North America.' },
  { cat: 13, sort: 4, img: 'p45', nameZh: '制动卡钳', nameEn: 'Brake Caliper', price: '$8.50–22.00 / pc', moq: '500 pcs',
    introZh: '铝合金与铸铁卡钳系列，活塞直径覆盖 34–60mm，密封件采用进口材质，制动响应快、回位彻底。',
    introEn: 'Aluminum and cast-iron caliper series with 34–60 mm piston coverage, imported seal materials for fast response and complete retraction.',
    advZh: '铝合金/铸铁卡钳系列，活塞直径 34–60mm 全覆盖，进口材质密封件耐高温 200℃；装配线 100% 气密测试，外观电镀与烤漆工艺可选，适配 300 余款车型。',
    advEn: 'Aluminum/cast-iron series with full 34–60 mm piston coverage and imported seals rated to 200°C; 100% air-tightness testing on assembly lines, electroplating or paint finishes, fitting 300+ models.',
    useZh: '用于制动系统维修、改装升级与配套生产，长期供应欧洲售后品牌与国内主机配套项目。',
    useEn: 'For brake system repair, tuning upgrades and OE projects; long-term supplier to European aftermarket brands and domestic OEM programs.' },
  { cat: 13, sort: 5, img: 'p46', nameZh: '铝合金轮毂', nameEn: 'Aluminum Alloy Wheel', price: '$28.00–65.00 / pc', moq: '200 pcs',
    introZh: 'A356.2 铝合金低压铸造轮毂，尺寸 15–22 英寸，通过冲击、弯曲、径向疲劳三项台架测试，支持定制造型。',
    introEn: 'Low-pressure cast A356.2 aluminum wheels, 15–22 inches, passing impact, bending and radial fatigue bench tests; custom designs available.',
    advZh: 'A356.2 铝合金低压铸造，15–22 英寸规格齐全，通过 13° 冲击、弯曲疲劳与径向疲劳三项台架测试；全自动喷涂线提供亮面、拉丝、电镀工艺，支持客户造型定制开发。',
    advEn: 'A356.2 aluminum low-pressure casting with full 15–22 inch specs, passing 13° impact, bending fatigue and radial fatigue tests; automated painting lines offer polished, brushed and electroplated finishes, custom design development supported.',
    useZh: '用于乘用车与改装车轮毂市场，出口欧洲、中东与东南亚，与多个海外改装品牌长期合作。',
    useEn: 'For passenger-car and tuning wheel markets; exported to Europe, the Middle East and Southeast Asia with long-term partnerships with overseas tuning brands.' },
  { cat: 13, sort: 6, img: 'p47', nameZh: '轮毂轮胎总成', nameEn: 'Wheel & Tire Assembly', price: '$45.00–95.00 / set', moq: '100 sets',
    introZh: '轮毂轮胎一体装配总成，动平衡出厂校准，适配主流 SUV 与轿车，支持胎压监测模块安装。',
    introEn: 'One-piece wheel-and-tire assemblies with factory dynamic balancing, fitting mainstream SUVs and sedans; TPMS module installation supported.',
    advZh: '轮毂与轮胎一体装配，出厂动平衡校准精度 5g 以内，适配主流 SUV 与轿车平台；支持内置 TPMS 胎压监测模块安装，全检气压与外观，出口东南亚与非洲整车后市场。',
    advEn: 'Assembled wheels and tires with factory dynamic balance within 5 g, fitting mainstream SUV and sedan platforms; built-in TPMS module installation supported, full air-pressure and appearance inspection, exported to Southeast Asian and African vehicle aftermarkets.',
    useZh: '用于整车售后更换、汽车租赁公司与改装门店批量采购，提供多品牌轮胎搭配方案。',
    useEn: 'For vehicle aftermarket replacement, car rental companies and tuning shops in bulk, with multi-brand tire pairing solutions.' },
  { cat: 13, sort: 7, img: 'p48', nameZh: '镀铬轮毂', nameEn: 'Chrome-Plated Wheel Hub', price: '$35.00–78.00 / pc', moq: '100 pcs',
    introZh: '三层镀铬工艺镜面效果，耐腐蚀盐雾测试 240 小时，18–24 英寸改装尺寸，是北美改装市场的热门款。',
    introEn: 'Triple-layer chrome plating with mirror finish and 240-hour salt-spray corrosion resistance, 18–24 inch tuning sizes — a hot item in the North American aftermarket.',
    advZh: '铜-镍-铬三层电镀镜面工艺，盐雾测试 240 小时无锈蚀；18–24 英寸改装尺寸覆盖，轮缘与辐条造型多样，支持来图开发与包装定制。',
    advEn: 'Copper-nickel-chrome triple plating with mirror finish, 240-hour salt-spray test without corrosion; 18–24 inch tuning sizes with varied rim and spoke designs, artwork-based development and custom packaging supported.',
    useZh: '面向北美与澳洲改装轮毂市场，供应改装门店、赛事车队与线上改装平台。',
    useEn: 'For North American and Australian tuning markets; supplying tuning shops, racing teams and online tuning platforms.' },
  { cat: 13, sort: 8, img: 'p49', nameZh: '摩托车传动链条', nameEn: 'Motorcycle Drive Chain', price: '$2.80–7.50 / pc', moq: '1000 pcs',
    introZh: '40Mn 钢精密冲压链片，热处理强化，抗拉强度达 25kN，规格 420–530 全系列，配套链轮同步供应。',
    introEn: 'Precision-stamped 40Mn steel plates with heat-treated pins, 25 kN tensile strength, full 420–530 range with matching sprockets supplied together.',
    advZh: '40Mn 钢链片精密冲压成形，销轴淬火强化，抗拉强度达 25kN、疲劳寿命 10 万次以上；420–530 规格全系列覆盖，配套链轮同步开发，通过盐雾与耐磨台架测试。',
    advEn: 'Precision-stamped 40Mn steel plates with hardened pins, 25 kN tensile strength and 100,000+ cycle fatigue life; full 420–530 series with co-developed sprockets, passed salt-spray and wear bench tests.',
    useZh: '用于摩托车、电动车与小型农机传动，出口东南亚、非洲与南美维修市场，支持整车厂配套。',
    useEn: 'For motorcycle, e-bike and small agricultural machinery transmissions; exported to repair markets in Southeast Asia, Africa and South America, with OEM supply supported.' },
  { cat: 13, sort: 9, img: 'p50', nameZh: '发动机零部件', nameEn: 'Engine Components', price: '$1.20–6.50 / pc', moq: '2000 pcs',
    introZh: '正时张紧轮、气门室盖垫、油底壳垫等发动机精密零部件，材质工艺按 OE 标准，支持多车型产品线开发。',
    introEn: 'Precise engine components including timing tensioners, valve cover gaskets, oil pan gaskets and crankshaft seals, made to OE material and process standards.',
    advZh: '产品线覆盖正时张紧轮、气门室盖垫、油底壳垫、曲轴油封等，材料与热处理按 OE 标准执行；关键尺寸全检，IATF 16949 体系，支持根据客户车型清单开发新品。',
    advEn: 'Product lines covering timing tensioners, valve cover gaskets, oil pan gaskets and crankshaft seals with OE-standard materials and heat treatment; full inspection of critical dimensions, IATF 16949 system, new products developed from customer vehicle lists.',
    useZh: '用于发动机维修保养与售后配套，供应国内汽配城与海外维修连锁，产品线随客户需求持续扩展。',
    useEn: 'For engine repair and aftermarket supply; serving domestic auto-parts markets and overseas repair chains, with product lines continuously expanding per customer demand.' },
  { cat: 13, sort: 10, img: 'p51', nameZh: '汽车蓄电池', nameEn: 'Automotive Battery', price: '$18.00–42.00 / pc', moq: '200 pcs',
    introZh: '免维护铅酸蓄电池，CCA 冷启动电流高，容量 45–100Ah 全系列，抗振耐温，适配乘用车与轻型商用车。',
    introEn: 'Maintenance-free lead-acid battery with high CCA ratings, full 45–100 Ah range, vibration- and temperature-resistant for passenger cars and light commercial vehicles.',
    advZh: '免维护铅酸电池，冷启动电流 CCA 达 700A，容量 45–100Ah 全系列覆盖；极板合金配比优化，循环寿命提升 30%，通过 CE、ROHS 检测，支持客户品牌贴牌。',
    advEn: 'Maintenance-free lead-acid batteries with CCA up to 700 A across the full 45–100 Ah range; optimized plate alloy raises cycle life by 30%, CE and ROHS certified, customer-brand labeling supported.',
    useZh: '用于乘用车、轻型商用车启动电源与替换市场，出口非洲、中东与东南亚，配套汽配连锁渠道。',
    useEn: 'For starting power and replacement markets of passenger cars and light commercial vehicles; exported to Africa, the Middle East and Southeast Asia for auto-parts chain channels.' },

  // ─────────── cat14 机械装备（公司 6 温州精工机械装备有限公司）───────────
  { cat: 14, sort: 2, img: 'p52', nameZh: '数控铣床', nameEn: 'CNC Milling Machine', price: '$18,000–42,000 / set', moq: '1 set',
    introZh: '立式加工中心三轴行程 800×500×500mm，主轴转速 12000rpm，定位精度 ±0.005mm，配备 24 刀位刀库。',
    introEn: 'Vertical machining center with 800x500x500 mm travels, 12,000 rpm spindle, ±0.005 mm positioning accuracy and a 24-tool magazine.',
    advZh: '三轴行程 800×500×500mm，BT40 主轴最高 12000rpm，X/Y/Z 定位精度 ±0.005mm；24 刀位圆盘刀库，标配西门子/发那科数控系统，床身经时效处理，CE 认证可出口欧盟。',
    advEn: '800x500x500 mm travels, BT40 spindle up to 12,000 rpm, ±0.005 mm X/Y/Z positioning accuracy; 24-tool disc magazine with Siemens/Fanuc CNC systems, stress-relieved bed, CE certified for EU export.',
    useZh: '用于模具加工、汽摩配件精密铣削与通用机械加工车间，服务本地产业集群企业。',
    useEn: 'For mold machining, precision milling of auto-parts and general machining workshops, serving local industrial cluster enterprises.' },
  { cat: 14, sort: 3, img: 'p53', nameZh: '光纤激光切割机', nameEn: 'Fiber Laser Cutting Machine', price: '$25,000–88,000 / set', moq: '1 set',
    introZh: '3000W–20000W 光纤激光切割机，加工幅面 3×1.5m，碳钢切割厚度可达 25mm，切割速度与精度行业领先。',
    introEn: '3,000–20,000 W fiber laser cutters with a 3x1.5 m working area, cutting carbon steel up to 25 mm at industry-leading speed and precision.',
    advZh: '3000W–20000W 功率段可选，标准幅面 3×1.5m；25mm 碳钢、12mm 不锈钢稳定切割，配自动调焦切割头与随动防碰撞系统，交换平台提升产能 30%，支持 24 小时连续生产。',
    advEn: '3,000–20,000 W power options with a standard 3x1.5 m area; stable cutting of 25 mm carbon steel and 12 mm stainless steel, auto-focus cutting head with collision-avoidance follow system, shuttle tables raising output 30% for 24-hour production.',
    useZh: '用于钣金加工、机械制造与金属家具行业，供应本地及全国钣金加工厂，可出口东南亚。',
    useEn: 'For sheet-metal processing, machinery manufacturing and metal furniture industries; supplying local and nationwide sheet-metal plants, exportable to Southeast Asia.' },
  { cat: 14, sort: 4, img: 'p54', nameZh: '工业机器人工作站', nameEn: 'Industrial Robot Workstation', price: '$32,000–75,000 / set', moq: '1 set',
    introZh: '六轴工业机器人集成工作站，负载 6–165kg，重复定位精度 ±0.03mm，配套夹具与视觉系统定制。',
    introEn: 'Six-axis industrial robot workstations with 6–165 kg payloads, ±0.03 mm repeatability, and customized fixtures and vision systems.',
    advZh: '六轴机器人负载 6–165kg，重复定位精度 ±0.03mm；按工艺定制夹具、视觉引导与安全围栏，集成打磨、搬运、上下料应用，交付含编程调试与操作培训。',
    advEn: 'Six-axis robots with 6–165 kg payloads and ±0.03 mm repeatability; fixtures, vision guidance and safety fencing customized per process, integrating grinding, handling and loading applications, delivered with programming and operator training.',
    useZh: '用于汽摩配加工、3C 电子与五金行业的自动化改造，帮助工厂实现一人多机与 24 小时连续生产。',
    useEn: 'For automation retrofits in auto-parts machining, 3C electronics and hardware industries, enabling one-operator-multiple-machine and 24-hour production.' },
  { cat: 14, sort: 5, img: 'p55', nameZh: '机器人焊接工作站', nameEn: 'Robotic Welding Station', price: '$28,000–68,000 / set', moq: '1 set',
    introZh: '六轴焊接机器人配脉冲气保焊电源，焊缝一致性好，配套双工位变位机，焊接效率为人工 2 倍以上。',
    introEn: 'Six-axis welding robot with pulsed MIG power source for consistent weld seams, plus dual-station positioners for 2x+ manual welding efficiency.',
    advZh: '六轴焊接机器人配 500A 脉冲气保焊电源，鱼鳞纹均匀一致；双工位变位机交替上料，效率为人工焊接 2 倍以上，标配防飞溅与清枪装置，支持碳钢、不锈钢、铝件焊接工艺包。',
    advEn: 'Six-axis robot with a 500 A pulsed MIG source producing uniform fish-scale seams; dual-station positioners alternate loading for 2x+ manual efficiency, standard anti-spatter and torch-cleaning units, process packages for carbon steel, stainless steel and aluminum.',
    useZh: '用于汽摩配件、钢结构与五金制品的批量焊接，服务本地及周边制造企业自动化升级。',
    useEn: 'For batch welding of auto-parts, steel structures and hardware products; serving local and neighboring manufacturers automation upgrades.' },
  { cat: 14, sort: 6, img: 'p56', nameZh: '金属切割焊接设备', nameEn: 'Metal Cutting & Welding Equipment', price: '$3,500–26,000 / set', moq: '1 set',
    introZh: '数控火焰/等离子切割机与气保焊机系列，切割厚度 5–150mm，焊接电流覆盖 250–630A，适合中小型金属加工厂。',
    introEn: 'CNC flame/plasma cutters for 5–150 mm thickness and MIG welder series from 250–630 A — core equipment for small and medium metalworking plants.',
    advZh: '数控火焰/等离子切割机切割厚度 5–150mm，自动调高与断点续切保证良品率；气保焊机 250–630A 全系列，暂载率 60% 以上，核心部件质保 2 年，整机 CE 认证。',
    advEn: 'CNC flame/plasma cutters handle 5–150 mm with auto torch-height and resumable cutting for high yield; 250–630 A MIG series with 60%+ duty cycles, 2-year warranty on core parts, CE certified machines.',
    useZh: '用于钢结构制作、船舶修造与机械加工车间，是中小金属加工厂起步与扩产的主力设备。',
    useEn: 'For steel-structure fabrication, ship repair and machining workshops — the workhorse equipment for starting and expanding small and medium metalworking plants.' },
  { cat: 14, sort: 7, img: 'p57', nameZh: '工业缝纫设备', nameEn: 'Industrial Sewing Machine', price: '$450–3,800 / set', moq: '1 set',
    introZh: '高速平缝机、包缝机与电脑花样机系列，缝速 5000 针/分钟，适合箱包、服装与编织袋缝制产线。',
    introEn: 'High-speed lockstitch, overlock and computerized pattern machines up to 5,000 stitches/min for garment, bag and woven-bag sewing lines.',
    advZh: '高速平缝机缝速达 5000 针/分钟，自动剪线、倒缝功能标配；包缝机、花样机多机型配套，支持厚料与编织袋专用机型，核心零件进口品牌，质保 3 年。',
    advEn: 'High-speed lockstitch machines at 5,000 stitches/min with auto thread-trimming and back-tacking standard; overlock and pattern machines for full line setups, heavy-material and woven-bag special models, imported-brand core parts, 3-year warranty.',
    useZh: '用于服装、箱包、编织袋（配套塑编产业）缝制产线，供应本地鞋服与塑编企业生产线升级。',
    useEn: 'For garment, bag and woven-bag sewing lines (supporting the local woven-packaging industry); supplying local footwear, apparel and woven-product enterprises.' },
  { cat: 14, sort: 8, img: 'p58', nameZh: '工业铸锻件', nameEn: 'Industrial Casting & Forging Parts', price: '$1.50–35.00 / kg', moq: '500 kg',
    introZh: '灰铁、球铁铸件与合金钢锻件定制，单件 0.5–800kg，配套热处理与机加工，用于阀门、法兰与机械结构件。',
    introEn: 'Custom grey iron, ductile iron and alloy steel castings/forgings from 0.5–800 kg per piece, with heat treatment and machining — for valves, flanges and machine structures.',
    advZh: '灰铁、球铁、合金钢材质齐全，单件 0.5–800kg，覆膜砂与树脂砂工艺可选；配套退火、调质热处理与数控机加工，尺寸公差按 GB/T 6414 CT9 控制，支持来图打样 15 天交付。',
    advEn: 'Grey iron, ductile iron and alloy steel grades with shell-molding or resin-sand options; annealing/quenching-tempering heat treatment and CNC machining included, tolerances to GB/T 6414 CT9, 15-day sampling from drawings.',
    useZh: '用于阀门、法兰、泵体、机械结构件等工业配套，服务本地装备制造集群与出口贸易订单。',
    useEn: 'For industrial supporting parts such as valves, flanges, pump bodies and machine structures; serving the local equipment cluster and export trade orders.' },
  { cat: 14, sort: 9, img: 'p59', nameZh: '激光切割头', nameEn: 'Laser Cutting Head', price: '$680–2,600 / pc', moq: '1 pc',
    introZh: '自动调焦激光切割头，适配 500W–20000W 光纤激光器，QBH 接口，配备防撞保护与气路监控，是切割机核心耗材部件。',
    introEn: 'Auto-focus laser cutting heads fitting 500 W–20,000 W fiber lasers with QBH interfaces, crash protection and gas monitoring — the core consumable of cutting machines.',
    advZh: '自动调焦切割头适配 500W–20000W 功率段，QBH 标准接口；内置电容随动与防碰撞保护，气路压力实时监控，镜片快换设计减少停机，提供原厂维修与校准服务。',
    advEn: 'Auto-focus heads for the 500 W–20,000 W power range with standard QBH interfaces; built-in capacitive height sensing and anti-collision protection, real-time gas-pressure monitoring, quick-change optics to cut downtime, factory repair and calibration service.',
    useZh: '用于光纤激光切割机配套与维修替换，供应激光设备制造商与终端加工厂，支持旧型号替换升级。',
    useEn: 'For fiber laser cutter assembly and repair replacement; supplying laser equipment makers and end-user fab shops, with retrofit support for older models.' },
  { cat: 14, sort: 10, img: 'p60', nameZh: '纺织成套设备', nameEn: 'Textile Machinery Set', price: '$15,000–96,000 / set', moq: '1 set',
    introZh: '无纺布与化纤纺丝成套设备，涵盖开松、梳理、成网、收卷全流程，幅宽 1.6–3.2m，支持整线交钥匙工程。',
    introEn: 'Nonwoven and chemical-fiber spinning lines covering opening, carding, web-forming and winding, 1.6–3.2 m widths, with turnkey project delivery.',
    advZh: '无纺布/化纤纺丝整线覆盖开松、梳理、成网、收卷全流程，幅宽 1.6–3.2m 定制；PLC 集中控制，产能与克重自动闭环调节，提供交钥匙安装调试与海外售后支持。',
    advEn: 'Complete nonwoven/fiber spinning lines from opening through carding, web-forming and winding with 1.6–3.2 m custom widths; PLC centralized control with closed-loop output and weight regulation, turnkey installation and overseas after-sales support.',
    useZh: '用于无纺布制造、化纤加工与再生纤维企业整厂建设，出口东南亚、中亚与非洲市场。',
    useEn: 'For whole-plant construction of nonwoven, chemical-fiber and recycled-fiber enterprises; exported to Southeast Asia, Central Asia and Africa.' },
];

function buildDetail(lang, p) {
  if (lang === 'zh') {
    return `<h3>产品优势</h3><p>${p.advZh}</p><img src='/img/${p.img}.jpg' alt=''><h3>应用场景</h3><p>${p.useZh}</p>`;
  }
  return `<h3>Product Advantages</h3><p>${p.advEn}</p><img src='/img/${p.img}.jpg' alt=''><h3>Applications</h3><p>${p.useEn}</p>`;
}

async function main() {
  // 0. 类目 → 公司映射（company_categories 联表）
  const junctions = await prisma.$queryRaw`SELECT category_id, company_id FROM company_categories`;
  const catCompany = new Map(junctions.map((j) => [j.category_id, j.company_id]));
  for (const cat of [9, 10, 11, 12, 13, 14]) {
    if (!catCompany.has(cat)) throw new Error(`类目 ${cat} 缺少公司映射，请先维护 company_categories`);
  }

  // 1. 清理历史测试垃圾数据
  const junkBefore = await prisma.product.count({
    where: { OR: JUNK_PREFIXES.map((p) => ({ nameZh: { startsWith: p } })) },
  });
  const junk = await prisma.product.deleteMany({
    where: { OR: JUNK_PREFIXES.map((p) => ({ nameZh: { startsWith: p } })) },
  });
  console.log(`[1/4] 清理测试垃圾数据：删除 ${junk.count} 条（清理前匹配 ${junkBefore} 条）`);

  // 2. 校正演示产品排序与 companyId（id8 补挂公司）
  for (const d of DEMO_SORTS) {
    await prisma.product.update({ where: { id: d.id }, data: { sort: d.sort } });
  }
  await prisma.product.update({ where: { id: 8 }, data: { companyId: catCompany.get(14) } });
  console.log('[2/4] 演示产品排序已校正（id8 补挂 温州精工机械装备有限公司）');

  // 3. 幂等写入 52 个新产品
  let created = 0;
  let updated = 0;
  for (const p of PRODUCTS) {
    const companyId = catCompany.get(p.cat);
    const mainImage = `/img/${p.img}.jpg`;
    // 画廊：[主图, 类目卡片图, 同类目下一产品主图（环回）]
    const siblings = PRODUCTS.filter((x) => x.cat === p.cat);
    const idx = siblings.indexOf(p);
    const next = siblings[(idx + 1) % siblings.length];
    const images = JSON.stringify([mainImage, CAT_CARD[p.cat], `/img/${next.img}.jpg`]);

    const data = {
      categoryId: p.cat,
      companyId,
      nameZh: p.nameZh,
      nameEn: p.nameEn,
      mainImage,
      images,
      introZh: p.introZh,
      introEn: p.introEn,
      detailZh: buildDetail('zh', p),
      detailEn: buildDetail('en', p),
      priceRef: p.price,
      moq: p.moq,
      sort: p.sort,
      status: 1,
      deletedAt: null,
    };

    const existing = await prisma.product.findFirst({ where: { nameZh: p.nameZh } });
    if (existing) {
      await prisma.product.update({ where: { id: existing.id }, data });
      updated += 1;
    } else {
      await prisma.product.create({ data });
      created += 1;
    }
  }
  console.log(`[3/4] 新产品写入完成：新建 ${created} 条，更新 ${updated} 条`);

  // 4. 汇总校验
  const summary = [];
  for (const cat of [9, 10, 11, 12, 13, 14]) {
    const total = await prisma.product.count({ where: { categoryId: cat, status: 1, deletedAt: null } });
    summary.push(`类目 ${cat}: ${total} 个已发布产品`);
  }
  console.log(`[4/4] ${summary.join(' | ')}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
