const { createClient } = require('@libsql/client');

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url || !authToken) {
  console.error('❌ TURSO_DATABASE_URL or TURSO_AUTH_TOKEN not set in environment.');
}

const client = createClient({ url, authToken });

async function execute(sql, args = []) {
  return client.execute({ sql, args });
}

async function init() {
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

  // 2. users table
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
      accountStatus TEXT DEFAULT 'active'
    )
  `);

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

module.exports = {
  client,
  execute,
  init,
};
