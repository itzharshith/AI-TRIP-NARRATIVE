import { NextRequest, NextResponse } from 'next/server';
import * as db from '@/lib/database';
import { getAuthenticatedUser } from '@/lib/auth/helper';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user || user.role !== 'Admin') {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { id } = await params;
    await db.init();
    
    const row = await db.getGeneration(Number(id));
    if (!row) {
      return NextResponse.json({ error: 'Record not found.' }, { status: 404 });
    }

    return NextResponse.json(row);

  } catch (err: any) {
    console.error('[admin-data-id] GET error:', err);
    return NextResponse.json({ error: 'Failed to fetch record.', detail: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user || user.role !== 'Admin') {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { id } = await params;
    const legacyId = Number(id);
    
    await db.init();
    const row = await db.getGeneration(legacyId);
    if (!row) {
      return NextResponse.json({ error: 'Record not found.' }, { status: 404 });
    }

    await db.deleteGeneration(legacyId);
    
    // Log admin activity
    await db.logActivity(user.uid, 'Delete Narrative', `Soft deleted narrative ID: ${legacyId}`);

    return NextResponse.json({ success: true, deleted: legacyId });

  } catch (err: any) {
    console.error('[admin-data-id] DELETE error:', err);
    return NextResponse.json({ error: 'Failed to delete record.', detail: err.message }, { status: 500 });
  }
}
