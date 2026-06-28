export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import * as db from '@/lib/database';
import { getAuthenticatedUser } from '@/lib/auth/helper';

const StatusSchema = z.object({
  accountStatus: z.enum(['active', 'suspended', 'pending']),
});

export async function PUT(req: NextRequest, { params }: { params: Promise<{ uid: string }> }) {
  try {
    const adminUser = await getAuthenticatedUser(req);
    if (!adminUser || adminUser.role !== 'Admin') {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { uid } = await params;
    const body = await req.json();

    const result = StatusSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: 'Invalid accountStatus. Must be active, suspended, or pending.' }, { status: 400 });
    }

    const { accountStatus } = result.data;

    await db.init();
    await db.updateUserStatus(uid, accountStatus);

    // Log admin activity
    await db.logActivity(adminUser.uid, 'Update User Status', `Changed status of user ${uid} to ${accountStatus}`);

    return NextResponse.json({ success: true, uid, accountStatus });

  } catch (err: any) {
    console.error('[admin-user-status] PUT error:', err);
    return NextResponse.json({ error: 'Failed to update user status.', detail: err.message }, { status: 500 });
  }
}
