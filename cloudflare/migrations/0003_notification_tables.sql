-- ==============================================================================
-- Migration 0003: Notification Tables & Audit Logs
-- Bhuvana's Bridal & Tailoring Studio
-- Cloudflare D1 Notification Tracking and Audit Trail
-- ==============================================================================

-- 1. Notification Jobs Table
CREATE TABLE IF NOT EXISTS notification_jobs (
  id TEXT PRIMARY KEY,                          -- UUID v4
  booking_id TEXT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL               -- 'fcm_new_booking', 'wa_approved', 'wa_rejected'
    CHECK (notification_type IN ('fcm_new_booking', 'wa_approved', 'wa_rejected')),
  recipient TEXT NOT NULL,                      -- Phone number or FCM token
  status TEXT NOT NULL DEFAULT 'pending'        -- 'pending', 'sent', 'delivered', 'read', 'failed'
    CHECK (status IN ('pending', 'sent', 'delivered', 'read', 'failed')),
  external_message_id TEXT,                     -- WhatsApp wamid or FCM message ID
  error_message TEXT,                           -- Diagnostic error details if failed
  payload_json TEXT,                            -- Sent template / notification parameters
  retry_count INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- 2. Booking Audit Logs Table
CREATE TABLE IF NOT EXISTS booking_audit_logs (
  id TEXT PRIMARY KEY,                          -- UUID v4
  booking_id TEXT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  owner_id TEXT REFERENCES owners(id) ON DELETE SET NULL,
  action TEXT NOT NULL,                         -- 'created_draft', 'submitted_pending', 'approved', 'rejected', 'retry_notification'
  previous_status TEXT,                         -- Status prior to transition
  new_status TEXT,                              -- Status after transition
  reason TEXT,                                  -- Reason or explanation
  metadata_json TEXT,                           -- Additional audit context (IP, User Agent, etc.)
  created_at TEXT NOT NULL
);

-- Indexes for Notification Jobs & Audit Logs
CREATE INDEX IF NOT EXISTS idx_notification_jobs_booking ON notification_jobs(booking_id);
CREATE INDEX IF NOT EXISTS idx_notification_jobs_status ON notification_jobs(status);
CREATE INDEX IF NOT EXISTS idx_notification_jobs_external_id ON notification_jobs(external_message_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_notification_dedup ON notification_jobs(booking_id, notification_type, recipient);

CREATE INDEX IF NOT EXISTS idx_audit_logs_booking ON booking_audit_logs(booking_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON booking_audit_logs(created_at DESC);
