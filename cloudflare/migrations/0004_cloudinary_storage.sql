-- ==============================================================================
-- Migration 0004: Cloudinary Image Storage Support
-- Bhuvana's Bridal & Tailoring Studio
-- Stores Cloudinary public ID, secure delivery URL, asset version and asset ID
-- ==============================================================================

ALTER TABLE bookings ADD COLUMN poster_public_id TEXT;
ALTER TABLE bookings ADD COLUMN poster_secure_url TEXT;
ALTER TABLE bookings ADD COLUMN poster_version TEXT;
ALTER TABLE bookings ADD COLUMN poster_asset_id TEXT;
