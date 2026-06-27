import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import * as crypto from 'crypto';
import * as db from '@/lib/database';
import { hashPassword } from '@/lib/auth/password';
import { signToken } from '@/lib/auth/jwt';

const SignupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  displayName: z.string().min(2),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = SignupSchema.safeParse(body);
    
    if (!result.success) {
      return NextResponse.json({ error: 'Validation failed.', details: result.error.format() }, { status: 400 });
    }

    const { email, password, displayName } = result.data;
    const normalizedEmail = email.toLowerCase().trim();

    // Initialize database connection
    await db.init();

    // Check if user already exists
    const existingUser = await db.getUserByEmail(normalizedEmail);
    if (existingUser) {
      return NextResponse.json({ error: 'An account with this email already exists.' }, { status: 409 });
    }

    // Hash password
    const hashedPassword = await hashPassword(password);
    const uid = crypto.randomUUID();

    // Create user in database
    await db.upsertUser({
      uid,
      email: normalizedEmail,
      displayName,
      password_hash: hashedPassword,
      emailVerified: true // Set to verified directly for simplicity/degraded mode
    });

    const user = await db.getUserByUid(uid);
    if (!user) {
      return NextResponse.json({ error: 'Failed to retrieve registered user profile.' }, { status: 500 });
    }

    // Generate JWT token
    const token = await signToken({
      uid: user.uid,
      email: user.email,
      role: user.role || 'User',
      displayName: user.displayName || '',
      photoURL: user.photoURL || '',
    });

    const response = NextResponse.json({
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
      role: user.role,
      permissions: user.permissions,
      emailVerified: user.emailVerified
    });

    // Set HTTP-only cookie
    response.cookies.set('session_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/'
    });

    // Log registration activity
    await db.logActivity(uid, 'Registration', `User account created successfully.`);

    return response;

  } catch (err: any) {
    console.error('[auth-signup] Route error:', err);
    return NextResponse.json({ error: 'An internal signup error occurred.', detail: err.message }, { status: 500 });
  }
}
