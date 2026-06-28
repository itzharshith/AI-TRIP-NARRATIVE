export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import * as crypto from 'crypto';
import * as db from '@/lib/database';
import { getAuthenticatedUser } from '@/lib/auth/helper';
import { hashPassword } from '@/lib/auth/password';

const CreateUserSchema = z.object({
  displayName: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(['Admin', 'User']).default('User'),
});

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user || user.role !== 'Admin') {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    await db.init();
    const users = await db.getUsers();
    
    // Sanitize database objects (remove sensitive hashes)
    const sanitizedUsers = users.map(u => {
      const { password_hash, ...rest } = u;
      return rest;
    });

    return NextResponse.json(sanitizedUsers);

  } catch (err: any) {
    console.error('[admin-users] GET error:', err);
    return NextResponse.json({ error: 'Failed to fetch user list.', detail: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const adminUser = await getAuthenticatedUser(req);
    if (!adminUser || adminUser.role !== 'Admin') {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const body = await req.json();
    const result = CreateUserSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: 'Validation failed.', details: result.error.format() }, { status: 400 });
    }

    const { email, password, displayName, role } = result.data;
    const normalizedEmail = email.toLowerCase().trim();

    await db.init();
    
    // Check if user already exists
    const existing = await db.getUserByEmail(normalizedEmail);
    if (existing) {
      return NextResponse.json({ error: 'An account with this email already exists.' }, { status: 409 });
    }

    const hashedPassword = await hashPassword(password);
    const uid = crypto.randomUUID();

    // Register user in database
    await db.upsertUser({
      uid,
      email: normalizedEmail,
      displayName,
      photoURL: '',
      provider: 'email',
      emailVerified: true,
      role,
      permissions: role === 'Admin' ? ['all'] : [],
      password_hash: hashedPassword
    });

    // Log admin activity
    await db.logActivity(adminUser.uid, 'Create User', `Created user account ${normalizedEmail} with role ${role}`);

    return NextResponse.json({
      success: true,
      user: {
        uid,
        email: normalizedEmail,
        displayName,
        role
      }
    }, { status: 201 });

  } catch (err: any) {
    console.error('[admin-users] POST error:', err);
    return NextResponse.json({ error: 'Failed to create user.', detail: err.message }, { status: 500 });
  }
}