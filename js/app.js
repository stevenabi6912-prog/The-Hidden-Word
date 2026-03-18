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
  navBadges: document.getElementById("navBadges"),
  navProfile: document.getElementById("navProfile"),

  viewHome: document.getElementById("viewHome"),
  viewPick: document.getElementById("viewPick"),
  viewVerses: document.getElementById("viewVerses"),
  viewBadges: document.getElementById("viewBadges"),
  viewGame: document.getElementById("viewGame"),
  viewProfile: document.getElementById("viewProfile"),
  badgesPageGrid: document.getElementById("badgesPageGrid"),

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
  todayCard: document.getElementById("todayCard"),
  todayRef: document.getElementById("todayRef"),
  todayText: document.getElementById("todayText"),
  todayDoneBadge: document.getElementById("todayDoneBadge"),

  pickBiblePane: document.getElementById("pickBiblePane"),
  bibleSearch: document.getElementById("bibleSearch"),
  bibleBooks: document.getElementById("bibleBooks"),
  bibleChapters: document.getElementById("bibleChapters"),
  bibleVerses: document.getElementById("bibleVerses"),
  bibleHelp: document.getElementById("bibleHelp"),
  btnMemorizeAll: document.getElementById("btnMemorizeAll"),
  myList: document.getElementById("myList"),
  sortByDate: document.getElementById("sortByDate"),
  sortByRef: document.getElementById("sortByRef"),

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
  tapControls: document.getElementById("tapControls"),
  wordRow: document.getElementById("wordRow"),
  btnSpeakToggle: document.getElementById("btnSpeakToggle"),
  btnShowVerse: document.getElementById("btnShowVerse"),
  verseModal: document.getElementById("verseModal"),
  verseModalRef: document.getElementById("verseModalRef"),
  verseModalText: document.getElementById("verseModalText"),
  verseModalReady: document.getElementById("verseModalReady"),
  speakPanel: document.getElementById("speakPanel"),
  speakStatus: document.getElementById("speakStatus"),
  speakMicBtn: document.getElementById("speakMicBtn"),
  speakResult: document.getElementById("speakResult"),
  speakBtns: document.getElementById("speakBtns"),
  speakAccept: document.getElementById("speakAccept"),
  speakRetry: document.getElementById("speakRetry"),
  btnSpeakExit: document.getElementById("btnSpeakExit"),

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

  authLoginSection: document.getElementById("authLoginSection"),
  authCreateSection: document.getElementById("authCreateSection"),
  authSectionDivider: document.getElementById("authSectionDivider"),
  btnSwitchToSignUp: document.getElementById("btnSwitchToSignUp"),
  btnSwitchToSignIn: document.getElementById("btnSwitchToSignIn"),

  welcomeModal: document.getElementById("welcomeModal"),
  welcomeLogin: document.getElementById("welcomeLogin"),
  welcomeSignup: document.getElementById("welcomeSignup"),
  welcomeGuest: document.getElementById("welcomeGuest"),

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
let verseQueue = [];       // multi-verse playlist
let verseQueueIdx = 0;     // current position in queue
let _queueContinuation = false; // true only when celebrateAndGoHome advances the queue
let myVersesSortOrder = "date"; // "date" | "ref"

let state = null;          // game runtime state

// Speech mode
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition || null;
let speechMode = false;
let recognition = null;
let speechListening = false;
let accumulatedTranscript = "";

const BOLLS_API = "https://bolls.life/get-books";
const BOLLS_TEXT_API = "https://bolls.life/get-text";
const BOLLS_TRANSLATION = "KJV";
const bibleState = { books: null, selectedBook: null, selectedChapter: null };

const BADGES = [
  // Verse count
  { id: "first",     icon: "🌱", label: "First Steps",        desc: "Complete your first verse" },
  { id: "verses5",   icon: "📖", label: "Diligent Reader",    desc: "Complete 5 verses" },
  { id: "verses10",  icon: "📚", label: "Scripture Student",  desc: "Complete 10 verses" },
  { id: "verses25",  icon: "✨", label: "Silver Tongue",      desc: "Complete 25 verses" },
  { id: "verses50",  icon: "🕊️", label: "Faithful Keeper",   desc: "Complete 50 verses" },
  { id: "verses100", icon: "🏆", label: "Word Warrior",       desc: "Complete 100 verses" },
  { id: "verses200", icon: "👑", label: "Scripture Master",   desc: "Complete 200 verses" },
  { id: "verses365", icon: "🎖️", label: "Year in the Word",  desc: "Complete 365 verses" },
  // Streaks
  { id: "streak3",   icon: "🔥", label: "On Fire",            desc: "Reach a 3‑day streak" },
  { id: "streak7",   icon: "💪", label: "Weekly Devotion",    desc: "Reach a 7‑day streak" },
  { id: "streak14",  icon: "⚡", label: "Fortnight Faithful", desc: "Reach a 14‑day streak" },
  { id: "streak30",  icon: "🌟", label: "Monthly Disciple",   desc: "Reach a 30‑day streak" },
  { id: "streak60",  icon: "💎", label: "Diamond Dedication", desc: "Reach a 60‑day streak" },
  { id: "streak100", icon: "🏅", label: "Century of Grace",   desc: "Reach a 100‑day streak" },
  // Chapter mastery
  { id: "chapter1",  icon: "📜", label: "Chapter Master",     desc: "Memorize a complete chapter" },
  // Books & testament
  { id: "ot",        icon: "📜", label: "Ancient Paths",      desc: "Complete an Old Testament verse" },
  { id: "nt",        icon: "✝️", label: "New Covenant",       desc: "Complete a New Testament verse" },
  { id: "psalms",    icon: "🎵", label: "Song of David",      desc: "Complete a verse from Psalms" },
  { id: "proverbs",  icon: "💡", label: "Wisdom Seeker",      desc: "Complete a verse from Proverbs" },
  { id: "gospels",   icon: "🕊️", label: "Gospel Bearer",     desc: "Complete a verse from all four Gospels" },
  { id: "bookworm",  icon: "📕", label: "Many Books",         desc: "Complete verses from 10 different books" },
];

