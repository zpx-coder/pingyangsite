import { spawnSync } from 'node:child_process';
import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import {
  API, ADMIN, SITE, PAGE_CONTENT_BACKUP, SEED_FILE, TEST_PNG, RUN_FILE,
  TEST_ADMIN_PASSWORD, writeJson,
} from './helpers/run-data';
import { mysqlExec, mysqlRows } from './helpers/mysql';
import { wipeMarkerRows } from './helpers/cleanup';

/** 等待 HTTP 服务可达（30 次 × 1s） */
async function waitHttp(url: string, label: string): Promise<void> {
  for (let i = 0; i < 30; i++) {
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(4000) });
      if (r.ok) {
        console.log(`[setup] ✓ ${label} 可达 ${url}`);
        return;
      }
    } catch {
      // 未就绪，继续等待
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error(`${label} 不可达：${url}（请确认三个服务与 MySQL/Redis 容器已启动，见 tests/e2e/README.md）`);
}

/** 生成 8×8 红色 PNG（真实 PNG 魔数 + IHDR/IDAT/IEND，通过后端魔数嗅探与白名单校验） */
function makeTestPng(): Buffer {
  const crc32 = (buf: Buffer): number => {
    let c = ~0;
    for (let i = 0; i < buf.length; i++) {
      c ^= buf[i];
      for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
    }
    return ~c >>> 0;
  };
  const chunk = (type: string, data: Buffer): Buffer => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(body));
    return Buffer.concat([len, body, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(8, 0);
  ihdr.writeUInt32BE(8, 4);
  ihdr[8] = 8; // 位深
  ihdr[9] = 6; // RGBA
  const stride = 1 + 8 * 4;
  const raw = Buffer.alloc(8 * stride);
  for (let y = 0; y < 8; y++) {
    raw[y * stride] = 0; // filter: none
    for (let x = 0; x < 8; x++) {
      const o = y * stride + 1 + x * 4;
      raw[o] = 200; raw[o + 1] = 40; raw[o + 2] = 40; raw[o + 3] = 255;
    }
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

export default async function globalSetup(): Promise<void> {
  await waitHttp(`${SITE}/zh-CN`, '官网');
  await waitHttp(`${ADMIN}/admin/login`, '管理后台');
  await waitHttp(`${API}/api/v1/health`, 'API');

  // 1. 清理上次运行残留的 E2E 数据
  wipeMarkerRows();

  // 2. 运行标记：本进程生成并落盘，specs/teardown 进程经 run.json 读取（跨进程共享）
  const RUN = String(Date.now()).slice(-8);
  writeJson(RUN_FILE, { run: RUN });

  // 3. 收集种子数据（已发布且英文名非空的样例，供官网双语断言使用）
  const pick = (sql: string): { id: number; zh: string; en: string } => {
    const rows = mysqlRows(sql);
    if (!rows[0]) throw new Error(`种子数据缺失（${sql} 无结果），请先初始化演示数据`);
    return { id: Number(rows[0][0]), zh: rows[0][1], en: rows[0][2] };
  };
  const p = pick(`SELECT id, name_zh, name_en FROM products WHERE status = 1 AND deleted_at IS NULL AND name_en <> '' ORDER BY id LIMIT 1`);
  const c = pick(`SELECT id, name_zh, name_en FROM companies WHERE status = 1 AND deleted_at IS NULL AND name_en <> '' ORDER BY id LIMIT 1`);
  const n = pick(`SELECT id, title_zh, title_en FROM news WHERE status = 1 AND deleted_at IS NULL AND title_en <> '' ORDER BY id LIMIT 1`);
  const cat = pick(`SELECT id, name_zh, name_en FROM categories WHERE status = 1 AND name_en <> '' ORDER BY id LIMIT 1`);
  const seed = {
    product: { id: p.id, nameZh: p.zh, nameEn: p.en },
    company: { id: c.id, nameZh: c.zh, nameEn: c.en },
    news: { id: n.id, titleZh: n.zh, titleEn: n.en },
    category: { id: cat.id, nameZh: cat.zh, nameEn: cat.en },
  };
  writeJson(SEED_FILE, seed);
  console.log(`[setup] ✓ 种子数据：产品#${seed.product.id} 企业#${seed.company.id} 新闻#${seed.news.id} 类目#${seed.category.id}`);

  // 3. 备份 page_contents（E2E 修改页脚配置，teardown 原样恢复）。
  //    config 为 JSON 文本，内部换行会破坏 mysql -e 的行分割，
  //    故用 HEX 往返（SELECT HEX / UPDATE UNHEX）保证字节级还原。
  const backup: Record<string, unknown> = {};
  for (const [key, hex] of mysqlRows('SELECT `key`, HEX(config) FROM page_contents')) {
    backup[key] = JSON.parse(Buffer.from(hex, 'hex').toString('utf8'));
  }
  writeJson(PAGE_CONTENT_BACKUP, backup);

  // 5. 创建专用测试管理员（bcryptjs 用 API 依赖库，避免测试包另装依赖）
  const testPhone = `199${RUN}`;
  mysqlExec(`DELETE FROM admin_users WHERE phone = '${testPhone}'`);
  const repoRoot = path.resolve(__dirname, '..', '..');
  const bcryptPath = path.join(repoRoot, 'services/api/node_modules/bcryptjs');
  const hash = spawnSync(
    'node',
    ['-e', `console.log(require(${JSON.stringify(bcryptPath)}).hashSync(process.argv[1], 10))`, TEST_ADMIN_PASSWORD],
    { encoding: 'utf8' },
  ).stdout.trim();
  if (!hash) throw new Error('测试管理员密码哈希生成失败');
  // created_at/updated_at 仅有 Prisma 客户端级默认值，无 DB 默认，直插必须显式给 NOW()
  //（否则落库为零日期，Prisma 登录查询报 invalid datetime 500）
  mysqlExec(`INSERT INTO admin_users (phone, password_hash, created_at, updated_at) VALUES ('${testPhone}', '${hash}', NOW(), NOW())`);
  console.log(`[setup] ✓ 测试管理员 ${testPhone} 已创建（RUN=${RUN}）`);

  // 6. 生成测试上传图片
  writeFileSync(TEST_PNG, makeTestPng());
}
