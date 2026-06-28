export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import * as db from '@/lib/database';
import { getAuthenticatedUser } from '@/lib/auth/helper';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { id } = await params;
    const narrativeId = Number(id);

    await db.init();
    const wishlisted = await db.isWishlisted(user.uid, narrativeId);

    return NextResponse.json({ wishlisted });

  } catch (err: any) {
    console.error('[wishlist-id-status] GET error:', err);
    return NextResponse.json({ error: 'Failed to fetch wishlist status.', detail: err.message }, { status: 500 });
  }
}
