import * as crypto from 'crypto';
import * as turso from './turso';

const TOUR_IMAGES = [
  'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1530789253388-582c481c54b0?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1501761095374-cf0a72b89ae1?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1488085061387-422e29b40080?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1433838552652-f9a46b332c40?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1516483638261-f4dbaf036963?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1493246507139-91e8fad9978e?auto=format&fit=crop&w=800&q=80',
];

/** Convert a SQL generation row to the shape expected by frontend and components */
export function toRow(row: any): any {
  if (!row) return null;

  const title = row.title || row.route || "Untitled Journey";
  const socialCaption = row.social_caption || "";
  const hashtags = socialCaption.match(/#[\w\u0900-\u097F]+/g) || [];

  const socialMediaContent = {
    caption: socialCaption,
    hashtags: hashtags
  };

  const imagePrompt = `A scenic travel photograph of a road trip from ${row.starting_location || ''} to ${row.destination || row.route || ''}`;

  const vehicleInfo = {
    type: row.vehicle_type || 'Sedan',
    driver: row.driver_name || 'Unknown'
  };

  const routeInfo = {
    startingLocation: row.starting_location || '',
    destination: row.destination || '',
    route: row.route || '',
    landmarks: row.landmarks || ''
  };

  return {
    id:                row.id,
    driver_name:       row.driver_name,
    route:             row.route,
    landmarks:         row.landmarks,
    highlights:        row.highlights,
    trip_date:         row.trip_date,
    vehicle_type:      row.vehicle_type || 'Sedan',
    tone:              row.tone || 'Adventurous',
    style:             row.style || 'Adventure',
    prompt:            row.prompt,
    ai_response:       row.ai_response,
    title:             title,
    summary:           row.summary,
    social_caption:    socialCaption,
    starting_location: row.starting_location,
    destination:       row.destination,
    rating:            row.rating,
    comment:           row.comment,
    user_id:           row.user_id,
    firestore_id:      row.firestore_id,
    is_deleted:        row.is_deleted ? 1 : 0,
    deleted_at:        row.deleted_at,
    created_at:        row.created_at,
    visibility:        row.visibility || 'Public',
    image_url:         row.image_url,
    updated_at:        row.updated_at,
    shares_count:      row.shares_count || 0,
    wishlist_count:    row.wishlist_count || 0,
    avg_rating:        row.avg_rating,
    ratings_count:     row.ratings_count || 0,
    views_count:       row.views_count || 0,

    // Audited schema fields
    userId:            row.user_id,
    narrative:         row.ai_response || "",
    socialMediaContent,
    hashtags,
    imagePrompt,
    vehicleInfo,
    routeInfo,
    startDate:         row.trip_date || "",
    reachingDate:      row.trip_date || "",
    createdAt:         row.created_at,
    updatedAt:         row.updated_at,
  };
}

// ── Lifecycle ─────────────────────────────────────────────────

export async function init() {
  await turso.init();
}

// ── Generations / Narratives ──────────────────────────────────

export interface GenerationInput {
  driverName?: string;
  route?: string;
  landmarks?: string;
  highlights?: string;
  tripDate?: string;
  vehicleType?: string;
  tone?: string;
  prompt?: string;
  aiResponse?: string;
  title?: string;
  summary?: string;
  socialCaption?: string;
  startingLocation?: string;
  destination?: string;
  style?: string;
  userId?: string | null;
  firestoreId?: string | null;
  visibility?: string;
  imageUrl?: string | null;
}

export async function insertGeneration(input: GenerationInput) {
  const now = new Date().toISOString();
  
  const res = await turso.execute(`
    INSERT INTO generations (
      driver_name, route, landmarks, highlights, trip_date, vehicle_type,
      tone, prompt, ai_response, title, summary, social_caption, starting_location, destination, style,
      user_id, firestore_id, visibility, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    input.driverName || null, input.route || null, input.landmarks || null, input.highlights || null, input.tripDate || null, input.vehicleType || 'Sedan',
    input.tone || 'Adventurous', input.prompt || null, input.aiResponse || null, input.title || null,
    input.summary || null, input.socialCaption || null, input.startingLocation || null, input.destination || null, input.style || 'Adventure',
    input.userId || null, input.firestoreId || null, input.visibility || 'Public', now, now
  ]);

  const id = Number(res.lastInsertRowid);
  const finalImageUrl = input.imageUrl ?? TOUR_IMAGES[id % TOUR_IMAGES.length];

  await turso.execute('UPDATE generations SET image_url = ? WHERE id = ?', [finalImageUrl, id]);
  return id;
}

export async function updateFirestoreId(id: number | string, firestoreId: string) {
  await turso.execute('UPDATE generations SET firestore_id = ? WHERE id = ?', [firestoreId, Number(id)]);
}

export interface GetGenerationsInput {
  page?: number;
  limit?: number;
  search?: string;
  userId?: string | null;
}

export async function getGenerations({ page = 1, limit = 12, search = '', userId = null }: GetGenerationsInput = {}) {
  const offset = (page - 1) * limit;
  let where = 'WHERE is_deleted = 0';
  const params: any[] = [];
  const countParams: any[] = [];

  if (userId) {
    where += ' AND user_id = ?';
    params.push(userId);
    countParams.push(userId);
  }

  if (search) {
    const term = `%${search}%`;
    where += ' AND (driver_name LIKE ? OR route LIKE ? OR title LIKE ?)';
    params.push(term, term, term);
    countParams.push(term, term, term);
  }

  const countSql = `SELECT COUNT(*) as count FROM generations ${where}`;
  const selectSql = `
    SELECT id, driver_name, route, landmarks, highlights, trip_date,
           vehicle_type, tone, style, title, summary, social_caption,
           starting_location, destination, rating, comment, user_id,
           firestore_id, is_deleted, deleted_at, created_at, visibility,
           image_url, updated_at, shares_count, wishlist_count, avg_rating,
           ratings_count, views_count
    FROM generations ${where}
    ORDER BY created_at DESC LIMIT ? OFFSET ?
  `;

  params.push(limit, offset);

  const [countRes, selectRes] = await Promise.all([
    turso.execute(countSql, countParams),
    turso.execute(selectSql, params)
  ]);

  const total = Number(countRes.rows[0]?.count || 0);
  const data = selectRes.rows.map(toRow);
  return { data, total };
}

export async function getGeneration(id: number | string) {
  const res = await turso.execute('SELECT * FROM generations WHERE id = ? AND is_deleted = 0 LIMIT 1', [Number(id)]);
  return res.rows[0] ? toRow(res.rows[0]) : null;
}

export async function updateRating(id: number | string, rating: number | null, comment: string | null) {
  await turso.execute('UPDATE generations SET rating = ?, comment = ? WHERE id = ?', [rating, comment, Number(id)]);
}

export async function deleteGeneration(id: number | string) {
  const now = new Date().toISOString();
  await turso.execute('UPDATE generations SET is_deleted = 1, deleted_at = ? WHERE id = ?', [now, Number(id)]);
}

export async function restoreGeneration(id: number | string) {
  await turso.execute('UPDATE generations SET is_deleted = 0, deleted_at = NULL WHERE id = ?', [Number(id)]);
}

// ── Analytics ─────────────────────────────────────────────────

export async function getAnalytics() {
  const [
    kpiRes,
    perDayRes,
    toneRes,
    routeRes,
    ratingRes,
    driverRes,
    recentRes,
    popularRes,
    trendingRes
  ] = await Promise.all([
    turso.execute(`
      SELECT COUNT(*) as total,
             AVG(rating) as avgRating,
             SUM(CASE WHEN rating IS NOT NULL THEN 1 ELSE 0 END) as ratedCount,
             SUM(shares_count) as totalShares,
             SUM(wishlist_count) as totalWishlists
      FROM generations WHERE is_deleted = 0
    `),
    turso.execute(`
      SELECT substr(created_at, 1, 10) as day, COUNT(*) as count
      FROM generations
      WHERE is_deleted = 0
        AND created_at >= datetime('now', '-30 days')
      GROUP BY day
      ORDER BY day ASC
    `),
    turso.execute(`
      SELECT tone, COUNT(*) as count FROM generations WHERE is_deleted = 0 GROUP BY tone ORDER BY count DESC
    `),
    turso.execute(`
      SELECT route, COUNT(*) as count FROM generations WHERE is_deleted = 0 GROUP BY route ORDER BY count DESC LIMIT 5
    `),
    turso.execute(`
      SELECT rating, COUNT(*) as count FROM generations WHERE is_deleted = 0 AND rating IS NOT NULL GROUP BY rating ORDER BY rating ASC
    `),
    turso.execute(`
      SELECT driver_name, COUNT(*) as count FROM generations WHERE is_deleted = 0 GROUP BY driver_name ORDER BY count DESC LIMIT 5
    `),
    turso.execute(`
      SELECT id, driver_name, route, title, rating, created_at
      FROM generations
      WHERE is_deleted = 0 AND rating >= 4
      ORDER BY created_at DESC LIMIT 5
    `),
    turso.execute(`
      SELECT * FROM generations WHERE is_deleted = 0 ORDER BY wishlist_count DESC, created_at DESC LIMIT 1
    `),
    turso.execute(`
      SELECT * FROM generations WHERE is_deleted = 0 ORDER BY avg_rating DESC, wishlist_count DESC LIMIT 5
    `)
  ]);

  const kpi = kpiRes.rows[0] || {};
  const total = Number(kpi.total || 0);
  const avgRating = kpi.avgRating ? Number(Number(kpi.avgRating).toFixed(1)) : 0;
  const ratedCount = Number(kpi.ratedCount || 0);
  const totalShares = Number(kpi.totalShares || 0);
  const totalWishlists = Number(kpi.totalWishlists || 0);

  return {
    kpis: {
      total,
      avgRating,
      ratedCount,
      totalShares,
      totalWishlists,
    },
    perDay: perDayRes.rows.map(r => ({ day: r.day as string, count: Number(r.count) })),
    toneDistribution: toneRes.rows.map(r => ({ tone: r.tone as string, count: Number(r.count) })),
    topRoutes: routeRes.rows.map(r => ({ route: r.route as string, count: Number(r.count) })),
    ratingDist: ratingRes.rows.map(r => ({ rating: Number(r.rating), count: Number(r.count) })),
    topDrivers: driverRes.rows.map(r => ({ driver_name: r.driver_name as string, count: Number(r.count) })),
    recentHighRated: recentRes.rows.map(r => ({
      id:          r.id,
      driver_name: r.driver_name,
      route:       r.route,
      title:       r.title || r.route || "Untitled Journey",
      rating:      r.rating,
      created_at:  r.created_at,
    })),
    mostPopular: popularRes.rows[0] ? toRow(popularRes.rows[0]) : null,
    trending: trendingRes.rows.map(toRow),
  };
}

// ── Admin ─────────────────────────────────────────────────────

export interface GetAdminDataInput {
  page?: number;
  limit?: number;
  search?: string;
  tone?: string;
  rating?: string;
}

export async function getAdminData({ page = 1, limit = 20, search = '', tone = '', rating = '' }: GetAdminDataInput = {}) {
  const offset = (page - 1) * limit;
  let where = 'WHERE is_deleted = 0';
  const params: any[] = [];
  const countParams: any[] = [];

  if (search) {
    const term = `%${search}%`;
    where += ' AND (driver_name LIKE ? OR route LIKE ? OR title LIKE ?)';
    params.push(term, term, term);
    countParams.push(term, term, term);
  }
  if (tone) {
    where += ' AND tone = ?';
    params.push(tone);
    countParams.push(tone);
  }
  if (rating) {
    where += ' AND rating = ?';
    params.push(Number(rating));
    countParams.push(Number(rating));
  }

  const countSql = `SELECT COUNT(*) as count FROM generations ${where}`;
  const selectSql = `
    SELECT id, driver_name, route, landmarks, highlights, trip_date,
           vehicle_type, tone, style, title, summary, social_caption,
           starting_location, destination, rating, comment, user_id,
           firestore_id, is_deleted, deleted_at, created_at, visibility,
           image_url, updated_at, shares_count, wishlist_count, avg_rating,
           ratings_count, views_count
    FROM generations ${where}
    ORDER BY created_at DESC LIMIT ? OFFSET ?
  `;

  params.push(limit, offset);

  const [countRes, selectRes] = await Promise.all([
    turso.execute(countSql, countParams),
    turso.execute(selectSql, params)
  ]);

  const total = Number(countRes.rows[0]?.count || 0);
  const data = selectRes.rows.map(toRow);
  return { data, total };
}

export async function getAllForExport() {
  const res = await turso.execute('SELECT * FROM generations WHERE is_deleted = 0 ORDER BY created_at DESC');
  return res.rows.map(toRow);
}

// ── Users & Custom Auth ───────────────────────────────────────

export interface UserInput {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  provider?: string;
  emailVerified?: boolean;
  role?: string;
  permissions?: string[];
  password_hash?: string;
}

export async function upsertUser(input: UserInput) {
  const now = new Date().toISOString();
  
  const role = 'Admin';
  const permissions = JSON.stringify(input.permissions || ['all']);

  // Check if we need to preserve existing password hash when updating without providing one
  let existingHash: string | null = null;
  if (!input.password_hash) {
    const existing = await getUserByUid(input.uid);
    if (existing) {
      existingHash = existing.password_hash || null;
    }
  }

  await turso.execute(`
    INSERT INTO users (
      uid, email, displayName, photoURL, provider, emailVerified, role, permissions, password_hash, lastLogin, createdAt, updatedAt, accountStatus
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')
    ON CONFLICT(uid) DO UPDATE SET
      email = excluded.email,
      displayName = excluded.displayName,
      photoURL = excluded.photoURL,
      provider = excluded.provider,
      emailVerified = excluded.emailVerified,
      role = excluded.role,
      permissions = excluded.permissions,
      password_hash = COALESCE(excluded.password_hash, users.password_hash),
      lastLogin = excluded.lastLogin,
      updatedAt = excluded.updatedAt
  `, [
    input.uid,
    input.email,
    input.displayName || '',
    input.photoURL || '',
    input.provider || 'email',
    input.emailVerified ? 1 : 0,
    role,
    permissions,
    input.password_hash || existingHash,
    now,
    now,
    now
  ]);
}

export async function getUserByUid(uid: string) {
  const res = await turso.execute('SELECT * FROM users WHERE uid = ? LIMIT 1', [uid]);
  const row = res.rows[0] as any;
  if (!row) return null;
  return {
    uid: row.uid as string,
    email: row.email as string,
    displayName: row.displayName as string,
    photoURL: row.photoURL as string,
    provider: row.provider as string,
    role: row.role as string,
    password_hash: row.password_hash as string,
    accountStatus: row.accountStatus as string,
    emailVerified: !!row.emailVerified,
    permissions: JSON.parse((row.permissions as string) || '[]'),
    preferences: JSON.parse((row.preferences as string) || '{}'),
  };
}

export async function getUserByEmail(email: string) {
  const res = await turso.execute('SELECT * FROM users WHERE email = ? LIMIT 1', [email]);
  const row = res.rows[0] as any;
  if (!row) return null;
  return {
    uid: row.uid as string,
    email: row.email as string,
    displayName: row.displayName as string,
    photoURL: row.photoURL as string,
    provider: row.provider as string,
    role: row.role as string,
    password_hash: row.password_hash as string,
    accountStatus: row.accountStatus as string,
    emailVerified: !!row.emailVerified,
    permissions: JSON.parse((row.permissions as string) || '[]'),
    preferences: JSON.parse((row.preferences as string) || '{}'),
  };
}

export async function getUsers() {
  const res = await turso.execute('SELECT * FROM users');
  return res.rows.map((row: any) => ({
    uid: row.uid as string,
    email: row.email as string,
    displayName: row.displayName as string,
    photoURL: row.photoURL as string,
    provider: row.provider as string,
    role: row.role as string,
    password_hash: row.password_hash as string,
    accountStatus: row.accountStatus as string,
    emailVerified: !!row.emailVerified,
    permissions: JSON.parse((row.permissions as string) || '[]'),
    preferences: JSON.parse((row.preferences as string) || '{}'),
  }));
}


export async function updateUserRoleAndPermissions(uid: string, role: string, permissions: string[]) {
  const targetRole = (role === 'Admin' || role === 'admin') ? 'Admin' : 'User';
  const perms = JSON.stringify(permissions || (targetRole === 'Admin' ? ['all'] : []));
  const now = new Date().toISOString();
  await turso.execute('UPDATE users SET role = ?, permissions = ?, updatedAt = ? WHERE uid = ?', [targetRole, perms, now, uid]);
}

export async function updateUserStatus(uid: string, status: string) {
  const now = new Date().toISOString();
  await turso.execute('UPDATE users SET accountStatus = ?, updatedAt = ? WHERE uid = ?', [status, now, uid]);
}

// ── Settings ──────────────────────────────────────────────────

export async function getSetting(key: string, defaultValue = '') {
  const res = await turso.execute('SELECT value FROM settings WHERE key = ? LIMIT 1', [key]);
  return res.rows[0] ? (res.rows[0].value as string) : defaultValue;
}

export async function setSetting(key: string, value: string) {
  const now = new Date().toISOString();
  await turso.execute(`
    INSERT INTO settings (key, value, updatedAt) VALUES (?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updatedAt = excluded.updatedAt
  `, [key, value, now]);
}

// ── User Dashboard & Analytics Extensions ─────────────────────

export async function incrementViews(id: number | string) {
  await turso.execute('UPDATE generations SET views_count = views_count + 1 WHERE id = ?', [Number(id)]);
}

export interface UserProfileInput {
  displayName?: string;
  photoURL?: string;
  bio?: string;
  preferences?: Record<string, any>;
}

export async function updateUserProfile(uid: string, profile: UserProfileInput) {
  const now = new Date().toISOString();
  const fields: string[] = [];
  const vals: any[] = [];

  if (profile.displayName !== undefined) {
    fields.push('displayName = ?');
    vals.push(profile.displayName);
  }
  if (profile.photoURL !== undefined) {
    fields.push('photoURL = ?');
    vals.push(profile.photoURL);
  }
  if (profile.bio !== undefined) {
    fields.push('bio = ?');
    vals.push(profile.bio);
  }
  if (profile.preferences !== undefined) {
    fields.push('preferences = ?');
    vals.push(JSON.stringify(profile.preferences));
  }

  if (!fields.length) return;

  fields.push('updatedAt = ?');
  vals.push(now);
  vals.push(uid);

  const sql = `UPDATE users SET ${fields.join(', ')} WHERE uid = ?`;
  await turso.execute(sql, vals);
}

export async function createNotification(userId: string, type: string, message: string) {
  const now = new Date().toISOString();
  await turso.execute('INSERT INTO notifications (userId, type, message, read, createdAt) VALUES (?, ?, ?, 0, ?)', [
    userId, type, message, now
  ]);
}

export async function getUserNotifications(userId: string) {
  const res = await turso.execute('SELECT id, type, message, read, createdAt FROM notifications WHERE userId = ? ORDER BY createdAt DESC LIMIT 20', [userId]);
  return res.rows.map(n => ({
    id: Number(n.id),
    type: n.type,
    message: n.message,
    read: Number(n.read) === 1,
    createdAt: n.createdAt,
  }));
}

export async function markNotificationsRead(userId: string) {
  await turso.execute('UPDATE notifications SET read = 1 WHERE userId = ?', [userId]);
}

export async function logActivity(userId: string, action: string, detail: string) {
  const now = new Date().toISOString();
  await turso.execute('INSERT INTO activity_logs (userId, action, detail, createdAt) VALUES (?, ?, ?, ?)', [
    userId, action, detail, now
  ]);
}

export async function getUserActivity(userId: string) {
  const res = await turso.execute('SELECT action, detail, createdAt FROM activity_logs WHERE userId = ? ORDER BY createdAt DESC LIMIT 20', [userId]);
  return res.rows;
}

export async function getUserAnalyticsMetrics(userId: string) {
  const [totalViewsRes, ratingsRes, perDayRes] = await Promise.all([
    turso.execute('SELECT SUM(views_count) as views, SUM(shares_count) as shares, SUM(wishlist_count) as saves FROM generations WHERE user_id = ? AND is_deleted = 0', [userId]),
    turso.execute('SELECT rating, COUNT(*) as count FROM generations WHERE user_id = ? AND is_deleted = 0 AND rating IS NOT NULL GROUP BY rating', [userId]),
    turso.execute(`
      SELECT substr(created_at, 1, 10) as day, COUNT(*) as count
      FROM generations
      WHERE user_id = ? AND is_deleted = 0 AND created_at >= datetime('now', '-15 days')
      GROUP BY day
      ORDER BY day ASC
    `, [userId])
  ]);

  const views = totalViewsRes.rows[0] || {};
  return {
    views: Number(views.views || 0),
    shares: Number(views.shares || 0),
    saves: Number(views.saves || 0),
    ratings: ratingsRes.rows.map(r => ({ rating: Number(r.rating), count: Number(r.count) })),
    dailyGenerations: perDayRes.rows.map(r => ({ date: r.day as string, count: Number(r.count) }))
  };
}

export async function getUserDashboardStats(userId: string) {
  const [statsRes, unreadRes, activityRes] = await Promise.all([
    turso.execute(`
      SELECT COUNT(*) as totalNarratives,
             SUM(views_count) as totalViews,
             SUM(wishlist_count) as totalSaves,
             SUM(shares_count) as totalShares,
             AVG(avg_rating) as avgRating
      FROM generations
      WHERE user_id = ? AND is_deleted = 0
    `, [userId]),
    turso.execute('SELECT COUNT(*) as count FROM notifications WHERE userId = ? AND read = 0', [userId]),
    turso.execute('SELECT action, detail, createdAt FROM activity_logs WHERE userId = ? ORDER BY createdAt DESC LIMIT 5', [userId])
  ]);

  const stats = statsRes.rows[0] || {};
  const totalNarratives = Number(stats.totalNarratives || 0);
  const totalViews = Number(stats.totalViews || 0);
  const totalSaves = Number(stats.totalSaves || 0);
  const totalShares = Number(stats.totalShares || 0);
  const avgRating = stats.avgRating ? parseFloat(Number(stats.avgRating).toFixed(1)) : 0;
  const unreadNotificationsCount = Number(unreadRes.rows[0]?.count || 0);

  return {
    totalNarratives,
    totalViews,
    totalSaves,
    totalShares,
    avgRating,
    unreadNotificationsCount,
    recentActivity: activityRes.rows.map(a => ({
      action: a.action,
      detail: a.detail,
      createdAt: a.createdAt,
    })),
  };
}

// ── Custom Extensions / Wishlist / Feedback / Reports ─────────

export async function getPublicGenerations({ page = 1, limit = 12, search = '' }: GetGenerationsInput = {}) {
  const offset = (page - 1) * limit;
  let where = "WHERE is_deleted = 0 AND visibility = 'Public'";
  const params: any[] = [];
  const countParams: any[] = [];

  if (search) {
    const term = `%${search}%`;
    where += ' AND (driver_name LIKE ? OR route LIKE ? OR title LIKE ? OR starting_location LIKE ? OR destination LIKE ?)';
    params.push(term, term, term, term, term);
    countParams.push(term, term, term, term, term);
  }

  const countSql = `SELECT COUNT(*) as count FROM generations ${where}`;
  const selectSql = `
    SELECT * FROM generations ${where}
    ORDER BY created_at DESC LIMIT ? OFFSET ?
  `;

  params.push(limit, offset);

  const [countRes, selectRes] = await Promise.all([
    turso.execute(countSql, countParams),
    turso.execute(selectSql, params)
  ]);

  const total = Number(countRes.rows[0]?.count || 0);
  const data = selectRes.rows.map(toRow);
  return { data, total };
}

export async function updateNarrative(id: number | string, updates: { title?: string; narrative?: string; summary?: string; visibility?: string }) {
  const fields: string[] = [];
  const vals: any[] = [];

  if (updates.title !== undefined) {
    fields.push('title = ?');
    vals.push(updates.title);
  }
  if (updates.narrative !== undefined) {
    fields.push('ai_response = ?');
    vals.push(updates.narrative);
  }
  if (updates.summary !== undefined) {
    fields.push('summary = ?');
    vals.push(updates.summary);
  }
  if (updates.visibility !== undefined) {
    fields.push('visibility = ?');
    vals.push(updates.visibility);
  }

  if (!fields.length) return;

  fields.push('updated_at = ?');
  vals.push(new Date().toISOString());
  vals.push(Number(id));

  const sql = `UPDATE generations SET ${fields.join(', ')} WHERE id = ?`;
  await turso.execute(sql, [...vals, Number(id)]);
}

export async function addRating(narrativeId: number | string, userId: string, userName: string, rating: number, review: string) {
  const now = new Date().toISOString();
  await turso.execute(`
    INSERT INTO ratings (narrativeId, userId, userName, rating, review, createdAt)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(narrativeId, userId) DO UPDATE SET
      userName = excluded.userName,
      rating = excluded.rating,
      review = excluded.review,
      createdAt = excluded.createdAt
  `, [Number(narrativeId), userId, userName, rating, review, now]);

  // Re-calculate average rating for this narrative
  const statsRes = await turso.execute('SELECT AVG(rating) as avg, COUNT(*) as count FROM ratings WHERE narrativeId = ?', [Number(narrativeId)]);
  const avg = Number(statsRes.rows[0]?.avg || 0);
  const count = Number(statsRes.rows[0]?.count || 0);

  await turso.execute('UPDATE generations SET avg_rating = ?, ratings_count = ? WHERE id = ?', [avg, count, Number(narrativeId)]);
}

export async function getNarrativeRatings(narrativeId: number | string) {
  const res = await turso.execute('SELECT * FROM ratings WHERE narrativeId = ? ORDER BY createdAt DESC', [Number(narrativeId)]);
  return res.rows.map(r => ({
    narrativeId: Number(r.narrativeId),
    userId: r.userId,
    userName: r.userName,
    rating: Number(r.rating),
    review: r.review,
    createdAt: r.createdAt
  }));
}

export async function toggleWishlist(userId: string, narrativeId: number | string) {
  const now = new Date().toISOString();
  const idNum = Number(narrativeId);
  
  const check = await turso.execute('SELECT 1 FROM wishlist WHERE userId = ? AND narrativeId = ? LIMIT 1', [userId, idNum]);
  const exists = check.rows.length > 0;

  if (exists) {
    await turso.execute('DELETE FROM wishlist WHERE userId = ? AND narrativeId = ?', [userId, idNum]);
    await turso.execute('UPDATE generations SET wishlist_count = MAX(0, wishlist_count - 1) WHERE id = ?', [idNum]);
    return { added: false };
  } else {
    await turso.execute('INSERT INTO wishlist (userId, narrativeId, createdAt) VALUES (?, ?, ?)', [userId, idNum, now]);
    await turso.execute('UPDATE generations SET wishlist_count = wishlist_count + 1 WHERE id = ?', [idNum]);
    return { added: true };
  }
}

export async function getUserWishlist(userId: string) {
  const res = await turso.execute(`
    SELECT g.* FROM generations g
    INNER JOIN wishlist w ON g.id = w.narrativeId
    WHERE w.userId = ? AND g.is_deleted = 0
  `, [userId]);
  return res.rows.map(toRow);
}

export async function isWishlisted(userId: string, narrativeId: number | string) {
  const res = await turso.execute('SELECT 1 FROM wishlist WHERE userId = ? AND narrativeId = ? LIMIT 1', [userId, Number(narrativeId)]);
  return res.rows.length > 0;
}

export async function createReport(narrativeId: number | string, reportedBy: string, reason: string) {
  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  await turso.execute('INSERT INTO reports (id, narrativeId, reportedBy, reason, status, createdAt, updatedAt) VALUES (?, ?, ?, ?, \'Pending\', ?, ?)', [
    id, Number(narrativeId), reportedBy, reason, now, now
  ]);
  return id;
}

export async function getReports() {
  const res = await turso.execute(`
    SELECT r.*, g.title as narrativeTitle FROM reports r
    LEFT JOIN generations g ON r.narrativeId = g.id
    ORDER BY r.createdAt DESC
  `);
  return res.rows;
}

export async function updateReportStatus(reportId: string, status: string) {
  const now = new Date().toISOString();
  await turso.execute('UPDATE reports SET status = ?, updatedAt = ? WHERE id = ?', [status, now, reportId]);
}

export async function incrementShares(id: number | string) {
  await turso.execute('UPDATE generations SET shares_count = shares_count + 1 WHERE id = ?', [Number(id)]);
}

// ── Trip Photos ───────────────────────────────────────────────

export interface PhotoInput {
  narrativeId?: number | string | null;
  userId?: string | null;
  filename: string;
  mimeType: string;
  data: string;
  size: number;
}

export async function insertPhoto(photo: PhotoInput) {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  await turso.execute('INSERT INTO trip_photos (id, narrativeId, userId, filename, mimeType, data, size, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [
    id, photo.narrativeId ? Number(photo.narrativeId) : null, photo.userId || null, photo.filename, photo.mimeType, photo.data, Number(photo.size), now
  ]);
  return id;
}

export async function getPhotosByNarrativeId(narrativeId: number | string) {
  const res = await turso.execute('SELECT id, narrativeId, userId, filename, mimeType, size, createdAt FROM trip_photos WHERE narrativeId = ? ORDER BY createdAt ASC', [Number(narrativeId)]);
  return res.rows;
}

export async function getPhotoById(photoId: string) {
  const res = await turso.execute('SELECT * FROM trip_photos WHERE id = ? LIMIT 1', [photoId]);
  return res.rows[0] || null;
}

export async function deletePhoto(photoId: string) {
  await turso.execute('DELETE FROM trip_photos WHERE id = ?', [photoId]);
}

export async function getPhotoCountForNarrative(narrativeId: number | string) {
  const res = await turso.execute('SELECT COUNT(*) as count FROM trip_photos WHERE narrativeId = ?', [Number(narrativeId)]);
  return Number(res.rows[0]?.count || 0);
}

export async function getUserReviews(uid: string) {
  const userNarrativesRes = await turso.execute(
    'SELECT id, title, route FROM generations WHERE user_id = ? AND is_deleted = 0',
    [uid]
  );
  const userNarratives = userNarrativesRes.rows.map(n => ({
    id: Number(n.id),
    title: n.title as string,
    route: n.route as string
  }));
  const narrativeIds = userNarratives.map(n => n.id);

  if (!narrativeIds.length) {
    return { avgScore: 0, totalReviews: 0, distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }, reviews: [] };
  }

  const qmarks = narrativeIds.map(() => '?').join(',');
  const ratingsRes = await turso.execute(
    `SELECT * FROM ratings WHERE narrativeId IN (${qmarks}) ORDER BY createdAt DESC`,
    narrativeIds
  );

  const reviews = ratingsRes.rows.map(r => ({
    id: String(r.narrativeId) + '-' + r.userId, // Stable string rating ID
    narrativeId: Number(r.narrativeId),
    userName: (r.userName as string) || 'Anonymous',
    rating: Number(r.rating),
    review: (r.review as string) || '',
    createdAt: r.createdAt as string
  }));

  const total = reviews.length;
  const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
  const avgScore = total ? parseFloat((sum / total).toFixed(1)) : 0;

  const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 } as Record<number, number>;
  reviews.forEach(r => {
    if (distribution[r.rating] !== undefined) {
      distribution[r.rating]++;
    }
  });

  const narrativeMap = Object.fromEntries(userNarratives.map(n => [n.id, n.title || n.route || 'Untitled']));
  const enrichedReviews = reviews.map(r => ({
    id: r.id,
    narrativeId: r.narrativeId,
    narrativeTitle: narrativeMap[r.narrativeId] || 'Deleted Narrative',
    userName: r.userName,
    rating: r.rating,
    review: r.review,
    createdAt: r.createdAt
  }));

  return {
    avgScore,
    totalReviews: total,
    distribution,
    reviews: enrichedReviews
  };
}
