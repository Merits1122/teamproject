import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'


export const config = {
  matcher: '/dashboard/:path*',
}

export function middleware(request: NextRequest) {
  const token = request.cookies.get('token')?.value;

  if (!token) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', request.nextUrl.pathname);
    
    loginUrl.searchParams.set('error', 'auth_required');
    return NextResponse.redirect(loginUrl);
  }
  return NextResponse.next();
}