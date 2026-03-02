# The Hidden Word (KJV)

Now includes an **optional** “Pick any verse” Bible picker.

## Daily verses
Daily verses come from `data/verses.json`.

## Pick any verse
The Bible picker expects generated data files at:

- `data/bible/index.json`
- `data/bible/<bookId>/<chapter>.json`

### Build the Bible data
This repo includes helper scripts in `tools/` to generate those files.

> Note: many Bible websites block automated scraping (Cloudflare/CORS). If the source blocks requests, use another public-domain KJV text source to generate the files, then deploy.

See `tools/README-tools.md`.
