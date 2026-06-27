import { NextRequest, NextResponse } from 'next/server';
import * as db from '@/lib/database';
import { getAuthenticatedUser } from '@/lib/auth/helper';

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { searchParams } = req.nextUrl;
    const page = Math.max(1, parseInt(searchParams.get('page') || '1') || 1);
    const limit = Math.min(50, parseInt(searchParams.get('limit') || '12') || 12);

    await db.init();
    const data = await db.getUserWishlist(user.uid);
    const total = data.length;
    
    // Paginate manually since sqlite SQL does not paginate user wishlist in single query
    const offset = (page - 1) * limit;
    const paginatedData = data.slice(offset, offset + limit);

    // Mark as wishlisted (all items returned in user wishlist are by definition wishlisted)
    paginatedData.forEach((row: any) => {
      row.is_wishlisted = true;
    });

    return NextResponse.json({
      records: paginatedData,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      }
    });

  } catch (err: any) {
    console.error('[wishlist] GET error:', err);
    return NextResponse.json({ error: 'Failed to fetch wishlist narratives.', detail: err.message }, { status: 500 });
  }
}
