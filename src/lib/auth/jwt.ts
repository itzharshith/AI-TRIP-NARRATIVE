import { SignJWT, jwtVerify } from 'jose';

const SECRET_KEY = process.env.JWT_SECRET || 'jwt-default-super-secret-key-1234567890';
const key = new TextEncoder().encode(SECRET_KEY);

export interface TokenPayload {
  uid: string;
  email: string;
  role: string;
  displayName?: string;
  photoURL?: string;
}

/**
 * Sign a JWT token with the user profile context
 */
export async function signToken(payload: TokenPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d') // Session expires in 7 days
    .sign(key);
}

/**
 * Verify a JWT token and decode its payload
 */
export async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, key, {
      algorithms: ['HS256'],
    });
    return payload as unknown as TokenPayload;
  } catch (err) {
    console.error('[auth-jwt] Failed to verify token:', err);
    return null;
  }
}
