// routes/movies.js
const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/:id', async (req, res) => {
  try {
    const movie = await db.getMovieById(req.params.id);
    res.json(movie);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch movie' });
  }
});

// routes/movies.js (same file as above, add this)
router.get('/:id/screenings', async (req, res) => {
    try {
      const result = await db.getScreeningsByMovieId(req.params.id);
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch screenings' });
    }
  });
  
module.exports = router;
