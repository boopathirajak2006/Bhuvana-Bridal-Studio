-- ==============================================================================
-- Migration 0001: Initial Schema
-- Bhuvana's Bridal & Tailoring Studio
-- Cloudflare D1 Database Schema
-- ==============================================================================

-- 1. Bookings Table
CREATE TABLE IF NOT EXISTS bookings (
  id TEXT PRIMARY KEY,                          -- UUID v4
  booking_ref TEXT NOT NULL UNIQUE,             -- Format: BBS-2026-XXXXXX
  idempotency_key TEXT UNIQUE,                  -- Client-generated unique submission token
  customer_name TEXT NOT NULL,                  -- Client full name
  customer_mobile TEXT NOT NULL,                -- 10-digit mobile or international format
  customer_email TEXT,                          -- Optional email address
  event_date TEXT NOT NULL,                     -- ISO format or event date string
  event_location TEXT NOT NULL,                 -- Venue address / city
  selected_services_json TEXT NOT NULL,         -- JSON array of selected service objects/IDs
  requirements_json TEXT,                       -- JSON object of customer styling/tailoring preferences
  special_notes TEXT,                           -- Freeform customer note
  poster_public_id TEXT,                        -- Cloudinary Public ID (e.g. bhuvana_posters/2026/BBS-2026-XXXXXX)
  poster_secure_url TEXT,                       -- Cloudinary Secure Delivery URL
  poster_version TEXT,                          -- Cloudinary Asset Version
  poster_asset_id TEXT,                         -- Cloudinary Unique Asset ID
  poster_file_size INTEGER DEFAULT 0,           -- File size in bytes
  booking_status TEXT NOT NULL DEFAULT 'draft'  -- 'draft', 'pending', 'approved', 'rejected'
    CHECK (booking_status IN ('draft', 'pending', 'approved', 'rejected')),
  whatsapp_consent INTEGER NOT NULL DEFAULT 0   -- 0 = No, 1 = Yes
    CHECK (whatsapp_consent IN (0, 1)),
  consent_timestamp TEXT,                       -- ISO timestamp when customer consented
  consent_version TEXT DEFAULT 'v1',            -- Version of consent wording
  reservation_expires_at TEXT,                  -- Expiration for draft reservations
  submitted_at TEXT,                            -- ISO timestamp when customer submitted
  reviewed_at TEXT,                             -- ISO timestamp when owner approved/rejected
  reviewed_by TEXT,                             -- Owner username or ID
  rejection_reason TEXT,                        -- Reason selected during rejection
  rejection_notes TEXT,                         -- Optional explanation provided during rejection
  created_at TEXT NOT NULL,                     -- ISO timestamp of row creation
  updated_at TEXT NOT NULL                      -- ISO timestamp of row update
);

-- 2. Owners Table (Studio Management Accounts)
CREATE TABLE IF NOT EXISTS owners (
  id TEXT PRIMARY KEY,                          -- UUID v4
  username TEXT NOT NULL UNIQUE,                -- Login username
  password_hash TEXT NOT NULL,                  -- PBKDF2 with SHA-256 hash (hex)
  salt TEXT NOT NULL,                           -- Cryptographic salt (hex)
  name TEXT NOT NULL,                           -- Display name (e.g. Bhuvaneshwari)
  role TEXT NOT NULL DEFAULT 'owner'            -- Role identifier
    CHECK (role IN ('owner', 'admin')),
  last_login_at TEXT,                           -- ISO timestamp
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- 3. Owner Sessions Table (Secure Server-Side Sessions)
CREATE TABLE IF NOT EXISTS owner_sessions (
  id TEXT PRIMARY KEY,                          -- UUID v4
  token_hash TEXT NOT NULL UNIQUE,              -- SHA-256 hash of session token
  owner_id TEXT NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
  ip_address TEXT,
  user_agent TEXT,
  expires_at TEXT NOT NULL,                     -- ISO timestamp
  created_at TEXT NOT NULL
);

-- 4. Owner Devices Table (Firebase Cloud Messaging Tokens)
CREATE TABLE IF NOT EXISTS owner_devices (
  id TEXT PRIMARY KEY,                          -- UUID v4
  owner_id TEXT NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
  fcm_token TEXT NOT NULL UNIQUE,               -- FCM Web Push token
  device_name TEXT,                             -- Browser / device label
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
