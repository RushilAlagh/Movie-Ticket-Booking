// models/screeningModel.js
const pool = require('../db');

async function getScreeningsByMovieId(movieId) {
  const result = await pool.query(`
    SELECT s.id, s.show_time, r.name AS room_name 
    FROM screenings s 
    JOIN rooms r ON s.room_id = r.id 
    WHERE s.movie_id = $1
  `, [movieId]);
  return result.rows;
}

module.exports = { getScreeningsByMovieId };
