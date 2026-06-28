export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import * as db from '@/lib/database';

const FeedbackSchema = z.object({
  rating: z.number().min(1).max(5),
  comment: z.string().optional().nullable(),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const narrativeId = Number(id);
    const body = await req.json();

    const result = FeedbackSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: 'Rating must be between 1 and 5.' }, { status: 400 });
    }

    const { rating, comment } = result.data;

    await db.init();
    const row = await db.getGeneration(narrativeId);
    if (!row) {
      return NextResponse.json({ error: 'Generation not found.' }, { status: 404 });
    }

    await db.updateRating(narrativeId, Math.round(rating), comment || null);

    return NextResponse.json({ success: true, id: narrativeId, rating: Math.round(rating) });

  } catch (err: any) {
    console.error('[feedback-id] POST error:', err);
    return NextResponse.json({ error: 'Failed to save rating.', detail: err.message }, { status: 500 });
  }
}

