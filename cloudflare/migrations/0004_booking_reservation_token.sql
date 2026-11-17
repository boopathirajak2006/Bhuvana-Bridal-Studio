-- Add hashed reservation tokens so only the customer holding the token can
-- finalize a reserved draft. This is additive and preserves existing rows.
ALTER TABLE bookings ADD COLUMN reservation_token_hash TEXT;
