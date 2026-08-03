import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Redirect legacy /landing route to /meridian
  if (pathname === '/landing') {
    return NextResponse.redirect(new URL('/meridian', request.url));
  }

  // Allow public marketing page (/meridian), login page, health API, and static assets
  if (
    pathname === '/meridian' ||
    pathname === '/login' ||
    pathname === '/api/health' ||
    pathname.startsWith('/_next') ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next();
  }

  // Check for active console session cookie
  const session = request.cookies.get('console_session')?.value;
  const isAuthenticated = session === 'active_session';

  if (!isAuthenticated) {
    // Return 401 JSON for API routes
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'UNAUTHORIZED: Valid session required.' },
        { status: 401 }
      );
    }

    // Redirect all public/console page requests to /login
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/((?!_next/static|_next/image|favicon.ico).*)',
};
