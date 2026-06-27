import { NextRequest, NextResponse } from 'next/server';
import * as db from '@/lib/database';
import { getAuthenticatedUser } from '@/lib/auth/helper';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const page = Math.max(1, parseInt(searchParams.get('page') || '1') || 1);
    const limit = Math.min(50, parseInt(searchParams.get('limit') || '12') || 12);
    const search = (searchParams.get('search') || '').trim();

    await db.init();
    const { data, total } = await db.getPublicGenerations({ page, limit, search });

    // Identify user wishes if authenticated
    const user = await getAuthenticatedUser(req);
    const userId = user?.uid || null;

    if (userId) {
      await Promise.all(
        data.map(async (row: any) => {
          row.is_wishlisted = await db.isWishlisted(userId, row.id);
        })
      );
    } else {
      data.forEach((row: any) => {
        row.is_wishlisted = false;
      });
    }

    return NextResponse.json({
      records: data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      }
    });

  } catch (err: any) {
    console.error('[explore] GET error:', err);
    return NextResponse.json({ error: 'Failed to fetch public explore narratives.', detail: err.message }, { status: 500 });
  }
}
