/**
 * auth-gate.js — Route Protection & Session Management
 * ──────────────────────────────────────────────────────
 * Loaded LAST in script order (after config.js and all firebase/* modules).
 *
 * Responsibilities:
 *  1. Wait for Firebase Auth to resolve the current session.
 *  2. If no user → redirect to /login.html.
 *  3. If user → expose window.currentUser, fire onUserReady callbacks.
 *  4. Update nav avatar / name.
 *  5. Wire logout button.
 *  6. Expose window.authFetch() — authenticated fetch with Bearer token.
 *
 * Exposes:
 *   window.currentUser     — Firebase user object (or null)
 *   window.getIdToken()    — returns Promise<string|null>
 *   window.authFetch()     — fetch wrapper with Authorization header
 *   window.onUserReady(cb) — registers callback when auth state resolves
 */

(function AuthGate() {
  'use strict';

  const LOGIN_URL = '/login.html';

  // ── Diagnostics ─────────────────────────────────────────────
  console.log('[auth-gate] Initializing…');

  // ── Auth-ready callbacks ─────────────────────────────────────
  const _readyCallbacks = [];
  let   _resolved       = false;
  window.currentUser    = null;

  window.onUserReady = function (cb) {
    if (typeof cb !== 'function') return;
    if (_resolved) {
      cb(window.currentUser);
      return;
    }
    _readyCallbacks.push(cb);
  };

  function _fireReady(user) {
    _resolved          = true;
    window.currentUser = user;
    console.log('[auth-gate] Auth resolved —', user ? `uid=${user.uid}` : 'no user');
    _readyCallbacks.forEach(cb => {
      try { cb(user); } catch (e) { console.error('[auth-gate] onUserReady error:', e); }
    });
    _readyCallbacks.length = 0;
  }

  // ── getIdToken ───────────────────────────────────────────────
  window.getIdToken = async function (force = false) {
    if (!window.currentUser) return null;
    try {
      return await window.currentUser.getIdToken(force);
    } catch (e) {
      console.warn('[auth-gate] getIdToken error:', e.message);
      return null;
    }
  };

  // ── authFetch — adds Bearer token to every request ───────────
  window.authFetch = async function (url, options = {}) {
    const token = await window.getIdToken();
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
    return fetch(url, { ...options, headers });
  };

  // ── Validate Firebase Auth is available ──────────────────────
  function validateFirebase() {
    if (typeof firebase === 'undefined') {
      console.error('[auth-gate] ❌ Firebase SDK not loaded — check CDN scripts in <head>.');
      return false;
    }
    if (!firebaseAuth) {
      console.error('[auth-gate] ❌ firebaseAuth is null — config.js initialization failed.');
      console.error('   → Check: firebase-app-compat.js and firebase-auth-compat.js are loaded before config.js');
      return false;
    }
    console.log('[auth-gate] ✅ Firebase Auth validated');
    return true;
  }

  // ── Update nav UI on sign-in ─────────────────────────────────
  function updateNavUser(user) {
    const userInfo   = document.getElementById('userInfo');
    const userAvatar = document.getElementById('userAvatar');
    const userName   = document.getElementById('userName');
    const dropdownUserName = document.getElementById('dropdownUserName');
    const dropdownUserEmail = document.getElementById('dropdownUserEmail');

    if (!userInfo) return;  // Not present on this page

    userInfo.style.display = 'flex';

    if (userName) {
      userName.textContent = user.displayName
        || user.email?.split('@')[0]
        || 'User';
    }

    if (dropdownUserName) {
      dropdownUserName.textContent = user.displayName
        || user.email?.split('@')[0]
        || 'User';
    }

    if (dropdownUserEmail) {
      dropdownUserEmail.textContent = user.email || '';
    }

    if (userAvatar) {
      if (user.photoURL) {
        userAvatar.innerHTML = `<img src="${user.photoURL}" alt="User avatar"
          style="width:100%;height:100%;object-fit:cover;border-radius:50%;"
          referrerpolicy="no-referrer"
          onerror="this.parentNode.textContent='${(user.displayName || user.email || 'U')[0].toUpperCase()}'">`;
      } else {
        const initial = (user.displayName || user.email || 'U')[0].toUpperCase();
        userAvatar.textContent = initial;
        userAvatar.style.cssText =
          'display:flex;align-items:center;justify-content:center;' +
          'font-size:16px;font-weight:700;background:var(--primary-fixed,#d9e2ff);' +
          'color:var(--primary,#003c90);border-radius:50%;';
      }
    }
  }

  // ── Core auth state listener ─────────────────────────────────
  function attachAuthListener() {
    console.log('[auth-gate] Attaching onAuthStateChanged listener…');

    firebaseAuth.onAuthStateChanged(async (user) => {
      console.log('[auth-gate] onAuthStateChanged fired —', user ? `${user.email} (${user.uid})` : 'signed out');

      if (!user) {
        console.log('[auth-gate] No authenticated user → redirecting to login');
        // Avoid redirect loop: only redirect if not already on login page
        if (!window.location.pathname.includes('login')) {
          window.location.replace(LOGIN_URL);
        }
        return;
      }

      // ── User is signed in ──────────────────────────────────
      console.log(`[auth-gate] ✅ Signed in: ${user.displayName || user.email}`);
      console.log(`[auth-gate]    UID: ${user.uid}`);
      console.log(`[auth-gate]    Email verified: ${user.emailVerified}`);

      // Update nav UI
      updateNavUser(user);

      // Sync profile to Firestore (non-blocking)
      if (window.FirestoreService) {
        FirestoreService.syncUserProfile(user)
          .then(({ error }) => {
            if (error) console.warn('[auth-gate] Firestore profile sync failed:', error);
            else       console.log('[auth-gate] Firestore profile synced');
          })
          .catch(e => console.warn('[auth-gate] Firestore sync error:', e.message));
      } else {
        console.warn('[auth-gate] FirestoreService not available — profile sync skipped');
      }

      // Resolve all waiting callbacks
      _fireReady(user);
    });
  }

  // ── Wire logout button ───────────────────────────────────────
  function wireLogout() {
    const handleLogout = async () => {
      console.log('[auth-gate] Signing out…');
      try {
        await firebaseAuth.signOut();
        window.currentUser = null;
        window.location.replace(LOGIN_URL);
      } catch (e) {
        console.error('[auth-gate] Sign-out error:', e.message);
      }
    };

    const btn = document.getElementById('logoutBtn');
    if (btn) btn.addEventListener('click', handleLogout);

    const dropdownLogout = document.getElementById('dropdownLogoutBtn');
    if (dropdownLogout) dropdownLogout.addEventListener('click', handleLogout);

    console.log('[auth-gate] Logout buttons wired');
  }

  // ── Profile Dropdown and Editing ─────────────────────────────
  window.toggleProfileDropdown = function(event) {
    if (event) event.stopPropagation();
    const dropdown = document.getElementById('profileDropdown');
    if (dropdown) {
      dropdown.classList.toggle('hidden');
    }
  };

  window.openEditProfileModal = function(event) {
    if (event) event.stopPropagation();
    const dropdown = document.getElementById('profileDropdown');
    if (dropdown) dropdown.classList.add('hidden');

    const modal = document.getElementById('editProfileModal');
    if (modal) {
      modal.classList.add('open');
      const nameInput = document.getElementById('editDisplayName');
      const photoInput = document.getElementById('editPhotoURL');
      if (nameInput && window.currentUser) {
        nameInput.value = window.currentUser.displayName || '';
      }
      if (photoInput && window.currentUser) {
        photoInput.value = window.currentUser.photoURL || '';
      }
    }
  };

  window.closeEditProfileModal = function(event) {
    if (event) event.stopPropagation();
    const modal = document.getElementById('editProfileModal');
    if (modal) {
      modal.classList.remove('open');
    }
  };

  // Close dropdown on click outside
  document.addEventListener('click', function(event) {
    const dropdown = document.getElementById('profileDropdown');
    const userInfo = document.getElementById('userInfo');
    if (dropdown && !dropdown.classList.contains('hidden')) {
      if (!userInfo || !userInfo.contains(event.target)) {
        dropdown.classList.add('hidden');
      }
    }
  });

  function wireProfileForm() {
    const form = document.getElementById('editProfileForm');
    if (!form) return;

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const nameInput = document.getElementById('editDisplayName');
      const photoInput = document.getElementById('editPhotoURL');
      const displayName = nameInput ? nameInput.value.trim() : '';
      const photoURL = photoInput ? photoInput.value.trim() : '';

      if (!window.currentUser) {
        if (typeof showToast === 'function') showToast('You must be signed in.', 'error');
        return;
      }

      const submitBtn = form.querySelector('button[type="submit"]');
      const originalText = submitBtn ? submitBtn.innerHTML : 'Save Changes';
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="inline-block w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin mr-2 align-middle"></span> Saving...';
      }

      try {
        await window.currentUser.updateProfile({
          displayName: displayName,
          photoURL: photoURL
        });

        const response = await window.authFetch('/api/user/profile', {
          method: 'PUT',
          body: JSON.stringify({
            displayName: displayName,
            photoURL: photoURL
          })
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to sync profile with database.');
        }

        // Force reload / update local UI
        updateNavUser(window.currentUser);
        window.closeEditProfileModal();

        if (typeof showToast === 'function') {
          showToast('Profile updated successfully!', 'success');
        } else {
          alert('Profile updated successfully!');
        }
      } catch (error) {
        console.error('[auth-gate] Error updating profile:', error);
        if (typeof showToast === 'function') {
          showToast(error.message || 'Error updating profile.', 'error');
        } else {
          alert('Error updating profile: ' + error.message);
        }
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = originalText;
        }
      }
    });
  }

  // ── Entry point ──────────────────────────────────────────────
  function start() {
    if (!validateFirebase()) {
      // Config failed — show error overlay then redirect
      const overlay = document.getElementById('authLoadingOverlay');
      if (overlay) {
        const msg = overlay.querySelector('p');
        if (msg) msg.textContent = 'Authentication service unavailable. Redirecting to login…';
      }
      setTimeout(() => window.location.replace(LOGIN_URL), 2000);
      return;
    }

    wireLogout();
    wireProfileForm();
    attachAuthListener();
  }

  // Wait for DOM, then start
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }

})();
