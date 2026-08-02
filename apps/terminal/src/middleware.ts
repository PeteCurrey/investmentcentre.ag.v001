import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public marketing pages, login page, API routes, and assets to bypass auth check
  if (
    pathname === '/landing' ||
    pathname === '/architecture' ||
    pathname === '/login' ||
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next') ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next();
  }

  // Check for the console_session cookie
  const session = request.cookies.get('console_session');

  if (!session || session.value !== 'active_session') {
    // Redirect unauthenticated requests to the public landing page
    const landingUrl = new URL('/landing', request.url);
    return NextResponse.redirect(landingUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/((?!api/health|_next/static|_next/image|favicon.ico).*)',
};
