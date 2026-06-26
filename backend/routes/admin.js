const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { verifyToken } = require('../middleware/verifyToken');
const { authorize } = require('../middleware/authorize');

// All admin routes require Firebase auth token + Admin role verification
router.use(verifyToken);
router.use(authorize(['Admin']));

/**
 * GET /api/admin/data
 * Returns paginated raw generations data for the admin data viewer.
 */
router.get('/data', async (req, res) => {
  const page   = Math.max(1, parseInt(req.query.page)  || 1);
  const limit  = Math.min(100, parseInt(req.query.limit) || 20);
  const search = (req.query.search || '').trim();
  const tone   = req.query.tone || '';
  const rating = req.query.rating || '';

  try {
    const { data, total } = await db.getAdminData({ page, limit, search, tone, rating });
    res.json({
      data,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      user: { email: req.user.email, name: req.user.name },
    });
  } catch (err) {
    console.error('[admin] GET /data error:', err);
    res.status(500).json({ error: 'Failed to fetch admin data.', detail: err.message });
  }
});

/**
 * GET /api/admin/data/:id
 * Returns a single full generation record (including AI response + prompt).
 */
router.get('/data/:id', async (req, res) => {
  try {
    const row = await db.getGeneration(Number(req.params.id));
    if (!row) return res.status(404).json({ error: 'Record not found.' });
    res.json(row);
  } catch (err) {
    console.error(`[admin] GET /data/${req.params.id} error:`, err);
    res.status(500).json({ error: 'Failed to fetch record.', detail: err.message });
  }
});

/**
 * DELETE /api/admin/data/:id
 * Soft-deletes a single generation record.
 */
router.delete('/data/:id', async (req, res) => {
  const id = Number(req.params.id);
  try {
    const row = await db.getGeneration(id);
    if (!row) return res.status(404).json({ error: 'Record not found.' });
    await db.deleteGeneration(id);
    res.json({ success: true, deleted: id });
  } catch (err) {
    console.error(`[admin] DELETE /data/${id} error:`, err);
    res.status(500).json({ error: 'Failed to delete record.', detail: err.message });
  }
});

/**
 * GET /api/admin/export
 * Returns all data as a CSV file download.
 */
