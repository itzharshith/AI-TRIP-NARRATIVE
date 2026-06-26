/**
 * firebase/auth.js — Complete Authentication Service
 * ────────────────────────────────────────────────────
 * Wraps Firebase Auth compat SDK.
 * Exposes: FirebaseAuth (window.FirebaseAuth)
 *
 * Features:
 *  - Email/Password Sign Up & Sign In
 *  - Google OAuth Sign In
 *  - Password Reset Email
 *  - Email Verification
 *  - Session Persistence (LOCAL)
 *  - Auth State Listener
 *  - Sign Out
 */

window.FirebaseAuth = (() => {
  // ── Internal State ─────────────────────────────────────────
  let _currentUser       = null;
  let _authListeners     = [];   // Array of registered state-change callbacks
  let _authInitialized   = false;

  // ── Guard: ensure Firebase is ready ───────────────────────
  function _assertFirebase() {
    if (!firebaseAuth) throw new Error('Firebase Auth is not initialized. Check config.js.');
  }

  // ── Auth State Listener (central) ─────────────────────────
  // Runs once; all consumers register via .onAuthChange()
  if (firebaseAuth) {
    firebaseAuth.onAuthStateChanged((user) => {
      _currentUser     = user;
      _authInitialized = true;
      _authListeners.forEach((cb) => {
        try { cb(user); } catch (e) { console.error('Auth listener error:', e); }
      });
    });
  } else {
    _authInitialized = true;
  }

  // ── Register external auth-change callbacks ────────────────
  function onAuthChange(callback) {
    _assertFirebase();
    _authListeners.push(callback);
    // Fire immediately if already initialized
    if (_authInitialized) callback(_currentUser);
    // Return unsubscribe function
    return () => { _authListeners = _authListeners.filter((cb) => cb !== callback); };
  }

  // ── Get current Firebase ID token for backend calls ────────
  async function getIdToken(forceRefresh = false) {
    if (!_currentUser) return null;
    try {
      return await _currentUser.getIdToken(forceRefresh);
    } catch (e) {
      console.error('getIdToken error:', e);
      return null;
    }
  }

  // ── Email / Password Sign Up ───────────────────────────────
  async function signUp(email, password, displayName = '') {
    _assertFirebase();
    try {
      const credential = await firebaseAuth.createUserWithEmailAndPassword(email, password);
      // Set display name if provided
      if (displayName && credential.user) {
        await credential.user.updateProfile({ displayName });
      }
      // Send verification email
      if (credential.user && !credential.user.emailVerified) {
        await credential.user.sendEmailVerification();
      }
      return { user: credential.user, error: null };
    } catch (e) {
      return { user: null, error: _mapAuthError(e.code) };
    }
  }

  // ── Email / Password Sign In ───────────────────────────────
  async function signInWithEmail(email, password) {
    _assertFirebase();
    try {
      const credential = await firebaseAuth.signInWithEmailAndPassword(email, password);
      return { user: credential.user, error: null };
    } catch (e) {
      return { user: null, error: _mapAuthError(e.code) };
    }
  }


  // ── Password Reset ─────────────────────────────────────────
  async function sendPasswordReset(email) {
    _assertFirebase();
    try {
      await firebaseAuth.sendPasswordResetEmail(email);
      return { error: null };
    } catch (e) {
      return { error: _mapAuthError(e.code) };
    }
  }

  // ── Update Profile ─────────────────────────────────────────
  async function updateProfile(updates = {}) {
    _assertFirebase();
    if (!_currentUser) return { error: 'No user signed in.' };
    try {
      await _currentUser.updateProfile(updates);
      return { error: null };
    } catch (e) {
      return { error: e.message };
    }
  }

  // ── Change Password ────────────────────────────────────────
  async function changePassword(newPassword) {
    _assertFirebase();
    if (!_currentUser) return { error: 'No user signed in.' };
    try {
      await _currentUser.updatePassword(newPassword);
      return { error: null };
    } catch (e) {
      return { error: _mapAuthError(e.code) };
    }
  }

  // ── Resend Verification Email ──────────────────────────────
  async function resendVerificationEmail() {
    _assertFirebase();
    if (!_currentUser) return { error: 'No user signed in.' };
    try {
      await _currentUser.sendEmailVerification();
      return { error: null };
    } catch (e) {
      return { error: e.message };
    }
  }

  // ── Sign Out ───────────────────────────────────────────────
  async function signOut() {
    _assertFirebase();
    try {
      await firebaseAuth.signOut();
      return { error: null };
    } catch (e) {
      return { error: e.message };
    }
  }

  // ── Re-authenticate (needed before password change) ────────
  async function reAuthenticate(password) {
    _assertFirebase();
    if (!_currentUser || !_currentUser.email) return { error: 'No user signed in.' };
    try {
      const cred = firebase.auth.EmailAuthProvider.credential(_currentUser.email, password);
      await _currentUser.reauthenticateWithCredential(cred);
      return { error: null };
    } catch (e) {
      return { error: _mapAuthError(e.code) };
    }
  }

  // ── Friendly Error Messages ────────────────────────────────
  function _mapAuthError(code) {
    const map = {
      'auth/email-already-in-use':     'An account with this email already exists.',
      'auth/invalid-email':            'Please enter a valid email address.',
      'auth/operation-not-allowed':    'Email/password login is not enabled.',
      'auth/weak-password':            'Password must be at least 6 characters.',
      'auth/user-not-found':           'No account found with this email.',
      'auth/wrong-password':           'Incorrect password. Please try again.',
      'auth/too-many-requests':        'Too many attempts. Please wait and try again.',
      'auth/network-request-failed':   'Network error. Check your connection.',
      'auth/popup-closed-by-user':     'Sign-in popup was closed.',
      'auth/requires-recent-login':    'Please sign in again to perform this action.',
      'auth/user-disabled':            'This account has been disabled.',
      'auth/invalid-credential':       'Invalid credentials. Please try again.',
    };
    return map[code] || `Authentication error (${code})`;
  }

  // ── Public API ─────────────────────────────────────────────
  return {
    get currentUser()      { return _currentUser; },
    get isInitialized()    { return _authInitialized; },
    get isSignedIn()       { return !!_currentUser; },
    get isEmailVerified()  { return _currentUser?.emailVerified ?? false; },
    onAuthChange,
    getIdToken,
    signUp,
    signInWithEmail,
    sendPasswordReset,
    updateProfile,
    changePassword,
    resendVerificationEmail,
    reAuthenticate,
    signOut,
  };
})();
