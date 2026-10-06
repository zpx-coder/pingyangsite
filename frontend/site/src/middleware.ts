// 中间件：
// 1) 透出当前 pathname 供服务端组件读取（根布局据此设置 <html lang>）；
// 2) 动态详情页存在性预检：产品/企业/类目/新闻不存在时直接返回设计 404。
//    背景：Next 15/16 在异步布局下无法渲染 not-found 边界，页面内 notFound()
//    会退化为空白错误页（NEXT_HTTP_ERROR_FALLBACK），故在中间件层兜底；
// 3) 非法语言段（非 zh-CN/en）直接返回设计 404（[lang] 布局的 notFound 同受上述缺陷影响）。
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const API_BASE = process.env.API_BASE_URL ?? 'http://127.0.0.1:3001';
const DETAIL_RE = /^\/(zh-CN|en)\/(products|companies|categories|news)\/(\d+)\/?$/;
// 首段非法（非语言、非 _next/api、非带点号静态文件）即 404
const INVALID_LANG_RE = /^\/(?!zh-CN|en)(?!_next)(?!api\b)[^/.]+(?=\/|$)/;

// 设计 404 页（内联样式，与 src/app/not-found.tsx 视觉一致；PRD §5.1）
function notFoundHtml(lang: 'zh-CN' | 'en'): string {
  const zh = lang === 'zh-CN';
  const title = zh ? '页面不存在' : 'Page Not Found';
  const back = zh ? '返回首页' : 'Back to Home';
  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<title>404 · ${title}</title>
<meta name="robots" content="noindex">
<style>
body{margin:0;font-family:-apple-system,'PingFang SC','Microsoft YaHei',sans-serif;background:#fff}
.not-found{text-align:center;padding:120px 0 140px}
.not-found .code{font-family:'Songti SC','STSong','Noto Serif SC',serif;font-size:110px;font-weight:700;color:#336065;line-height:1;letter-spacing:6px}
.not-found .msg{margin:22px 0 34px;font-size:17px;color:#8a8e86;letter-spacing:2px}
.btn{display:inline-block;padding:12px 34px;border-radius:999px;text-decoration:none;font-size:15px;letter-spacing:1px;transition:transform .25s}
.btn-gold{background:linear-gradient(135deg,#e8be4c,#d9a93e);color:#4a3208;box-shadow:0 6px 18px rgba(217,169,62,.4)}
.btn-gold:hover{transform:translateY(-2px)}
</style>
</head>
<body>
<div class="not-found">
<div class="code">404</div>
<div class="msg">${title}</div>
<a class="btn btn-gold" href="/${lang}">${back}</a>
</div>
</body>
</html>`;
}

function notFoundResponse(lang: 'zh-CN' | 'en'): NextResponse {
  return new NextResponse(notFoundHtml(lang), {
    status: 404,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store',
    },
  });
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 非法语言段：直接 404（/en 前缀按 en 语言兜底，其余默认 zh-CN）
  if (INVALID_LANG_RE.test(pathname) && request.method === 'GET') {
    return notFoundResponse(pathname.startsWith('/en') ? 'en' : 'zh-CN');
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-pathname', pathname);

  // 详情页预检：公开详情接口 404 → 设计 404（接口不可用时放行，由页面自身兜底）
  const m = DETAIL_RE.exec(pathname);
  if (m && request.method === 'GET') {
    const [, lang, kind, id] = m;
    try {
      const res = await fetch(`${API_BASE}/api/v1/public/${kind}/${id}`, {
        headers: { accept: 'application/json' },
        signal: AbortSignal.timeout(1500),
      });
      if (res.status === 404) {
        return notFoundResponse(lang as 'zh-CN' | 'en');
      }
    } catch {
      // API 不可用：放行
    }
  }

  return NextResponse.next({ headers: requestHeaders });
}

export const config = {
  matcher: '/:path*',
};
