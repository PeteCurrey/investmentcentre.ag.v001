import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifySessionToken } from './lib/auth';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Redirect legacy /landing route to /meridian
  if (pathname === '/landing') {
    return NextResponse.redirect(new URL('/meridian', request.url));
  }

  // Allow public marketing page (/meridian), login page, health API, and static assets.
  // /api/autotrader/cron is authenticated by CRON_SECRET inside its own handler —
  // Vercel cron sends Authorization: Bearer <CRON_SECRET> with no session cookie.
  if (
    pathname === '/meridian' ||
    pathname === '/login' ||
    pathname === '/api/health' ||
    pathname === '/api/autotrader/cron' ||
    pathname.startsWith('/_next') ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next();
  }

  // Check for active console session token
  const token =
    request.cookies.get('console_session')?.value ||
    request.cookies.get('__meridian_session')?.value;

  const payload = token ? await verifySessionToken(token) : null;
  const isAuthenticated = payload !== null;

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
