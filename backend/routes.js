const express = require("express");
const { pool } = require("./db");
const redis = require("./redisClient");
const crypto = require("crypto");
const router = express.Router();

router.use((req, res, next) => {
  console.log(`Route accessed: ${req.method} ${req.path}`);
  next();
});

// Helper: Cache with lock and retry logic
const getMoviesWithCache = async (retries = 3, delay = 100) => {
  try {
    const cached = await redis.get("movies");
    if (cached) {
      console.log("Cache hit: Returning movies from Redis");
      return JSON.parse(cached);
    }

    const lock = await redis.set("movies_lock", "1", {
      NX: true,
      EX: 10,
    });

    if (!lock) {
      if (retries <= 0) {
        console.error("Could not acquire lock after multiple retries");
        throw new Error("Could not acquire lock after retries");
      }
      console.log(`Lock acquisition failed, retrying... (${retries} retries left)`);
      await new Promise((resolve) => setTimeout(resolve, delay));
      return getMoviesWithCache(retries - 1, delay * 2);
    }

    console.log("Lock acquired, fetching movies from DB...");
    const result = await pool.query("SELECT * FROM movies ORDER BY title");

    console.log("Setting movies in cache for 60 seconds");
    await redis.set("movies", JSON.stringify(result.rows), { EX: 60 });

    return result.rows;
  } catch (error) {
    console.error("Error in getMoviesWithCache:", error.stack);
    throw new Error("Failed to fetch movies with cache");
  } finally {
    await redis.del("movies_lock").catch((err) => console.warn("Error releasing lock:", err));
  }
};

// Generate unique booking ID
const generateId = () => crypto.randomBytes(16).toString("hex");

// Validate booking input
const validateBookingInput = (movie_id, user_name) => {
  if (!movie_id || !user_name) {
    throw new Error("Missing required fields");
  }

  if (typeof movie_id !== "string" || typeof user_name !== "string") {
    throw new Error("Invalid input types");
  }

  if (user_name.length > 100) {
    throw new Error("User name must be less than 100 characters");
  }

  if (!/^\d+$/.test(movie_id)) {
    throw new Error("Invalid movie ID format - must be numeric");
  }
};

// Route to get all movies
router.get("/movies", async (req, res) => {
  try {
    const movies = await getMoviesWithCache();
    res.json(movies);
  } catch (error) {
    console.error("Error fetching movies:", error);
    res.status(500).json({ success: false, error: "Failed to fetch movies" });
  }
});

