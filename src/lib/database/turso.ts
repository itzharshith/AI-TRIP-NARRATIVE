import { createClient, Client } from '@libsql/client';

const url = process.env.TURSO_DATABASE_URL || 'file:local.db';
const authToken = process.env.TURSO_AUTH_TOKEN || 'local-dev-mock-token';

if (!url) {
  console.error('❌ TURSO_DATABASE_URL not set in environment.');
}

// Singleton connection client for serverless environment
let client: Client;

if (process.env.NODE_ENV === 'production') {
  client = createClient({ url, authToken });
} else {
  // Prevent duplicate connections during development hot reloads
  if (!(global as any)._tursoClient) {
    (global as any)._tursoClient = createClient({ url, authToken });
  }
  client = (global as any)._tursoClient;
}

export async function execute(sql: string, args: any[] = []) {
  return client.execute({ sql, args });
}

export async function init() {
  console.log('🔌 Initializing Turso Database and Tables...');

  // 1. generations table
  await execute(`
    CREATE TABLE IF NOT EXISTS generations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      driver_name TEXT,
      route TEXT,
      landmarks TEXT,
      highlights TEXT,
      trip_date TEXT,
      vehicle_type TEXT DEFAULT 'Sedan',
      tone TEXT DEFAULT 'Adventurous',
      style TEXT DEFAULT 'Adventure',
      prompt TEXT,
      ai_response TEXT,
      title TEXT,
      summary TEXT,
      social_caption TEXT,
      starting_location TEXT,
      destination TEXT,
      rating INTEGER,
      comment TEXT,
      user_id TEXT,
      firestore_id TEXT,
      is_deleted INTEGER DEFAULT 0,
      deleted_at TEXT,
      created_at TEXT,
      updated_at TEXT,
      visibility TEXT DEFAULT 'Public',
      image_url TEXT,
      shares_count INTEGER DEFAULT 0,
      wishlist_count INTEGER DEFAULT 0,
      avg_rating REAL DEFAULT 0.0,
      ratings_count INTEGER DEFAULT 0,
      views_count INTEGER DEFAULT 0,
      legacy_id INTEGER UNIQUE
    )
  `);

  // 2. users table (with password_hash column for custom credentials auth)
  await execute(`
    CREATE TABLE IF NOT EXISTS users (
      uid TEXT PRIMARY KEY,
      email TEXT UNIQUE,
      displayName TEXT,
      photoURL TEXT,
      provider TEXT DEFAULT 'email',
      emailVerified INTEGER DEFAULT 0,
      role TEXT DEFAULT 'User',
      permissions TEXT DEFAULT '[]',
      bio TEXT,
      lastLogin TEXT,
      createdAt TEXT,
      updatedAt TEXT,
      preferences TEXT DEFAULT '{}',
      accountStatus TEXT DEFAULT 'active',
      password_hash TEXT
    )
  `);

  // Resiliently add password_hash column if the users table already exists in local sqlite file
  try {
    await execute('ALTER TABLE users ADD COLUMN password_hash TEXT');
  } catch (err) {
    // Fail silently if column already exists
  }

  // 3. settings table
  await execute(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT,
      updatedAt TEXT
    )
  `);

  // 4. ratings table
  await execute(`
    CREATE TABLE IF NOT EXISTS ratings (
      narrativeId INTEGER,
      userId TEXT,
      userName TEXT,
      rating INTEGER,
      review TEXT,
      createdAt TEXT,
      PRIMARY KEY (narrativeId, userId)
    )
  `);

  // 5. wishlist table
  await execute(`
    CREATE TABLE IF NOT EXISTS wishlist (
      userId TEXT,
      narrativeId INTEGER,
      createdAt TEXT,
      PRIMARY KEY (userId, narrativeId)
    )
  `);

  // 6. reports table
  await execute(`
    CREATE TABLE IF NOT EXISTS reports (
      id TEXT PRIMARY KEY,
      narrativeId INTEGER,
      reportedBy TEXT,
      reason TEXT,
      status TEXT DEFAULT 'Pending',
      createdAt TEXT,
      updatedAt TEXT
    )
  `);

  // 7. notifications table
  await execute(`
    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId TEXT,
      type TEXT,
      message TEXT,
      read INTEGER DEFAULT 0,
      createdAt TEXT
    )
  `);

  // 8. activity_logs table
  await execute(`
    CREATE TABLE IF NOT EXISTS activity_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId TEXT,
      action TEXT,
      detail TEXT,
      createdAt TEXT
    )
  `);

  // 9. trip_photos table
  await execute(`
    CREATE TABLE IF NOT EXISTS trip_photos (
      id TEXT PRIMARY KEY,
      narrativeId INTEGER,
      userId TEXT,
      filename TEXT,
      mimeType TEXT,
      data TEXT,
      size INTEGER,
      createdAt TEXT
    )
  `);

  console.log('✅ Turso Database tables verified and created successfully.');
}

export { client };
