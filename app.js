// Loads data/news.sqlite (built by the GitHub Action) directly into the browser
// using sql.js (SQLite compiled to WebAssembly), then runs real SQL queries
// client-side to filter by category. No backend server involved.

const SQL_JS_BASE = 'https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.5.0/';
const DB_PATH = 'data/news.sqlite';

const feedEl = document.getElementById('feed');
const tabsEl = document.getElementById('category-tabs');
const statusEl = document.getElementById('status');

let db;
let activeCategory = 'all';

function escapeHtml(str = '') {
  return String(str).replace(/[&<>"']/g, ch => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[ch]));
}

function timeAgo(iso) {
  if (!iso) return '';
  const mins = Math.floor((Date.now() - new Date(iso + 'Z').getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function query(sql, params = []) {
  const stmt = db.prepare(sql);
  if (params.length) stmt.bind(params);
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

function renderTabs() {
  const categories = query('SELECT DISTINCT category FROM news ORDER BY category').map(r => r.category);
  const all = ['all', ...categories];

  tabsEl.innerHTML = all.map(cat => `
    <button class="tab${cat === activeCategory ? ' tab--active' : ''}" data-category="${escapeHtml(cat)}">
      ${cat === 'all' ? 'All' : escapeHtml(cat)}
    </button>
  `).join('');

  tabsEl.querySelectorAll('.tab').forEach(btn => {
    btn.addEventListener('click', () => {
      activeCategory = btn.dataset.category;
      renderTabs();
      renderFeed();
    });
  });
}

function renderFeed() {
  const rows = activeCategory === 'all'
    ? query('SELECT * FROM news ORDER BY fetched_at DESC LIMIT 60')
    : query('SELECT * FROM news WHERE category = ? ORDER BY fetched_at DESC LIMIT 60', [activeCategory]);

  if (!rows.length) {
    feedEl.innerHTML = `<p class="empty">No stories in this category yet.</p>`;
    return;
  }

  feedEl.innerHTML = rows.map(item => `
    <article class="story">
      <div class="story__meta">
        <span class="story__dot story__dot--${escapeHtml(item.category)}"></span>
        <span class="story__category">${escapeHtml(item.category)}</span>
        <span class="story__time">${timeAgo(item.fetched_at)}</span>
      </div>
      <h2 class="story__title">
        <a href="${escapeHtml(item.link)}" target="_blank" rel="noopener">${escapeHtml(item.title)}</a>
      </h2>
      <p class="story__summary">${escapeHtml(item.summary || '')}</p>
    </article>
  `).join('');
}

async function init() {
  try {
    statusEl.textContent = 'Loading latest stories…';
    const SQL = await window.initSqlJs({ locateFile: file => SQL_JS_BASE + file });
    const buf = await fetch(DB_PATH, { cache: 'no-store' }).then(res => {
      if (!res.ok) throw new Error('news.sqlite not found yet');
      return res.arrayBuffer();
    });
    db = new SQL.Database(new Uint8Array(buf));
    statusEl.textContent = '';
    renderTabs();
    renderFeed();
  } catch (err) {
    statusEl.textContent = 'No news database yet — run the GitHub Action once to generate it.';
    console.error(err);
  }
}

init();
