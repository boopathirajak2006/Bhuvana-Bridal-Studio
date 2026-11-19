CREATE TABLE IF NOT EXISTS studio_gallery (
  category TEXT NOT NULL CHECK (category IN ('bridal-beauty', 'designer-blouse')),
  slot INTEGER NOT NULL CHECK (slot BETWEEN 1 AND 6),
  title TEXT NOT NULL DEFAULT '',
  image_url TEXT NOT NULL,
  cloudinary_public_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (category, slot)
);
