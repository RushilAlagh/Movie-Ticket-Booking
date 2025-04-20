// routes/screenings.js
const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/:screeningId/seats', async (req, res) => {
  try {
    const result = await db.getSeatsByScreeningId(req.params.screeningId);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch seats' });
  }
});

module.exports = router;
