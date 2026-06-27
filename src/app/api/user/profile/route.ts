import { NextRequest, NextResponse } from 'next/server';
import * as db from '@/lib/database';
import { getAuthenticatedUser } from '@/lib/auth/helper';

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    await db.init();
    const profile = await db.getUserByUid(user.uid);
    if (!profile) {
      return NextResponse.json({ error: 'User profile not found.' }, { status: 404 });
    }

    // Sanitize sensitive info
    const { password_hash, ...sanitized } = profile;

    return NextResponse.json(sanitized);

  } catch (err: any) {
    console.error('[user-profile] GET error:', err);
    return NextResponse.json({ error: 'Failed to fetch profile.', detail: err.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const body = await req.json();
    const { displayName, bio, photoURL, preferences } = body;

    await db.init();
    await db.updateUserProfile(user.uid, { displayName, bio, photoURL, preferences });

    // Log profile update activity
    await db.logActivity(user.uid, 'Profile Update', 'Updated profile information');

    return NextResponse.json({ success: true });

  } catch (err: any) {
    console.error('[user-profile] PUT error:', err);
    return NextResponse.json({ error: 'Failed to update profile.', detail: err.message }, { status: 500 });
  }
}
