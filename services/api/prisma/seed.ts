// 种子脚本（npm run db:seed）：初始化超级管理员与 page_contents 5 个配置项默认值
// 计划 §5.1 / §0.4；幂等设计：已存在的数据不覆盖、不重置（含密码）。
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// 种子默认值（本地开发用；生产部署经环境变量注入覆盖）
const ADMIN_PHONE = process.env.SEED_ADMIN_PHONE ?? '13800000000';
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? 'Admin@123456';

// page_contents 5 个配置项默认值（PRD §7.4.2）
// 注：JSON 序列化后续统一收敛至 packages/shared（计划 §5.1 适配约定），
// 种子为引导用途，仅做最小化 JSON.stringify。
const PAGE_CONTENT_DEFAULTS: ReadonlyArray<{ key: string; config: unknown }> = [
  {
    key: 'home_banner',
    config: { images: [], interval: 5 }, // 图片 1–5 张，轮播间隔 5s/张
  },
  {
    key: 'home_about',
    config: { image: '', titleZh: '', titleEn: '', summaryZh: '', summaryEn: '' },
  },
  {
    key: 'about_page',
    config: { bannerImage: '', videoUrl: '', contentZh: '', contentEn: '' },
  },
  {
    key: 'contact_info',
    config: {
      phone: '',
      email: '',
      addressZh: '',
      addressEn: '',
      workHoursZh: '',
      workHoursEn: '',
      mapCoordinate: '',
    },
  },
  {
    key: 'footer_info',
    config: { icp: '', copyrightZh: '', copyrightEn: '' },
  },
];

async function main(): Promise<void> {
  // 1. 超级管理员（幂等：已存在则不动，不重置密码）
  const passwordHash = bcrypt.hashSync(ADMIN_PASSWORD, 10);
  await prisma.adminUser.upsert({
    where: { phone: ADMIN_PHONE },
    update: {},
    create: { phone: ADMIN_PHONE, passwordHash },
  });

  // 2. page_contents 默认配置（幂等：不覆盖运营已改内容）
  for (const item of PAGE_CONTENT_DEFAULTS) {
    await prisma.pageContent.upsert({
      where: { key: item.key },
      update: {},
      create: { key: item.key, config: JSON.stringify(item.config) },
    });
  }

  const [adminCount, pageCount] = await Promise.all([
    prisma.adminUser.count(),
    prisma.pageContent.count(),
  ]);
  console.log(`[seed] admin_users=${adminCount} page_contents=${pageCount}`);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
