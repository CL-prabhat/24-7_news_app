# Signal — AI-summarized news, fully free

Fetches news → summarizes it with Groq AI → stores it in a real SQL database →
shows it on a static site. Everything runs on GitHub's free infrastructure —
no server or VPS of your own required.

## How it works

```
GitHub Actions (Ubuntu runner, hourly cron)
      │
      ▼
  Docker container (Ubuntu image, Node.js)
      │  runs scripts/fetch-and-summarize.js
      │  1. pulls RSS feeds per category
      │  2. sends each story to Groq AI for a 3-bullet summary
      │  3. writes rows into data/news.sqlite (SQL, via better-sqlite3)
      ▼
  Action commits + pushes data/news.sqlite back to the repo
      │
      ▼
  GitHub Pages serves index.html / style.css / app.js
      │
      ▼
  Visitor's browser loads news.sqlite with sql.js (SQLite-as-WebAssembly)
  and runs real SQL queries (SELECT ... WHERE category = ?) to filter —
  no backend API, no server cost.
```

- **HTML/CSS/JS** — `index.html`, `style.css`, `app.js`, served by GitHub Pages.
- **Ubuntu** — both the Docker image (`ubuntu:24.04`) and the GitHub Actions
  runner (`ubuntu-latest`) are Ubuntu. You don't need to rent or run your own
  Ubuntu machine — GitHub provides the runner for free on public repos.
- **Docker** — `Dockerfile` packages the fetch/summarize job so it runs the
  same way locally and in CI.
- **Automation / pipelining** — `.github/workflows/update-news.yml` replaces
  the old cron-job-on-your-own-server approach with a scheduled GitHub Action.
- **SQL database** — `data/news.sqlite`, defined by `db/schema.sql`, written
  with real SQL from Node.js and read with real SQL from the browser.

## Setup

1. **Create a free Groq API key** at [console.groq.com](https://console.groq.com/keys).
2. **Push this project to a new GitHub repo.**
3. In the repo, go to **Settings → Secrets and variables → Actions** and add
   a secret named `GROQ_API_KEY` with your key.
4. Go to **Settings → Pages**, set **Source: Deploy from a branch**,
   branch **main**, folder **/ (root)**. Save.
5. Go to the **Actions** tab → *Update news database* → **Run workflow** to
   trigger it manually the first time (otherwise it waits for the next
   hourly run).
6. Once it finishes, your site is live at
   `https://<your-username>.github.io/<repo-name>/`.

After that, it updates itself every hour — no further action needed.

## Local testing (optional)

```bash
docker build -t news-fetcher .
docker run --rm -e GROQ_API_KEY=your_key -v "$(pwd)/data:/app/data" news-fetcher
```

Then open `index.html` with a local server (e.g. `npx serve .`) — opening it
directly via `file://` will block the `fetch()` call for `news.sqlite`.

## Notes

- Without `GROQ_API_KEY` set, the script still runs and stores a plain
  truncated snippet instead of an AI summary, so nothing breaks.
- Feeds and categories are defined in `scripts/fetch-and-summarize.js` —
  add or remove entries in the `FEEDS` array. The frontend picks up new
  categories automatically.
- GitHub Actions' free minutes comfortably cover an hourly job like this on
  a public repo. If the repo is private, check your remaining free minutes
  under Settings → Billing.
