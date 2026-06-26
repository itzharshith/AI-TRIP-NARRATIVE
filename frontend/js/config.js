/**
 * config.js — Firebase & App Configuration
 * ─────────────────────────────────────────
 * Initializes Firebase compat SDK (loaded via CDN in index.html).
 * Uses getApp() / initializeApp() pattern to prevent duplicate-app errors.
 * Exposes: firebaseApp, firebaseAuth, firebaseDb, firebaseStorage
 *
 * Diagnostic logging is included so initialization failures are easy to trace.
 */

const FIREBASE_CONFIG = {
  apiKey:            "AIzaSyDVKDd6r-96ewW3dBBxEmF7VsvONifazBs",
  authDomain:        "ai-trip-narrative-generator.firebaseapp.com",
  projectId:         "ai-trip-narrative-generator",
  storageBucket:     "ai-trip-narrative-generator.firebasestorage.app",
  messagingSenderId: "70632204810",
  appId:             "1:70632204810:web:da3e6a8fb1efb9741b8df3",
  measurementId:     "G-Z1CDCVMX8K",
};

// Backend API base URL
const API_BASE = 'http://localhost:3001/api';

// ── Initialize Firebase (prevent duplicate-app errors) ────────
let firebaseApp     = null;
let firebaseAuth    = null;
let firebaseDb      = null;
let firebaseStorage = null;

(function initFirebase() {
  // Guard: ensure the Firebase SDK is available
  if (typeof firebase === 'undefined') {
    console.error('❌ [config] Firebase SDK not loaded. Check CDN script tags.');
    return;
  }

  try {
    // Re-use existing app if already initialized (prevents "duplicate app" error
    // when navigating between pages that both call initializeApp).
    try {
      firebaseApp = firebase.app();   // throws if no app exists
      console.log('[config] Re-using existing Firebase app.');
    } catch (_) {
      firebaseApp = firebase.initializeApp(FIREBASE_CONFIG);
      console.log('[config] Firebase app initialized — project:', FIREBASE_CONFIG.projectId);
    }

    // ── Auth ─────────────────────────────────────────────────
    firebaseAuth = firebase.auth(firebaseApp);
    // Persist auth across page reloads / browser restarts
    firebaseAuth.setPersistence(firebase.auth.Auth.Persistence.LOCAL)
      .then(() => console.log('[config] Auth persistence: LOCAL'))
      .catch(e => console.warn('[config] setPersistence error:', e.message));

    // ── Firestore ─────────────────────────────────────────────
    if (typeof firebase.firestore === 'function') {
      firebaseDb = firebase.firestore(firebaseApp);
      firebaseDb.settings({ ignoreUndefinedProperties: true });
      console.log('[config] Firestore ready');
    } else {
      console.warn('[config] firebase-firestore-compat.js not loaded');
    }

    // ── Storage ───────────────────────────────────────────────
    if (typeof firebase.storage === 'function') {
      firebaseStorage = firebase.storage(firebaseApp);
      console.log('[config] Storage ready');
    } else {
      console.warn('[config] firebase-storage-compat.js not loaded');
    }

    console.log('✅ [config] Firebase fully initialized');

  } catch (e) {
    console.error('❌ [config] Firebase initialization FAILED:', e.code || e.message);
    console.error('   → Check: apiKey, authDomain, projectId in FIREBASE_CONFIG');
  }
})();

// ── Global Helper: Normalize narrative objects ────────────────
window.normalizeNarrative = function (r) {
  if (!r) return null;
  
  // Normalization logic for narrative/story body text
  const narrative =
    r.narrative ||
    r.aiResponse ||
    r.ai_response ||
    r.content ||
    r.story ||
    r.generatedNarrative ||
    r.generatedText ||
    r.description ||
    "";
    
  // Title
  const title =
    r.title ||
    r.route ||
    r.destination ||
    "Untitled Journey";
    
  // Social Caption
  const socialCaption =
    r.socialCaption ||
    r.social_caption ||
    r.socialMediaContent?.caption ||
    "";
    
  // Hashtags
  const hashtags =
    r.hashtags ||
    r.socialMediaContent?.hashtags ||
    (socialCaption.match(/#[\w\u0900-\u097F]+/g) || []);
    
  const socialMediaContent = r.socialMediaContent || {
    caption: socialCaption,
    hashtags: hashtags
  };

  const startingLocation = r.startingLocation || r.starting_location || "";
  const destination = r.destination || "";
  const route = r.route || (startingLocation && destination ? `${startingLocation} to ${destination}` : destination);

  const imagePrompt = r.imagePrompt || `A scenic travel photograph of a road trip from ${startingLocation} to ${destination || route}`;
  
  const driverName = r.driverName || r.driver_name || "Unknown";
  
  const vehicleType = r.vehicleType || r.vehicle_type || "Sedan";
  const vehicleInfo = r.vehicleInfo || {
    type: vehicleType,
    driver: driverName
  };

  const routeInfo = r.routeInfo || {
    startingLocation: startingLocation,
    destination: destination,
    route: route,
    landmarks: r.landmarks || ""
  };

  const tripDate = r.tripDate || r.trip_date || r.startDate || r.start_date || "";
  const startDate = r.startDate || tripDate;
  const reachingDate = r.reachingDate || r.reaching_date || tripDate;
  
  const id = r.id !== undefined ? String(r.id) : (r.sqliteId !== undefined ? String(r.sqliteId) : "");
  const firestoreId = r.firestoreId || r.firestore_id || (r.id && typeof r.id === 'string' && !r.id.startsWith('sqlite-') ? r.id : "");

  const rating = r.rating !== undefined ? Number(r.rating) : null;
  const comment = r.comment || "";
  
  // Format createdAt and updatedAt consistently
  const formatTime = (val) => {
    if (!val) return null;
    if (val.toDate) return val.toDate().toISOString();
    try {
      return new Date(val).toISOString();
    } catch {
      return String(val);
    }
  };

  const createdAt = formatTime(r.createdAt || r.created_at);
  const updatedAt = formatTime(r.updatedAt || r.updated_at || r.createdAt || r.created_at);

  return {
    id,
    firestoreId,
    driverName,
    route,
    startingLocation,
    destination,
    landmarks: r.landmarks || "",
    highlights: r.highlights || "",
    tripDate,
    reachingDate,
    vehicleType,
    tone: r.tone || r.mood || "Adventurous",
    style: r.style || "Adventure",
    title,
    narrative,
    summary: r.summary || r.brief || "",
    socialCaption,
    socialMediaContent,
    hashtags,
    imagePrompt,
    vehicleInfo,
    routeInfo,
    startDate,
    reachingDate,
    rating,
    comment,
    createdAt,
    updatedAt,
    isDeleted: r.isDeleted || r.is_deleted === 1 || r.is_deleted === true || false
  };
};
