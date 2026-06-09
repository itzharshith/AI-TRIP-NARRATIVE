/**
 * firebase/storage.js — Firebase Storage Service
 * ─────────────────────────────────────────────────
 * Complete file upload/download/delete with progress tracking.
 * Exposes: window.StorageService
 *
 * Used for: trip photos, driver avatars, exported reports
 * Storage structure:
 *   trips/{userId}/{narrativeId}/photos/{filename}
 *   users/{userId}/avatar/{filename}
 *   exports/{userId}/{date}/{filename}
 */

window.StorageService = (() => {
  // ── Guard ───────────────────────────────────────────────────
  function _assert() {
    if (!firebaseStorage) throw new Error('Firebase Storage is not initialized. Check config.js.');
  }

  // ── Helpers ─────────────────────────────────────────────────

  /** Build a storage reference from a path */
  function _ref(path) {
    return firebaseStorage.ref(path);
  }

  /** Generate a unique filename preserving extension */
  function _uniqueName(originalName) {
    const ext  = originalName.split('.').pop().toLowerCase();
    const ts   = Date.now();
    const rand = Math.random().toString(36).slice(2, 8);
    return `${ts}_${rand}.${ext}`;
  }

  /** Validate allowed MIME types */
  function _validateFile(file, allowedTypes = ['image/']) {
    if (!file) return 'No file provided.';
    const allowed = allowedTypes.some((t) => file.type.startsWith(t));
    if (!allowed) return `File type "${file.type}" is not allowed.`;
    if (file.size > 10 * 1024 * 1024) return 'File size must be under 10 MB.';
    return null;
  }

  // ══════════════════════════════════════════════════════════════
  //  UPLOAD
  // ══════════════════════════════════════════════════════════════

  /**
   * Upload a file with progress tracking.
   *
   * @param {string}   storagePath   — e.g. "trips/uid123/photo.jpg"
   * @param {File}     file          — File object from input
   * @param {Object}   metadata      — custom metadata { contentType, ... }
   * @param {Function} onProgress    — callback(percent: 0–100)
   * Returns: Promise<{ url, path, error }>
   */
  async function uploadFile(storagePath, file, metadata = {}, onProgress = null) {
    _assert();
    try {
      const ref          = _ref(storagePath);
      const uploadTask   = ref.put(file, {
        contentType: file.type,
        customMetadata: {
          originalName: file.name,
          uploadedAt:   new Date().toISOString(),
          ...metadata,
        },
      });

      return new Promise((resolve) => {
        uploadTask.on(
          'state_changed',
          (snapshot) => {
            const percent = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
            if (onProgress) onProgress(percent, snapshot.state);
          },
          (error) => {
            console.error('Upload error:', error);
            resolve({ url: null, path: null, error: error.message });
          },
          async () => {
            try {
              const url = await uploadTask.snapshot.ref.getDownloadURL();
              resolve({ url, path: storagePath, error: null });
            } catch (e) {
              resolve({ url: null, path: storagePath, error: e.message });
            }
          }
        );
      });
    } catch (e) {
      console.error('uploadFile error:', e);
      return { url: null, path: null, error: e.message };
    }
  }

  /**
   * Upload a trip photo with validation.
   *
   * @param {string}   userId
   * @param {string}   narrativeId
   * @param {File}     file
   * @param {Function} onProgress
   * Returns: { url, path, error }
   */
  async function uploadTripPhoto(userId, narrativeId, file, onProgress = null) {
    const err = _validateFile(file, ['image/']);
    if (err) return { url: null, path: null, error: err };

    const filename = _uniqueName(file.name);
    const path     = `trips/${userId}/${narrativeId}/photos/${filename}`;
    return uploadFile(path, file, { uploadedBy: userId }, onProgress);
  }

  /**
   * Upload a user avatar.
   *
   * @param {string}   userId
   * @param {File}     file
   * @param {Function} onProgress
   * Returns: { url, path, error }
   */
  async function uploadAvatar(userId, file, onProgress = null) {
    const err = _validateFile(file, ['image/']);
    if (err) return { url: null, path: null, error: err };

    const filename = _uniqueName(file.name);
    const path     = `users/${userId}/avatar/${filename}`;
    return uploadFile(path, file, { uploadedBy: userId }, onProgress);
  }

  /**
   * Upload a text/CSV export file.
   *
   * @param {string}   userId
   * @param {Blob}     blob
   * @param {string}   filename
   * Returns: { url, path, error }
   */
  async function uploadExport(userId, blob, filename) {
    _assert();
    const date = new Date().toISOString().split('T')[0];
    const path = `exports/${userId}/${date}/${filename}`;
    const file = new File([blob], filename, { type: blob.type });
    return uploadFile(path, file, { exportedBy: userId });
  }

  // ══════════════════════════════════════════════════════════════
  //  DOWNLOAD / GET URL
  // ══════════════════════════════════════════════════════════════

  /**
   * Get a publicly accessible download URL for a storage path.
   * Returns: { url, error }
   */
  async function getDownloadURL(storagePath) {
    _assert();
    try {
      const url = await _ref(storagePath).getDownloadURL();
      return { url, error: null };
    } catch (e) {
      console.error(`getDownloadURL [${storagePath}]:`, e);
      return { url: null, error: e.message };
    }
  }

  /**
   * Download a file from storage and save it to the user's device.
   *
   * @param {string} storagePath
   * @param {string} saveAsFilename
   */
  async function downloadFile(storagePath, saveAsFilename) {
    const { url, error } = await getDownloadURL(storagePath);
    if (error) return { error };

    try {
      const response = await fetch(url);
      const blob     = await response.blob();
      const anchor   = document.createElement('a');
      anchor.href    = URL.createObjectURL(blob);
      anchor.download = saveAsFilename || 'download';
      anchor.click();
      URL.revokeObjectURL(anchor.href);
      return { error: null };
    } catch (e) {
      return { error: e.message };
    }
  }

  // ══════════════════════════════════════════════════════════════
  //  LIST FILES
  // ══════════════════════════════════════════════════════════════

  /**
   * List all files in a storage folder.
   * Returns: { items: [{ name, fullPath, url }], error }
   */
  async function listFiles(folderPath) {
    _assert();
    try {
      const result = await _ref(folderPath).listAll();
      const items  = await Promise.all(
        result.items.map(async (itemRef) => {
          try {
            const url = await itemRef.getDownloadURL();
            return { name: itemRef.name, fullPath: itemRef.fullPath, url };
          } catch {
            return { name: itemRef.name, fullPath: itemRef.fullPath, url: null };
          }
        })
      );
      return { items, error: null };
    } catch (e) {
      console.error(`listFiles [${folderPath}]:`, e);
      return { items: [], error: e.message };
    }
  }

  // ══════════════════════════════════════════════════════════════
  //  DELETE
  // ══════════════════════════════════════════════════════════════

  /**
   * Delete a file by its storage path.
   * Returns: { error }
   */
  async function deleteFile(storagePath) {
    _assert();
    try {
      await _ref(storagePath).delete();
      return { error: null };
    } catch (e) {
      // If file not found, treat as success
      if (e.code === 'storage/object-not-found') return { error: null };
      console.error(`deleteFile [${storagePath}]:`, e);
      return { error: e.message };
    }
  }

  /**
   * Delete all files in a storage folder (e.g. all trip photos).
   * Returns: { deleted: number, error }
   */
  async function deleteFolder(folderPath) {
    _assert();
    try {
      const result = await _ref(folderPath).listAll();
      await Promise.all(result.items.map((ref) => ref.delete()));
      // Recurse into sub-folders
      await Promise.all(result.prefixes.map((pre) => deleteFolder(pre.fullPath)));
      return { deleted: result.items.length, error: null };
    } catch (e) {
      console.error(`deleteFolder [${folderPath}]:`, e);
      return { deleted: 0, error: e.message };
    }
  }

  // ══════════════════════════════════════════════════════════════
  //  IMAGE PREVIEW (local, before upload)
  // ══════════════════════════════════════════════════════════════

  /**
   * Generate a local object URL for image preview (before upload).
   * Caller must revoke with URL.revokeObjectURL() when done.
   * Returns: { previewUrl, error }
   */
  function createLocalPreview(file) {
    try {
      if (!file.type.startsWith('image/')) return { previewUrl: null, error: 'File is not an image.' };
      const previewUrl = URL.createObjectURL(file);
      return { previewUrl, error: null };
    } catch (e) {
      return { previewUrl: null, error: e.message };
    }
  }

  // ── Public API ─────────────────────────────────────────────
  return {
    uploadFile,
    uploadTripPhoto,
    uploadAvatar,
    uploadExport,
    getDownloadURL,
    downloadFile,
    listFiles,
    deleteFile,
    deleteFolder,
    createLocalPreview,
  };
})();
