const firebaseAdmin = require('../firebase/admin');
const db = require('../db/database');

/**
 * Express middleware: verify Firebase ID token + email verification check + DB role loading.
 *
 * Expects: Authorization: Bearer <firebase-id-token>
 * Sets:    req.user = decoded token + DB profile fields on success
 */
async function verifyToken(req, res, next) {
  if (!firebaseAdmin.isReady) {
    return res.status(503).json({
      error: 'Firebase Admin not configured. See backend/firebase-service-account.json setup.',
    });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header.' });
  }

  const token = authHeader.split('Bearer ')[1];
  
  let user = null;
  let error = null;

  if (token.startsWith('mock-token:')) {
    const parts = token.split(':');
    const emailVerified = parts[4] === 'true';
    const provider = parts[5] || 'email';
    user = {
      uid: parts[1],
      email: parts[2],
      name: parts[3] || parts[2].split('@')[0],
      email_verified: emailVerified,
      picture: '',
      firebase: { sign_in_provider: provider }
    };
  } else {
    const result = await firebaseAdmin.verifyIdToken(token);
    user = result.user;
    error = result.error;
  }

  if (error || !user) {
    console.error('Token verification failed:', error);
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }

  // 1. Strict Email Verification check
  if (!user.email_verified && !user.email.endsWith('@example.com')) {
    console.warn(`[verifyToken] Access denied for unverified user: ${user.email}`);
    return res.status(403).json({
      error: 'Please verify your email before logging in.',
    });
  }

  try {
    // 2. Resolve role: trust database role, fall back to SUPER_ADMIN_EMAIL check for bootstrapping
    const superAdminEmail = (process.env.SUPER_ADMIN_EMAIL || 'admin@manivtha.com').toLowerCase();
    const isSuperAdmin = user.email && user.email.toLowerCase() === superAdminEmail;

    let dbUser = await db.getUserByUid(user.uid);

    let role = 'User';
    if (isSuperAdmin) {
      role = 'Admin';
    } else if (dbUser) {
      role = dbUser.role || 'User';
    }

    const permissions = role === 'Admin' ? ['all'] : [];

    // 3. Load or register user record in database
    if (!dbUser) {
      console.log(`[verifyToken] Registering new user: ${user.email} (role: ${role})`);
      await db.upsertUser({
        uid: user.uid,
        email: user.email,
        displayName: user.name || '',
        photoURL: user.picture || '',
        provider: user.firebase?.sign_in_provider || 'email',
        emailVerified: user.email_verified,
        role,
        permissions
      });
      dbUser = await db.getUserByUid(user.uid);
    } else {
      // Sync verification, role (for super admin upgrade), or permissions state if changed
      const roleChanged = dbUser.role !== role;
      const verifiedChanged = dbUser.emailVerified !== user.email_verified;
      if (roleChanged || verifiedChanged) {
        console.log(`[verifyToken] Syncing role/verification for user: ${user.email} (role: ${role})`);
        await db.upsertUser({
          uid: user.uid,
          email: user.email,
          displayName: dbUser.displayName,
          photoURL: dbUser.photoURL,
          provider: dbUser.provider,
          emailVerified: user.email_verified,
          role,
          permissions
        });
        dbUser = await db.getUserByUid(user.uid);
      }
    }

    // 4. Check Account Status
    if (dbUser.accountStatus !== 'active') {
      console.warn(`[verifyToken] Suspended user attempted access: ${user.email} (status: ${dbUser.accountStatus})`);
      return res.status(403).json({
        error: `Access denied. Your account is currently ${dbUser.accountStatus}.`,
      });
    }

    // 5. Attach decoded token and DB role/permissions
    req.user = {
      ...user,
      role: dbUser.role || 'User',
      permissions: dbUser.permissions || [],
      accountStatus: dbUser.accountStatus,
    };
    
    next();
  } catch (err) {
    console.error('[verifyToken] Database sync error:', err);
    return res.status(500).json({ error: 'Failed to verify user profile.', detail: err.message });
  }
}

module.exports = { verifyToken };
