/**
 * firebase/index.js — Central Firebase Export
 * ─────────────────────────────────────────────
 * Loaded AFTER config.js, auth.js, firestore.js, storage.js.
 * Wires up cross-module side-effects:
 *   1. Auto-sync user profile to Firestore on sign-in.
 *   2. Provides a single global entry-point: window.FB
 *
 * Usage anywhere in the app:
 *   const user = FB.auth.currentUser;
 *   const { id } = await FB.firestore.saveNarrative(data);
 *   const { url } = await FB.storage.uploadTripPhoto(uid, nid, file, onProgress);
 */

window.FB = (() => {
  // ── Guard ────────────────────────────────────────────────────
  const auth      = window.FirebaseAuth;
  const firestore = window.FirestoreService;
  const storage   = window.StorageService;

  if (!auth || !firestore || !storage) {
    console.error('❌ FB index: one or more Firebase modules failed to load.');
    return { auth, firestore, storage };
  }

  // ── Auto-sync user profile on sign-in ───────────────────────
  auth.onAuthChange(async (user) => {
    if (user) {
      // Sync user data to Firestore users/ collection
      const { error } = await firestore.syncUserProfile(user);
      if (error) console.warn('User profile sync failed:', error);
    }
  });

  // ── Convenience: authenticated fetch for backend API ────────
  /**
   * Fetch wrapper that automatically attaches Firebase ID token.
   * Use for admin-protected backend endpoints.
   *
   * @param {string} url
   * @param {Object} options  — fetch options
   * Returns: Response
   */
  async function authFetch(url, options = {}) {
    const token = await auth.getIdToken();
    return fetch(url, {
      ...options,
      headers: {
        ...(options.headers || {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        'Content-Type': options.body ? 'application/json' : undefined,
      },
    });
  }

  // ── Utility: check if Firebase features are available ────────
  function isAvailable() {
    return !!(firebaseApp && firebaseAuth && firebaseDb && firebaseStorage);
  }

  console.log(`✅ FB module ready — Firebase available: ${isAvailable()}`);

  // ── Public API ───────────────────────────────────────────────
  return {
    auth,
    firestore,
    storage,
    authFetch,
    isAvailable,
    // Expose raw instances if needed
    get app()       { return firebaseApp; },
    get rawAuth()   { return firebaseAuth; },
    get rawDb()     { return firebaseDb; },
    get rawStorage(){ return firebaseStorage; },
  };
})();
