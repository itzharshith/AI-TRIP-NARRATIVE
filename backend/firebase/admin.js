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
async function seedAdminAllowlist() {
  if (!admin.apps.length) return;
  const db = admin.firestore();
  
  const superAdminEmail = (process.env.SUPER_ADMIN_EMAIL || 'admin@manivtha.com').toLowerCase();
  
  try {
    const docRef = db.collection('admins').doc(superAdminEmail);
    const doc = await docRef.get();
    if (!doc.exists) {
      console.log(`[firebase/admin] Seeding admin allowlist for ${superAdminEmail}`);
      await docRef.set({
        email: superAdminEmail,
        role: 'admin',
        enabled: true,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }
  } catch (e) {
    console.warn(`[firebase/admin] Failed to seed super admin email ${superAdminEmail}:`, e.message);
  }
}

async function verifyDevUsers() {
  if (!admin.apps.length) return;
  const auth = admin.auth();
  const emails = ['charan@example.com', 'driver@manivtha.com'];
  for (const email of emails) {
    try {
      const userRecord = await auth.getUserByEmail(email);
      const updates = { emailVerified: true };
      if (email === 'driver@manivtha.com') {
        updates.password = 'password123';
      }
      console.log(`[firebase/admin] Updating dev user ${email} in Firebase Auth.`);
      await auth.updateUser(userRecord.uid, updates);
    } catch (e) {
      console.warn(`[firebase/admin] Could not verify/update dev user ${email}:`, e.message);
    }
  }
}

ensureInitialized();
if (admin.apps.length) {
  seedAdminAllowlist().catch(e => console.error('[firebase/admin] Allowlist seeding error:', e));
  verifyDevUsers().catch(e => console.error('[firebase/admin] Dev users verification error:', e));
}

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
   * Check if email is the Super Admin.
   * @param {string} email
   * Returns: boolean
   */
  isAdminEmail(email) {
    const superAdminEmail = (process.env.SUPER_ADMIN_EMAIL || 'admin@manivtha.com').toLowerCase();
    return (email || '').toLowerCase() === superAdminEmail;
  },

  /**
   * Check dynamically if email is an allowed admin via Firestore allowlist collection,
   * falling back to the static SUPER_ADMIN_EMAIL check.
   * @param {string} email
   * Returns: Promise<boolean>
   */
  async isAllowedAdmin(email) {
    if (!admin.apps.length || !email) return false;
    try {
      const emailLower = email.toLowerCase();
      const doc = await admin.firestore().collection('admins').doc(emailLower).get();
      if (doc.exists) {
        const data = doc.data();
        if ((data.role === 'admin' || data.role === 'Admin') && data.enabled === true) {
          return true;
        }
      }
    } catch (e) {
      console.warn('[firebase/admin] Firestore allowlist check error:', e.message);
    }
    // Fallback to static check
    return this.isAdminEmail(email);
  }
};
