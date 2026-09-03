// Fetches news per category, summarizes each with Groq's free AI API,
// and writes the result into a real SQLite database (data/news.sqlite).
// This runs inside the Docker container, on the GitHub Actions Ubuntu runner.

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const Parser = require('rss-parser');
const axios = require('axios');

const DB_PATH = path.join(__dirname, '..', 'data', 'news.sqlite');
const SCHEMA_PATH = path.join(__dirname, '..', 'db', 'schema.sql');

// Add or remove categories/feeds here — the frontend picks up
// whatever categories exist in the database automatically.
const FEEDS = [
  { url: 'https://news.google.com/rss/search?q=technology&hl=en-IN&gl=IN&ceid=IN:en', category: 'tech' },
  { url: 'https://news.google.com/rss/search?q=cryptocurrency&hl=en-IN&gl=IN&ceid=IN:en', category: 'crypto' },
  { url: 'https://news.google.com/rss/search?q=business&hl=en-IN&gl=IN&ceid=IN:en', category: 'business' },
  { url: 'https://news.google.com/rss/search?q=sports&hl=en-IN&gl=IN&ceid=IN:en', category: 'sports' },
];

const ITEMS_PER_FEED = 6;
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.3-70b-versatile'; // check console.groq.com/docs/models if this is retired

function openDb() {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  const db = new Database(DB_PATH);
  db.exec(fs.readFileSync(SCHEMA_PATH, 'utf-8'));
  return db;
}

async function summarize(title, snippet) {
  const fallback = (snippet || title || '').slice(0, 220);
  if (!GROQ_API_KEY) return fallback;

  try {
    const res = await axios.post(
      GROQ_URL,
      {
        model: GROQ_MODEL,
        messages: [{
          role: 'user',
          content: `Summarize this news story in 3 short bullet points for a mobile app. ` +
                    `Title: ${title}\nContent: ${snippet || 'N/A'}`
        }],
        temperature: 0.3,
        max_tokens: 200
      },
      { headers: { Authorization: `Bearer ${GROQ_API_KEY}` }, timeout: 20000 }
    );
    return res.data.choices[0].message.content.trim();
  } catch (err) {
    console.error(`Groq summarize failed for "${title}":`, err.response?.data || err.message);
    return fallback;
  }
}

async function run() {
  const db = openDb();
  const parser = new Parser();
  const insert = db.prepare(`
    INSERT INTO news (title, link, category, summary, published_at)
    VALUES (@title, @link, @category, @summary, @published_at)
    ON CONFLICT(link) DO UPDATE SET summary = excluded.summary
  `);

  for (const feed of FEEDS) {
    try {
      const parsed = await parser.parseURL(feed.url);
      const items = parsed.items.slice(0, ITEMS_PER_FEED);

      for (const item of items) {
        const summary = await summarize(item.title, item.contentSnippet);
        insert.run({
          title: item.title,
          link: item.link,
          category: feed.category,
          summary,
          published_at: item.pubDate || null
        });
        console.log(`Saved [${feed.category}] ${item.title}`);
      }
    } catch (err) {
      console.error(`Failed to fetch feed ${feed.url}:`, err.message);
    }
  }

  db.close();
  console.log('Done. Database written to', DB_PATH);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
