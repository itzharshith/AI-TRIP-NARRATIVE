import { NextRequest, NextResponse } from 'next/server';
import * as db from '@/lib/database';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const legacyId = Number(id);

    await db.init();
    await db.incrementViews(legacyId);

    return NextResponse.json({ success: true });

  } catch (err: any) {
    console.error('[explore-view] POST error:', err);
    return NextResponse.json({ error: 'Failed to increment view count.', detail: err.message }, { status: 500 });
  }
}
