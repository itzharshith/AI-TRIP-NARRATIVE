import { NextRequest, NextResponse } from 'next/server';
import * as db from '@/lib/database';

export async function GET(req: NextRequest) {
  try {
    await db.init();
    const analytics = await db.getAnalytics();
    return NextResponse.json(analytics);
  } catch (err: any) {
    console.error('Analytics route error:', err);
    return NextResponse.json({ error: 'Failed to load analytics.' }, { status: 500 });
  }
}
