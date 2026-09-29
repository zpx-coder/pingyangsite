// 中间件：透出当前 pathname 供服务端组件读取（根布局据此设置 <html lang>）
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-pathname', request.nextUrl.pathname);
  return NextResponse.next({ headers: requestHeaders });
}

export const config = {
  matcher: '/:path*',
};
