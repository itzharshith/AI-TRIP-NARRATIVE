export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import * as db from '@/lib/database';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sqliteId, firestoreId } = body;
    if (!sqliteId || !firestoreId) {
      return NextResponse.json({ error: 'sqliteId and firestoreId are required.' }, { status: 400 });
    }

    await db.init();
    await db.updateFirestoreId(Number(sqliteId), firestoreId);

    return NextResponse.json({ success: true });

  } catch (err: any) {
    console.error('[feedback-link] POST error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}