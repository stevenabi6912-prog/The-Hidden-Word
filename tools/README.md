# Tools (Path A: local Bible data)

This app’s “Pick any verse” feature works from local files under `data/bible/`.

## Recommended source
Use a public-domain KJV dataset and generate the chapter JSON files locally.

A good option is the `farskipper/kjv` JSON mapping (`verses-1769.json`) which is labeled public domain. (See repo for license info.)

## Steps (quick)
1) Download `verses-1769.json` from the dataset repo and put it in `tools/input/verses-1769.json`
2) From repo root, run:
   node tools/build-bible-from-verses-map.js

It will generate:
- `data/bible/index.json`
- `data/bible/<bookId>/<chapter>.json`

Then commit/push and redeploy GitHub Pages.

## Notes
- This is all client-side and works on GitHub Pages.
- No external API calls.
