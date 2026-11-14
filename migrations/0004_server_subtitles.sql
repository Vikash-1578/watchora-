-- Subtitles built into each server's video. The API also adds this column by itself.
ALTER TABLE sources ADD COLUMN subtitles TEXT DEFAULT '';
