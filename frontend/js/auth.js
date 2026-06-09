/**
 * auth.js — App-level Auth Bridge
 * ─────────────────────────────────
 * Bridges window.FirebaseAuth (firebase/auth.js) to the rest of the app.
 * Keeps the original window.Auth interface intact for backward compatibility
 * while adding signup, password reset, and richer error handling.
 *
 * Exposes: window.Auth (backward compat) — delegates to window.FirebaseAuth
 */

// ── Backward-compat: window.Auth ───────────────────────────────
window.Auth = (() => {
  const _fa = () => window.FirebaseAuth;

  function isFirebaseReady() {
    return !!(firebaseApp && window.FirebaseAuth);
  }

  // ── Sidebar user display ────────────────────────────────────
  function updateSidebarUser(user) {
    const userInfo   = document.getElementById('userInfo');
    const userAvatar = document.getElementById('userAvatar');
    const userName   = document.getElementById('userName');
    if (!userInfo) return;

    if (user) {
      userInfo.style.display = 'flex';
      userName.textContent   = user.displayName || user.email || 'Admin';
      if (user.photoURL) {
        userAvatar.innerHTML = `<img src="${user.photoURL}" alt="Avatar" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
      } else {
        userAvatar.textContent = (user.displayName || user.email || 'A')[0].toUpperCase();
      }
    } else {
      userInfo.style.display = 'none';
      if (userAvatar) userAvatar.textContent = '👤';
      if (userName)  userName.textContent    = '';
    }
  }

  // ── Register state listener ─────────────────────────────────
  if (isFirebaseReady()) {
    _fa().onAuthChange((user) => {
      updateSidebarUser(user);
      // Admin panel state
      if (window.Admin && typeof window.Admin.onAuthChange === 'function') {
        window.Admin.onAuthChange(user);
      }
    });
  }

  // ── Public API (backward compat) ────────────────────────────
  return {
    get currentUser() { return _fa()?.currentUser ?? null; },

    isFirebaseReady,

    async getIdToken() {
      return (await _fa()?.getIdToken()) ?? null;
    },

    async signInWithGoogle() {
      if (!isFirebaseReady()) { showToast('Firebase not configured.', 'error'); return; }
      const { user, error } = await _fa().signInWithGoogle();
      if (error) throw new Error(error);
      return user;
    },

    async signInWithEmail(email, password) {
      if (!isFirebaseReady()) { showToast('Firebase not configured.', 'error'); return; }
      const { user, error } = await _fa().signInWithEmail(email, password);
      if (error) throw new Error(error);
      return user;
    },

    async signUp(email, password, displayName) {
      if (!isFirebaseReady()) { showToast('Firebase not configured.', 'error'); return; }
      const { user, error } = await _fa().signUp(email, password, displayName);
      if (error) throw new Error(error);
      return user;
    },

    async sendPasswordReset(email) {
      if (!isFirebaseReady()) { showToast('Firebase not configured.', 'error'); return; }
      const { error } = await _fa().sendPasswordReset(email);
      if (error) throw new Error(error);
    },

    async signOut() {
      if (!isFirebaseReady()) return;
      const { error } = await _fa().signOut();
      if (!error) showToast('Signed out successfully', 'info');
    },
  };
})();

// ── Wire Logout Button ─────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('logoutBtn')?.addEventListener('click', () => Auth.signOut());
});
