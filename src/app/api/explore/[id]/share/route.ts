import { NextRequest, NextResponse } from 'next/server';
import * as db from '@/lib/database';
import { getAuthenticatedUser } from '@/lib/auth/helper';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { id } = await params;
    const narrativeId = Number(id);

    await db.init();
    await db.incrementShares(narrativeId);

    return NextResponse.json({ success: true });

  } catch (err: any) {
    console.error('[explore-share] POST error:', err);
    return NextResponse.json({ error: 'Failed to increment share count.', detail: err.message }, { status: 500 });
  }
}
