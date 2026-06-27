import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const response = NextResponse.json({ success: true, message: 'Logged out successfully.' });
    
    // Clear session_token cookie
    response.cookies.set('session_token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 0, // Instant expiry
      path: '/'
    });

    return response;
  } catch (err: any) {
    console.error('[auth-logout] Route error:', err);
    return NextResponse.json({ error: 'An internal signout error occurred.' }, { status: 500 });
  }
}
