import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from './lib/auth/jwt';

export async function proxy(req: NextRequest) {
  const path = req.nextUrl.pathname;

  // Static files and API bypass
  if (
    path.startsWith('/_next') ||
    path.startsWith('/favicon.ico') ||
    path.startsWith('/api/auth') ||
    path.startsWith('/public')
  ) {
    return NextResponse.next();
  }

  const sessionCookie = req.cookies.get('session_token');
  const token = sessionCookie?.value;

  // Verify token if present
  const payload = token ? await verifyToken(token) : null;

  // Route: /login
  if (path === '/login') {
    if (payload) {
      // User already logged in, redirect to dashboard
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }
    return NextResponse.next();
  }

  // Route: /dashboard
  if (path === '/dashboard') {
    if (!payload) {
      // Unauthenticated, redirect to login
      return NextResponse.redirect(new URL('/login', req.url));
    }
    return NextResponse.next();
  }

  // Route: /admin
  if (path === '/admin') {
    if (!payload) {
      return NextResponse.redirect(new URL('/login', req.url));
    }
    if (payload.role !== 'Admin') {
      // Unauthorized, redirect to access-denied
      return NextResponse.redirect(new URL('/access-denied', req.url));
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/login', '/dashboard', '/admin'],
};