router.get('/export', async (req, res) => {
  try {
    const rows = await db.getAllForExport();

    const headers = [
      'ID', 'Driver/Staff', 'Route', 'Landmarks', 'Highlights',
      'Trip Date', 'Vehicle Type', 'Tone', 'Title', 'Rating', 'Comment', 'Created At',
    ];

    const escape = (val) => {
      if (val === null || val === undefined) return '';
      const str = String(val).replace(/"/g, '""');
      return /[",\n]/.test(str) ? `"${str}"` : str;
    };

    const csvLines = [
      headers.join(','),
      ...rows.map((r) =>
        [
          r.id, r.driver_name, r.route, r.landmarks, r.highlights,
          r.trip_date, r.vehicle_type, r.tone, r.title,
          r.rating, r.comment, r.created_at,
        ]
          .map(escape)
          .join(',')
      ),
    ];

    const csvContent = csvLines.join('\r\n');
    const filename = `manivtha_generations_${new Date().toISOString().split('T')[0]}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send('\uFEFF' + csvContent); // BOM for Excel compatibility
  } catch (err) {
    console.error('[admin] GET /export error:', err);
    res.status(500).json({ error: 'Failed to export data.', detail: err.message });
  }
});

/**
 * GET /api/admin/verify
 * Verifies the admin token and returns user info.
 */
router.get('/verify', (req, res) => {
  res.json({
    authenticated: true,
    user: {
      email:   req.user.email,
      name:    req.user.name || req.user.email,
      picture: req.user.picture,
    },
  });
});

/**
 * GET /api/admin/users
 * Returns list of all registered users.
 */
router.get('/users', async (req, res) => {
  try {
    const users = await db.getUsers();
    res.json(users);
  } catch (err) {
    console.error('[admin] GET /users error:', err);
    res.status(500).json({ error: 'Failed to fetch user list.', detail: err.message });
  }
});

/**
 * PUT /api/admin/users/:uid/role
 * Updates a user's role and permissions.
 */
router.put('/users/:uid/role', async (req, res) => {
  const { uid } = req.params;
  const { role } = req.body;
  
  if (!role || !['Admin', 'User'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role. Must be Admin or User.' });
  }

  try {
    const permissions = role === 'Admin' ? ['all'] : [];
    await db.updateUserRoleAndPermissions(uid, role, permissions);
    
    // Log activity
    await db.logActivity({
      userId: req.user.uid,
      action: 'Update User Role',
      detail: `Changed role of user ${uid} to ${role}`
    });
    
    res.json({ success: true, uid, role });
  } catch (err) {
    console.error(`[admin] PUT /users/${uid}/role error:`, err);
    res.status(500).json({ error: 'Failed to update user role.', detail: err.message });
  }
});

/**
 * PUT /api/admin/users/:uid/status
 * Updates a user's account status.
 */
router.put('/users/:uid/status', async (req, res) => {
  const { uid } = req.params;
  const { accountStatus } = req.body;
  
  if (!accountStatus || !['active', 'suspended', 'pending'].includes(accountStatus)) {
    return res.status(400).json({ error: 'Invalid accountStatus. Must be active, suspended, or pending.' });
  }

  try {
    await db.updateUserStatus(uid, accountStatus);
    
    // Log activity
    await db.logActivity({
      userId: req.user.uid,
      action: 'Update User Status',
      detail: `Changed status of user ${uid} to ${accountStatus}`
    });
    
    res.json({ success: true, uid, accountStatus });
  } catch (err) {
    console.error(`[admin] PUT /users/${uid}/status error:`, err);
    res.status(500).json({ error: 'Failed to update user status.', detail: err.message });
  }
});

/**
 * GET /api/admin/metrics
 * Returns server and database health statistics.
 */
router.get('/metrics', async (req, res) => {
  try {
    const { total: narrativesCount } = await db.getGenerations({ limit: 1 });
    const users = await db.getUsers();
    const usersCount = users.length;
    
    res.json({
      system: {
        uptime: Math.floor(process.uptime()),
        nodeVersion: process.version,
        platform: process.platform,
        memory: {
          heapUsed: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)} MB`,
          rss: `${Math.round(process.memoryUsage().rss / 1024 / 1024)} MB`,
        }
      },
      database: {
        connected: true,
        narrativesCount,
        usersCount,
      }
    });
  } catch (err) {
    console.error('[admin] GET /metrics error:', err);
    res.status(500).json({ error: 'Failed to fetch metrics.', detail: err.message });
  }
});

/**
 * POST /api/admin/users
 * Creates a new user in Firebase Auth and Turso database.
 */
router.post('/users', async (req, res) => {
  const { displayName, email, password, role } = req.body;

  if (!email || !password || !displayName) {
    return res.status(400).json({ error: 'Email, password, and display name are required.' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters.' });
  }

  const targetRole = role === 'Admin' ? 'Admin' : 'User';

  try {
    const firebaseAdmin = require('../firebase/admin');
    if (!firebaseAdmin.isReady || !firebaseAdmin.adminAuth) {
      return res.status(503).json({ error: 'Firebase Admin Auth is not configured/ready.' });
    }

    // 1. Create user in Firebase Authentication
    const userRecord = await firebaseAdmin.adminAuth.createUser({
      email,
      password,
      displayName,
      emailVerified: true // Set to true immediately so they can log in without verification link
    });

    // 2. Register/upsert user in the Turso database
    await db.upsertUser({
      uid: userRecord.uid,
      email: userRecord.email,
      displayName: userRecord.displayName,
      photoURL: '',
      provider: 'email',
      emailVerified: true,
      role: targetRole,
      permissions: targetRole === 'Admin' ? ['all'] : []
    });

    // Log action
    await db.logActivity({
      userId: req.user.uid,
      action: 'Create User',
      detail: `Created user ${email} with role ${targetRole}`
    });

    res.status(201).json({
      success: true,
      user: {
        uid: userRecord.uid,
        email: userRecord.email,
        displayName: userRecord.displayName,
        role: targetRole
      }
    });
  } catch (err) {
    console.error('[admin] POST /users error:', err);
    res.status(500).json({ error: 'Failed to create user.', detail: err.message });
  }
});

module.exports = router;
