export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import * as db from '@/lib/database';
import { getAuthenticatedUser } from '@/lib/auth/helper';

const RoleSchema = z.object({
  role: z.enum(['Admin', 'User']),
});

export async function PUT(req: NextRequest, { params }: { params: Promise<{ uid: string }> }) {
  try {
    const adminUser = await getAuthenticatedUser(req);
    if (!adminUser || adminUser.role !== 'Admin') {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { uid } = await params;
    const body = await req.json();
    
    const result = RoleSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: 'Invalid role. Must be Admin or User.' }, { status: 400 });
    }

    const { role } = result.data;
    const permissions = role === 'Admin' ? ['all'] : [];

    await db.init();
    await db.updateUserRoleAndPermissions(uid, role, permissions);

    // Log admin activity
    await db.logActivity(adminUser.uid, 'Update User Role', `Changed role of user ${uid} to ${role}`);

    return NextResponse.json({ success: true, uid, role });

  } catch (err: any) {
    console.error('[admin-user-role] PUT error:', err);
    return NextResponse.json({ error: 'Failed to update user role.', detail: err.message }, { status: 500 });
  }
}
