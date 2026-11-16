-- ==============================================================================
-- Migration 0002: Booking Indexes
-- Bhuvana's Bridal & Tailoring Studio
-- Cloudflare D1 Database Performance & Uniqueness Indexes
-- ==============================================================================

-- Unique constraints & Lookups
CREATE UNIQUE INDEX IF NOT EXISTS idx_bookings_ref ON bookings(booking_ref);
CREATE UNIQUE INDEX IF NOT EXISTS idx_bookings_idempotency ON bookings(idempotency_key) WHERE idempotency_key IS NOT NULL;

-- Query performance indexes for owner dashboard filtering & searches
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(booking_status);
CREATE INDEX IF NOT EXISTS idx_bookings_submitted_at ON bookings(submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_bookings_event_date ON bookings(event_date);
CREATE INDEX IF NOT EXISTS idx_bookings_customer_mobile ON bookings(customer_mobile);
CREATE INDEX IF NOT EXISTS idx_bookings_customer_name ON bookings(customer_name);

-- Session validation index
CREATE INDEX IF NOT EXISTS idx_owner_sessions_token_hash ON owner_sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_owner_sessions_expires_at ON owner_sessions(expires_at);

-- Device token index
CREATE INDEX IF NOT EXISTS idx_owner_devices_owner ON owner_devices(owner_id);
