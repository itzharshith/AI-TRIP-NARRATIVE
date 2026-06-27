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
    const activity = await db.getUserActivity(user.uid);
    return NextResponse.json(activity);

  } catch (err: any) {
    console.error('[user-activity] GET error:', err);
    return NextResponse.json({ error: 'Failed to fetch activity logs.', detail: err.message }, { status: 500 });
  }
}
