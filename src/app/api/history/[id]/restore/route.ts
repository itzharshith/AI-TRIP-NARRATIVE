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
    const row = await db.getGeneration(narrativeId);
    if (!row) {
      return NextResponse.json({ error: 'Narrative not found or not recoverable.' }, { status: 404 });
    }

    if (row.user_id && row.user_id !== user.uid) {
      return NextResponse.json({ error: 'Forbidden. You do not own this narrative.' }, { status: 403 });
    }

    await db.restoreGeneration(narrativeId);

    // Log user activity
    await db.logActivity(user.uid, 'Restore Narrative', `Restored soft-deleted narrative ID: ${narrativeId}`);

    return NextResponse.json({ success: true, id: narrativeId, restored: true });

  } catch (err: any) {
    console.error('[history-restore] POST error:', err);
    return NextResponse.json({ error: 'Failed to restore narrative.', detail: err.message }, { status: 500 });
  }
}

