import { NextRequest, NextResponse } from 'next/server';
import * as db from '@/lib/database';
import { verifyToken } from '@/lib/auth/jwt';

export async function GET(req: NextRequest) {
  try {
    const tokenCookie = req.cookies.get('session_token');
    if (!tokenCookie) {
      return NextResponse.json({ user: null });
    }

    const payload = await verifyToken(tokenCookie.value);
    if (!payload) {
      return NextResponse.json({ user: null });
    }

    // Initialize database connection
    await db.init();

    // Query latest database state
    const user = await db.getUserByUid(payload.uid);
    if (!user) {
      return NextResponse.json({ user: null });
    }

    return NextResponse.json({
      user: {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        role: user.role,
        permissions: user.permissions,
        emailVerified: user.emailVerified
      }
    });

  } catch (err: any) {
    console.error('[auth-session] Route error:', err);
    return NextResponse.json({ user: null, error: err.message });
  }
}
