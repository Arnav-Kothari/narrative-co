import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  if (process.env.NODE_ENV === 'development') {
    return NextResponse.next();
  }

  const jwt =
    request.headers.get('cf-access-jwt-assertion') ||
    request.cookies.get('CF_Authorization')?.value;

  if (!jwt) {
    return new NextResponse('Forbidden', { status: 403 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/clients/:path*',
    '/api/engagement/x-posts/:path*',
    '/api/engagement/score/:path*',
    '/api/engagement/angles/:path*',
    '/api/engagement/slack-send/:path*',
  ],
};
