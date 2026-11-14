-- Watchora database (Cloudflare D1). Fresh install: run this whole file.
CREATE TABLE IF NOT EXISTS titles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  original_name TEXT DEFAULT '',
  category TEXT NOT NULL,            -- movies | web-series | anime | drama | serials | adult
  subcategory TEXT DEFAULT '',
  language TEXT DEFAULT '',          -- original language
  audio TEXT DEFAULT '',             -- comma separated audio languages (dual audio etc.)
  subtitles TEXT DEFAULT '',         -- comma separated
  genres TEXT DEFAULT '',            -- comma separated
  tags TEXT DEFAULT '',              -- comma separated search keywords
  year INTEGER,
  release_date TEXT DEFAULT '',
  runtime INTEGER,                   -- minutes (movie) or per-episode
  country TEXT DEFAULT '',
  certificate TEXT DEFAULT '',       -- U, UA 7+, UA 13+, UA 16+, A
  status TEXT DEFAULT '',            -- Released | Ongoing | Completed | Upcoming
  quality TEXT DEFAULT '',           -- 480p | 720p | 1080p | 4K
  imdb_rating REAL,
  cast_list TEXT DEFAULT '',         -- comma separated
  director TEXT DEFAULT '',
  studio TEXT DEFAULT '',
  is_adult INTEGER NOT NULL DEFAULT 0,
  description TEXT DEFAULT '',
  poster TEXT DEFAULT '',            -- image URL (2:3)
  backdrop TEXT DEFAULT '',          -- wide image URL (16:9)
  trailer TEXT DEFAULT '',           -- YouTube link
  tmdb_id INTEGER,
  collection TEXT DEFAULT '',        -- movie series / franchise name, e.g. KGF
  part INTEGER,                      -- part number inside the collection
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
  overview TEXT DEFAULT '',
  thumbnail TEXT DEFAULT '',
  runtime INTEGER,
  air_date TEXT DEFAULT '',
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
  kind TEXT DEFAULT 'embed',         -- embed | file | hls
  audio TEXT DEFAULT '',             -- audio language of this server
  download_url TEXT DEFAULT '',
  size TEXT DEFAULT '',
  sort INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_sources_title ON sources(title_id, episode_id);

CREATE TABLE IF NOT EXISTS subtitles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title_id INTEGER NOT NULL REFERENCES titles(id) ON DELETE CASCADE,
  episode_id INTEGER REFERENCES episodes(id) ON DELETE CASCADE,
  language TEXT NOT NULL,
  url TEXT NOT NULL,
  sort INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_subtitles_title ON subtitles(title_id, episode_id);
CREATE INDEX IF NOT EXISTS idx_titles_collection ON titles(collection);
