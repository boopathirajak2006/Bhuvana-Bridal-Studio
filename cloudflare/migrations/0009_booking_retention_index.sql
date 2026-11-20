CREATE INDEX IF NOT EXISTS idx_bookings_retention
  ON bookings(booking_status, submitted_at, created_at);
