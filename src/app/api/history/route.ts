import { NextRequest, NextResponse } from 'next/server';
import * as db from '@/lib/database';
import { getAuthenticatedUser } from '@/lib/auth/helper';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const page = Math.max(1, parseInt(searchParams.get('page') || '1') || 1);
    const limit = Math.min(50, parseInt(searchParams.get('limit') || '12') || 12);
    const search = (searchParams.get('search') || '').trim();

    const user = await getAuthenticatedUser(req);
    const userId = user?.uid || null;

    console.log(`[history] GET / page=${page} limit=${limit} search="${search}" user=${userId}`);

    await db.init();
    const { data, total } = await db.getGenerations({ page, limit, search, userId });

    return NextResponse.json({
      records: data,
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });

  } catch (err: any) {
    console.error('[history] GET error:', err);
    return NextResponse.json({ error: 'Failed to fetch history.', detail: err.message }, { status: 500 });
  }
}

