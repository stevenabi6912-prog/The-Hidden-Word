# Tools

These scripts generate Bible data files so the app can offer “Pick any verse” **offline** (no external API needed).

## Output format (expected by the app)

- `data/bible/index.json`:
  { "books": [ { "id":"Genesis", "name":"Genesis", "chapters":50 }, ... ] }

- `data/bible/<bookId>/<chapter>.json`:
  { "book":"Genesis", "chapter":1, "verses":[{"n":1,"t":"In the beginning..."}, ...] }

## Important note about kingjamesbibleonline.org
That site often uses anti-bot protection and may block automated downloads, and browsers will also block cross-site JSON fetches because of CORS.

If you can fetch pages from your machine, you can write a polite, rate-limited scraper.
If you get blocked, the simplest route is to generate from a public-domain KJV dataset (Project Gutenberg / OSIS / etc.) and deploy the generated JSON.

## Minimal Node setup
1) Install Node.js
2) From repo root:
   npm init -y
   npm i cheerio node-fetch@3

Then run your generator script.
