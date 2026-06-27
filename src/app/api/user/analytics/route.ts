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
    const analytics = await db.getUserAnalyticsMetrics(user.uid);
    return NextResponse.json(analytics);

  } catch (err: any) {
    console.error('[user-analytics] GET error:', err);
    return NextResponse.json({ error: 'Failed to fetch analytics metrics.', detail: err.message }, { status: 500 });
  }
}
