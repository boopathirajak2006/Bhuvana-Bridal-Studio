CREATE TABLE studio_gallery_new (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL CHECK (category IN ('bridal-beauty', 'designer-blouse')),
  subcategory TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  image_url TEXT NOT NULL,
  cloudinary_public_id TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT INTO studio_gallery_new (id, category, subcategory, title, image_url, cloudinary_public_id, sort_order, created_at, updated_at)
SELECT 'legacy-' || category || '-' || subcategory || '-' || slot,
       category, subcategory, title, image_url, cloudinary_public_id, slot, created_at, updated_at
FROM studio_gallery;

DROP TABLE studio_gallery;
ALTER TABLE studio_gallery_new RENAME TO studio_gallery;
CREATE INDEX idx_studio_gallery_order ON studio_gallery(category, subcategory, sort_order, created_at);
ALTER TABLE bookings ADD COLUMN customer_whatsapp TEXT;
ALTER TABLE bookings ADD COLUMN customer_address TEXT;
CREATE TABLE booking_reference_images (
  id TEXT PRIMARY KEY,
  booking_ref TEXT NOT NULL REFERENCES bookings(booking_ref) ON DELETE CASCADE,
  cloudinary_public_id TEXT NOT NULL,
  secure_url TEXT NOT NULL,
  asset_version TEXT,
  image_format TEXT NOT NULL DEFAULT 'jpg',
  title TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_booking_reference_images_ref ON booking_reference_images(booking_ref, sort_order);
