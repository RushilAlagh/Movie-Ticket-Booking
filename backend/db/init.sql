-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================
-- Movies Table
-- =====================
CREATE TABLE IF NOT EXISTS movies (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  director VARCHAR(255) NOT NULL,
  release_year INT NOT NULL 
    CHECK (release_year BETWEEN 1888 AND EXTRACT(YEAR FROM NOW())::INT + 5),
  description TEXT,
  poster_url VARCHAR(512),
  duration_minutes INT CHECK (duration_minutes > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_movie_title_year UNIQUE (title, release_year)
);

-- =====================
-- Screenings Table
-- =====================
CREATE TABLE IF NOT EXISTS screenings (
  id SERIAL PRIMARY KEY,
  movie_id INTEGER NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
  screen_number INTEGER NOT NULL CHECK (screen_number > 0),
  show_time TIMESTAMPTZ NOT NULL,
  total_seats INTEGER NOT NULL CHECK (total_seats > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_screening UNIQUE (movie_id, screen_number, show_time)
);

-- =====================
-- Seats Table
-- =====================
CREATE TABLE IF NOT EXISTS seats (
  id SERIAL PRIMARY KEY,
  screening_id INTEGER NOT NULL REFERENCES screenings(id) ON DELETE CASCADE,
  row CHAR(1) NOT NULL,
  number INTEGER NOT NULL CHECK (number > 0),
  is_booked BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_seat UNIQUE (screening_id, row, number)
);

-- =====================
-- Users Table
-- =====================
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================
-- Bookings Table
-- =====================
CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  screening_id INTEGER NOT NULL REFERENCES screenings(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'Pending'
    CHECK (status IN ('Pending', 'Confirmed', 'Cancelled', 'Completed')),
  payment_reference VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================
-- Booking_Seats Junction Table
-- =====================
CREATE TABLE IF NOT EXISTS booking_seats (
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  seat_id INTEGER NOT NULL REFERENCES seats(id) ON DELETE CASCADE,
  PRIMARY KEY (booking_id, seat_id)
);

-- =====================
-- Triggers and Functions for updated_at
-- =====================
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_movies_modtime
BEFORE UPDATE ON movies
FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_bookings_modtime
BEFORE UPDATE ON bookings
FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- =====================
-- Indexes for Performance
-- =====================
CREATE INDEX IF NOT EXISTS idx_movies_release_year ON movies(release_year);
CREATE INDEX IF NOT EXISTS idx_screenings_movie_id ON screenings(movie_id);
CREATE INDEX IF NOT EXISTS idx_screenings_show_time ON screenings(show_time);
CREATE INDEX IF NOT EXISTS idx_seats_screening_id ON seats(screening_id);
CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_screening_id ON bookings(screening_id);

-- =====================
-- Initial Movie Data (Conflict-Aware)
-- =====================
INSERT INTO movies (title, director, release_year, duration_minutes)
VALUES
  ('The Matrix', 'Lana Wachowski', 1999, 136),
  ('Inception', 'Christopher Nolan', 2010, 148),
  ('Parasite', 'Bong Joon-ho', 2019, 132),
  ('Fight Club', 'David Fincher', 1999, 139),
  ('Into the Wild', 'Sean Penn', 2007, 148),
  ('The Dark Knight', 'Christopher Nolan', 2008, 152),
  ('The Godfather', 'Francis Ford Coppola', 1972, 175),
  ('The Shawshank Redemption', 'Frank Darabont', 1994, 142),
  ('Whiplash', 'Damien Chazelle', 2014, 106)
ON CONFLICT ON CONSTRAINT unique_movie_title_year DO UPDATE SET
  director = EXCLUDED.director,
  duration_minutes = EXCLUDED.duration_minutes;
