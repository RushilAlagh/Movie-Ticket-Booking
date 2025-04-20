// models/movieModel.js
const pool = require('../db');

async function getMovieById(id) {
  const result = await pool.query('SELECT * FROM movies WHERE id = $1', [id]);
  return result.rows[0];
}

module.exports = { getMovieById };
