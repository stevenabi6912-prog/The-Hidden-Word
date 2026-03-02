/**
 * Build Bible data files from a reference->verseText JSON map.
 *
 * Input format example (from farskipper/kjv):
 *   {
 *     "John 3:16": "# For God so loved the world, ...",
 *     "Genesis 1:1": "In the beginning ...",
 *     ...
 *   }
 *
 * Output (expected by the app):
 *   data/bible/index.json
 *   data/bible/<bookId>/<chapter>.json
 *
 * Run:
 *   node tools/build-bible-from-verses-map.js
 *
 * Put your input file at:
 *   tools/input/verses-1769.json
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const INPUT = path.join(ROOT, "tools", "input", "verses-1769.json");
const OUT_DIR = path.join(ROOT, "data", "bible");

function ensureDir(p){ fs.mkdirSync(p, { recursive:true }); }
function writeJSON(filePath, obj){
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, JSON.stringify(obj, null, 2), "utf8");
}
function cleanVerseText(t){
  // dataset uses "# " for new paragraph, keep text clean for memorization.
  return String(t || "")
    .replace(/^#\s*/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
function slugBook(bookName){
  // safe folder id
  return bookName
    .replace(/[^A-Za-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function parseRef(ref){
  // ref like "1 John 5:7" or "Song of Solomon 2:1"
  const m = ref.match(/^(.*)\s(\d+):(\d+)$/);
  if (!m) return null;
  const book = m[1].trim();
  const chapter = Number(m[2]);
  const verse = Number(m[3]);
  return { book, chapter, verse };
}

function main(){
  if (!fs.existsSync(INPUT)){
    console.error("Missing input:", INPUT);
    console.error("Create tools/input/verses-1769.json (download from your chosen KJV dataset).");
    process.exit(1);
  }

  const map = JSON.parse(fs.readFileSync(INPUT, "utf8"));
  const byBook = new Map(); // bookName -> Map(chapter -> Map(verse -> text))

  for (const [ref, rawText] of Object.entries(map)){
    const p = parseRef(ref);
    if (!p) continue;
    const t = cleanVerseText(rawText);
    if (!t) continue;

    if (!byBook.has(p.book)) byBook.set(p.book, new Map());
    const byChapter = byBook.get(p.book);
    if (!byChapter.has(p.chapter)) byChapter.set(p.chapter, new Map());
    const byVerse = byChapter.get(p.chapter);
    byVerse.set(p.verse, t);
  }

  // Build outputs
  ensureDir(OUT_DIR);

  const booksOut = [];
  for (const [bookName, chaptersMap] of byBook.entries()){
    const bookId = slugBook(bookName);
    const chapters = Array.from(chaptersMap.keys()).sort((a,b)=>a-b);
    const chapterCount = chapters.length ? chapters[chapters.length-1] : 0;

    booksOut.push({ id: bookId, name: bookName, chapters: chapterCount });

    for (const ch of chapters){
      const versesMap = chaptersMap.get(ch);
      const verses = Array.from(versesMap.entries())
        .sort((a,b)=>a[0]-b[0])
        .map(([n, t]) => ({ n, t }));

      writeJSON(path.join(OUT_DIR, bookId, `${ch}.json`), {
        book: bookName,
        chapter: ch,
        verses
      });
    }
  }

  // Keep book order roughly canonical if possible by sorting common order list first (fallback alpha)
  const CANON = [
    "Genesis","Exodus","Leviticus","Numbers","Deuteronomy","Joshua","Judges","Ruth","1 Samuel","2 Samuel","1 Kings","2 Kings",
    "1 Chronicles","2 Chronicles","Ezra","Nehemiah","Esther","Job","Psalms","Proverbs","Ecclesiastes","Song of Solomon","Isaiah",
    "Jeremiah","Lamentations","Ezekiel","Daniel","Hosea","Joel","Amos","Obadiah","Jonah","Micah","Nahum","Habakkuk","Zephaniah",
    "Haggai","Zechariah","Malachi","Matthew","Mark","Luke","John","Acts","Romans","1 Corinthians","2 Corinthians","Galatians","Ephesians",
    "Philippians","Colossians","1 Thessalonians","2 Thessalonians","1 Timothy","2 Timothy","Titus","Philemon","Hebrews","James",
    "1 Peter","2 Peter","1 John","2 John","3 John","Jude","Revelation"
  ];
  const canonIndex = new Map(CANON.map((b,i)=>[b,i]));
  booksOut.sort((a,b)=>{
    const ai = canonIndex.has(a.name) ? canonIndex.get(a.name) : 9999;
    const bi = canonIndex.has(b.name) ? canonIndex.get(b.name) : 9999;
    if (ai !== bi) return ai - bi;
    return a.name.localeCompare(b.name);
  });

  writeJSON(path.join(OUT_DIR, "index.json"), { books: booksOut });

  console.log("Done. Generated:", path.join("data","bible"));
  console.log("Books:", booksOut.length);
}

main();
