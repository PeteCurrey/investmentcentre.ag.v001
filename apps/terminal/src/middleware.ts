import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow login page, health API, and Next.js static assets
  if (
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
