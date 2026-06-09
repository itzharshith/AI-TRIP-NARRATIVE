/**
 * middleware/verifyToken.js — Firebase Token Verification Middleware
 * ───────────────────────────────────────────────────────────────────
 * Uses the centralized Firebase Admin SDK from firebase/admin.js.
 * Verifies the Bearer token and checks the admin email allow-list.
 */

const firebaseAdmin = require('../firebase/admin');

/**
 * Express middleware: verify Firebase ID token + admin email check.
 *
 * Expects: Authorization: Bearer <firebase-id-token>
 * Sets:    req.user = decoded token on success
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
  const { user, error } = await firebaseAdmin.verifyIdToken(token);

  if (error) {
    console.error('Token verification failed:', error);
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }

  // Check admin email allow-list
  if (!firebaseAdmin.isAdminEmail(user.email)) {
    return res.status(403).json({
      error: 'Access denied. Your account is not in the admin list.',
    });
  }

  req.user = user;
  next();
}

module.exports = { verifyToken };