const NT_BOOKS = new Set(["Matthew","Mark","Luke","John","Acts","Romans",
  "1 Corinthians","2 Corinthians","Galatians","Ephesians","Philippians",
  "Colossians","1 Thessalonians","2 Thessalonians","1 Timothy","2 Timothy",
  "Titus","Philemon","Hebrews","James","1 Peter","2 Peter",
  "1 John","2 John","3 John","Jude","Revelation"
]);

// Canonical Bible book order (Genesis = 0 … Revelation = 65)
const BIBLE_ORDER = new Map([
  "Genesis","Exodus","Leviticus","Numbers","Deuteronomy",
  "Joshua","Judges","Ruth","1 Samuel","2 Samuel",
  "1 Kings","2 Kings","1 Chronicles","2 Chronicles","Ezra",
  "Nehemiah","Esther","Job","Psalms","Proverbs",
  "Ecclesiastes","Song of Solomon","Isaiah","Jeremiah","Lamentations",
  "Ezekiel","Daniel","Hosea","Joel","Amos",
  "Obadiah","Jonah","Micah","Nahum","Habakkuk",
  "Zephaniah","Haggai","Zechariah","Malachi",
  "Matthew","Mark","Luke","John","Acts",
  "Romans","1 Corinthians","2 Corinthians","Galatians","Ephesians",
  "Philippians","Colossians","1 Thessalonians","2 Thessalonians","1 Timothy",
  "2 Timothy","Titus","Philemon","Hebrews","James",
  "1 Peter","2 Peter","1 John","2 John","3 John",
  "Jude","Revelation",
].map((name, i) => [name, i]));
// Common aliases
BIBLE_ORDER.set("Psalm", BIBLE_ORDER.get("Psalms"));
BIBLE_ORDER.set("Song of Songs", BIBLE_ORDER.get("Song of Solomon"));

function parseVerseRef(ref) {
  const m = (ref || "").match(/^(.+?)\s+(\d+):(\d+)/);
  if (!m) return { order: 999, ch: 0, v: 0 };
  return {
    order: BIBLE_ORDER.get(m[1].trim()) ?? 999,
    ch: Number(m[2]),
    v: Number(m[3]),
  };
}


  // Active profile helpers (parent or child id). Stored in LS_ACTIVE_KID.
  function getActiveProfileId() {
    return localStorage.getItem(LS_ACTIVE_KID) || "parent";
  }

  function setActiveProfileId(id) {
    localStorage.setItem(LS_ACTIVE_KID, id || "parent");
  }

const LS_ACTIVE_KID = "thw_activeKidId";

