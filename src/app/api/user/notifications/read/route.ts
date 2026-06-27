import { NextRequest, NextResponse } from 'next/server';
import * as db from '@/lib/database';
import { getAuthenticatedUser } from '@/lib/auth/helper';

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    await db.init();
    await db.markNotificationsRead(user.uid);
    return NextResponse.json({ success: true });

  } catch (err: any) {
    console.error('[user-notifications-read] POST error:', err);
    return NextResponse.json({ error: 'Failed to mark notifications as read.', detail: err.message }, { status: 500 });
  }
}
