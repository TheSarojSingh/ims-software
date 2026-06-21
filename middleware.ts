import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth/session';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('auth_session')?.value;

  if (pathname.startsWith('/dashboard')) {
    if (!token) return NextResponse.redirect(new URL('/login', request.url));
    const session = await verifySession(token);
    if (!session || session.role !== 'admin') {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    return NextResponse.next();
  }

  if (pathname.startsWith('/faculty')) {
    if (!token) return NextResponse.redirect(new URL('/faculty-login', request.url));
    const session = await verifySession(token);
    if (!session || session.role !== 'faculty') {
      return NextResponse.redirect(new URL('/faculty-login', request.url));
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/faculty/:path*'],
};