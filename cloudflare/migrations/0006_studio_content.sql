CREATE TABLE IF NOT EXISTS studio_content (
  content_key TEXT PRIMARY KEY,
  content_value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
