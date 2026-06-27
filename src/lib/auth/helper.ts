import { NextRequest } from 'next/server';
import { verifyToken, TokenPayload } from './jwt';

/**
 * Retrieve the authenticated user context from cookies
 */
export async function getAuthenticatedUser(req: NextRequest): Promise<TokenPayload | null> {
  try {
    const sessionCookie = req.cookies.get('session_token');
    if (!sessionCookie) return null;
    
    return await verifyToken(sessionCookie.value);
  } catch (err) {
    console.error('[auth-helper] Error getting authenticated user:', err);
    return null;
  }
}
