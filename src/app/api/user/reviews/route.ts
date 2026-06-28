export const dynamic = 'force-dynamic';

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
    const result = await db.getUserReviews(user.uid);
    return NextResponse.json(result);

  } catch (err: any) {
    console.error('[user-reviews] GET error:', err);
    return NextResponse.json({ error: 'Failed to fetch user reviews.', detail: err.message }, { status: 500 });
  }
}