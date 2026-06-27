import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import * as db from '@/lib/database';
import { getAuthenticatedUser } from '@/lib/auth/helper';

const RatingSchema = z.object({
  rating: z.number().min(1).max(5),
  review: z.string().optional().nullable(),
});

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const narrativeId = Number(id);

    await db.init();
    const ratings = await db.getNarrativeRatings(narrativeId);

    return NextResponse.json({ ratings });

  } catch (err: any) {
    console.error('[ratings-id] GET error:', err);
    return NextResponse.json({ error: 'Failed to fetch narrative reviews.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { id } = await params;
    const narrativeId = Number(id);
    const body = await req.json();

    const result = RatingSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: 'Rating must be an integer between 1 and 5.' }, { status: 400 });
    }

    const { rating, review } = result.data;
    const userName = user.displayName || user.email.split('@')[0];

    await db.init();
    await db.addRating(narrativeId, user.uid, userName, Number(rating), review || '');

    return NextResponse.json({ success: true, message: 'Rating submitted successfully.' });

  } catch (err: any) {
    console.error('[ratings-id] POST error:', err);
    if (err.message?.includes('duplicate') || err.message?.includes('UNIQUE')) {
      return NextResponse.json({ error: 'You have already rated this narrative.' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to submit rating.', detail: err.message }, { status: 500 });
  }
}
