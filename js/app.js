/* The Hidden Word — parent login + multiple child profiles
   Version: 2.1.0-family
   Built: 2026-03-03 19:48:23Z
*/
import { firebaseConfig } from "./firebase-config.js";

// These CDN imports work on GitHub Pages.
// (Importmap also included in index.html to guard against mixed builds.)
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut
} from "https://www.gstatic.com/firebasejs/12.10.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  collection,
  getDocs,
  query,
  orderBy,
  limit
} from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";

const els = {
  navHome: document.getElementById("navHome"),
  navDaily: document.getElementById("navDaily"),
  navPick: document.getElementById("navPick"),
  navVerses: document.getElementById("navVerses"),
  navProfile: document.getElementById("navProfile"),

  viewHome: document.getElementById("viewHome"),
  viewPick: document.getElementById("viewPick"),
  viewVerses: document.getElementById("viewVerses"),
  viewGame: document.getElementById("viewGame"),
  viewProfile: document.getElementById("viewProfile"),

  streakHome: document.getElementById("streakHome"),
  completedHome: document.getElementById("completedHome"),
  xpHome: document.getElementById("xpHome"),
  levelHome: document.getElementById("levelHome"),
  levelLabelHome: document.getElementById("levelLabelHome"),
  xpNextHome: document.getElementById("xpNextHome"),
  xpBarFillHome: document.getElementById("xpBarFillHome"),
  badgeRowHome: document.getElementById("badgeRowHome"),

  homeDaily: document.getElementById("homeDaily"),
  homePick: document.getElementById("homePick"),
  todayRef: document.getElementById("todayRef"),
  todayText: document.getElementById("todayText"),

  pickBiblePane: document.getElementById("pickBiblePane"),
  bibleSearch: document.getElementById("bibleSearch"),
  bibleBooks: document.getElementById("bibleBooks"),
  bibleChapters: document.getElementById("bibleChapters"),
  bibleVerses: document.getElementById("bibleVerses"),
  bibleHelp: document.getElementById("bibleHelp"),
  myList: document.getElementById("myList"),

  gameRef: document.getElementById("gameRef"),
  gameMode: document.getElementById("gameMode"),
  streakGame: document.getElementById("streakGame"),
  xpGame: document.getElementById("xpGame"),
  verseBox: document.getElementById("verseBox"),
  pillRow: document.getElementById("pillRow"),
  btnHint: document.getElementById("btnHint"),
  btnFullAttempt: document.getElementById("btnFullAttempt"),
  btnResetStep: document.getElementById("btnResetStep"),
  btnStartOver: document.getElementById("btnStartOver"),
  stepLabel: document.getElementById("stepLabel"),

  // Profile/auth
  profileName: document.getElementById("profileName"),
  profileMeta: document.getElementById("profileMeta"),
  activeKidName: document.getElementById("activeKidName"),
  activeKidMeta: document.getElementById("activeKidMeta"),
  kidsRow: document.getElementById("kidsRow"),
  kidName: document.getElementById("kidName"),
  btnAddKid: document.getElementById("btnAddKid"),
  badgeRowProfile: document.getElementById("badgeRowProfile"),
  levelProfile: document.getElementById("levelProfile"),
  xpProfile: document.getElementById("xpProfile"),
  levelLabelProfile: document.getElementById("levelLabelProfile"),
  xpNextProfile: document.getElementById("xpNextProfile"),
  xpBarFillProfile: document.getElementById("xpBarFillProfile"),

  btnSignOut: document.getElementById("btnSignOut"),
  authCard: document.getElementById("authCard"),
  authName: document.getElementById("authName"),
  authEmail: document.getElementById("authEmail"),
  authPass: document.getElementById("authPass"),
  authEmail2: document.getElementById("authEmail2"),
  authPass2: document.getElementById("authPass2"),
  btnSignIn: document.getElementById("btnSignIn"),
  btnForgotPassword: document.getElementById("btnForgotPassword"),
  btnSignUp: document.getElementById("btnSignUp"),
  authMsg: document.getElementById("authMsg"),
  firebaseStatus: document.getElementById("firebaseStatus"),

  guestModal: document.getElementById("guestModal"),
  guestGoProfile: document.getElementById("guestGoProfile"),
  guestContinue: document.getElementById("guestContinue"),

  alertModal: document.getElementById("alertModal"),
  alertTitle: document.getElementById("alertTitle"),
  alertBody: document.getElementById("alertBody"),
  alertOk: document.getElementById("alertOk"),
};

function showAlert(title, message) {
  if (!els.alertModal) {
    // last-ditch fallback
    // eslint-disable-next-line no-alert
    alert(`${title || 'Notice'}\n\n${message || ''}`);
    return;
  }
  els.alertTitle.textContent = title || "Notice";
  els.alertBody.textContent = message || "";
  els.alertModal.hidden = false;
}

function hideAlert() {
  if (!els.alertModal) return;
  els.alertModal.hidden = true;
}

els.alertOk?.addEventListener("click", hideAlert);
els.alertModal?.addEventListener("click", (e) => {
  if (e.target === els.alertModal) hideAlert();
});

// Guest mode is allowed *per session* after the user explicitly chooses it.
// We intentionally do NOT persist this across reloads because the app should
// start on the login/profile screen each visit unless already signed in.
let guestAllowed = false;
let pendingGuestAction = null;

let library = [];
let todayVerse = null;

let fbApp = null;
let auth = null;
let db = null;
let fbEnabled = false;

let user = null;           // parent firebase user
let parentDoc = null;      // {displayName}
let kids = [];             // [{id,name,xp,streak,lastCompleted,badges}]
let activeKid = null;      // active child doc
let completedCache = [];   // active child's completed list

let state = null;          // game runtime state

const BOLLS_API = "https://bolls.life/get-books";
const BOLLS_TEXT_API = "https://bolls.life/get-text";
const BOLLS_TRANSLATION = "KJV";
const bibleState = { books: null, selectedBook: null, selectedChapter: null };

const BADGES = [
  { id: "first", icon: "🌟", label: "First verse" },
  { id: "streak3", icon: "🔥", label: "3‑day streak" },
  { id: "streak7", icon: "🏅", label: "7‑day streak" },
  { id: "verses10", icon: "📚", label: "10 verses" },
];


  // Active profile helpers (parent or child id). Stored in LS_ACTIVE_KID.
  function getActiveProfileId() {
    return localStorage.getItem(LS_ACTIVE_KID) || "parent";
  }

  function setActiveProfileId(id) {
    localStorage.setItem(LS_ACTIVE_KID, id || "parent");
  }

const LS_ACTIVE_KID = "thw_activeKidId";

function stripHtmlTags(s){
  return (s||"" ).toString().replace(/<[^>]*>/g, "").replace(/\s+/g," ").trim();
}

