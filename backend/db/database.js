/**
 * database.js — Turso (LibSQL) persistence layer
 * ================================================
 * Drop-in replacement for the previous MongoDB implementation.
 *
 * All exported function signatures are IDENTICAL to the previous version,
 * so no route files or middleware need any changes.
 */

'use strict';

const crypto = require('crypto');
const turso = require('./turso');

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

/** Convert a SQL generation row to the snake_case shape the routes expect */
function toRow(row) {
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
    id:                row.legacy_id || row.id,
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

/**
 * init() — Connect to Turso.
 */
async function init() {
  await turso.init();
}

// ── Generations / Narratives ──────────────────────────────────

/**
 * insertGeneration({ driverName, ... })
 * Inserts a new narrative and returns its unique ID.
 */
async function insertGeneration({
  driverName, route, landmarks, highlights, tripDate,
  vehicleType, tone, prompt, aiResponse, title,
  summary, socialCaption, startingLocation, destination, style,
  userId = null, firestoreId = null, visibility = 'Public', imageUrl = null,
}) {
  const now = new Date().toISOString();
  
  const res = await turso.execute(`
    INSERT INTO generations (
      driver_name, route, landmarks, highlights, trip_date, vehicle_type,
      tone, prompt, ai_response, title, summary, social_caption, starting_location, destination, style,
      user_id, firestore_id, visibility, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    driverName || null, route || null, landmarks || null, highlights || null, tripDate || null, vehicleType || 'Sedan',
    tone || 'Adventurous', prompt || null, aiResponse || null, title || null,
    summary || null, socialCaption || null, startingLocation || null, destination || null, style || 'Adventure',
    userId, firestoreId, visibility, now, now
  ]);

  const id = Number(res.lastInsertRowid);
  const finalImageUrl = imageUrl ?? TOUR_IMAGES[id % TOUR_IMAGES.length];

  await turso.execute('UPDATE generations SET legacy_id = ?, image_url = ? WHERE id = ?', [id, finalImageUrl, id]);
  return id;
}

/**
 * updateFirestoreId(legacyId, firestoreId)
 */
async function updateFirestoreId(legacyId, firestoreId) {
  await turso.execute('UPDATE generations SET firestore_id = ? WHERE legacy_id = ?', [firestoreId, Number(legacyId)]);
}

/**
 * getGenerations({ page, limit, search, userId })
 */
async function getGenerations({ page = 1, limit = 12, search = '', userId = null } = {}) {
  const offset = (page - 1) * limit;
  let where = 'WHERE is_deleted = 0';
  const params = [];
  const countParams = [];

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
           ratings_count, views_count, legacy_id
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

/**
 * getGeneration(id)
 */
async function getGeneration(id) {
  const res = await turso.execute('SELECT * FROM generations WHERE legacy_id = ? AND is_deleted = 0 LIMIT 1', [Number(id)]);
  return res.rows[0] ? toRow(res.rows[0]) : null;
}

/**
 * updateRating(id, rating, comment)
 */
async function updateRating(id, rating, comment) {
  await turso.execute('UPDATE generations SET rating = ?, comment = ? WHERE legacy_id = ?', [rating ?? null, comment ?? null, Number(id)]);
}

/**
 * deleteGeneration(id)
 */
async function deleteGeneration(id) {
  const now = new Date().toISOString();
  await turso.execute('UPDATE generations SET is_deleted = 1, deleted_at = ? WHERE legacy_id = ?', [now, Number(id)]);
}

/**
 * restoreGeneration(id)
 */
async function restoreGeneration(id) {
  await turso.execute('UPDATE generations SET is_deleted = 0, deleted_at = NULL WHERE legacy_id = ?', [Number(id)]);
}

// ── Analytics ─────────────────────────────────────────────────

/**
 * getAnalytics()
 */
async function getAnalytics() {
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
      SELECT id, driver_name, route, title, rating, created_at, legacy_id
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
    perDay: perDayRes.rows.map(r => ({ day: r.day, count: Number(r.count) })),
    toneDistribution: toneRes.rows.map(r => ({ tone: r.tone, count: Number(r.count) })),
    topRoutes: routeRes.rows.map(r => ({ route: r.route, count: Number(r.count) })),
    ratingDist: ratingRes.rows.map(r => ({ rating: Number(r.rating), count: Number(r.count) })),
    topDrivers: driverRes.rows.map(r => ({ driver_name: r.driver_name, count: Number(r.count) })),
    recentHighRated: recentRes.rows.map(r => ({
      id:          r.legacy_id || r.id,
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

/**
 * getAdminData({ page, limit, search, tone, rating })
 */
async function getAdminData({ page = 1, limit = 20, search = '', tone = '', rating = '' } = {}) {
  const offset = (page - 1) * limit;
  let where = 'WHERE is_deleted = 0';
  const params = [];
  const countParams = [];

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
           ratings_count, views_count, legacy_id
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

/**
 * getAllForExport()
 */
async function getAllForExport() {
  const res = await turso.execute('SELECT * FROM generations WHERE is_deleted = 0 ORDER BY created_at DESC');
  return res.rows.map(toRow);
}

// ── Users ─────────────────────────────────────────────────────

/**
 * upsertUser({ uid, email, ... })
 */
async function upsertUser({ uid, email, displayName, photoURL, provider, emailVerified, role: inputRole, permissions: inputPermissions }) {
  const now = new Date().toISOString();
  
  // Resolve default role based on SUPER_ADMIN_EMAIL
  const superAdminEmail = (process.env.SUPER_ADMIN_EMAIL || 'admin@manivtha.com').toLowerCase();
  const isDefaultAdmin = email && email.toLowerCase() === superAdminEmail;
  
  let role = 'User';
  if (inputRole) {
    role = (inputRole === 'Admin' || inputRole === 'admin') ? 'Admin' : 'User';
  } else {
    role = isDefaultAdmin ? 'Admin' : 'User';
  }
  
  const permissions = JSON.stringify(inputPermissions || (role === 'Admin' ? ['all'] : []));

  await turso.execute(`
    INSERT INTO users (
      uid, email, displayName, photoURL, provider, emailVerified, role, permissions, lastLogin, createdAt, updatedAt, accountStatus
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')
    ON CONFLICT(uid) DO UPDATE SET
      email = excluded.email,
      displayName = excluded.displayName,
      photoURL = excluded.photoURL,
      provider = excluded.provider,
      emailVerified = excluded.emailVerified,
      role = excluded.role,
      permissions = excluded.permissions,
      lastLogin = excluded.lastLogin,
      updatedAt = excluded.updatedAt
  `, [
    uid, email, displayName || '', photoURL || '', provider || 'email', emailVerified ? 1 : 0, role, permissions, now, now, now
  ]);

  // Sync to Firestore if Firebase Admin is initialized
  try {
    const firebaseAdmin = require('../firebase/admin');
    if (firebaseAdmin.isReady && firebaseAdmin.adminDb) {
      const db = firebaseAdmin.adminDb;
      await db.collection('users').doc(uid).set({
        uid,
        email,
        displayName: displayName || '',
        photoURL: photoURL || '',
        role: role,
        updatedAt: new Date()
      }, { merge: true });

      // Also ensure the super admin is always in the admins collection
      if (isDefaultAdmin) {
        await db.collection('admins').doc(superAdminEmail).set({
          email: superAdminEmail,
          role: 'admin',
          enabled: true,
          updatedAt: new Date()
        });
      }
    }
  } catch (err) {
    console.warn('[database] Failed to sync profile to Firestore in upsertUser:', err.message);
  }
}

/**
 * getUserByUid(uid)
 */
async function getUserByUid(uid) {
  const res = await turso.execute('SELECT * FROM users WHERE uid = ? LIMIT 1', [uid]);
  const row = res.rows[0];
  if (!row) return null;
  return {
    ...row,
    emailVerified: !!row.emailVerified,
    permissions: JSON.parse(row.permissions || '[]'),
    preferences: JSON.parse(row.preferences || '{}'),
  };
}

/**
 * getUsers()
 */
async function getUsers() {
  const res = await turso.execute('SELECT * FROM users');
  return res.rows.map(row => ({
    ...row,
    emailVerified: !!row.emailVerified,
    permissions: JSON.parse(row.permissions || '[]'),
    preferences: JSON.parse(row.preferences || '{}'),
  }));
}

/**
 * updateUserRoleAndPermissions(uid, role, permissions)
 */
async function updateUserRoleAndPermissions(uid, role, permissions) {
  const targetRole = (role === 'Admin' || role === 'admin') ? 'Admin' : 'User';
  const perms = JSON.stringify(permissions || (targetRole === 'Admin' ? ['all'] : []));
  const now = new Date().toISOString();
  await turso.execute('UPDATE users SET role = ?, permissions = ?, updatedAt = ? WHERE uid = ?', [targetRole, perms, now, uid]);

  // Sync to Firestore if Firebase Admin is initialized
  try {
    const firebaseAdmin = require('../firebase/admin');
    if (firebaseAdmin.isReady && firebaseAdmin.adminDb) {
      const db = firebaseAdmin.adminDb;
      // 1. Update users collection role
      await db.collection('users').doc(uid).set({ role: targetRole }, { merge: true });
      
      // 2. Update/create admins allowlist document depending on the role
      const userRes = await turso.execute('SELECT email FROM users WHERE uid = ? LIMIT 1', [uid]);
      const email = userRes.rows[0]?.email;
      if (email) {
        const emailLower = email.toLowerCase();
        if (targetRole === 'Admin') {
          await db.collection('admins').doc(emailLower).set({
            email: emailLower,
            role: 'admin',
            enabled: true,
            updatedAt: new Date()
          });
        } else {
          // If demoted, delete from allowlist or disable it
          await db.collection('admins').doc(emailLower).delete();
        }
      }
    }
  } catch (err) {
    console.warn('[database] Failed to sync role to Firestore:', err.message);
  }
}

/**
 * updateUserStatus(uid, accountStatus)
 */
async function updateUserStatus(uid, accountStatus) {
  const now = new Date().toISOString();
  await turso.execute('UPDATE users SET accountStatus = ?, updatedAt = ? WHERE uid = ?', [accountStatus, now, uid]);
}

// ── Public Exploration & Social Sharing & Ratings & Wishlist & Reports ──

/**
 * getPublicGenerations({ ... })
 */
async function getPublicGenerations({
  page = 1,
  limit = 12,
  search = '',
  sortBy = 'recent',
  destination = '',
  author = '',
  rating = '',
  date = '',
} = {}) {
  const offset = (page - 1) * limit;
  let where = 'WHERE is_deleted = 0 AND visibility = "Public"';
  const params = [];

  if (search) {
    const term = `%${search}%`;
    where += ' AND (driver_name LIKE ? OR route LIKE ? OR title LIKE ? OR destination LIKE ? OR starting_location LIKE ?)';
    params.push(term, term, term, term, term);
  }

  if (destination) {
    const term = `%${destination}%`;
    where += ' AND (destination LIKE ? OR route LIKE ?)';
    params.push(term, term);
  }

  if (author) {
    const term = `%${author}%`;
    where += ' AND user_id IN (SELECT uid FROM users WHERE displayName LIKE ?)';
    params.push(term);
  }

  if (rating) {
    where += ' AND avg_rating >= ?';
    params.push(Number(rating));
  }

  if (date) {
    let dateLimit;
    const now = new Date();
    if (date === 'today') {
      dateLimit = new Date(now.setHours(0,0,0,0)).toISOString();
    } else if (date === 'week') {
      dateLimit = new Date(now.setDate(now.getDate() - 7)).toISOString();
    } else if (date === 'month') {
      dateLimit = new Date(now.setMonth(now.getMonth() - 1)).toISOString();
    } else if (date === 'year') {
      dateLimit = new Date(now.setFullYear(now.getFullYear() - 1)).toISOString();
    }
    if (dateLimit) {
      where += ' AND created_at >= ?';
      params.push(dateLimit);
    }
  }

  let orderBy = 'ORDER BY created_at DESC';
  if (sortBy === 'popular' || sortBy === 'Most Popular' || sortBy === 'wishlisted' || sortBy === 'Most Wishlisted') {
    orderBy = 'ORDER BY wishlist_count DESC, created_at DESC';
  } else if (sortBy === 'shared' || sortBy === 'Most Shared') {
    orderBy = 'ORDER BY shares_count DESC, created_at DESC';
  } else if (sortBy === 'rating' || sortBy === 'Rating') {
    orderBy = 'ORDER BY avg_rating DESC, created_at DESC';
  }

  const countSql = `SELECT COUNT(*) as count FROM generations ${where}`;
  const selectSql = `SELECT * FROM generations ${where} ${orderBy} LIMIT ? OFFSET ?`;

  const [countRes, selectRes] = await Promise.all([
    turso.execute(countSql, params),
    turso.execute(selectSql, [...params, limit, offset])
  ]);

  const total = Number(countRes.rows[0]?.count || 0);
  const docs = selectRes.rows;

  const authorUids = [...new Set(docs.map(d => d.user_id).filter(Boolean))];
  let authorMap = {};
  if (authorUids.length > 0) {
    const qmarks = authorUids.map(() => '?').join(',');
    const usersRes = await turso.execute(`SELECT uid, displayName, email FROM users WHERE uid IN (${qmarks})`, authorUids);
    authorMap = Object.fromEntries(usersRes.rows.map(u => [u.uid, u.displayName || u.email.split('@')[0]]));
  }

  const data = docs.map(doc => {
    const row = toRow(doc);
    row.author_name = authorMap[doc.user_id] || 'Anonymous';
    return row;
  });

  return { data, total };
}

/**
 * updateNarrative(id, userId, updates)
 */
async function updateNarrative(id, userId, updates) {
  const res = await turso.execute('SELECT * FROM generations WHERE legacy_id = ? AND is_deleted = 0 LIMIT 1', [Number(id)]);
  const doc = res.rows[0];
  if (!doc) throw new Error('Narrative not found.');
  if (doc.user_id && doc.user_id !== userId) {
    throw new Error('Forbidden. You do not own this narrative.');
  }

  const fields = [];
  const params = [];
  if (updates.title !== undefined) { fields.push('title = ?'); params.push(updates.title); }
  if (updates.aiResponse !== undefined) { fields.push('ai_response = ?'); params.push(updates.aiResponse); }
  if (updates.visibility !== undefined) { fields.push('visibility = ?'); params.push(updates.visibility); }
  if (updates.imageUrl !== undefined) { fields.push('image_url = ?'); params.push(updates.imageUrl); }

  if (fields.length > 0) {
    const now = new Date().toISOString();
    fields.push('updated_at = ?');
    params.push(now);

    params.push(Number(id));
    await turso.execute(`UPDATE generations SET ${fields.join(', ')} WHERE legacy_id = ?`, params);
  }
}

/**
 * addRating({ ... })
 */
async function addRating({ narrativeId, userId, userName, rating, review }) {
  const res = await turso.execute('SELECT * FROM generations WHERE legacy_id = ? AND is_deleted = 0 LIMIT 1', [Number(narrativeId)]);
  const narr = res.rows[0];
  if (!narr) throw new Error('Narrative not found.');
  if (narr.user_id === userId) throw new Error('You cannot rate your own narrative.');

  const now = new Date().toISOString();
  await turso.execute(`
    INSERT INTO ratings (narrativeId, userId, userName, rating, review, createdAt)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(narrativeId, userId) DO UPDATE SET
      userName = excluded.userName,
      rating = excluded.rating,
      review = excluded.review,
      createdAt = excluded.createdAt
  `, [Number(narrativeId), userId, userName || '', Number(rating), review || '', now]);

  // Recalculate average rating & ratings count
  const statsRes = await turso.execute('SELECT AVG(rating) as avg, COUNT(*) as count FROM ratings WHERE narrativeId = ?', [Number(narrativeId)]);
  const stats = statsRes.rows[0] || {};
  const avgRating = stats.avg ? parseFloat(Number(stats.avg).toFixed(1)) : 0;
  const ratingsCount = Number(stats.count || 0);

  await turso.execute('UPDATE generations SET avg_rating = ?, ratings_count = ?, updated_at = ? WHERE legacy_id = ?', [avgRating, ratingsCount, now, Number(narrativeId)]);
}

/**
 * getNarrativeRatings(narrativeId)
 */
async function getNarrativeRatings(narrativeId) {
  const res = await turso.execute('SELECT * FROM ratings WHERE narrativeId = ? ORDER BY createdAt DESC', [Number(narrativeId)]);
  return res.rows;
}

/**
 * toggleWishlist({ userId, narrativeId })
 */
async function toggleWishlist({ userId, narrativeId }) {
  const existing = await turso.execute('SELECT * FROM wishlist WHERE userId = ? AND narrativeId = ? LIMIT 1', [userId, Number(narrativeId)]);
  let added = false;
  if (existing.rows.length > 0) {
    await turso.execute('DELETE FROM wishlist WHERE userId = ? AND narrativeId = ?', [userId, Number(narrativeId)]);
  } else {
    const now = new Date().toISOString();
    await turso.execute('INSERT INTO wishlist (userId, narrativeId, createdAt) VALUES (?, ?, ?)', [userId, Number(narrativeId), now]);
    added = true;
  }

  const countRes = await turso.execute('SELECT COUNT(*) as count FROM wishlist WHERE narrativeId = ?', [Number(narrativeId)]);
  const wishlistCount = Number(countRes.rows[0]?.count || 0);
  await turso.execute('UPDATE generations SET wishlist_count = ? WHERE legacy_id = ?', [wishlistCount, Number(narrativeId)]);

  return { added, wishlistCount };
}

/**
 * getUserWishlist(userId, { page, limit })
 */
async function getUserWishlist(userId, { page = 1, limit = 12 } = {}) {
  const offset = (page - 1) * limit;
  
  const countRes = await turso.execute('SELECT COUNT(*) as count FROM wishlist WHERE userId = ?', [userId]);
  const total = Number(countRes.rows[0]?.count || 0);
  if (total === 0) return { data: [], total };

  const listRes = await turso.execute('SELECT narrativeId FROM wishlist WHERE userId = ? ORDER BY createdAt DESC LIMIT ? OFFSET ?', [userId, limit, offset]);
  const narrativeIds = listRes.rows.map(r => Number(r.narrativeId));

  if (narrativeIds.length === 0) return { data: [], total };

  const qmarks = narrativeIds.map(() => '?').join(',');
  const docsRes = await turso.execute(`SELECT * FROM generations WHERE legacy_id IN (${qmarks}) AND is_deleted = 0`, narrativeIds);
  const docs = docsRes.rows;

  const authorUids = [...new Set(docs.map(d => d.user_id).filter(Boolean))];
  let authorMap = {};
  if (authorUids.length > 0) {
    const uqmarks = authorUids.map(() => '?').join(',');
    const usersRes = await turso.execute(`SELECT uid, displayName, email FROM users WHERE uid IN (${uqmarks})`, authorUids);
    authorMap = Object.fromEntries(usersRes.rows.map(u => [u.uid, u.displayName || u.email.split('@')[0]]));
  }

  const data = docs.map(doc => {
    const row = toRow(doc);
    row.author_name = authorMap[doc.user_id] || 'Anonymous';
    return row;
  });

  return { data, total };
}

/**
 * isWishlisted(userId, narrativeId)
 */
async function isWishlisted(userId, narrativeId) {
  const res = await turso.execute('SELECT 1 FROM wishlist WHERE userId = ? AND narrativeId = ? LIMIT 1', [userId, Number(narrativeId)]);
  return res.rows.length > 0;
}

/**
 * createReport({ narrativeId, reportedBy, reason })
 */
async function createReport({ narrativeId, reportedBy, reason }) {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  await turso.execute('INSERT INTO reports (id, narrativeId, reportedBy, reason, status, createdAt, updatedAt) VALUES (?, ?, ?, ?, "Pending", ?, ?)', [
    id, Number(narrativeId), reportedBy, reason, now, now
  ]);
}

/**
 * getReports({ page, limit })
 */
async function getReports({ page = 1, limit = 20 } = {}) {
  const offset = (page - 1) * limit;
  const countRes = await turso.execute('SELECT COUNT(*) as count FROM reports');
  const total = Number(countRes.rows[0]?.count || 0);

  const selectRes = await turso.execute('SELECT * FROM reports ORDER BY createdAt DESC LIMIT ? OFFSET ?', [limit, offset]);
  const docs = selectRes.rows;

  const narrativeIds = [...new Set(docs.map(d => Number(d.narrativeId)))];
  let narrativeMap = {};
  if (narrativeIds.length > 0) {
    const qmarks = narrativeIds.map(() => '?').join(',');
    const narrRes = await turso.execute(`SELECT legacy_id, title, route FROM generations WHERE legacy_id IN (${qmarks})`, narrativeIds);
    narrativeMap = Object.fromEntries(narrRes.rows.map(n => [n.legacy_id, n.title || n.route]));
  }

  const reporterUids = [...new Set(docs.map(d => d.reportedBy))];
  let reporterMap = {};
  if (reporterUids.length > 0) {
    const uqmarks = reporterUids.map(() => '?').join(',');
    const usersRes = await turso.execute(`SELECT uid, email, displayName FROM users WHERE uid IN (${uqmarks})`, reporterUids);
    reporterMap = Object.fromEntries(usersRes.rows.map(u => [u.uid, u.email || u.displayName]));
  }

  const data = docs.map(doc => ({
    id: doc.id,
    narrativeId: doc.narrativeId,
    narrativeTitle: narrativeMap[doc.narrativeId] || 'Deleted Narrative',
    reportedBy: doc.reportedBy,
    reporterEmail: reporterMap[doc.reportedBy] || 'Unknown User',
    reason: doc.reason,
    status: doc.status,
    createdAt: doc.createdAt,
  }));

  return { data, total };
}

/**
 * updateReportStatus(reportId, status)
 */
async function updateReportStatus(reportId, status) {
  const now = new Date().toISOString();
  await turso.execute('UPDATE reports SET status = ?, updatedAt = ? WHERE id = ?', [status, now, reportId]);
}

/**
 * incrementShares(id)
 */
async function incrementShares(id) {
  await turso.execute('UPDATE generations SET shares_count = shares_count + 1 WHERE legacy_id = ?', [Number(id)]);
}

// ── Settings ──────────────────────────────────────────────────

/**
 * getSetting(key)
 */
async function getSetting(key) {
  const res = await turso.execute('SELECT value FROM settings WHERE key = ? LIMIT 1', [key]);
  return res.rows[0] ? res.rows[0].value : null;
}

/**
 * setSetting(key, value)
 */
async function setSetting(key, value) {
  const now = new Date().toISOString();
  await turso.execute(`
    INSERT INTO settings (key, value, updatedAt) VALUES (?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updatedAt = excluded.updatedAt
  `, [key, value, now]);
}

// ── User Dashboard Extensions ────────────────────────────────

/**
 * incrementViews(id)
 */
async function incrementViews(id) {
  await turso.execute('UPDATE generations SET views_count = views_count + 1 WHERE legacy_id = ?', [Number(id)]);
}

/**
 * updateUserProfile(uid, { ... })
 */
async function updateUserProfile(uid, { displayName, bio, photoURL, email }) {
  const fields = [];
  const params = [];

  if (displayName !== undefined) { fields.push('displayName = ?'); params.push(displayName); }
  if (bio !== undefined) { fields.push('bio = ?'); params.push(bio); }
  if (photoURL !== undefined) { fields.push('photoURL = ?'); params.push(photoURL); }
  if (email !== undefined) { fields.push('email = ?'); params.push(email); }

  if (fields.length > 0) {
    const now = new Date().toISOString();
    fields.push('updatedAt = ?');
    params.push(now);

    params.push(uid);
    await turso.execute(`UPDATE users SET ${fields.join(', ')} WHERE uid = ?`, params);
  }
}

/**
 * createNotification({ userId, type, message })
 */
async function createNotification({ userId, type, message }) {
  const now = new Date().toISOString();
  await turso.execute('INSERT INTO notifications (userId, type, message, read, createdAt) VALUES (?, ?, ?, 0, ?)', [userId, type, message, now]);
}

/**
 * getUserNotifications(userId)
 */
async function getUserNotifications(userId) {
  const res = await turso.execute('SELECT * FROM notifications WHERE userId = ? ORDER BY createdAt DESC', [userId]);
  return res.rows.map(r => ({
    ...r,
    read: !!r.read,
  }));
}

/**
 * markNotificationsRead(userId)
 */
async function markNotificationsRead(userId) {
  await turso.execute('UPDATE notifications SET read = 1 WHERE userId = ? AND read = 0', [userId]);
}

/**
 * logActivity({ userId, action, detail })
 */
async function logActivity({ userId, action, detail }) {
  const now = new Date().toISOString();
  await turso.execute('INSERT INTO activity_logs (userId, action, detail, createdAt) VALUES (?, ?, ?, ?)', [userId, action, detail, now]);
}

/**
 * getUserActivity(userId)
 */
async function getUserActivity(userId) {
  const res = await turso.execute('SELECT * FROM activity_logs WHERE userId = ? ORDER BY createdAt DESC', [userId]);
  return res.rows;
}

/**
 * getUserAnalyticsMetrics(userId)
 */
async function getUserAnalyticsMetrics(userId) {
  const [perMonthRes, topViewedRes, topSharedRes, trendRes] = await Promise.all([
    turso.execute(`
      SELECT substr(created_at, 1, 7) as month, COUNT(*) as count
      FROM generations
      WHERE user_id = ? AND is_deleted = 0
      GROUP BY month
      ORDER BY month ASC
      LIMIT 6
    `, [userId]),
    turso.execute(`
      SELECT title, route, views_count FROM generations WHERE user_id = ? AND is_deleted = 0 ORDER BY views_count DESC LIMIT 5
    `, [userId]),
    turso.execute(`
      SELECT title, route, shares_count FROM generations WHERE user_id = ? AND is_deleted = 0 ORDER BY shares_count DESC LIMIT 5
    `, [userId]),
    turso.execute(`
      SELECT substr(created_at, 1, 7) as month, AVG(avg_rating) as avgRating
      FROM generations
      WHERE user_id = ? AND is_deleted = 0 AND avg_rating IS NOT NULL AND avg_rating > 0
      GROUP BY month
      ORDER BY month ASC
    `, [userId])
  ]);

  return {
    perMonth: perMonthRes.rows.map(r => ({ month: r.month, count: Number(r.count) })),
    topViewed: topViewedRes.rows.map(r => ({ title: r.title || r.route || 'Untitled', views: Number(r.views_count || 0) })),
    topShared: topSharedRes.rows.map(r => ({ title: r.title || r.route || 'Untitled', shares: Number(r.shares_count || 0) })),
    ratingTrend: trendRes.rows.map(r => ({ month: r.month, avgRating: parseFloat(Number(r.avgRating || 0).toFixed(1)) }))
  };
}

/**
 * getUserDashboardStats(userId)
 */
async function getUserDashboardStats(userId) {
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

// ── Trip Photos ───────────────────────────────────────────────

/**
 * insertPhoto({ narrativeId, userId, filename, mimeType, data, size })
 */
async function insertPhoto({ narrativeId, userId, filename, mimeType, data, size }) {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  await turso.execute('INSERT INTO trip_photos (id, narrativeId, userId, filename, mimeType, data, size, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [
    id, narrativeId ? Number(narrativeId) : null, userId || null, filename, mimeType, data, Number(size), now
  ]);
  return id;
}

/**
 * getPhotosByNarrativeId(narrativeId)
 */
async function getPhotosByNarrativeId(narrativeId) {
  const res = await turso.execute('SELECT id, narrativeId, userId, filename, mimeType, size, createdAt FROM trip_photos WHERE narrativeId = ? ORDER BY createdAt ASC', [Number(narrativeId)]);
  return res.rows;
}

/**
 * getPhotoById(photoId)
 */
async function getPhotoById(photoId) {
  const res = await turso.execute('SELECT * FROM trip_photos WHERE id = ? LIMIT 1', [photoId]);
  return res.rows[0] || null;
}

/**
 * deletePhoto(photoId)
 */
async function deletePhoto(photoId) {
  await turso.execute('DELETE FROM trip_photos WHERE id = ?', [photoId]);
}

/**
 * getPhotoCountForNarrative(narrativeId)
 */
async function getPhotoCountForNarrative(narrativeId) {
  const res = await turso.execute('SELECT COUNT(*) as count FROM trip_photos WHERE narrativeId = ?', [Number(narrativeId)]);
  return Number(res.rows[0]?.count || 0);
}

// ── Exports (identical to previous version) ──
module.exports = {
  // Lifecycle
  init,

  // Narratives
  insertGeneration,
  updateFirestoreId,
  getGenerations,
  getGeneration,
  updateRating,
  deleteGeneration,
  restoreGeneration,
  getAnalytics,
  getAdminData,
  getAllForExport,
  
  // Custom Extensions
  getPublicGenerations,
  updateNarrative,
  addRating,
  getNarrativeRatings,
  toggleWishlist,
  getUserWishlist,
  isWishlisted,
  createReport,
  getReports,
  updateReportStatus,
  incrementShares,

  // Users
  upsertUser,
  getUserByUid,
  getUsers,
  updateUserRoleAndPermissions,
  updateUserStatus,

  // Settings
  getSetting,
  setSetting,

  // User Dashboard Extensions
  incrementViews,
  updateUserProfile,
  createNotification,
  getUserNotifications,
  markNotificationsRead,
  logActivity,
  getUserActivity,
  getUserAnalyticsMetrics,
  getUserDashboardStats,

  // Trip Photos
  insertPhoto,
  getPhotosByNarrativeId,
  getPhotoById,
  deletePhoto,
  getPhotoCountForNarrative,
};
