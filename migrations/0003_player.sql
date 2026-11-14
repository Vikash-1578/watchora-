-- Player, downloads, subtitles and movie parts (Nov 2026)
ALTER TABLE titles ADD COLUMN collection TEXT DEFAULT '';
ALTER TABLE titles ADD COLUMN part INTEGER;
ALTER TABLE sources ADD COLUMN kind TEXT DEFAULT 'embed';
ALTER TABLE sources ADD COLUMN audio TEXT DEFAULT '';
ALTER TABLE sources ADD COLUMN download_url TEXT DEFAULT '';
ALTER TABLE sources ADD COLUMN size TEXT DEFAULT '';
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
