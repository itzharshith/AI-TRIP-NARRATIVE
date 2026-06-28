export const dynamic = 'force-dynamic';

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
    const { total: narrativesCount } = await db.getGenerations({ limit: 1 });
    const users = await db.getUsers();
    const usersCount = users.length;

    return NextResponse.json({
      system: {
        uptime: Math.floor(process.uptime()),
        nodeVersion: process.version,
        platform: process.platform,
        memory: {
          heapUsed: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)} MB`,
          rss: `${Math.round(process.memoryUsage().rss / 1024 / 1024)} MB`,
        }
      },
      database: {
        connected: true,
        narrativesCount,
        usersCount,
      }
    });

  } catch (err: any) {
    console.error('[admin-metrics] GET error:', err);
    return NextResponse.json({ error: 'Failed to fetch metrics.', detail: err.message }, { status: 500 });
  }
}