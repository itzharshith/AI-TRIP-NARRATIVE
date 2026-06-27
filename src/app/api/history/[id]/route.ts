import { NextRequest, NextResponse } from 'next/server';
import * as db from '@/lib/database';
import { getAuthenticatedUser } from '@/lib/auth/helper';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const legacyId = Number(id);

    await db.init();
    const row = await db.getGeneration(legacyId);
    if (!row) {
      return NextResponse.json({ error: 'Generation not found.' }, { status: 404 });
    }

    return NextResponse.json(row);

  } catch (err: any) {
    console.error('[history-id] GET error:', err);
    return NextResponse.json({ error: 'Failed to fetch record.', detail: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { id } = await params;
    const legacyId = Number(id);

    await db.init();
    const row = await db.getGeneration(legacyId);
    if (!row) {
      return NextResponse.json({ error: 'Narrative not found.' }, { status: 404 });
    }

    // Ownership check: row.user_id must match authenticated user uid
    if (row.user_id && row.user_id !== user.uid) {
      return NextResponse.json({ error: 'Forbidden. You do not own this narrative.' }, { status: 403 });
    }

    await db.deleteGeneration(legacyId);

    // Log user activity
    await db.logActivity(user.uid, 'Archive Narrative', `Soft deleted narrative ID: ${legacyId}`);

    return NextResponse.json({ success: true, id: legacyId, archived: true });

  } catch (err: any) {
    console.error('[history-id] DELETE error:', err);
    return NextResponse.json({ error: 'Failed to archive narrative.', detail: err.message }, { status: 500 });
  }
}
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { id } = await params;
    const legacyId = Number(id);

    const body = await req.json();
    const { title, narrative, summary, visibility } = body;

    await db.init();
    const row = await db.getGeneration(legacyId);
    if (!row) {
      return NextResponse.json({ error: 'Narrative not found.' }, { status: 404 });
    }

    if (row.user_id && row.user_id !== user.uid) {
      return NextResponse.json({ error: 'Forbidden. You do not own this narrative.' }, { status: 403 });
    }

    await db.updateNarrative(legacyId, { title, narrative, summary, visibility });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[history-id] PUT error:', err);
    return NextResponse.json({ error: 'Failed to update narrative.', detail: err.message }, { status: 500 });
  }
}
