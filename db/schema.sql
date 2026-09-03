-- Real SQL schema, used both when the fetch script writes rows
-- and when the browser queries the .sqlite file with sql.js.
CREATE TABLE IF NOT EXISTS news (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  title        TEXT NOT NULL,
  link         TEXT UNIQUE NOT NULL,
  category     TEXT NOT NULL DEFAULT 'general',
  summary      TEXT,
  published_at TEXT,
  fetched_at   TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_news_category   ON news(category);
CREATE INDEX IF NOT EXISTS idx_news_fetched_at ON news(fetched_at);
