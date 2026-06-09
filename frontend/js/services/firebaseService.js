/**
 * services/firebaseService.js — High-Level Application Service Layer
 * ─────────────────────────────────────────────────────────────────────
 * Sits above Firebase modules. Business logic lives here.
 * Connects Firestore cloud storage ↔ local SQLite backend ↔ UI.
 * Exposes: window.AppService
 *
 * Responsibilities:
 *  - Generate narrative → save to SQLite (backend) + Firestore (cloud)
 *  - Manage user session & profile UI
 *  - Provide admin authenticated API calls
 *  - Handle photo uploads for trip records
 */

window.AppService = (() => {
  // ── Shorthand refs ─────────────────────────────────────────
  const _fb = () => window.FB;

  // ══════════════════════════════════════════════════════════════
  //  NARRATIVE GENERATION (SQLite + optional Firestore backup)
  // ══════════════════════════════════════════════════════════════

  /**
   * Generate a narrative via the Express backend (Gemini AI + SQLite),
   * then optionally back it up to Firestore for cloud sync.
   *
   * @param {Object} formData — { driverName, route, landmarks, ... }
   * Returns: { id, title, narrative, createdAt, firestoreId, error }
   */
  async function generateNarrative(formData) {
    try {
      // 1. Call our backend (Gemini AI + SQLite)
      const res = await fetch(`${API_BASE}/generate`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(formData),
      });

      const json = await res.json();
      if (!res.ok) return { ...json, firestoreId: null, error: json.error };

      // 2. If signed in, back up to Firestore (non-blocking)
      let firestoreId = null;
      const fb = _fb();
      if (fb && fb.auth.isSignedIn && fb.isAvailable()) {
        fb.firestore.saveNarrative({
          ...formData,
          id:        json.id,
          title:     json.title,
          narrative: json.narrative,
          userId:    fb.auth.currentUser?.uid || null,
        }).then(({ id, error }) => {
          if (error) console.warn('Firestore backup failed:', error);
          else       firestoreId = id;
        });
      }

      return { ...json, firestoreId, error: null };
    } catch (e) {
      console.error('generateNarrative error:', e);
      return { error: e.message };
    }
  }

  // ══════════════════════════════════════════════════════════════
  //  FEEDBACK / RATING
  // ══════════════════════════════════════════════════════════════

  /**
   * Submit rating to backend SQLite + update Firestore doc.
   *
   * @param {number} sqliteId
   * @param {number} rating
   * @param {string} comment
   * @param {string} firestoreId  — optional, for Firestore update
   * Returns: { error }
   */
  async function submitRating(sqliteId, rating, comment = '', firestoreId = null) {
    try {
      // 1. Update SQLite via backend
      const res = await fetch(`${API_BASE}/feedback/${sqliteId}`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ rating, comment }),
      });
      if (!res.ok) {
        const json = await res.json();
        return { error: json.error || 'Rating failed' };
      }

      // 2. Also update Firestore (non-blocking)
      const fb = _fb();
      if (firestoreId && fb && fb.isAvailable()) {
        fb.firestore.rateNarrative(firestoreId, rating, comment)
          .catch((e) => console.warn('Firestore rating update failed:', e));
      }

      return { error: null };
    } catch (e) {
      return { error: e.message };
    }
  }

  // ══════════════════════════════════════════════════════════════
  //  PHOTO UPLOAD FOR TRIPS
  // ══════════════════════════════════════════════════════════════

  /**
   * Upload a trip photo to Firebase Storage.
   *
   * @param {number|string} narrativeId — SQLite ID of the narrative
   * @param {File}          file
   * @param {Function}      onProgress  — callback(percent)
   * Returns: { url, path, error }
   */
  async function uploadTripPhoto(narrativeId, file, onProgress = null) {
    const fb = _fb();
    if (!fb || !fb.isAvailable()) return { url: null, path: null, error: 'Firebase Storage not available.' };
    if (!fb.auth.isSignedIn) return { url: null, path: null, error: 'You must be signed in to upload photos.' };

    const userId = fb.auth.currentUser.uid;
    return fb.storage.uploadTripPhoto(userId, String(narrativeId), file, onProgress);
  }

  // ══════════════════════════════════════════════════════════════
  //  ADMIN API CALLS (authenticated)
  // ══════════════════════════════════════════════════════════════

  /**
   * Call a backend admin endpoint with Firebase auth token.
   *
   * @param {string} endpoint  — e.g. '/admin/data'
   * @param {string} method
   * @param {Object} body
   * Returns: { data, error }
   */
  async function adminFetch(endpoint, method = 'GET', body = null) {
    const fb = _fb();
    if (!fb || !fb.auth.isSignedIn) return { data: null, error: 'Not authenticated.' };

    try {
      const res = await fb.authFetch(`${API_BASE}${endpoint}`, {
        method,
        body: body ? JSON.stringify(body) : undefined,
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) return { data: null, error: json.error || `HTTP ${res.status}` };
      return { data: json, error: null };
    } catch (e) {
      return { data: null, error: e.message };
    }
  }

  /**
   * Fetch admin data with filters.
   */
  async function getAdminData({ page = 1, limit = 20, search = '', tone = '', rating = '' } = {}) {
    const params = new URLSearchParams({ page, limit, search, tone, rating });
    return adminFetch(`/admin/data?${params}`);
  }

  /**
   * Delete a record (admin only).
   */
  async function deleteRecord(id) {
    return adminFetch(`/admin/data/${id}`, 'DELETE');
  }

  /**
   * Download CSV export (admin only).
   */
  async function exportCsv() {
    const fb = _fb();
    if (!fb || !fb.auth.isSignedIn) return { error: 'Not authenticated.' };

    try {
      const res = await fb.authFetch(`${API_BASE}/admin/export`);
      if (!res.ok) return { error: 'Export failed.' };

      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `manivtha_generations_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      return { error: null };
    } catch (e) {
      return { error: e.message };
    }
  }

  // ══════════════════════════════════════════════════════════════
  //  USER PROFILE MANAGEMENT
  // ══════════════════════════════════════════════════════════════

  /**
   * Get current user's Firestore profile.
   * Returns: { data, error }
   */
  async function getUserProfile() {
    const fb = _fb();
    if (!fb || !fb.auth.isSignedIn) return { data: null, error: 'Not signed in.' };
    return fb.firestore.getUserProfile(fb.auth.currentUser.uid);
  }

  /**
   * Update display name and optional avatar upload.
   *
   * @param {string} displayName
   * @param {File}   avatarFile — optional
   * @param {Function} onProgress
   * Returns: { avatarUrl, error }
   */
  async function updateUserProfile(displayName, avatarFile = null, onProgress = null) {
    const fb = _fb();
    if (!fb || !fb.auth.isSignedIn) return { avatarUrl: null, error: 'Not signed in.' };

    let avatarUrl = fb.auth.currentUser.photoURL || '';

    // Upload avatar if provided
    if (avatarFile) {
      const { url, error } = await fb.storage.uploadAvatar(fb.auth.currentUser.uid, avatarFile, onProgress);
      if (error) return { avatarUrl: null, error };
      avatarUrl = url;
    }

    // Update Firebase Auth profile
    const { error: authErr } = await fb.auth.updateProfile({ displayName, photoURL: avatarUrl });
    if (authErr) return { avatarUrl: null, error: authErr };

    // Update Firestore profile
    await fb.firestore.syncUserProfile({ ...fb.auth.currentUser, displayName, photoURL: avatarUrl });

    return { avatarUrl, error: null };
  }

  // ── Public API ─────────────────────────────────────────────
  return {
    generateNarrative,
    submitRating,
    uploadTripPhoto,
    adminFetch,
    getAdminData,
    deleteRecord,
    exportCsv,
    getUserProfile,
    updateUserProfile,
  };
})();
