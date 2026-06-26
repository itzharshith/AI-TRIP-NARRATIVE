const express = require('express');
const router  = express.Router();
const db      = require('../db/database');
const { verifyIdToken } = require('../firebase/admin');
const { verifyToken } = require('../middleware/verifyToken');

async function extractUserId(req) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return null;
  const token = auth.slice(7);
  const { user } = await verifyIdToken(token);
  return user ? user.uid : null;
}

router.get('/', async (req, res) => {
  try {
    const page   = Math.max(1, parseInt(req.query.page)  || 1);
    const limit  = Math.min(50, parseInt(req.query.limit) || 12);
    const search = (req.query.search || '').trim();
    const sortBy = req.query.sortBy || 'recent';
    const destination = req.query.destination || '';
    const author = req.query.author || '';
    const rating = req.query.rating || '';
    const date = req.query.date || '';

    const { data, total } = await db.getPublicGenerations({
      page, limit, search, sortBy, destination, author, rating, date
    });

    // If user is authenticated, mark wishlisted items
    const userId = await extractUserId(req);
    if (userId) {
      await Promise.all(data.map(async (row) => {
        row.is_wishlisted = await db.isWishlisted(userId, row.id);
      }));
    } else {
      data.forEach(row => { row.is_wishlisted = false; });
    }

    res.json({
      records: data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      }
    });
  } catch (err) {
    console.error('[explore] GET / error:', err);
    res.status(500).json({ error: 'Failed to fetch public explore narratives.', detail: err.message });
  }
});

// Increment shares count when user clicks share button
router.post('/:id/share', verifyToken, async (req, res) => {
  try {
    const id = Number(req.params.id);
    await db.incrementShares(id);
    res.json({ success: true });
  } catch (err) {
    console.error('[explore] POST /:id/share error:', err);
    res.status(500).json({ error: 'Failed to increment share count.' });
  }
});

// Increment views count when user views narrative modal
router.post('/:id/view', async (req, res) => {
  try {
    const id = Number(req.params.id);
    await db.incrementViews(id);
    res.json({ success: true });
  } catch (err) {
    console.error('[explore] POST /:id/view error:', err);
    res.status(500).json({ error: 'Failed to increment view count.' });
  }
});

module.exports = router;
