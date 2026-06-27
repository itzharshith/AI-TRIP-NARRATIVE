import { NextRequest, NextResponse } from 'next/server';
import * as db from '@/lib/database';
import { getAuthenticatedUser } from '@/lib/auth/helper';

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user || user.role !== 'Admin') {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    await db.init();
    const rows = await db.getAllForExport();

    const headers = [
      'ID', 'Driver/Staff', 'Route', 'Landmarks', 'Highlights',
      'Trip Date', 'Vehicle Type', 'Tone', 'Title', 'Rating', 'Comment', 'Created At',
    ];

    const escape = (val: any) => {
      if (val === null || val === undefined) return '';
      const str = String(val).replace(/"/g, '""');
      return /[",\n]/.test(str) ? `"${str}"` : str;
    };

    const csvLines = [
      headers.join(','),
      ...rows.map((r: any) =>
        [
          r.id, r.driver_name, r.route, r.landmarks, r.highlights,
          r.trip_date, r.vehicle_type, r.tone, r.title,
          r.rating, r.comment, r.created_at,
        ]
          .map(escape)
          .join(',')
      ),
    ];

    const csvContent = csvLines.join('\r\n');
    const filename = `manivtha_generations_${new Date().toISOString().split('T')[0]}.csv`;

    // Return custom CSV response
    const headersInit = new Headers({
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`
    });

    // Prepend BOM for Excel compatibility
    return new NextResponse('\uFEFF' + csvContent, {
      status: 200,
      headers: headersInit
    });

  } catch (err: any) {
    console.error('[admin-export] GET error:', err);
    return NextResponse.json({ error: 'Failed to export data.', detail: err.message }, { status: 500 });
  }
}