function stripHtmlTags(s){
  return (s||"").toString()
    .replace(/<sup[^>]*>.*?<\/sup>/gi, "") // remove translator's notes
    .replace(/<S>\d+<\/S>/gi, "")          // remove Strong's number tags e.g. <S>3069</S>
    .replace(/<[^>]*>/g, "")               // remove any remaining HTML tags
    .replace(/\d+/g, "")                   // strip any leftover digits
    .replace(/\s+/g, " ")
    .trim();
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
  for (const b of [els.navHome, els.navDaily, els.navPick, els.navVerses, els.navBadges, els.navProfile]) {
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

// Welcome modal (shown on first load when not signed in)
function showWelcomeModal() {
  if (!els.welcomeModal) return;
  els.welcomeModal.hidden = false;
  els.welcomeModal.style.display = "flex";
}
function hideWelcomeModal() {
  if (!els.welcomeModal) return;
  els.welcomeModal.hidden = true;
  els.welcomeModal.style.display = "none";
}

// Show only one section of the authCard at a time
function showAuthSection(section) {
  const showLogin = section === "login";
  if (els.authLoginSection) els.authLoginSection.hidden = !showLogin;
  if (els.authCreateSection) els.authCreateSection.hidden = showLogin;
  if (els.authSectionDivider) els.authSectionDivider.hidden = false;
}

function goToLogin() {
  hideWelcomeModal();
  showAuthSection("login");
  setActiveNav(els.navProfile);
  showView("profile");
  renderProfile();
  renderKidsRow();
  renderStats();
  setTimeout(() => els.authEmail?.focus(), 80);
}

function goToSignup() {
  hideWelcomeModal();
  showAuthSection("create");
  setActiveNav(els.navProfile);
  showView("profile");
  els.viewProfile.classList.add("signupOnly");
  renderProfile();
  renderKidsRow();
  renderStats();
  setTimeout(() => els.authName?.focus(), 80);
}

function goAsGuest() {
  hideWelcomeModal();
  guestAllowed = true;
  setActiveNav(els.navHome);
  showView("home");
  renderStats();
}
function showView(name) {
  els.viewHome.hidden = name !== "home";
  els.viewPick.hidden = name !== "pick";
  els.viewVerses.hidden = name !== "verses";
  els.viewBadges.hidden = name !== "badges";
  els.viewGame.hidden = name !== "game";
  els.viewProfile.hidden = name !== "profile";
}

async function loadVerses() {
  const url = new URL("verses.json", window.location.href);
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

  const todayKey = getVerseKey(todayVerse);
  const done = completedCache.some(x => x.key === todayKey);
  if (els.todayDoneBadge) els.todayDoneBadge.hidden = !done;
  if (els.todayCard) els.todayCard.classList.toggle("todayCard--done", done);
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
  if (!amount) return;
  const el = document.createElement("div");
  el.className = "floatingXp";
  if (amount < 0) el.classList.add("floatingXp--neg");
  el.textContent = amount > 0 ? `+${amount} XP` : `${amount} XP`;
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

function renderBadgesPage() {
  if (!els.badgesPageGrid) return;
  const owned = activeKid?.badges || {};
  els.badgesPageGrid.innerHTML = BADGES.map(b => {
    const earned = !!owned[b.id];
    return `
      <div class="badgeCard ${earned ? "" : "badgeCard--locked"}" title="${escapeHTML(b.desc)}">
        <div class="badgeCardIcon">${escapeHTML(b.icon)}</div>
        <div class="badgeCardLabel">${escapeHTML(b.label)}</div>
        <div class="badgeCardDesc">${escapeHTML(b.desc)}</div>
        ${earned ? "" : '<div class="badgeLock">🔒</div>'}
      </div>`;
  }).join("");
}

function effectiveStreak(kid) {
  if (!kid || !kid.streak || !kid.lastCompleted) return 0;
  const today = todayISO();
  const d = new Date(today + "T00:00:00");
  d.setDate(d.getDate() - 1);
  const yesterday = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  return (kid.lastCompleted === today || kid.lastCompleted === yesterday) ? kid.streak : 0;
}

function renderStats() {
  const streak = effectiveStreak(activeKid);
  const xp = activeKid?.xp ?? 0;
  const streakLabel = streak === 1 ? "1 day" : `${streak} days`;
  els.streakHome.textContent = streakLabel;
  els.streakGame.textContent = streakLabel;
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
    const isNT = NT_BOOKS.has(b.name);
    return `<button class="bibleBookBtn ${active ? "active" : ""}" type="button" data-book="${escapeHTML(b.bookid)}">
      <span class="bookBtnBadge ${isNT ? "nt" : "ot"}">${isNT ? "NT" : "OT"}</span>
      <span class="bookBtnName">${escapeHTML(b.name)}</span>
      ${active ? `<span class="bookBtnChev">›</span>` : ""}
    </button>`;
  }).join("");
  els.bibleBooks.querySelectorAll(".bibleBookBtn").forEach(btn => {
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
      return `<button class="bibleChBtn ${active ? "active" : ""}" type="button" data-ch="${ch}">${ch}</button>`;
    }).join("");
    els.bibleChapters.querySelectorAll(".bibleChBtn").forEach(btn => {
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
  if (els.btnMemorizeAll) els.btnMemorizeAll.hidden = true;
  try {
    const verses = await getBibleChapter(bookid, chapterNr);
    const bookName = (bibleState.books || []).find(b => b.bookid === String(bookid))?.name || `Book ${bookid}`;
    if (!verses.length) {
      els.bibleVerses.innerHTML = `<div class="empty">No verses found.</div>`;
      return;
    }
    const doneRefs = new Set(completedCache.map(x => x.ref));
    // Build verse objects for queue use
    const verseObjects = verses.map(v => {
      const vn = (v.verse ?? v.nr ?? v.v ?? "").toString();
      const text = (v.text ?? v.verseText ?? v.t ?? "").toString();
      const ref = `${bookName} ${chapterNr}:${vn}`;
      return { ref, text };
    }).filter(v => v.ref && v.text);
    bibleState.loadedVerses = verseObjects;

    els.bibleVerses.innerHTML = verseObjects.map(v => {
      const vn = v.ref.split(":")[1] || "";
      const done = doneRefs.has(v.ref);
      return `<button class="verseBtn${done ? " verseBtn--done" : ""}" type="button" data-ref="${escapeHTML(v.ref)}" data-text="${escapeHTML(v.text)}">
        ${done ? `<span class="verseDoneCheck" title="Memorized">✓</span>` : ""}
        <span class="vn">${escapeHTML(vn)}</span>
        <span class="vt">${escapeHTML(v.text)}</span>
      </button>`;
    }).join("");

    els.bibleVerses.querySelectorAll(".verseBtn").forEach(btn => {
      btn.addEventListener("click", () => {
        const ref = btn.getAttribute("data-ref") || "";
        const text = btn.getAttribute("data-text") || "";
        if (!ref || !text) return;
        requireLoginOrGuest(() => startGame({ ref, text }, "pick"));
      });
    });

    // Show "Memorize All" button
    if (els.btnMemorizeAll && verseObjects.length > 1) {
      els.btnMemorizeAll.textContent = `📖 Memorize All (${verseObjects.length})`;
      els.btnMemorizeAll.hidden = false;
    }
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
  const res = await fetch(url, { cache: "default" });
  const data = await res.json();
  const items = Array.isArray(data) ? data : (Array.isArray(data?.books) ? data.books : []);
  bibleState.books = items.map((b, idx) => ({
    bookid: String(b.bookid ?? b.id ?? idx + 1),
    name: String(b.name ?? b.book_name ?? b.bookName ?? ""),
    chapters: Number(b.chapters ?? b.chapter_count ?? b.nr_chapters ?? 0),
  })).filter(b => b.name && Number(b.bookid) >= 1 && Number(b.bookid) <= 66);
  return bibleState.books;
}

async function getBibleChapter(bookid, chapter){
  const url = `${BOLLS_TEXT_API}/${BOLLS_TRANSLATION}/${encodeURIComponent(bookid)}/${encodeURIComponent(chapter)}/`;
  const res = await fetch(url, { cache: "default" });
  if (!res.ok) throw new Error(`Bible chapter failed: ${res.status}`);
  const data = await res.json();
  // Expected shape: [{ pk: 1, verse: 1, text: "In the beginning..." }, ...]
  const verses = (Array.isArray(data) ? data : data?.verses || []).map(v => ({
    verse: Number(v.verse ?? v.nr ?? v.verseNum ?? v.pk ?? 0),
    text: stripHtmlTags(v.text ?? v.verseText ?? v.content ?? ""),
  })).filter(v => v.verse && v.text);
  return verses;
}
async function bibleTryDirectReference(q) {
  // Match references like "John 3:16" or "1 John 3:16"
  const match = q.match(/^(.+?)\s+(\d+):(\d+)$/);
  if (!match) {
    if (els.bibleHelp) els.bibleHelp.textContent = 'Try a reference like "John 3:16" or browse a book above.';
    return;
  }
  const bookQuery = match[1].trim().toLowerCase();
  const chapterNr = Number(match[2]);
  const verseNr = Number(match[3]);
  try {
    await ensureBibleBooks();
    const book = (bibleState.books || []).find(b => b.name.toLowerCase().startsWith(bookQuery) || b.name.toLowerCase() === bookQuery);
    if (!book) {
      if (els.bibleHelp) els.bibleHelp.textContent = `Book "${match[1]}" not found. Try spelling it out (e.g. "Psalms" not "Ps").`;
      return;
    }
    bibleState.selectedBook = book.bookid;
    bibleState.selectedChapter = chapterNr;
    renderBibleBooks(els.bibleSearch?.value || "");
    await renderBibleChapters(book.bookid);
    await renderBibleVerses(book.bookid, chapterNr);
    // Scroll to/highlight the specific verse
    setTimeout(() => {
      const btns = els.bibleVerses?.querySelectorAll(".verseBtn");
      if (btns) {
        btns.forEach(btn => {
          const ref = btn.getAttribute("data-ref") || "";
          if (ref.endsWith(`:${verseNr}`)) {
            btn.scrollIntoView({ behavior: "smooth", block: "nearest" });
            btn.classList.add("highlight");
            setTimeout(() => btn.classList.remove("highlight"), 2000);
          }
        });
      }
    }, 300);
    if (els.bibleHelp) els.bibleHelp.textContent = "";
  } catch (e) {
    console.error("Direct reference lookup failed:", e);
    if (els.bibleHelp) els.bibleHelp.textContent = "Couldn't find that reference. Try browsing manually.";
  }
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
  // Update sort button active state
  els.sortByDate?.classList.toggle("sortBtn--active", myVersesSortOrder === "date");
  els.sortByRef?.classList.toggle("sortBtn--active", myVersesSortOrder === "ref");

  const items = completedCache.slice().sort((a, b) => {
    if (myVersesSortOrder === "ref") {
      const pa = parseVerseRef(a.ref), pb = parseVerseRef(b.ref);
      return pa.order - pb.order || pa.ch - pb.ch || pa.v - pb.v;
    }
    return (b.at || "").localeCompare(a.at || "");
  });
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

els.sortByDate?.addEventListener("click", () => { myVersesSortOrder = "date"; renderMyVerses(); });
els.sortByRef?.addEventListener("click",  () => { myVersesSortOrder = "ref";  renderMyVerses(); });

/* GAME LOGIC (unchanged from v5) */
function initState(verse, mode) {
  // Append the reference so its words ("John", "3", "16") enter the blank pool
  const tokens = normalizeTokens(verse.text + " \u2014 " + verse.ref);
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
    consecutiveHints: 0,
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

  const isNumeric = /^\d+$/.test(correctWord);
  const choices = new Set([correctWord]);
  const seenLower = new Set([correctWord.toLowerCase()]);
  let guard = 0;

  if (isNumeric) {
    // Generate plausible numeric distractors (chapter/verse range 1–176)
    const correct = parseInt(correctWord, 10);
    const candidates = [];
    for (let n = Math.max(1, correct - 10); n <= correct + 10; n++) {
      if (n !== correct) candidates.push(String(n));
    }
    // Shuffle candidates then fill remaining slots with randoms in 1–176
    for (let i = candidates.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
    }
    for (const c of candidates) {
      if (choices.size >= 5) break;
      choices.add(c); seenLower.add(c);
    }
    while (choices.size < 5 && guard < 200) {
      guard++;
      const n = String(1 + Math.floor(Math.random() * 176));
      if (!seenLower.has(n)) { choices.add(n); seenLower.add(n); }
    }
  } else {
    const wordTokens = state.tokens.filter(t => isWordToken(t) && !/^\d+$/.test(t));
    while (choices.size < Math.min(5, wordTokens.length) && guard < 200) {
      guard++;
      const w = wordTokens[Math.floor(Math.random() * wordTokens.length)];
      if (!seenLower.has(w.toLowerCase())) {
        choices.add(w);
        seenLower.add(w.toLowerCase());
      }
    }
  }
  const arr = Array.from(choices);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return { correctWord, correctIdx, pills: arr };
}
function goHome() {
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
}

function celebrateAndGoHome() {
  const inQueue = verseQueue.length > 0;
  const nextIdx = verseQueueIdx + 1;
  const hasNext = inQueue && nextIdx < verseQueue.length;
  const chapterFinished = inQueue && !hasNext && verseQueue.length > 1;

  const overlay = document.createElement("div");
  overlay.className = "celebrateOverlay";

  if (hasNext) {
    // Mid-queue: quick card, then auto-advance
    const pct = Math.round(((verseQueueIdx + 1) / verseQueue.length) * 100);
    overlay.innerHTML = `
      <div class="celebrateCard">
        <div class="celebrateSparkle">🔥</div>
        <div class="celebrateTitle">Great job!</div>
        <div class="celebrateSub">Verse ${verseQueueIdx + 1} of ${verseQueue.length} — up next!</div>
        <div class="celebrateProgress"><div class="celebrateBar" style="width:${pct}%"></div></div>
      </div>`;
    document.body.appendChild(overlay);
    setTimeout(() => {
      overlay.remove();
      verseQueueIdx = nextIdx;
      _queueContinuation = true;
      startGameInternal(verseQueue[verseQueueIdx], "pick");
    }, 1400);
    return;
  }

  if (chapterFinished) {
    // All verses done — show chapter complete screen
    const completedQueue = verseQueue.slice();
    const chapterKey = verseQueue[0].ref.replace(/\s*:\s*\d+\s*$/, "").trim();

    // Award chapter badge
    if (activeKid) {
      if (!activeKid.completedChapters) activeKid.completedChapters = [];
      if (!activeKid.completedChapters.includes(chapterKey)) {
        activeKid.completedChapters.push(chapterKey);
      }
      const badgesBefore = new Set(Object.keys(activeKid.badges || {}));
      awardBadgesForKid(activeKid);
      const newBadges = BADGES.filter(b => activeKid.badges[b.id] && !badgesBefore.has(b.id));
      saveActiveKidDoc();
      if (newBadges.length) setTimeout(() => showBadgePopups(newBadges), 2200);
    }

    verseQueue = [];
    verseQueueIdx = 0;

    overlay.innerHTML = `
      <div class="chapterCompleteCard">
        <div class="chapterCompleteIcon">🎉</div>
        <div class="chapterCompleteTitle">Chapter Complete!</div>
        <div class="chapterCompleteChapter">${escapeHTML(chapterKey)}</div>
        <div class="chapterCompleteSub">You've memorized every verse.<br>Ready to say the whole thing?</div>
        <div class="chapterCompleteBtns">
          <button class="primary chapterTryBtn" type="button">🎙️ Recite Full Chapter</button>
          <button class="soft chapterDoneBtn" type="button">✓ I'm Done</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);

    overlay.querySelector(".chapterTryBtn").addEventListener("click", () => {
      overlay.remove();
      startChapterChallenge(completedQueue);
    });
    overlay.querySelector(".chapterDoneBtn").addEventListener("click", () => {
      overlay.remove();
      goHome();
    });
    return;
  }

  // Normal single-verse complete
  verseQueue = [];
  verseQueueIdx = 0;
  overlay.innerHTML = `
    <div class="celebrateCard">
      <div class="celebrateSparkle">✨</div>
      <div class="celebrateTitle">Great job!</div>
      <div class="celebrateSub">Verse complete.</div>
    </div>`;
  document.body.appendChild(overlay);
  setTimeout(() => { overlay.remove(); goHome(); }, 1200);
}

function startChapterChallenge(verses) {
  const combinedText = verses.map(v => v.text).join(" ");
  const chapterKey = verses[0].ref.replace(/\s*:\s*\d+\s*$/, "").trim();
  const verse = { ref: chapterKey + " (Full Chapter)", text: combinedText };
  // Show the full text in the modal, then auto-enter speak mode
  showVerseModal(verse, () => {
    state = initState(verse, "pick");
    speechMode = false;
    stopListening();
    els.tapControls.hidden = false;
    els.wordRow.hidden = false;
    els.speakPanel.hidden = true;
    if (els.btnSpeakToggle) els.btnSpeakToggle.textContent = "🎤 Speak it";
    els.gameRef.textContent = "";
    els.gameMode.textContent = `Full Chapter`;
    setActiveNav(els.navPick);
    showView("game");
    renderStats();
    renderGame();
    // Auto-enter speech mode so they recite rather than tap 100+ words
    setTimeout(() => enterSpeechMode(), 300);
  });
}

// Wire "Memorize All" button
els.btnMemorizeAll?.addEventListener("click", () => {
  const verses = bibleState.loadedVerses || [];
  if (!verses.length) return;
  verseQueue = verses.slice();
  verseQueueIdx = 0;
  requireLoginOrGuest(() => {
    _queueContinuation = true;
    startGameInternal(verseQueue[0], "pick");
  });
});

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
    state.consecutiveHints = 0;
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

  if (speechMode) {
    els.pillRow.innerHTML = "";
    const remaining = currentHiddenSlice().filter(i => !state.revealed.has(i));
    const wordCount = remaining.filter(i => isWordToken(state.tokens[i])).length;
    els.speakStatus.textContent = state.fullAttempt
      ? "Tap the microphone and recite the full verse from memory."
      : wordCount === 1
        ? "Tap the microphone and say the missing word."
        : `Tap the microphone and say the ${wordCount} missing words in order.`;
    els.speakResult.innerHTML = "";
    els.speakBtns.hidden = true;
    return;
  }

  const built = buildPills();
  if (!built) return;
  const { correctWord, correctIdx, pills } = built;

  // Disable hint button when 2 consecutive hints have been used
  if (els.btnHint) els.btnHint.disabled = state.consecutiveHints >= 2;

  els.pillRow.innerHTML = pills.map(w => {
    const hinted = state.hint && w === state.hint;
    return `<button class="pill${hinted ? " hint" : ""}" type="button" data-word="${escapeHTML(w)}">${escapeHTML(w)}</button>`;
  }).join("");

  els.pillRow.querySelectorAll(".pill").forEach(btn => {
    btn.addEventListener("click", () => {
      if (state.locked) return;
      state.locked = true;
      const usedHint = !!state.hint;  // capture before clearing
      state.hint = null;

      const w = btn.getAttribute("data-word") || "";
      const ok = w === correctWord;
      btn.classList.add(ok ? "good" : "wrong");

      if (ok) {
        state.revealed.add(correctIdx);
        state.consecutiveHints = 0;
        if (activeKid) {
          const xpGain = usedHint ? 0 : 2;
          activeKid.xp = Math.max(0, Number(activeKid.xp || 0)) + xpGain;
          renderStats();
          floatXP(xpGain, btn);
        }
        setTimeout(() => {
          state.locked = false;
          renderGame();
        }, 430);
      } else {
        if (activeKid) {
          activeKid.xp = Math.max(0, Number(activeKid.xp || 0) - 2);
          renderStats();
          floatXP(-2, btn);
        }
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
  if (state.consecutiveHints >= 2) return;
  const idx = nextExpectedIndex();
  if (idx === null) return;
  state.hint = state.tokens[idx];
  state.consecutiveHints++;
  if (activeKid) {
    activeKid.xp = Math.max(0, Number(activeKid.xp || 0) - 1);
    renderStats();
    floatXP(-1, els.btnHint);
  }
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
  state.consecutiveHints = 0;
  renderGame();
}
function startOver() {
  if (!state) return;
  state.step = 1;
  state.revealed.clear();
  state.hint = null;
  state.consecutiveHints = 0;
  state.fullAttempt = false;
  state.snap = null;
  renderGame();
}
/* ── Speech mode ──────────────────────────────────────────────────── */

function isSpeechSupported() { return !!SpeechRecognition; }

function normalizeForSpeech(s) {
  return s.toLowerCase()
    .replace(/[^a-z0-9\s']/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function speechDiff(spoken, target) {
  const spokenWords = normalizeForSpeech(spoken).split(" ").filter(Boolean);
  const targetWords = normalizeForSpeech(target).split(" ").filter(Boolean);
  // LCS to find best in-order match, so one missed word doesn't wipe out all subsequent matches
  const n = spokenWords.length, m = targetWords.length;
  const dp = Array.from({ length: n + 1 }, () => new Int16Array(m + 1));
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      dp[i][j] = spokenWords[i - 1] === targetWords[j - 1]
        ? dp[i - 1][j - 1] + 1
        : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }

  const matched = dp[n][m];
  const pct = m ? Math.round((matched / m) * 100) : 0;

  // Backtrack to find which target-word positions were matched
  const matchedIdx = new Set();
  let i = n, j = m;
  while (i > 0 && j > 0) {
    if (spokenWords[i - 1] === targetWords[j - 1]) { matchedIdx.add(j - 1); i--; j--; }
    else if (dp[i - 1][j] >= dp[i][j - 1]) i--;
    else j--;
  }

  const html = targetWords.map((tw, idx) =>
    `<span class="sw ${matchedIdx.has(idx) ? "sw--ok" : "sw--miss"}">${escapeHTML(tw)}</span>`
  ).join(" ");

  return { pct, html };
}

function enterSpeechMode() {
  speechMode = true;
  // Keep tapControls visible so "I think I have it" is accessible
  els.wordRow.hidden = true;
  els.speakPanel.hidden = false;
  els.speakBtns.hidden = true;
  els.speakResult.innerHTML = "";
  els.speakStatus.textContent = "Tap the microphone and say the missing word(s).";
  if (els.btnSpeakToggle) els.btnSpeakToggle.textContent = "⌨️ Tap it";
  stopListening();
}

function exitSpeechMode() {
  speechMode = false;
  stopListening();
  els.wordRow.hidden = false;
  els.speakPanel.hidden = true;
  if (els.btnSpeakToggle) els.btnSpeakToggle.textContent = "🎤 Speak it";
  renderGame();
}

function stopListening() {
  speechListening = false;
  if (recognition) { try { recognition.stop(); } catch(_) {} recognition = null; }
  if (els.speakMicBtn) els.speakMicBtn.classList.remove("micBtn--active");
}

function startListening() {
  if (!isSpeechSupported()) {
    showAlert("Not supported", "Speech recognition is not supported in this browser. Try Chrome on desktop or Android.");
    return;
  }

  // Tap again while listening → stop and evaluate
  if (speechListening) {
    stopListening();
    if (accumulatedTranscript.trim()) {
      handleSpeechResult(accumulatedTranscript.trim());
    } else {
      els.speakStatus.textContent = "No speech captured. Tap mic and try again.";
    }
    return;
  }

  accumulatedTranscript = "";
  recognition = new SpeechRecognition();
  recognition.lang = "en-US";
  recognition.interimResults = true;   // show live partial text
  recognition.maxAlternatives = 1;
  recognition.continuous = true;       // keep going through pauses

  speechListening = true;
  els.speakMicBtn.classList.add("micBtn--active");
  els.speakStatus.textContent = "Listening… recite the verse, then tap mic to stop.";
  els.speakBtns.hidden = true;
  els.speakResult.innerHTML = "";

  recognition.onresult = (event) => {
    // Rebuild full transcript from all result segments
    let full = "";
    for (let i = 0; i < event.results.length; i++) {
      full += event.results[i][0].transcript + " ";
    }
    accumulatedTranscript = full.trim();
    // Show live preview in status while listening
    els.speakStatus.textContent = `Hearing: "${accumulatedTranscript}"`;
  };

  recognition.onerror = (event) => {
    if (event.error === "no-speech") return; // ignore — keep listening
    stopListening();
    if (event.error === "not-allowed") {
      showAlert("Microphone blocked", "Please allow microphone access in your browser settings, then try again.");
      exitSpeechMode();
    } else {
      els.speakStatus.textContent = `Error: ${event.error}. Tap mic and try again.`;
    }
  };

  recognition.onend = () => {
    // Browser ended the session (timeout / lost focus). Evaluate what we have.
    if (speechListening) {
      speechListening = false;
      els.speakMicBtn.classList.remove("micBtn--active");
      if (accumulatedTranscript.trim()) {
        handleSpeechResult(accumulatedTranscript.trim());
      } else {
        els.speakStatus.textContent = "Tap the microphone and recite the full verse.";
      }
    }
  };

  recognition.start();
}

function handleSpeechResult(transcript) {
  stopListening();
  if (!state) return;

  // Full-verse attempt — triggered by "I think I have it"
  if (state.fullAttempt) {
    const { pct, html } = speechDiff(transcript, state.verse.text);
    els.speakResult.innerHTML = html;
    if (pct >= 90) {
      els.speakStatus.textContent = `Great! ${pct}% match — verse complete!`;
      els.speakBtns.hidden = true;
      onVerseComplete().finally(() => celebrateAndGoHome());
    } else if (pct >= 60) {
      els.speakStatus.textContent = `${pct}% match — good effort! Accept or try again.`;
      els.speakAccept.hidden = false;
      els.speakBtns.hidden = false;
    } else {
      els.speakStatus.textContent = `${pct}% match — keep practising! Tap mic to try again.`;
      els.speakAccept.hidden = false;
      els.speakBtns.hidden = false;
    }
    return;
  }

  // Step-by-step: match against only the current step's missing words.
  // The user may speak the full verse — LCS finds the missing words within it.
  const remaining = currentHiddenSlice().filter(i => !state.revealed.has(i));
  const expectedText = remaining.map(i => state.tokens[i]).filter(t => isWordToken(t)).join(" ");
  if (!expectedText) return;

  const { pct, html } = speechDiff(transcript, expectedText);
  els.speakResult.innerHTML = html;

  if (pct === 100) {
    els.speakBtns.hidden = true;
    for (const idx of remaining) state.revealed.add(idx);
    if (activeKid) {
      activeKid.xp = Math.max(0, Number(activeKid.xp || 0)) + 2 * Math.max(1, remaining.length);
      renderStats();
    }
    setTimeout(() => { if (speechMode) renderGame(); }, 500);
  } else {
    if (activeKid) {
      activeKid.xp = Math.max(0, Number(activeKid.xp || 0) - 2);
      renderStats();
      floatXP(-2, els.speakMicBtn);
    }
    els.speakStatus.textContent = `${pct}% — say every missing word and tap mic to try again.`;
    els.speakAccept.hidden = true;   // no partial credit; all words required
    els.speakBtns.hidden = false;
  }
}

/* ── Speech event listeners ───────────────────────────────────────── */
els.btnSpeakToggle?.addEventListener("click", () => {
  if (speechMode) {
    exitSpeechMode();
    return;
  }
  if (!isSpeechSupported()) {
    showAlert("Not supported", "Speech recognition is not supported in this browser. Try Chrome on desktop or Android.");
    return;
  }
  enterSpeechMode();
});

els.btnSpeakExit?.addEventListener("click", () => exitSpeechMode());

els.speakMicBtn?.addEventListener("click", () => startListening());

els.speakAccept?.addEventListener("click", () => {
  els.speakBtns.hidden = true;
  if (state?.fullAttempt) {
    onVerseComplete().finally(() => celebrateAndGoHome());
  } else {
    // Accept step — reveal current words and advance
    const remaining = currentHiddenSlice().filter(i => !state.revealed.has(i));
    for (const idx of remaining) state.revealed.add(idx);
    setTimeout(() => { if (speechMode) renderGame(); }, 300);
  }
});

els.speakRetry?.addEventListener("click", () => {
  els.speakBtns.hidden = true;
  els.speakResult.innerHTML = "";
  if (state?.fullAttempt) {
    els.speakStatus.textContent = "Tap the microphone and recite the full verse from memory.";
  } else {
    const remaining = currentHiddenSlice().filter(i => !state?.revealed.has(i));
    const count = remaining.filter(i => isWordToken(state.tokens[i])).length;
    els.speakStatus.textContent = count === 1
      ? "Tap the microphone and say the missing word."
      : `Tap the microphone and say the ${count} missing words in order.`;
  }
});

/* ── End speech mode ─────────────────────────────────────────────── */

/* ── Verse modal ─────────────────────────────────────────────────── */
let verseModalCallback = null;

function showVerseModal(verse, onReady) {
  els.verseModalRef.textContent = verse.ref;
  els.verseModalText.textContent = verse.text;
  verseModalCallback = onReady || null;
  els.verseModal.hidden = false;
}

els.verseModalReady?.addEventListener("click", () => {
  els.verseModal.hidden = true;
  if (verseModalCallback) {
    const cb = verseModalCallback;
    verseModalCallback = null;
    cb();
  }
});

els.btnShowVerse?.addEventListener("click", () => {
  if (!state) return;
  showVerseModal(state.verse, null);
});
/* ── End verse modal ──────────────────────────────────────────────── */

function startGameInternal(verse, mode) {
  // Clear any leftover queue unless this call is an intentional queue advancement
  if (!_queueContinuation) {
    verseQueue = [];
    verseQueueIdx = 0;
  }
  _queueContinuation = false;

  state = initState(verse, mode);
  // Reset speech mode on every new game
  speechMode = false;
  stopListening();
  els.tapControls.hidden = false;
  els.wordRow.hidden = false;
  els.speakPanel.hidden = true;
  if (els.btnSpeakToggle) els.btnSpeakToggle.textContent = "🎤 Speak it";

  els.gameRef.textContent = "";
  els.gameMode.textContent = verseQueue.length > 0
    ? `Verse ${verseQueueIdx + 1} of ${verseQueue.length}`
    : `Today: ${todayISO()}`;
  setActiveNav(mode === "daily" ? els.navDaily : els.navPick);
  showView("game");
  renderStats();

  // Show full verse first so user can read it before blanks appear
  showVerseModal(verse, () => renderGame());
}

// Only warn about guest mode when a verse is about to start.
function startGame(verse, mode) {
  requireLoginOrGuest(() => startGameInternal(verse, mode));
}
function freshDailyStart(verse) { startGame(verse, "daily"); }

/* FAMILY DATA */
function emptyKid(name="Child") {
  return { id: "local", name, xp: 0, streak: 0, lastCompleted: null, badges: {}, completedChapters: [] };
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
  const n = completedCache.length;
  const streak = kid.streak || 0;

  // Verse count
  if (n >= 1)   badges.first     = true;
  if (n >= 5)   badges.verses5   = true;
  if (n >= 10)  badges.verses10  = true;
  if (n >= 25)  badges.verses25  = true;
  if (n >= 50)  badges.verses50  = true;
  if (n >= 100) badges.verses100 = true;
  if (n >= 200) badges.verses200 = true;
  if (n >= 365) badges.verses365 = true;

  // Streaks
  if (streak >= 3)   badges.streak3   = true;
  if (streak >= 7)   badges.streak7   = true;
  if (streak >= 14)  badges.streak14  = true;
  if (streak >= 30)  badges.streak30  = true;
  if (streak >= 60)  badges.streak60  = true;
  if (streak >= 100) badges.streak100 = true;

  // Book-based (derived from completed refs)
  const books = new Set(completedCache.map(x => (x.ref || "").replace(/\s+\d+:\d+$/, "").trim()));
  const gospels = ["Matthew","Mark","Luke","John"];

  for (const book of books) {
    if (NT_BOOKS.has(book)) badges.nt = true; else badges.ot = true;
    if (book === "Psalms" || book === "Psalm") badges.psalms = true;
    if (book === "Proverbs") badges.proverbs = true;
  }
  if (gospels.every(g => books.has(g))) badges.gospels = true;
  if (books.size >= 10) badges.bookworm = true;

  // Chapter mastery
  if ((kid.completedChapters || []).length >= 1) badges.chapter1 = true;

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
      await setActiveKidById(id || "parent");
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

async function loadCompletedForProfile(profileId) {
  if (profileId === "parent") {
    const col = collection(db, "users", user.uid, "completed");
    const qy = query(col, orderBy("at", "desc"), limit(500));
    const snap = await getDocs(qy);
    const items = [];
    snap.forEach(docu => {
      const d = docu.data();
      if (d && d.key) items.push(d);
    });
    return items;
  }
  return loadCompletedForKid(profileId);
}

function makeParentProfile() {
  return {
    id: "parent",
    name: parentDoc?.displayName || user?.displayName || "Parent",
    xp: parentDoc?.xp ?? 0,
    streak: parentDoc?.streak ?? 0,
    lastCompleted: parentDoc?.lastCompleted ?? null,
    badges: parentDoc?.badges ?? {},
  };
}

async function setActiveKidById(kidId) {
  if (!kidId) return;
  if (kidId === "parent") {
    await ensureParentDoc(); // re-fetch fresh parent data from Firestore
    activeKid = makeParentProfile();
    setActiveProfileId("parent");
    completedCache = await loadCompletedForProfile("parent");
    awardBadgesForKid(activeKid);
    renderProfile();
    renderKidsRow();
    renderStats();
    return;
  }
  // Re-fetch this kid's doc fresh from Firestore instead of using stale cache
  const kidRef = doc(db, "users", user.uid, "kids", kidId);
  const kidSnap = await getDoc(kidRef);
  if (!kidSnap.exists()) return;
  const d = kidSnap.data() || {};
  activeKid = {
    id: kidId,
    name: d.name || "Child",
    xp: Number.isFinite(+d.xp) ? +d.xp : 0,
    streak: Number.isFinite(+d.streak) ? +d.streak : 0,
    lastCompleted: typeof d.lastCompleted === "string" ? d.lastCompleted : null,
    badges: (d.badges && typeof d.badges === "object") ? d.badges : {},
  };
  // Keep local cache in sync
  kids = kids.map(k => k.id === kidId ? { ...activeKid } : k);
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
  renderBadges(els.badgeRowHome, activeKid?.badges);
  renderBadges(els.badgeRowProfile, activeKid?.badges);
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

function activeProfileDocData() {
  if (!activeKid) return null;
  return {
    displayName: parentDoc?.displayName || user?.displayName || "Parent",
    xp: activeKid.xp ?? 0,
    streak: activeKid.streak ?? 0,
    lastCompleted: activeKid.lastCompleted ?? null,
    badges: activeKid.badges || {},
  };
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
    completedChapters: activeKid.completedChapters || [],
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

function showBadgePopups(badges) {
  if (!badges.length) return;
  const badge = badges[0];
  const rest = badges.slice(1);

  const overlay = document.createElement("div");
  overlay.className = "badgePopupOverlay";
  overlay.innerHTML = `
    <div class="badgePopupCard">
      <div class="badgePopupSparkles" aria-hidden="true">
        <span class="bps bps1">✨</span><span class="bps bps2">⭐</span>
        <span class="bps bps3">✨</span><span class="bps bps4">🌟</span>
        <span class="bps bps5">✨</span><span class="bps bps6">⭐</span>
      </div>
      <div class="badgePopupUnlocked">🎉 Badge Unlocked!</div>
      <div class="badgePopupIcon">${badge.icon}</div>
      <div class="badgePopupName">${escapeHTML(badge.label)}</div>
      <div class="badgePopupDesc">${escapeHTML(badge.desc)}</div>
      <button class="badgePopupBtn" type="button">Awesome!</button>
    </div>
  `;
  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add("badgePopupOverlay--in"));

  overlay.querySelector(".badgePopupBtn").addEventListener("click", () => {
    overlay.classList.remove("badgePopupOverlay--in");
    overlay.classList.add("badgePopupOverlay--out");
    overlay.addEventListener("animationend", () => {
      overlay.remove();
      if (rest.length) setTimeout(() => showBadgePopups(rest), 200);
    }, { once: true });
  });
}

async function onVerseComplete() {
  if (!state) return;
  const key = getVerseKey(state.verse);
  const atISO = new Date().toISOString();
  if (!completedCache.some(x => x.key === key)) {
    completedCache.push({ key, ref: state.verse.ref, text: state.verse.text, at: atISO });
  }

  if (!activeKid) activeKid = emptyKid("Child");

  const today = todayISO();
  const already = activeKid.lastCompleted === today;
  activeKid.streak = computeStreakNext(activeKid.streak || 0, activeKid.lastCompleted, today);
  activeKid.lastCompleted = today;
  const bonusXP = already ? 10 : 50;

  activeKid.xp = (activeKid.xp || 0) + bonusXP;
  const badgesBefore = new Set(Object.keys(activeKid.badges || {}));
  awardBadgesForKid(activeKid);
  const newBadges = BADGES.filter(b => activeKid.badges[b.id] && !badgesBefore.has(b.id));
  renderStats();
  floatXP(bonusXP, els.gameRef);
  if (newBadges.length) {
    setTimeout(() => showBadgePopups(newBadges), 1400);
  }

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
  els.viewProfile.classList.remove("signupOnly");
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

    hideWelcomeModal();
    renderProfile();
    renderKidsRow();
    renderStats();
    setActiveNav(els.navHome);
    showView("home");
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
    hideWelcomeModal();
    setActiveNav(els.navHome);
    showView("home");
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

  els.navBadges.addEventListener("click", () => {
    setActiveNav(els.navBadges);
    showView("badges");
    renderBadgesPage();
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
    renderBibleBooks(q);
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

  // Welcome modal
  els.welcomeLogin?.addEventListener("click", goToLogin);
  els.welcomeSignup?.addEventListener("click", goToSignup);
  els.welcomeGuest?.addEventListener("click", goAsGuest);

  // Auth section switch links
  els.btnSwitchToSignUp?.addEventListener("click", () => showAuthSection("create"));
  els.btnSwitchToSignIn?.addEventListener("click", () => showAuthSection("login"));

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

  if (!auth?.currentUser) {
    // Show home page behind the welcome modal
    setActiveNav(els.navHome);
    showView("home");
    showWelcomeModal();
  } else {
    setActiveNav(els.navHome);
    showView("home");
  }
  renderKidsRow();
  renderStats();
}

wire();
boot();