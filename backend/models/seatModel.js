// models/seatModel.js
const pool = require('../db');

async function getSeatsByScreeningId(screeningId) {
  const result = await pool.query(`
    SELECT s.id, s.number, s.row, 
      CASE 
        WHEN bs.seat_id IS NOT NULL THEN true 
        ELSE false 
      END AS is_booked
    FROM seats s
    LEFT JOIN booked_seats bs ON s.id = bs.seat_id AND bs.screening_id = $1
    WHERE s.screening_id = $1
  `, [screeningId]);
  return result.rows;
}

module.exports = { getSeatsByScreeningId };
