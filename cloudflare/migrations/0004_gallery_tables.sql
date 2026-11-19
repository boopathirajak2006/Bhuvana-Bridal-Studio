-- ==============================================================================
-- Migration 0004: Gallery Management
-- Bhuvana's Bridal & Tailoring Studio
-- Cloudflare D1 Gallery Tables & Indexes
-- ==============================================================================

CREATE TABLE IF NOT EXISTS gallery_items (
  id TEXT PRIMARY KEY,                          -- e.g. 'bbs-gal-bm-01' or UUID
  category TEXT NOT NULL,                       -- 'bridal-makeup', 'reception-makeup', etc.
  category_name TEXT NOT NULL,                  -- Display name
  title TEXT NOT NULL,                          -- Title of the photo/look
  description TEXT,                             -- Detailed styling description
  image_url TEXT NOT NULL,                      -- Cloudinary URL or local path
  public_id TEXT,                               -- Cloudinary public_id (for deletion/replacement)
  is_sample INTEGER NOT NULL DEFAULT 1,         -- 1 = Sample photo, 0 = Studio original
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_gallery_items_category ON gallery_items(category);
CREATE INDEX IF NOT EXISTS idx_gallery_items_sort ON gallery_items(sort_order);
CREATE INDEX IF NOT EXISTS idx_gallery_items_created ON gallery_items(created_at DESC);
