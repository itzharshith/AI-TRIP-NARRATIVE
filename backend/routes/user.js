const express = require('express');
const router = express.Router();
const db = require('../db/database');

/**
 * GET /api/user/dashboard-stats
 * Returns aggregated user KPIs, unread notification counts, and recent activity.
 */
router.get('/dashboard-stats', async (req, res) => {
  try {
    const stats = await db.getUserDashboardStats(req.user.uid);
    res.json(stats);
  } catch (err) {
    console.error('[user] GET /dashboard-stats error:', err);
    res.status(500).json({ error: 'Failed to fetch dashboard stats.', detail: err.message });
  }
});

/**
 * GET /api/user/reviews
 * Returns all reviews received on narratives owned by this user.
 */
router.get('/reviews', async (req, res) => {
  try {
    const uid = req.user.uid;
    const mongo = require('../db/mongodb');
    const narrColl = mongo.getCollection('narratives');
    const ratingsColl = mongo.getCollection('ratings');

    // Find user's active narratives
    const userNarratives = await narrColl.find({ userId: uid, isDeleted: { $ne: true } }).project({ legacyId: 1, title: 1, route: 1 }).toArray();
    const narrativeIds = userNarratives.map(n => n.legacyId);

    if (!narrativeIds.length) {
      return res.json({ avgScore: 0, distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }, reviews: [] });
    }

    // Find reviews
    const reviews = await ratingsColl.find({ narrativeId: { $in: narrativeIds } }).sort({ createdAt: -1 }).toArray();

    // Calculate average and distribution
    const total = reviews.length;
    const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
    const avgScore = total ? parseFloat((sum / total).toFixed(1)) : 0;

    const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviews.forEach(r => {
      if (distribution[r.rating] !== undefined) {
        distribution[r.rating]++;
      }
    });

    // Attach narrative details to reviews
    const narrativeMap = Object.fromEntries(userNarratives.map(n => [n.legacyId, n.title || n.route || 'Untitled']));
    const enrichedReviews = reviews.map(r => ({
      id: r._id.toString(),
      narrativeId: r.narrativeId,
      narrativeTitle: narrativeMap[r.narrativeId] || 'Deleted Narrative',
      userName: r.userName || 'Anonymous',
      rating: r.rating,
      review: r.review || '',
      createdAt: r.createdAt.toISOString()
    }));

    res.json({
      avgScore,
      totalReviews: total,
      distribution,
      reviews: enrichedReviews
    });
  } catch (err) {
    console.error('[user] GET /reviews error:', err);
    res.status(500).json({ error: 'Failed to fetch user reviews.', detail: err.message });
  }
});

/**
 * GET /api/user/notifications
 * Returns all notifications for the authenticated user.
 */
router.get('/notifications', async (req, res) => {
  try {
    const notifications = await db.getUserNotifications(req.user.uid);
    res.json(notifications);
  } catch (err) {
    console.error('[user] GET /notifications error:', err);
    res.status(500).json({ error: 'Failed to fetch notifications.', detail: err.message });
  }
});

/**
 * POST /api/user/notifications/read
 * Marks all unread notifications for the user as read.
 */
router.post('/notifications/read', async (req, res) => {
  try {
    await db.markNotificationsRead(req.user.uid);
    res.json({ success: true });
  } catch (err) {
    console.error('[user] POST /notifications/read error:', err);
    res.status(500).json({ error: 'Failed to mark notifications as read.', detail: err.message });
  }
});

/**
 * GET /api/user/activity
 * Returns the activity log timeline for the user.
 */
router.get('/activity', async (req, res) => {
  try {
    const activity = await db.getUserActivity(req.user.uid);
    res.json(activity);
  } catch (err) {
    console.error('[user] GET /activity error:', err);
    res.status(500).json({ error: 'Failed to fetch activity logs.', detail: err.message });
  }
});

/**
 * GET /api/user/analytics
 * Returns monthly and narrative-level performance metrics for Chart.js.
 */
router.get('/analytics', async (req, res) => {
  try {
    const analytics = await db.getUserAnalyticsMetrics(req.user.uid);
    res.json(analytics);
  } catch (err) {
    console.error('[user] GET /analytics error:', err);
    res.status(500).json({ error: 'Failed to fetch analytics metrics.', detail: err.message });
  }
});

/**
 * GET /api/user/profile
 * Returns the current user's profile details.
 */
router.get('/profile', async (req, res) => {
  try {
    const user = await db.getUserByUid(req.user.uid);
    if (!user) return res.status(404).json({ error: 'User profile not found.' });
    res.json(user);
  } catch (err) {
    console.error('[user] GET /profile error:', err);
    res.status(500).json({ error: 'Failed to fetch profile.', detail: err.message });
  }
});

/**
 * PUT /api/user/profile
 * Updates the user's display name, biography, avatar URL, and logs the action.
 */
router.put('/profile', async (req, res) => {
  try {
    const { displayName, bio, photoURL, email } = req.body;
    await db.updateUserProfile(req.user.uid, { displayName, bio, photoURL, email });
    await db.logActivity({
      userId: req.user.uid,
      action: 'Profile Update',
      detail: 'Updated profile information'
    });
    res.json({ success: true });
  } catch (err) {
    console.error('[user] PUT /profile error:', err);
    res.status(500).json({ error: 'Failed to update profile.', detail: err.message });
  }
});

module.exports = router;
