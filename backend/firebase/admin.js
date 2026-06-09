/**
 * backend/firebase/admin.js — Firebase Admin SDK Setup
 * ──────────────────────────────────────────────────────
 * Centralised initialization. Imported once at startup.
 * Other modules should import from here, NOT re-initialize.
 *
 * Usage:
 *   const { adminAuth, adminDb } = require('./firebase/admin');
 */

const admin = require('firebase-admin');
const path  = require('path');
const fs    = require('fs');

let _initialized = false;

// ── Initialize once ────────────────────────────────────────────
function ensureInitialized() {
  if (_initialized || admin.apps.length) {
    _initialized = true;
    return;
  }

  const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH
    ? path.resolve(process.env.FIREBASE_SERVICE_ACCOUNT_PATH)
    : path.join(__dirname, '../firebase-service-account.json');

  if (fs.existsSync(serviceAccountPath)) {
    const serviceAccount = require(serviceAccountPath);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId:  process.env.FIREBASE_PROJECT_ID || 'ai-trip-narrative-generator',
    });
    console.log('✅ Firebase Admin SDK initialized (service account)');
  } else {
    // Application Default Credentials fallback (for Cloud Run / GCP hosting)
    try {
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        projectId:  process.env.FIREBASE_PROJECT_ID || 'ai-trip-narrative-generator',
      });
      console.log('✅ Firebase Admin SDK initialized (application default credentials)');
    } catch {
      // No credentials — dev mode, admin routes will return 503
      console.warn(
        '⚠️  firebase-service-account.json not found and no ADC available.\n' +
        '   Admin routes will return 503 until Firebase is configured.\n' +
        '   → Download from Firebase Console → Project Settings → Service Accounts\n' +
        '   → Save as backend/firebase-service-account.json'
      );
    }
  }
  _initialized = true;
}

ensureInitialized();

// ── Exports ─────────────────────────────────────────────────────
module.exports = {
  /** Firebase Admin App instance */
  get app()       { return admin.apps[0] || null; },

  /** Firebase Auth Admin */
  get adminAuth() { return admin.apps.length ? admin.auth()      : null; },

  /** Firestore Admin */
  get adminDb()   { return admin.apps.length ? admin.firestore() : null; },

  /** Check if Admin SDK is ready */
  get isReady()   { return admin.apps.length > 0; },

  // ── Token Verification ──────────────────────────────────────
  /**
   * Verify a Firebase ID token from the Authorization header.
   * @param {string} token — raw JWT string
   * Returns: { user: DecodedIdToken, error: string|null }
   */
  async verifyIdToken(token) {
    if (!admin.apps.length) return { user: null, error: 'Firebase Admin not initialized.' };
    try {
      const decoded = await admin.auth().verifyIdToken(token);
      return { user: decoded, error: null };
    } catch (e) {
      return { user: null, error: e.message };
    }
  },

  // ── Admin Email Check ────────────────────────────────────────
  /**
   * Check if email is in the ADMIN_EMAILS allow-list.
   * @param {string} email
   * Returns: boolean
   */
  isAdminEmail(email) {
    const admins = (process.env.ADMIN_EMAILS || '')
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);
    return admins.length === 0 || admins.includes((email || '').toLowerCase());
  },
};
