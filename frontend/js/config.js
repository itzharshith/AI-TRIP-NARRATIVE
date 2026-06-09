/**
 * config.js — Firebase & App Configuration
 * ─────────────────────────────────────────
 * Initializes Firebase compat SDK (loaded via CDN in index.html).
 * Exposes: firebaseApp, FIREBASE_CONFIG, API_BASE
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

// ── Initialize Firebase ──────────────────────────────────────
let firebaseApp  = null;
let firebaseAuth = null;
let firebaseDb   = null;   // Firestore
let firebaseStorage = null;

try {
  firebaseApp     = firebase.initializeApp(FIREBASE_CONFIG);
  firebaseAuth    = firebase.auth();
  firebaseDb      = firebase.firestore();
  firebaseStorage = firebase.storage();

  // Firestore settings
  firebaseDb.settings({ ignoreUndefinedProperties: true });

  // Enable Auth persistence across page reloads
  firebaseAuth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);

  console.log('✅ Firebase initialized — project: ai-trip-narrative-generator');
} catch (e) {
  console.error('❌ Firebase init error:', e.message);
}
