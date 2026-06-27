import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import * as db from '@/lib/database';
import { getAuthenticatedUser } from '@/lib/auth/helper';

const ReportSchema = z.object({
  reason: z.string().min(1),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { id } = await params;
    const narrativeId = Number(id);
    const body = await req.json();

    const result = ReportSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: 'Reason is required to submit a report.' }, { status: 400 });
    }

    const { reason } = result.data;

    await db.init();
    await db.createReport(narrativeId, user.uid, reason.trim());

    return NextResponse.json({ success: true, message: 'Report submitted successfully. Administrators will review it.' });

  } catch (err: any) {
    console.error('[reports-id] POST error:', err);
    return NextResponse.json({ error: 'Failed to submit report.', detail: err.message }, { status: 500 });
  }
}