// Route to get specific movie details
router.get("/movies/:id", async (req, res) => {
  console.log(`[DEBUG] Request for movie ID: ${req.params.id}`);
  try {
    await pool.query("SELECT 1");
    console.log("[DEBUG] Database connection verified");

    const numericId = parseInt(req.params.id, 10);
    console.log(`[DEBUG] Querying for ID: ${numericId}`);

    const result = await pool.query(`SELECT * FROM movies WHERE id = $1`, [numericId]);

    console.log(`[DEBUG] Found ${result.rows.length} records`);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Movie not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("[ERROR] Route failure:", {
      params: req.params,
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({ error: "Internal server error" });
  }
});

// Route to book a movie (generic)
router.post("/book", async (req, res) => {
  const { movie_id, user_name } = req.body;
  const client = await pool.connect();

  try {
    validateBookingInput(movie_id, user_name);

    const id = generateId();
    const timestamp = new Date().toISOString();

    await client.query("BEGIN");

    const movieCheck = await client.query("SELECT id FROM movies WHERE id = $1 FOR UPDATE", [movie_id]);
    if (movieCheck.rows.length === 0) {
      throw new Error("Movie not found");
    }

    await client.query(
      `INSERT INTO bookings (id, movie_id, user_name, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [id, movie_id, user_name, "Pending", timestamp, timestamp]
    );

    if (req.amqpChannel) {
      await req.amqpChannel.sendToQueue("booking_queue", Buffer.from(id), {
        persistent: true,
      });
    }

    await client.query("COMMIT");
    await redis.del("movies").catch(() => {});

    res.json({
      success: true,
      booking_id: id,
      status: "Pending",
    });
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});

    console.error("Booking error details:", {
      message: error.message,
      stack: error.stack,
      code: error.code,
      constraint: error.constraint,
    });

    const statusCode = error.message.includes("not found") ? 404 : 400;
    res.status(statusCode).json({
      success: false,
      error: error.message.includes("not found") ? error.message : "Failed to create booking",
      ...(process.env.NODE_ENV === "development" && {
        details: error.message,
      }),
    });
  } finally {
    client.release();
  }
});

// Route to test DB connection
router.get("/test-db", async (req, res) => {
  try {
    const result = await pool.query("SELECT $1::text as message", ["Database connection successful"]);
    res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Database connection failed:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

router.get("/movies/:id/screenings", async (req, res) => {
    const movieId = parseInt(req.params.id, 10);
    console.log(`[DEBUG] Fetching screenings for movie ID ${movieId}`);
    try {
      const result = await pool.query(
        `SELECT s.*, m.title as movie_title, m.duration_minutes
           FROM screenings s
           JOIN movies m ON s.movie_id = m.id
          WHERE s.movie_id = $1
            AND s.show_time > NOW()
          ORDER BY s.show_time`,
        [movieId]
      );
      console.log(`[DEBUG] Found ${result.rows.length} screenings`);
      res.json(result.rows);
    } catch (error) {
      console.error("Error fetching screenings:", error);
      res.status(500).json({ error: "Failed to fetch screenings" });
    }
  });
    
  // ➕ New: Enhanced seat availability check
  router.get("/screenings/:id/seats", async (req, res) => {
    try {
      const result = await pool.query(
        `SELECT s.id, s.row, s.number, 
                CASE WHEN b.id IS NULL THEN false ELSE true END as is_booked
         FROM seats s
         LEFT JOIN booking_seats bs ON s.id = bs.seat_id
         LEFT JOIN bookings b ON bs.booking_id = b.id AND b.status != 'Cancelled'
         WHERE s.screening_id = $1
         ORDER BY s.row, s.number`,
        [req.params.id]
      );
      res.json(result.rows);
    } catch (error) {
      console.error('Error fetching seats:', error);
      res.status(500).json({ error: 'Failed to fetch seat availability' });
    }
  });
  
  // ➕ New: Enhanced booking endpoint (multiple seats)
  router.post("/bookings", async (req, res) => {
    const { user_id, screening_id, seat_ids } = req.body;
    const client = await pool.connect();
  
    try {
      // Validate input
      if (!Array.isArray(seat_ids)) {
        throw new Error('seat_ids must be an array');
      }
  
      await client.query('BEGIN');
  
      // 1. Check seat availability
      const { rows: availableSeats } = await client.query(
        `SELECT id FROM seats
         WHERE id = ANY($1::int[])
         AND screening_id = $2
         AND is_booked = false
         FOR UPDATE`,
        [seat_ids, screening_id]
      );
  
      if (availableSeats.length !== seat_ids.length) {
        throw new Error(`${seat_ids.length - availableSeats.length} seats are already booked`);
      }
  
      // 2. Create booking record
      const { rows: [booking] } = await client.query(
        `INSERT INTO bookings (user_id, screening_id, status)
         VALUES ($1, $2, 'Confirmed')
         RETURNING id`,
        [user_id, screening_id]
      );
  
      // 3. Book seats and link to booking
      await client.query(
        `UPDATE seats SET is_booked = true
         WHERE id = ANY($1::int[])`,
        [seat_ids]
      );
  
      // 4. Create booking_seats records
      const values = seat_ids.map(seat_id => 
        `('${booking.id}', ${seat_id})`).join(',');
      
      await client.query(
        `INSERT INTO booking_seats (booking_id, seat_id)
         VALUES ${values}`
      );
  
      await client.query('COMMIT');
      
      // Clear relevant caches
      await redis.del(`screening:${screening_id}:seats`);
      
      res.json({ 
        success: true,
        booking_id: booking.id,
        booked_seats: seat_ids.length
      });
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Booking failed:', error);
      res.status(400).json({ 
        success: false,
        error: error.message
      });
    } finally {
      client.release();
    }
  });
  
  // ➕ New: Cancel booking endpoint
  router.post("/bookings/:id/cancel", async (req, res) => {
    const bookingId = req.params.id;
    const client = await pool.connect();
  
    try {
      await client.query('BEGIN');
  
      // 1. Get booking details
      const { rows: [booking] } = await client.query(
        `SELECT * FROM bookings WHERE id = $1 FOR UPDATE`,
        [bookingId]
      );
  
      if (!booking) {
        throw new Error('Booking not found');
      }
  
      // 2. Update booking status
      await client.query(
        `UPDATE bookings SET status = 'Cancelled' WHERE id = $1`,
        [bookingId]
      );
  
      // 3. Release seats
      const { rows: seats } = await client.query(
        `SELECT seat_id FROM booking_seats WHERE booking_id = $1`,
        [bookingId]
      );
  
      const seatIds = seats.map(s => s.seat_id);
      await client.query(
        `UPDATE seats SET is_booked = false
         WHERE id = ANY($1::int[])`,
        [seatIds]
      );
  
      await client.query('COMMIT');
      
      // Clear relevant caches
      await redis.del(`screening:${booking.screening_id}:seats`);
      
      res.json({ success: true });
    } catch (error) {
      await client.query('ROLLBACK');
      res.status(400).json({ error: error.message });
    } finally {
      client.release();
    }
  });
  
  module.exports = router;