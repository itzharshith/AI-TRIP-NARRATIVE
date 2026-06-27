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
    const result = await db.toggleWishlist(user.uid, narrativeId);

    // Fetch updated narrative to get latest wishlist count
    const generation = await db.getGeneration(narrativeId);

    return NextResponse.json({
      success: true,
      added: result.added,
      wishlistCount: generation?.wishlist_count || 0
    });

  } catch (err: any) {
    console.error('[wishlist-id] POST error:', err);
    return NextResponse.json({ error: 'Failed to update wishlist.', detail: err.message }, { status: 500 });
  }
}
