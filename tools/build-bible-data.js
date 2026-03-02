/**
 * build-bible-data.js (starter scaffold)
 *
 * This is a scaffold you can adapt to fetch KJV text and generate:
 *   data/bible/index.json
 *   data/bible/<bookId>/<chapter>.json
 *
 * Many sites (including kingjamesbibleonline.org) may block scraping via Cloudflare.
 * If blocked, use a public-domain KJV dataset instead and parse it locally.
 *
 * Run: node tools/build-bible-data.js
 */
import fs from "node:fs";
import path from "node:path";

const OUT_DIR = path.join(process.cwd(), "data", "bible");

function ensureDir(p){ fs.mkdirSync(p, { recursive:true }); }

function writeJSON(filePath, obj){
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, JSON.stringify(obj, null, 2), "utf8");
}

async function main(){
  console.log("This is a scaffold. Plug in a KJV text source and generate chapter JSON files.");
  console.log("Output should be:");
  console.log(" - data/bible/index.json");
  console.log(" - data/bible/<BookId>/<Chapter>.json");
  // Example minimal index (replace with full):
  writeJSON(path.join(OUT_DIR, "index.json"), {
    books: [
      { id: "Genesis", name: "Genesis", chapters: 50 },
      { id: "Exodus", name: "Exodus", chapters: 40 }
    ]
  });
  console.log("Wrote a placeholder index.json. Replace with full build output.");
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