function escapeHTML(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function todayISO() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function getVerseKey(v) {
  return v.ref + "|" + v.text.slice(0, 60);
}
function hashId(s) {
  const buf = new TextEncoder().encode(s);
  let h = 2166136261;
  for (const b of buf) {
    h ^= b;
    h = Math.imul(h, 16777619);
  }
  return "v_" + (h >>> 0).toString(16);
}
function kidIdFromName(name) {
  const base = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  return (base || "kid") + "-" + Math.random().toString(16).slice(2, 8);
}

function normalizeTokens(text) {
  const re = /[A-Za-z']+|\d+|[^\sA-Za-z0-9]+/g;
  return text.match(re) || [];
}
function isWordToken(t) {
  return /^[A-Za-z']+$/.test(t) || /^\d+$/.test(t);
}

function pickDaily(dateStr) {
  if (!library.length) return null;
  let h = 2166136261;
  for (let i = 0; i < dateStr.length; i++) {
    h ^= dateStr.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const idx = Math.abs(h) % library.length;
  return library[idx];
}

function updateNavProfileLabel() {
  const el = document.getElementById("navProfileLabel");
  const homeEl = document.getElementById("playingAsLabel");
  const setLabel = (txt) => {
    if (el) el.textContent = txt;
    if (homeEl) homeEl.textContent = txt;
  };

  if (!el && !homeEl) return;
  if (!user) { setLabel("Profile"); return; }
  // If a child is active, show the child's name; otherwise show the parent's display name.
  if (activeKid && activeKid.id !== "parent") {
    setLabel(activeKid.name || "Profile");
    return;
  }
  setLabel((parentDoc && parentDoc.displayName) || user.displayName || "Profile");
}

function setActiveNav(btn) {
  for (const b of [els.navHome, els.navDaily, els.navPick, els.navVerses, els.navProfile]) {
    b.classList.toggle("isActive", b === btn);
  }
}

function showGuestModal(action){
  pendingGuestAction = action || null;
  if (!els.guestModal) return;
  els.guestModal.hidden = false;
  els.guestModal.style.display = "flex";
}
function hideGuestModal(){
  if (!els.guestModal) return;
  els.guestModal.hidden = true;
  els.guestModal.style.display = "none";
}
function requireLoginOrGuest(action){
  if (auth?.currentUser) { action(); return; }
  if (guestAllowed) { action(); return; }
  showGuestModal(action);
}
function showView(name) {
  els.viewHome.hidden = name !== "home";
  els.viewPick.hidden = name !== "pick";
  els.viewVerses.hidden = name !== "verses";
  els.viewGame.hidden = name !== "game";
  els.viewProfile.hidden = name !== "profile";
}

async function loadVerses() {
  const url = new URL("data/verses.json", window.location.href);
  const res = await fetch(url.toString(), { cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP ${res.status} loading ${url}`);
  const data = await res.json();
  if (!data || !Array.isArray(data.verses)) throw new Error("verses.json missing verses[]");
  library = data.verses;
  return library.length;
}

function renderToday() {
  if (!todayVerse) return;
  els.todayRef.textContent = todayVerse.ref;
  els.todayText.textContent = todayVerse.text;
}


function levelInfoFromXP(xp) {
  const safeXP = Math.max(0, Number(xp || 0));
  let level = 1;
  let prevTotal = 0;
  let total = 100;
  while (safeXP >= total) {
    level += 1;
    prevTotal = total;
    total += 75 + (level * 25);
  }
  return {
    level,
    xpIntoLevel: safeXP - prevTotal,
    xpNeeded: total - prevTotal,
    progressPct: Math.max(0, Math.min(100, ((safeXP - prevTotal) / Math.max(1, total - prevTotal)) * 100)),
  };
}

function renderXPUI(xp) {
  const info = levelInfoFromXP(xp);
  if (els.levelHome) els.levelHome.textContent = String(info.level);
  if (els.levelLabelHome) els.levelLabelHome.textContent = `Level ${info.level}`;
  if (els.xpNextHome) els.xpNextHome.textContent = `${info.xpIntoLevel} / ${info.xpNeeded} XP`;
  if (els.xpBarFillHome) els.xpBarFillHome.style.width = `${info.progressPct}%`;
  if (els.levelProfile) els.levelProfile.textContent = String(info.level);
  if (els.xpProfile) els.xpProfile.textContent = String(Math.max(0, Number(xp || 0)));
  if (els.levelLabelProfile) els.levelLabelProfile.textContent = `Level ${info.level}`;
  if (els.xpNextProfile) els.xpNextProfile.textContent = `${info.xpIntoLevel} / ${info.xpNeeded} XP`;
  if (els.xpBarFillProfile) els.xpBarFillProfile.style.width = `${info.progressPct}%`;
}

function floatXP(amount, anchorEl) {
  if (!amount || amount <= 0) return;
  const el = document.createElement("div");
  el.className = "floatingXp";
  el.textContent = `+${amount} XP`;
  document.body.appendChild(el);
  let x = window.innerWidth / 2;
  let y = 120;
  if (anchorEl && anchorEl.getBoundingClientRect) {
    const r = anchorEl.getBoundingClientRect();
    x = r.left + r.width / 2;
    y = r.top + window.scrollY - 8;
  }
  el.style.left = `${Math.max(12, x - 35)}px`;
  el.style.top = `${Math.max(12, y)}px`;
  setTimeout(() => el.remove(), 900);
}

function activeProfileDocData() {
  if (activeKid && activeKid.id === "parent") {
    return {
      displayName: parentDoc?.displayName || user?.displayName || "Parent",
      xp: activeKid.xp || 0,
      streak: activeKid.streak || 0,
      lastCompleted: activeKid.lastCompleted || null,
      badges: activeKid.badges || {},
    };
  }
  return null;
}

function makeParentProfile() {
  return {
    id: "parent",
    name: parentDoc?.displayName || user?.displayName || "Parent",
    xp: Number.isFinite(+(parentDoc?.xp)) ? +(parentDoc?.xp) : 0,
    streak: Number.isFinite(+(parentDoc?.streak)) ? +(parentDoc?.streak) : 0,
    lastCompleted: typeof parentDoc?.lastCompleted === "string" ? parentDoc.lastCompleted : null,
    badges: (parentDoc?.badges && typeof parentDoc.badges === "object") ? parentDoc.badges : {},
  };
}

async function loadCompletedForProfile(profileId) {
  if (!fbEnabled || !user) return [];
  const col = profileId === "parent"
    ? collection(db, "users", user.uid, "completed")
    : collection(db, "users", user.uid, "kids", profileId, "completed");
  const qy = query(col, orderBy("at", "desc"), limit(500));
  const snap = await getDocs(qy);
  const items = [];
  snap.forEach(docu => {
    const d = docu.data();
    if (d && d.key) items.push(d);
  });
  return items;
}

async function ensureBibleChapters(bookid) {
  await ensureBibleBooks();
  const book = (bibleState.books || []).find(b => b.bookid === String(bookid));
  if (!book) return [];
  return Array.from({ length: Number(book.chapters || 0) }, (_, i) => i + 1);
}

function renderBadges(targetEl, badgesObj) {
  if (!targetEl) return;
  const owned = badgesObj || {};
  const earned = BADGES.filter(b => owned[b.id]);
  if (!earned.length) {
    targetEl.innerHTML = `<div class="empty">No badges yet — finish a verse to earn your first.</div>`;
    return;
  }
  targetEl.innerHTML = earned.map(b => `
    <div class="badge" title="${escapeHTML(b.label)}">
      <div class="badgeIcon">${escapeHTML(b.icon)}</div>
      <div class="badgeLabel">${escapeHTML(b.label)}</div>
    </div>
  `).join("");
}

function renderStats() {
  const streak = activeKid?.streak ?? 0;
  const xp = activeKid?.xp ?? 0;
  els.streakHome.textContent = String(streak);
  els.streakGame.textContent = String(streak);
  els.xpHome.textContent = String(xp);
  els.xpGame.textContent = String(xp);
  els.completedHome.textContent = String(completedCache.length);
  renderBadges(els.badgeRowHome, activeKid?.badges);
  renderBadges(els.badgeRowProfile, activeKid?.badges);
  renderXPUI(xp);
}

function renderHomeStats() {
  // Back-compat: older builds called this name
  renderStats();
}


function renderPickList(){
  // Library picker removed (Bible-only picker).
}

function setPickTab(tab) {
  const isBible = tab === "bible";
  els.pickBiblePane.hidden = !isBible;
  if (isBible) {
    // Lazy-load books
    void initBiblePicker();
  }
}

function renderBibleBooks(filter = "") {
  const q = filter.trim().toLowerCase();
  const books = (bibleState.books || []).filter(b => !q || b.name.toLowerCase().includes(q));
  if (!books.length) {
    els.bibleBooks.innerHTML = `<div class="empty">No matching books.</div>`;
    return;
  }
  els.bibleBooks.innerHTML = books.map(b => {
    const active = bibleState.selectedBook === b.bookid;
    return `<button class="bibleBtn ${active ? "active" : ""}" type="button" data-book="${escapeHTML(b.bookid)}">${escapeHTML(b.name)}</button>`;
  }).join("");
  els.bibleBooks.querySelectorAll(".bibleBtn").forEach(btn => {
    btn.addEventListener("click", async () => {
      const bookid = btn.getAttribute("data-book");
      bibleState.selectedBook = bookid;
      bibleState.selectedChapter = null;
      renderBibleBooks(els.bibleSearch?.value || "");
      await renderBibleChapters(bookid);
    });
  });
}

async function renderBibleChapters(bookid) {
  els.bibleChapters.innerHTML = `<div class="empty">Loading chapters…</div>`;
  els.bibleVerses.innerHTML = `<div class="empty">Pick a chapter.</div>`;
  try {
    const list = await ensureBibleChapters(bookid);
    if (!list.length) {
      els.bibleChapters.innerHTML = `<div class="empty">No chapters found.</div>`;
      return;
    }
    els.bibleChapters.innerHTML = list.map(ch => {
      const active = bibleState.selectedChapter === ch;
      return `<button class="bibleBtn ${active ? "active" : ""}" type="button" data-ch="${ch}">${ch}</button>`;
    }).join("");
    els.bibleChapters.querySelectorAll(".bibleBtn").forEach(btn => {
      btn.addEventListener("click", async () => {
        const ch = Number(btn.getAttribute("data-ch"));
        bibleState.selectedChapter = ch;
        await renderBibleChapters(bookid);
        await renderBibleVerses(bookid, ch);
      });
    });
  } catch (e) {
    console.error(e);
    els.bibleChapters.innerHTML = `<div class="empty">Couldn't load chapters.</div>`;
  }
}

function extractVersesFromChapterJson(chJson){
  if (Array.isArray(chJson)) return chJson;
  // Older API shapes fallback
  if (chJson && typeof chJson === "object") {
    if (Array.isArray(chJson.verses)) return chJson.verses;
    const book = chJson.book || chJson;
    if (book && typeof book === "object") {
      const chapterKey = Object.keys(book).find(k => k !== "book_name" && k !== "chapter_nr");
      if (chapterKey && book[chapterKey] && Array.isArray(book[chapterKey].chapter)) {
        return book[chapterKey].chapter;
      }
    }
  }
  return [];
}


async function renderBibleVerses(bookid, chapterNr) {
  els.bibleVerses.innerHTML = `<div class="empty">Loading verses…</div>`;
  try {
    const verses = await getBibleChapter(bookid, chapterNr);
    const bookName = (bibleState.books || []).find(b => b.bookid === String(bookid))?.name || `Book ${bookid}`;
    if (!verses.length) {
      els.bibleVerses.innerHTML = `<div class="empty">No verses found.</div>`;
      return;
    }
    els.bibleVerses.innerHTML = verses.map(v => {
      const vn = (v.verse ?? v.nr ?? v.v ?? "").toString();
      const text = (v.text ?? v.verseText ?? v.t ?? "").toString();
      const ref = `${bookName} ${chapterNr}:${vn}`;
      return `<button class="verseBtn" type="button" data-ref="${escapeHTML(ref)}" data-text="${escapeHTML(text)}"><span class="vn">${escapeHTML(vn)}</span><span class="vt">${escapeHTML(text)}</span></button>`;
    }).join("");
    els.bibleVerses.querySelectorAll(".verseBtn").forEach(btn => {
      btn.addEventListener("click", () => {
        const ref = btn.getAttribute("data-ref") || "";
        const text = btn.getAttribute("data-text") || "";
        if (!ref || !text) return;
        requireLoginOrGuest(() => startGame({ ref, text }, "pick"));
      });
    });
  } catch (e) {
    console.error(e);
    els.bibleVerses.innerHTML = `<div class="empty">Couldn't load verses.</div>`;
  }
}


async function ensureBibleChapters(bookid) {
  await ensureBibleBooks();
  const book = (bibleState.books || []).find(b => b.bookid === String(bookid));
  if (!book) return [];
  const n = Number(book.chapters || 0);
  return Array.from({ length: n }, (_, i) => i + 1);
}

async function ensureBibleBooks(){
  if (bibleState.books && bibleState.books.length) return bibleState.books;
  const url = `${BOLLS_API}/${BOLLS_TRANSLATION}/`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP ${res.status} loading Bible books`);
  const data = await res.json();
  const items = Array.isArray(data) ? data : (Array.isArray(data?.books) ? data.books : []);
  bibleState.books = items.map((b, idx) => ({
    bookid: String(b.bookid ?? b.id ?? idx + 1),
    name: String(b.name ?? b.book_name ?? b.bookName ?? ""),
    chapters: Number(b.chapters ?? b.chapter_count ?? b.nr_chapters ?? 0),
  })).filter(b => b.name);
  return bibleState.books;
}

async function getBibleChapter(bookid, chapter){
  const url = `${BOLLS_TEXT_API}/${BOLLS_TRANSLATION}/${encodeURIComponent(bookid)}/${encodeURIComponent(chapter)}/`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Bible chapter failed: ${res.status}`);
  const data = await res.json();
  // Expected shape: [{ pk: 1, verse: 1, text: "In the beginning..." }, ...]
  const verses = (Array.isArray(data) ? data : data?.verses || []).map(v => ({
    verse: Number(v.verse ?? v.nr ?? v.verseNum ?? v.pk ?? 0),
    text: stripHtmlTags(v.text ?? v.verseText ?? v.content ?? ""),
  })).filter(v => v.verse && v.text);
  return verses;
}
async function initBiblePicker() {
  try {
    if (!els.bibleBooks || !els.bibleChapters || !els.bibleVerses) return;
    if (!bibleState.books || !bibleState.books.length) {
      els.bibleBooks.innerHTML = `<div class="empty">Loading books…</div>`;
      els.bibleChapters.innerHTML = `<div class="empty">Pick a book.</div>`;
      els.bibleVerses.innerHTML = `<div class="empty">Pick a chapter.</div>`;
      await ensureBibleBooks();
    }
    renderBibleBooks(els.bibleSearch?.value || "");
    if (bibleState.selectedBook) {
      await renderBibleChapters(bibleState.selectedBook);
      if (bibleState.selectedChapter) {
        await renderBibleVerses(bibleState.selectedBook, bibleState.selectedChapter);
      }
    }
  } catch (e) {
    console.error("initBiblePicker failed:", e);
    if (els.bibleBooks) els.bibleBooks.innerHTML = `<div class="empty">Couldn't load Bible books.</div>`;
  }
}

function renderMyVerses() {
  const items = completedCache.slice().sort((a,b) => (b.at||"").localeCompare(a.at||""));
  if (!items.length) {
    els.myList.innerHTML = `<div class="empty">No completed verses yet. Finish a verse and it will show up here.</div>`;
    return;
  }
  els.myList.innerHTML = items.map(v => {
    const d = v.at ? new Date(v.at) : null;
    const ds = d && !isNaN(d) ? d.toLocaleDateString() : "";
    return `
      <button class="itemBtn" type="button" data-key="${escapeHTML(v.key)}">
        <div class="itemRef">${escapeHTML(v.ref)}</div>
        <div class="itemText">${escapeHTML(v.text)}</div>
        <div class="itemDate">${ds ? "Memorized: " + escapeHTML(ds) : ""}</div>
      </button>
    `;
  }).join("");
  els.myList.querySelectorAll(".itemBtn").forEach(btn => {
    btn.addEventListener("click", () => {
      const key = btn.getAttribute("data-key");
      const found = items.find(x => x.key === key);
      if (!found) return;
      requireLoginOrGuest(() => startGame({ ref: found.ref, text: found.text }, "pick"));
    });
  });
}

/* GAME LOGIC (unchanged from v5) */
function initState(verse, mode) {
  const tokens = normalizeTokens(verse.text);
  const wordIdx = tokens.map((t,i) => (isWordToken(t) ? i : -1)).filter(i => i >= 0);

  const seedStr = verse.ref + "|" + verse.text.length;
  let h = 0;
  for (let i = 0; i < seedStr.length; i++) h = (h * 31 + seedStr.charCodeAt(i)) >>> 0;

  const shuffled = wordIdx.slice();
  for (let i = shuffled.length - 1; i > 0; i--) {
    h = (h * 1664525 + 1013904223) >>> 0;
    const j = h % (i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return {
    verse,
    key: getVerseKey(verse),
    mode,
    tokens,
    hiddenIdx: shuffled,
    step: 1,
    revealed: new Set(),
    locked: false,
    hint: null,
    fullAttempt: false,
    snap: null,
  };
}
function currentHiddenSlice() {
  const n = Math.min(state.step, state.hiddenIdx.length);
  return state.hiddenIdx.slice(0, n);
}
function nextExpectedIndex() {
  const slice = currentHiddenSlice();
  const remaining = slice.filter(i => !state.revealed.has(i));
  if (!remaining.length) return null;
  return remaining.reduce((a,b) => a < b ? a : b);
}
function renderVerseWithBlanks() {
  const hideSet = new Set(currentHiddenSlice());
  const focusIdx = nextExpectedIndex();
  const parts = state.tokens.map((t,i) => {
    if (hideSet.has(i) && !state.revealed.has(i)) {
      const cls = i === focusIdx ? "blank focus" : "blank";
      return `<span class="${cls}">____</span>`;
    }
    return escapeHTML(t);
  });
  let s = parts.join(" ");
  s = s
    .replaceAll(" ,", ",")
    .replaceAll(" .", ".")
    .replaceAll(" ;", ";")
    .replaceAll(" :", ":")
    .replaceAll(" !", "!")
    .replaceAll(" ?", "?")
    .replaceAll(" )", ")")
    .replaceAll("( ", "(");
  return s;
}
function buildPills() {
  const slice = currentHiddenSlice();
  const remaining = slice.filter(i => !state.revealed.has(i));
  if (!remaining.length) return null;

  const correctIdx = nextExpectedIndex();
  const correctWord = state.tokens[correctIdx];

  const wordTokens = state.tokens.filter(isWordToken);
  const choices = new Set([correctWord]);
  let guard = 0;
  while (choices.size < Math.min(5, wordTokens.length) && guard < 200) {
    guard++;
    const w = wordTokens[Math.floor(Math.random() * wordTokens.length)];
    choices.add(w);
  }
  const arr = Array.from(choices);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return { correctWord, correctIdx, pills: arr };
}
function celebrateAndGoHome() {
  const overlay = document.createElement("div");
  overlay.className = "celebrateOverlay";
  overlay.innerHTML = `
    <div class="celebrateCard">
      <div class="celebrateSparkle">✨</div>
      <div class="celebrateTitle">Great job!</div>
      <div class="celebrateSub">Verse complete.</div>
    </div>
  `;
  document.body.appendChild(overlay);
  setTimeout(() => {
    overlay.remove();
    if (!auth?.currentUser && !guestAllowed) {
      setActiveNav(els.navProfile);
      showView("profile");
      renderProfile();
    } else {
      setActiveNav(els.navHome);
      showView("home");
    }
    renderStats();
    renderToday();
  }, 1200);
}
function renderGame() {
  if (!state) return;

  els.stepLabel.textContent = `Step ${state.step} of ${state.hiddenIdx.length}`;
  els.verseBox.innerHTML = renderVerseWithBlanks();

  const expected = nextExpectedIndex();
  if (expected === null) {
    if (state.step >= state.hiddenIdx.length) {
      els.pillRow.innerHTML = "";
      els.stepLabel.textContent = "Complete 🎉";
      onVerseComplete().finally(() => celebrateAndGoHome());
      return;
    }
    state.step += 1;
    state.revealed.clear();
    state.hint = null;
    state.fullAttempt = false;
    state.snap = null;
    if (activeKid) {
      activeKid.xp = Math.max(0, Number(activeKid.xp || 0)) + 3;
      renderStats();
      floatXP(3, els.stepLabel);
    }
    renderGame();
    return;
  }

  const built = buildPills();
  if (!built) return;
  const { correctWord, correctIdx, pills } = built;

  els.pillRow.innerHTML = pills.map(w => {
    const hinted = state.hint && w === state.hint;
    return `<button class="pill${hinted ? " hint" : ""}" type="button" data-word="${escapeHTML(w)}">${escapeHTML(w)}</button>`;
  }).join("");

  els.pillRow.querySelectorAll(".pill").forEach(btn => {
    btn.addEventListener("click", () => {
      if (state.locked) return;
      state.locked = true;
      state.hint = null;

      const w = btn.getAttribute("data-word") || "";
      const ok = w === correctWord;
      btn.classList.add(ok ? "good" : "wrong");

      if (ok) {
        state.revealed.add(correctIdx);
        if (activeKid) {
          activeKid.xp = Math.max(0, Number(activeKid.xp || 0)) + 2;
          renderStats();
          floatXP(2, btn);
        }
        setTimeout(() => {
          state.locked = false;
          renderGame();
        }, 430);
      } else {
        setTimeout(() => {
          btn.classList.remove("wrong");
          state.locked = false;
          if (state.fullAttempt && state.snap) {
            state.fullAttempt = false;
            state.step = state.snap.step;
            state.revealed = new Set(state.snap.revealed);
            state.snap = null;
            state.hint = null;
            renderGame();
          }
        }, 650);
      }
    });
  });
}
function hintNext() {
  if (!state) return;
  const idx = nextExpectedIndex();
  if (idx === null) return;
  state.hint = state.tokens[idx];
  renderGame();
}
function startFullAttempt() {
  if (!state) return;
  if (state.fullAttempt) return;
  state.snap = { step: state.step, revealed: Array.from(state.revealed) };
  state.fullAttempt = true;
  state.step = state.hiddenIdx.length;
  state.revealed.clear();
  state.hint = null;
  renderGame();
}
function resetStep() {
  if (!state) return;
  const slice = currentHiddenSlice();
  for (const idx of slice) state.revealed.delete(idx);
  state.hint = null;
  renderGame();
}
function startOver() {
  if (!state) return;
  state.step = 1;
  state.revealed.clear();
  state.hint = null;
  state.fullAttempt = false;
  state.snap = null;
  renderGame();
}
function startGameInternal(verse, mode) {
  state = initState(verse, mode);
  els.gameRef.textContent = verse.ref;
  els.gameMode.textContent = mode === "daily" ? `Today: ${todayISO()}` : "Practice (no streak)";
  setActiveNav(mode === "daily" ? els.navDaily : els.navPick);
  showView("game");
  renderStats();
  renderGame();
}

// Only warn about guest mode when a verse is about to start.
function startGame(verse, mode) {
  requireLoginOrGuest(() => startGameInternal(verse, mode));
}
function freshDailyStart(verse) { startGame(verse, "daily"); }

/* FAMILY DATA */
function activeProfileDocData() {
  if (activeKid && activeKid.id === "parent") {
    return {
      displayName: parentDoc?.displayName || user?.displayName || "Parent",
      xp: activeKid.xp || 0,
      streak: activeKid.streak || 0,
      lastCompleted: activeKid.lastCompleted || null,
      badges: activeKid.badges || {},
    };
  }
  return null;
}

async function loadCompletedForProfile(profileId) {
  if (!fbEnabled || !user) return [];
  const col = profileId === "parent" ? collection(db, "users", user.uid, "completed") : collection(db, "users", user.uid, "kids", profileId, "completed");
  const qy = query(col, orderBy("at", "desc"), limit(500));
  const snap = await getDocs(qy);
  const items = [];
  snap.forEach(docu => { const d = docu.data(); if (d && d.key) items.push(d); });
  return items;
}

function makeParentProfile() {
  return {
    id: "parent",
    name: parentDoc?.displayName || user?.displayName || "Parent",
    xp: Number.isFinite(+(parentDoc?.xp)) ? +(parentDoc?.xp) : 0,
    streak: Number.isFinite(+(parentDoc?.streak)) ? +(parentDoc?.streak) : 0,
    lastCompleted: typeof parentDoc?.lastCompleted === "string" ? parentDoc.lastCompleted : null,
    badges: (parentDoc?.badges && typeof parentDoc.badges === "object") ? parentDoc.badges : {},
  };
}

function emptyKid(name="Child") {
  return { id: "local", name, xp: 0, streak: 0, lastCompleted: null, badges: {} };
}
function computeStreakNext(current, lastCompleted, dateStr) {
  if (lastCompleted === dateStr) return current;
  const d = new Date(dateStr + "T00:00:00");
  const y = new Date(d);
  y.setDate(y.getDate() - 1);
  const yStr = `${y.getFullYear()}-${String(y.getMonth()+1).padStart(2,"0")}-${String(y.getDate()).padStart(2,"0")}`;
  return lastCompleted === yStr ? current + 1 : 1;
}
function awardBadgesForKid(kid) {
  const badges = kid.badges || {};
  if (completedCache.length >= 1) badges.first = true;
  if ((kid.streak || 0) >= 3) badges.streak3 = true;
  if ((kid.streak || 0) >= 7) badges.streak7 = true;
  if (completedCache.length >= 10) badges.verses10 = true;
  kid.badges = badges;
}

function renderKidsRow() {
  if (!els.kidsRow) return;
  if (!user) {
    els.kidsRow.innerHTML = `<div class="empty">Sign in to create child profiles.</div>`;
    els.activeKidName.textContent = "—";
    els.activeKidMeta.textContent = "—";
    updateNavProfileLabel();
    return;
  }

  const activeId = activeKid?.id || "parent";

  // NOTE: Use a wrapper element per chip so the delete button isn't nested inside another <button>
  const parentLabel = escapeHTML(parentDoc?.displayName || "Parent");
  const parentChip = `
    <div class="kidChip" title="Use parent profile">
      <button class="kidBtn ${activeId==="parent" ? "isActive" : ""}" type="button" data-kid="parent">
        <div class="avatar" aria-hidden="true">
          <svg viewBox="0 0 48 48" width="20" height="20">
            <circle cx="24" cy="18" r="9" fill="rgba(13,19,33,.35)"/>
            <path d="M10 44c1-9 9-14 14-14s13 5 14 14" fill="rgba(13,19,33,.35)"/>
          </svg>
        </div>
        <div class="kidName">${parentLabel}</div>
        <div class="kidTag">Parent</div>
      </button>
    </div>
  `;

  const kidsHtml = kids.map(k => {
    const kidName = escapeHTML(k.name);
    const kidId = escapeHTML(k.id);
    const isActive = (k.id === activeId);
    return `
      <div class="kidChip" title="Switch to ${kidName}">
        <button class="kidBtn ${isActive ? "isActive" : ""}" type="button" data-kid="${kidId}">
          <div class="avatar" aria-hidden="true">
            <svg viewBox="0 0 48 48" width="20" height="20">
              <circle cx="24" cy="18" r="9" fill="rgba(13,19,33,.35)"/>
              <path d="M10 44c1-9 9-14 14-14s13 5 14 14" fill="rgba(13,19,33,.35)"/>
            </svg>
          </div>
          <div class="kidName">${kidName}</div>
        </button>
        <button class="kidDel" type="button" data-del="${kidId}" aria-label="Delete ${kidName}" title="Delete">×</button>
      </div>
    `;
  }).join("");

  els.kidsRow.innerHTML = parentChip + kidsHtml;

  // Active panel text
  if (activeId === "parent") {
    els.activeKidName.textContent = parentDoc?.displayName || "Parent";
    els.activeKidMeta.textContent = "Parent profile";
  } else if (activeKid) {
    els.activeKidName.textContent = activeKid.name;
    els.activeKidMeta.textContent = `Streak: ${activeKid.streak || 0} • XP: ${activeKid.xp || 0}`;
  } else {
    els.activeKidName.textContent = "—";
    els.activeKidMeta.textContent = "Select a profile.";
  }

  // Clicks
  els.kidsRow.querySelectorAll(".kidBtn").forEach(btn => {
    btn.addEventListener("click", async (e) => {
      const id = btn.getAttribute("data-kid");
      if (id === "parent") {
        activeKid = null;
        localStorage.setItem(LS_ACTIVE_KID, "parent");
        renderKidsRow();
        renderBadges();
        renderHomeStats();
        updateNavProfileLabel();
        return;
      }
      await setActiveKidById(id);
    });
  });

  els.kidsRow.querySelectorAll(".kidDel").forEach(btn => {
    btn.addEventListener("click", async (e) => {
      e.stopPropagation();
      const id = btn.getAttribute("data-del");
      if (!id) return;
      const k = kids.find(x => x.id === id);
      const ok = confirm(`Delete profile “${k?.name || "child"}”? This cannot be undone.`);
      if (!ok) return;
      await deleteKidProfile(id);
    });
  });

  updateNavProfileLabel();
}

function isFirebaseConfigured() {
  return firebaseConfig && firebaseConfig.apiKey && firebaseConfig.projectId;
}

async function initFirebase() {
  if (!isFirebaseConfigured()) {
    els.firebaseStatus.textContent = "Firebase not configured yet. App is in local mode.";
    fbEnabled = false;
    activeKid = emptyKid("Local player");
    kids = [activeKid];
    completedCache = [];
    renderProfile();
    renderKidsRow();
    renderStats();
    return;
  }
  fbApp = initializeApp(firebaseConfig);
  auth = getAuth(fbApp);
  db = getFirestore(fbApp);
  fbEnabled = true;
  els.firebaseStatus.textContent = "Firebase configured ✅";

  onAuthStateChanged(auth, async (u) => {
    try {
      user = u;
      if (user) {
        await loadParentAndKids();
        renderProfile();
        renderKidsRow();
        renderStats();
      } else {
        parentDoc = null;
        kids = [];
        activeKid = null;
        completedCache = [];
        renderProfile();
        renderKidsRow();
        renderStats();
      }
    } catch (err) {
      console.error("Auth state sync failed:", err);
      const msg = friendlyAuthError(err) || safeErrorMessage(err);
      showAlert("Sync error", msg);
    }
  });
}

async function ensureParentDoc() {
  const ref = doc(db, "users", user.uid);
  const snap = await getDoc(ref);
  const name = user.displayName || "Parent";
  if (!snap.exists()) {
    await setDoc(ref, {
      displayName: name,
      xp: 0,
      streak: 0,
      lastCompleted: null,
      badges: {},
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }, { merge: true });
    parentDoc = { displayName: name, xp: 0, streak: 0, lastCompleted: null, badges: {} };
  } else {
    const d = snap.data() || {};
    parentDoc = {
      displayName: d.displayName || name,
      xp: Number.isFinite(+d.xp) ? +d.xp : 0,
      streak: Number.isFinite(+d.streak) ? +d.streak : 0,
      lastCompleted: typeof d.lastCompleted === "string" ? d.lastCompleted : null,
      badges: (d.badges && typeof d.badges === "object") ? d.badges : {},
    };
  }
}

async function listKids() {
  const col = collection(db, "users", user.uid, "kids");
  const qy = query(col, orderBy("createdAt", "asc"), limit(50));
  const snap = await getDocs(qy);
  const items = [];
  snap.forEach(docu => {
    const d = docu.data() || {};
    if (d.deleted) return;
    items.push({
      id: docu.id,
      name: d.name || "Child",
      xp: Number.isFinite(+d.xp) ? +d.xp : 0,
      streak: Number.isFinite(+d.streak) ? +d.streak : 0,
      lastCompleted: typeof d.lastCompleted === "string" ? d.lastCompleted : null,
      badges: (d.badges && typeof d.badges === "object") ? d.badges : {}
    });
  });
  return items;
}

async function createKid(name) {
  const id = kidIdFromName(name);
  const ref = doc(db, "users", user.uid, "kids", id);
  await setDoc(ref, {
    name,
    xp: 0,
    streak: 0,
    lastCompleted: null,
    badges: {},
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }, { merge: true });
  return id;
}

async function loadCompletedForKid(kidId) {
  const col = collection(db, "users", user.uid, "kids", kidId, "completed");
  const qy = query(col, orderBy("at", "desc"), limit(500));
  const snap = await getDocs(qy);
  const items = [];
  snap.forEach(docu => {
    const d = docu.data();
    if (d && d.key) items.push(d);
  });
  return items;
}

async function setActiveKidById(kidId) {
  if (!kidId) return;
  if (kidId === "parent") {
    activeKid = makeParentProfile();
    setActiveProfileId("parent");
    completedCache = await loadCompletedForProfile("parent");
    awardBadgesForKid(activeKid);
    renderProfile();
    renderKidsRow();
    renderStats();
    return;
  }
  const found = kids.find(k => k.id === kidId);
  if (!found) return;
  activeKid = { ...found };
  setActiveProfileId(kidId);
  completedCache = await loadCompletedForProfile(kidId);
  awardBadgesForKid(activeKid);
  renderProfile();
  renderKidsRow();
  renderStats();
}

async function deleteKidProfile(kidId) {
  if (!user) return;
  const ref = doc(db, "users", user.uid, "kids", kidId);
  // Soft-delete: mark deleted to avoid orphaned progress; then filter it out.
  await updateDoc(ref, { deleted: true, deletedAt: Date.now() }).catch(async () => {
    // If update fails (doc missing), just ignore.
  });

  kids = kids.filter(k => k.id !== kidId);

  // If we deleted the active kid, fall back to parent (or first remaining kid)
  if (activeKid?.id === kidId) {
    activeKid = null;
    localStorage.setItem(LS_ACTIVE_KID, "parent");
  }

  renderKidsRow();
  renderBadges();
  renderHomeStats();
  updateNavProfileLabel();
}

async function loadParentAndKids() {
  await ensureParentDoc();
  kids = await listKids();

  const saved = getActiveProfileId();
  if (!saved || saved === "parent") {
    activeKid = makeParentProfile();
    setActiveProfileId("parent");
    completedCache = await loadCompletedForProfile("parent");
    awardBadgesForKid(activeKid);
    return;
  }

  const found = kids.find(k => k.id === saved);
  if (found) {
    await setActiveKidById(saved);
  } else {
    activeKid = makeParentProfile();
    setActiveProfileId("parent");
    completedCache = await loadCompletedForProfile("parent");
    awardBadgesForKid(activeKid);
  }
}

async function saveActiveKidDoc() {
  if (!fbEnabled || !user || !activeKid || !activeKid.id) return;

  if (activeKid.id === "parent") {
    const payload = activeProfileDocData() || {
      displayName: parentDoc?.displayName || user?.displayName || "Parent",
      xp: 0, streak: 0, lastCompleted: null, badges: {}
    };
    await setDoc(doc(db, "users", user.uid), {
      ...payload,
      updatedAt: serverTimestamp(),
    }, { merge: true });
    parentDoc = { ...parentDoc, ...payload };
    return;
  }

  await setDoc(doc(db, "users", user.uid, "kids", activeKid.id), {
    name: activeKid.name,
    xp: activeKid.xp,
    streak: activeKid.streak,
    lastCompleted: activeKid.lastCompleted,
    badges: activeKid.badges || {},
    updatedAt: serverTimestamp(),
  }, { merge: true });

  kids = kids.map(k => k.id === activeKid.id ? { ...activeKid } : k);
}

async function saveCompletedToCloud(verse, atISO) {
  if (!fbEnabled || !user || !activeKid?.id) return;
  const id = hashId(getVerseKey(verse));
  const ref = activeKid.id === "parent"
    ? doc(db, "users", user.uid, "completed", id)
    : doc(db, "users", user.uid, "kids", activeKid.id, "completed", id);

  await setDoc(ref, {
    key: getVerseKey(verse),
    ref: verse.ref,
    text: verse.text,
    at: atISO,
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

async function onVerseComplete() {
  if (!state) return;
  const key = getVerseKey(state.verse);
  const atISO = new Date().toISOString();
  if (!completedCache.some(x => x.key === key)) {
    completedCache.push({ key, ref: state.verse.ref, text: state.verse.text, at: atISO });
  }

  if (!activeKid) activeKid = emptyKid("Child");

  let bonusXP = 0;
  if (state.mode === "daily") {
    const today = todayISO();
    const already = activeKid.lastCompleted === today;
    activeKid.streak = computeStreakNext(activeKid.streak || 0, activeKid.lastCompleted, today);
    activeKid.lastCompleted = today;
    bonusXP = already ? 10 : 50;
  } else {
    bonusXP = 20;
  }

  activeKid.xp = (activeKid.xp || 0) + bonusXP;
  awardBadgesForKid(activeKid);
  renderStats();
  floatXP(bonusXP, els.gameRef);

  await saveCompletedToCloud(state.verse, atISO);
  await saveActiveKidDoc();
}

function renderProfile() {
  if (!user) {
    els.profileName.textContent = "Not signed in";
    els.profileMeta.textContent = "Sign in to sync progress across devices.";
    els.btnSignOut.disabled = true;
    els.authCard.style.display = "";
    return;
  }
  els.profileName.textContent = parentDoc?.displayName || user.displayName || user.email || "Parent";
  els.profileMeta.textContent = user.email ? `Email: ${user.email}` : `UID: ${user.uid.slice(0,8)}…`;
  els.btnSignOut.disabled = false;
  els.authCard.style.display = "none";
}

async function doSignIn() {
  if (!fbEnabled) {
    showAlert("Firebase not configured", "Firebase Auth isn't enabled in this build yet. Please paste your config into js/firebase-config.js and redeploy.");
    return;
  }
  if (!auth) {
    showAlert("Sign in failed", "Auth didn't initialize. Please refresh the page and check the console for Firebase import errors.");
    return;
  }

  const email = (els.authEmail?.value || "").trim();
  const pass = (els.authPass?.value || "").trim();

  if (!email || !pass) {
    showAlert("Missing info", "Please enter your email and password.");
    return;
  }

  const btn = els.btnSignIn;
  const oldLabel = btn ? btn.textContent : "Sign in";
  if (btn) {
    btn.disabled = true;
    btn.textContent = "Signing in…";
  }

  try {
    const cred = await signInWithEmailAndPassword(auth, email, pass);

    // Make the signed-in user immediately available to the rest of the app.
    user = cred.user;

    // Default to the parent profile right after sign-in.
    setActiveProfileId("parent");

    // Pull parent/kid data now, and surface any failures visibly.
    await loadParentAndKids();

    renderProfile();
    renderKidsRow();
    renderStats();
    setActiveNav(els.navProfile);
    showView("profile");
  } catch (err) {
    console.error("Sign in failed:", err);
    const msg = friendlyAuthError(err) || safeErrorMessage(err);
    showAlert("Sign in failed", msg);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = oldLabel || "Sign in";
    }
  }
}


function safeErrorMessage(err) {
  if (!err) return "An unknown error occurred.";
  if (typeof err === "string") return err;
  if (err.message) return String(err.message);
  if (err.code) return String(err.code);
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}

function friendlyAuthError(e) {
  const code = (e && (e.code || e.errorCode)) ? String(e.code || e.errorCode) : "";
  // Firebase codes are like: auth/wrong-password
  switch (code) {
    case "auth/invalid-email":
      return "That email address doesn't look valid.";
    case "auth/user-not-found":
      return "No account found for that email. Use ‘Create parent account’ below.";
    case "auth/wrong-password":
      return "Incorrect password. Try again or use ‘Forgot password’.";
    case "auth/invalid-credential":
      return "Email or password is incorrect. Try again or use ‘Forgot password’.";
    case "auth/too-many-requests":
      return "Too many attempts. Wait a bit, then try again.";
    case "auth/network-request-failed":
      return "Network error. Check your connection and try again. If you're on GitHub Pages, also make sure your domain is added in Firebase → Authentication → Settings → Authorized domains (e.g., stevenabi6912-prog.github.io).";
    case "auth/email-already-in-use":
      return "That email is already registered. Use ‘Sign in’ instead.";
    case "auth/weak-password":
      return "Password is too weak. Use at least 6 characters.";
    case "auth/operation-not-allowed":
      return "Email/password sign-in is not enabled in Firebase yet.";
    case "auth/invalid-api-key":
      return "Firebase API key is invalid. Double-check js/firebase-config.js (apiKey) and any API key restrictions in Google Cloud.";
    case "auth/app-not-authorized":
      return "This site isn't authorized for Firebase Auth. Add your domain in Firebase → Authentication → Settings → Authorized domains.";
    default:
      return (e && e.message) ? String(e.message) : "Sign-in failed. Please try again.";
  }
}

async function doForgotPassword() {
  if (!fbEnabled) return;
  els.authMsg.textContent = "";
  const email = (els.authEmail.value || "").trim() || (els.authEmail2.value || "").trim();
  if (!email) {
    els.authMsg.textContent = "Enter your email above, then click ‘Forgot password’.";
    showAlert("Forgot password", "Enter your email in the Sign in box first, then click Forgot password.");
    return;
  }
  try {
    await sendPasswordResetEmail(auth, email);
    els.authMsg.textContent = "Password reset email sent. Check your inbox (and spam).";
    showAlert(
      "Password reset email sent",
      "Check your inbox (and spam/junk). If you don't see it in a few minutes, try again and make sure the email is correct."
    );
  } catch (e) {
    const msg = friendlyAuthError(e);
    els.authMsg.textContent = msg;
    showAlert("Password reset failed", msg);
  }
}

async function doSignUp() {
  if (!fbEnabled) return;
  els.authMsg.textContent = "";
  const name = (els.authName.value || "").trim() || "Parent";
  const email = (els.authEmail2.value || "").trim();
  const pass = (els.authPass2.value || "").trim();
  if (!email || !pass) {
    els.authMsg.textContent = "Please enter email + password.";
    showAlert("Missing info", "Please enter an email and password to create the parent account.");
    return;
  }
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, pass);
    await updateProfile(cred.user, { displayName: name });
    // Parent doc + a first kid
    user = cred.user;
    parentDoc = { displayName: name };
    await setDoc(doc(db, "users", user.uid), {
      displayName: name,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }, { merge: true });
    const firstKid = await createKid("Kid 1");
    kids = await listKids();
    await setActiveKidById(firstKid);
    els.authMsg.textContent = "";
  } catch (e) {
    const msg = friendlyAuthError(e);
    els.authMsg.textContent = msg;
    showAlert("Create account failed", msg);
  }
}

async function doSignOut() {
  if (!fbEnabled || !auth) return;
  await signOut(auth);
}

async function doAddKid() {
  if (!fbEnabled || !user) return;
  const name = (els.kidName.value || "").trim();
  if (!name) return;
  els.kidName.value = "";
  const id = await createKid(name);
  kids = await listKids();
  await setActiveKidById(id);
  renderKidsRow();
  renderStats();
}

function wire() {
  els.navHome.addEventListener("click", () => {
    setActiveNav(els.navHome);
    showView("home");
    renderStats();
    renderToday();
  });
  els.navDaily.addEventListener("click", () => {
    if (todayVerse) freshDailyStart(todayVerse);
  });
  els.navPick.addEventListener("click", () => {
    setActiveNav(els.navPick);
    showView("pick");
    // Pick screen is Bible-only now
    initBiblePicker();
    // focus the search for quick typing
    els.bibleSearch?.focus();
  });

  els.navVerses.addEventListener("click", () => {
    setActiveNav(els.navVerses);
    showView("verses");
    renderMyVerses();
  });
  els.navProfile.addEventListener("click", () => {
    setActiveNav(els.navProfile);
    showView("profile");
    renderProfile();
    renderKidsRow();
    renderStats();
  })
  // Guest warning modal (when not signed in)
  els.guestGoProfile?.addEventListener("click", () => {
    hideGuestModal();
    setActiveNav(els.navProfile);
    showView("profile");
    renderProfile();
    renderKidsRow();
    renderStats();
  });
  els.guestContinue?.addEventListener("click", () => {
    guestAllowed = true;
    const fn = pendingGuestAction;
    pendingGuestAction = null;
    hideGuestModal();
    if (typeof fn === "function") fn();
  });
  els.guestModal?.addEventListener("click", (e) => {
    if (e.target === els.guestModal) hideGuestModal();
  });

  els.homeDaily.addEventListener("click", () => {
    requireLoginOrGuest(() => {
      setActiveNav(els.navDaily);
      if (todayVerse) freshDailyStart(todayVerse);
    });
  });
  els.homePick.addEventListener("click", () => {
    setActiveNav(els.navPick);
    showView("pick");
    initBiblePicker();
    els.bibleSearch?.focus();
  });

  els.bibleSearch.addEventListener("input", () => {
    const q = (els.bibleSearch.value || "").trim();
    // If user types something that looks like a reference, we still keep browsing experience.
    // Books list filters live as you type.
    bibleRenderBooks(q);
  });

  els.bibleSearch.addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;
    const q = (els.bibleSearch.value || "").trim();
    if (!q) return;
    bibleTryDirectReference(q);
  });

  els.btnHint.addEventListener("click", hintNext);
  els.btnFullAttempt.addEventListener("click", startFullAttempt);
  els.btnResetStep.addEventListener("click", resetStep);
  els.btnStartOver.addEventListener("click", startOver);

  els.btnSignIn.addEventListener("click", doSignIn);
  if (els.btnForgotPassword) els.btnForgotPassword.addEventListener("click", doForgotPassword);

  // Allow Enter to sign in from the email/password fields (Safari-friendly).
  const signInOnEnter = (e) => { if (e.key === "Enter") { e.preventDefault(); doSignIn(); } };
  if (els.authEmail) els.authEmail.addEventListener("keydown", signInOnEnter);
  if (els.authPass) els.authPass.addEventListener("keydown", signInOnEnter);
  els.btnSignUp.addEventListener("click", doSignUp);
  els.btnSignOut.addEventListener("click", doSignOut);
  els.authEmail?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") doSignIn();
  });
  els.authPass?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") doSignIn();
  });
  els.btnAddKid.addEventListener("click", doAddKid);
}

async function boot() {
  try {
    await loadVerses();
    todayVerse = pickDaily(todayISO());
    renderToday();
  } catch (e) {
    els.todayRef.textContent = "Could not load verses";
    els.todayText.textContent = e?.message || String(e);
  }

  await initFirebase();

  // Start on Profile (login) unless the user is already signed in.
  // (Guest choice is made when starting a verse, not at page-load.)
  if (!auth?.currentUser) {
    setActiveNav(els.navProfile);
    showView("profile");
    renderProfile();
  } else {
    setActiveNav(els.navHome);
    showView("home");
  }
  renderKidsRow();
  renderStats();
}

wire();
boot();