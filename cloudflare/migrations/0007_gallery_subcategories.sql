CREATE TABLE studio_gallery_new (
  category TEXT NOT NULL CHECK (category IN ('bridal-beauty', 'designer-blouse')),
  subcategory TEXT NOT NULL CHECK (subcategory IN (
    'baby-shower', 'wedding-makeup', 'party-makeup', 'engagement-makeup', 'reception-makeup', 'bridal-hairstyling', 'other-bridal',
    'bridal-blouse', 'maggam-work', 'aari-work', 'embroidery', 'sleeve-designs', 'neck-designs', 'other-blouse'
  )),
  slot INTEGER NOT NULL CHECK (slot BETWEEN 1 AND 6),
  title TEXT NOT NULL DEFAULT '',
  image_url TEXT NOT NULL,
  cloudinary_public_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (category, subcategory, slot)
);

INSERT INTO studio_gallery_new (category, subcategory, slot, title, image_url, cloudinary_public_id, created_at, updated_at)
SELECT category, CASE category WHEN 'bridal-beauty' THEN 'other-bridal' ELSE 'other-blouse' END,
  slot, title, image_url, cloudinary_public_id, created_at, updated_at
FROM studio_gallery;

DROP TABLE studio_gallery;
ALTER TABLE studio_gallery_new RENAME TO studio_gallery;
