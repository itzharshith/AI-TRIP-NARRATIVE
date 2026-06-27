import { NextRequest, NextResponse } from 'next/server';
import * as db from '@/lib/database';
import { getAuthenticatedUser } from '@/lib/auth/helper';

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user || user.role !== 'Admin') {
      return NextResponse.json({ error: 'Unauthorized. Admin access required.' }, { status: 401 });
    }

    const { searchParams } = req.nextUrl;
    const page = Math.max(1, parseInt(searchParams.get('page') || '1') || 1);
    const limit = Math.min(100, parseInt(searchParams.get('limit') || '20') || 20);
    const search = (searchParams.get('search') || '').trim();
    const tone = searchParams.get('tone') || '';
    const rating = searchParams.get('rating') || '';

    await db.init();
    const { data, total } = await db.getAdminData({ page, limit, search, tone, rating });

    return NextResponse.json({
      data,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      user: { email: user.email, name: user.displayName || user.email },
    });

  } catch (err: any) {
    console.error('[admin-data] GET error:', err);
    return NextResponse.json({ error: 'Failed to fetch admin data.', detail: err.message }, { status: 500 });
  }
}
