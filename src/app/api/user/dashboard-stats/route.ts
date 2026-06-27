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
    const stats = await db.getUserDashboardStats(user.uid);
    return NextResponse.json(stats);

  } catch (err: any) {
    console.error('[user-stats] GET error:', err);
    return NextResponse.json({ error: 'Failed to fetch dashboard stats.', detail: err.message }, { status: 500 });
  }
}
