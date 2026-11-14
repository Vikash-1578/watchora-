-- Watchora database (Cloudflare D1)
CREATE TABLE IF NOT EXISTS titles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  category TEXT NOT NULL,            -- movies | web-series | anime | drama | serials | adult
  subcategory TEXT DEFAULT '',
  language TEXT DEFAULT '',
  genres TEXT DEFAULT '',            -- comma separated
  year INTEGER,
  certificate TEXT DEFAULT '',       -- U, UA, A
  is_adult INTEGER NOT NULL DEFAULT 0,
  description TEXT DEFAULT '',
  poster TEXT DEFAULT '',            -- image URL (2:3)
  backdrop TEXT DEFAULT '',          -- wide image URL (16:9)
  featured INTEGER NOT NULL DEFAULT 0,
  published INTEGER NOT NULL DEFAULT 1,
  views INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_titles_cat ON titles(category, is_adult, published, created_at);
CREATE INDEX IF NOT EXISTS idx_titles_featured ON titles(featured, is_adult, published);

CREATE TABLE IF NOT EXISTS episodes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title_id INTEGER NOT NULL REFERENCES titles(id) ON DELETE CASCADE,
  season INTEGER NOT NULL DEFAULT 1,
  episode INTEGER NOT NULL,
  name TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(title_id, season, episode)
);

-- Video links (servers). Movie: episode_id NULL. Series: episode_id set.
CREATE TABLE IF NOT EXISTS sources (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title_id INTEGER NOT NULL REFERENCES titles(id) ON DELETE CASCADE,
  episode_id INTEGER REFERENCES episodes(id) ON DELETE CASCADE,
  label TEXT NOT NULL DEFAULT 'Server 1',
  url TEXT NOT NULL,
  quality TEXT DEFAULT '',
  sort INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_sources_title ON sources(title_id, episode_id);
