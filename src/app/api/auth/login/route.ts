import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import * as db from '@/lib/database';
import { comparePassword, hashPassword } from '@/lib/auth/password';
import { signToken } from '@/lib/auth/jwt';

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = LoginSchema.safeParse(body);
    
    if (!result.success) {
      return NextResponse.json({ error: 'Invalid email or password format.' }, { status: 400 });
    }

    const { email, password } = result.data;
    const normalizedEmail = email.toLowerCase().trim();

    // Initialize database connection
    await db.init();

    let user = await db.getUserByEmail(normalizedEmail);

    // Bootstrap Super Admin local bypass
    const superAdminEmail = (process.env.SUPER_ADMIN_EMAIL || 'admin@manivtha.com').toLowerCase();
    if (!user && normalizedEmail === superAdminEmail && password === 'admin123') {
      console.log(`[auth-login] Bootstrapping Super Admin account: ${normalizedEmail}`);
      const hashedPassword = await hashPassword('admin123');
      await db.upsertUser({
        uid: 'mock-admin-uid-123',
        email: normalizedEmail,
        displayName: 'Super Admin',
        role: 'Admin',
        password_hash: hashedPassword,
        emailVerified: true
      });
      user = await db.getUserByEmail(normalizedEmail);
    }

    if (!user || !user.password_hash) {
      return NextResponse.json({ error: 'Incorrect email or password.' }, { status: 401 });
    }

    const isMatch = await comparePassword(password, user.password_hash);
    if (!isMatch) {
      return NextResponse.json({ error: 'Incorrect email or password.' }, { status: 401 });
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

    // Log user login activity
    await db.logActivity(user.uid, 'Login', `User successfully authenticated via credentials.`);

    return response;

  } catch (err: any) {
    console.error('[auth-login] Route error:', err);
    return NextResponse.json({ error: 'An internal authentication error occurred.', detail: err.message }, { status: 500 });
  }
}
