export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth/helper';

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user || user.role !== 'Admin') {
      return NextResponse.json({ authenticated: false, error: 'Unauthorized.' }, { status: 401 });
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        email:   user.email,
        name:    user.displayName || user.email,
        picture: user.photoURL || '',
      },
    });

  } catch (err: any) {
    console.error('[admin-verify] GET error:', err);
    return NextResponse.json({ authenticated: false, error: 'Internal validation error.' }, { status: 500 });
  }
}