import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow login page, API health route, and assets to bypass auth check
  if (
    pathname === '/login' ||
    pathname.startsWith('/api/health') ||
    pathname.startsWith('/_next') ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next();
  }

  // Check for the console_session cookie
  const session = request.cookies.get('console_session');

  if (!session || session.value !== 'active_session') {
    // Redirect unauthenticated requests to the login page
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/((?!api/health|_next/static|_next/image|favicon.ico).*)',
};
