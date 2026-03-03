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
  badgeRowHome: document.getElementById("badgeRowHome"),

  homeDaily: document.getElementById("homeDaily"),
  homePick: document.getElementById("homePick"),
  todayRef: document.getElementById("todayRef"),
  todayText: document.getElementById("todayText"),

  pickSearch: document.getElementById("pickSearch"),
  pickList: document.getElementById("pickList"),
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

  btnSignOut: document.getElementById("btnSignOut"),
  authCard: document.getElementById("authCard"),
  authName: document.getElementById("authName"),
  authEmail: document.getElementById("authEmail"),
  authPass: document.getElementById("authPass"),
  authEmail2: document.getElementById("authEmail2"),
  authPass2: document.getElementById("authPass2"),
  btnSignIn: document.getElementById("btnSignIn"),
  btnSignUp: document.getElementById("btnSignUp"),
  authMsg: document.getElementById("authMsg"),
  firebaseStatus: document.getElementById("firebaseStatus"),

  guestModal: document.getElementById("guestModal"),
  guestGoProfile: document.getElementById("guestGoProfile"),
  guestContinue: document.getElementById("guestContinue"),
};

let guestAllowed = localStorage.getItem('thw_guest_ok') === '1';
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

const BADGES = [
  { id: "first", icon: "🌟", label: "First verse" },
  { id: "streak3", icon: "🔥", label: "3‑day streak" },
  { id: "streak7", icon: "🏅", label: "7‑day streak" },
  { id: "verses10", icon: "📚", label: "10 verses" },
];

const LS_ACTIVE_KID = "thw_activeKidId";

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

function setActiveNav(btn) {
  for (const b of [els.navHome, els.navDaily, els.navPick, els.navVerses, els.navProfile]) {
    b.classList.toggle("isActive", b === btn);
  }
}

function showGuestModal(action){
  pendingGuestAction = action || null;
  if (!els.guestModal) return;
  els.guestModal.hidden = false;
}
function hideGuestModal(){
  if (!els.guestModal) return;
  els.guestModal.hidden = true;
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
}

function renderPickList(filter = "") {
  const q = filter.trim().toLowerCase();
  const items = !q ? library : library.filter(v => (v.ref + " " + v.text).toLowerCase().includes(q));
  if (!items.length) {
    els.pickList.innerHTML = `<div class="empty">No results.</div>`;
    return;
  }
  els.pickList.innerHTML = items.slice(0, 200).map(v => `
    <button class="itemBtn" type="button" data-ref="${escapeHTML(v.ref)}">
      <div class="itemRef">${escapeHTML(v.ref)}</div>
      <div class="itemText">${escapeHTML(v.text)}</div>
    </button>
  `).join("");
  els.pickList.querySelectorAll(".itemBtn").forEach(btn => {
    btn.addEventListener("click", () => {
      const ref = btn.getAttribute("data-ref");
      const verse = library.find(x => x.ref === ref);
      if (verse) startGame(verse, "pick");
    });
  });
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
      if (found) startGame({ ref: found.ref, text: found.text }, "pick");
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
          }
          renderGame();
        }, 500);
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
function startGame(verse, mode) {
  state = initState(verse, mode);
  els.gameRef.textContent = verse.ref;
  els.gameMode.textContent = mode === "daily" ? `Today: ${todayISO()}` : "Practice (no streak)";
  setActiveNav(mode === "daily" ? els.navDaily : els.navPick);
  showView("game");
  renderStats();
  renderGame();
}
function freshDailyStart(verse) { startGame(verse, "daily"); }

/* FAMILY DATA */
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
    return;
  }
  if (!kids.length) {
    els.kidsRow.innerHTML = `<div class="empty">No children yet. Add one below.</div>`;
    els.activeKidName.textContent = "—";
    els.activeKidMeta.textContent = "Add a child name.";
    return;
  }
  const activeId = activeKid?.id;
  els.kidsRow.innerHTML = kids.map(k => `
    <button class="kidBtn ${k.id===activeId ? "isActive":""}" type="button" data-kid="${escapeHTML(k.id)}">
      <div class="avatar" aria-hidden="true">
        <svg viewBox="0 0 48 48" width="20" height="20">
          <circle cx="24" cy="18" r="9" fill="rgba(13,19,33,.35)"/>
          <path d="M10 44c1-9 9-14 14-14s13 5 14 14" fill="rgba(13,19,33,.25)"/>
        </svg>
      </div>
      <div>${escapeHTML(k.name || "Child")}</div>
    </button>
  `).join("");
  els.kidsRow.querySelectorAll(".kidBtn").forEach(btn => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-kid");
      await setActiveKidById(id);
      renderKidsRow();
      renderStats();
    });
  });
  els.activeKidName.textContent = activeKid?.name || "—";
  els.activeKidMeta.textContent = activeKid ? `Streak: ${activeKid.streak||0} • XP: ${activeKid.xp||0}` : "—";
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
    user = u;
    if (user) {
      await loadParentAndKids();
    } else {
      parentDoc = null;
      kids = [];
      activeKid = null;
      completedCache = [];
      renderProfile();
      renderKidsRow();
      renderStats();
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
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }, { merge: true });
    parentDoc = { displayName: name };
  } else {
    const d = snap.data() || {};
    parentDoc = { displayName: d.displayName || name };
  }
}

async function listKids() {
  const col = collection(db, "users", user.uid, "kids");
  const qy = query(col, orderBy("createdAt", "asc"), limit(50));
  const snap = await getDocs(qy);
  const items = [];
  snap.forEach(docu => {
    const d = docu.data() || {};
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
  const found = kids.find(k => k.id === kidId);
  if (!found) return;
  activeKid = { ...found };
  localStorage.setItem(LS_ACTIVE_KID, kidId);
  completedCache = await loadCompletedForKid(kidId);
  awardBadgesForKid(activeKid);
  renderProfile();
  renderKidsRow();
  renderStats();
}

async function loadParentAndKids() {
  await ensureParentDoc();
  kids = await listKids();

  // If no kids exist yet, create one default kid.
  if (!kids.length) {
    const defaultId = await createKid("Kid 1");
    kids = await listKids();
    localStorage.setItem(LS_ACTIVE_KID, defaultId);
  }

  const saved = localStorage.getItem(LS_ACTIVE_KID);
  const pickId = (saved && kids.some(k => k.id === saved)) ? saved : kids[0].id;
  await setActiveKidById(pickId);
}

async function saveActiveKidDoc() {
  if (!fbEnabled || !user || !activeKid || !activeKid.id) return;
  const ref = doc(db, "users", user.uid, "kids", activeKid.id);
  await updateDoc(ref, {
    name: activeKid.name,
    xp: activeKid.xp,
    streak: activeKid.streak,
    lastCompleted: activeKid.lastCompleted,
    badges: activeKid.badges || {},
    updatedAt: serverTimestamp(),
  });
  // keep local kids list in sync
  kids = kids.map(k => k.id === activeKid.id ? { ...activeKid } : k);
}

async function saveCompletedToCloud(verse, atISO) {
  if (!fbEnabled || !user || !activeKid?.id) return;
  const id = hashId(getVerseKey(verse));
  const ref = doc(db, "users", user.uid, "kids", activeKid.id, "completed", id);
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

  if (state.mode === "daily") {
    const today = todayISO();
    const already = activeKid.lastCompleted === today;
    activeKid.streak = computeStreakNext(activeKid.streak || 0, activeKid.lastCompleted, today);
    activeKid.lastCompleted = today;
    if (!already) activeKid.xp = (activeKid.xp || 0) + 50;
  } else {
    activeKid.xp = (activeKid.xp || 0) + 10;
  }

  awardBadgesForKid(activeKid);
  renderStats();

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
  if (!fbEnabled) return;
  els.authMsg.textContent = "";
  const email = (els.authEmail.value || "").trim();
  const pass = (els.authPass.value || "").trim();
  if (!email || !pass) {
    els.authMsg.textContent = "Please enter email + password.";
    return;
  }
  try {
    await signInWithEmailAndPassword(auth, email, pass);
    els.authMsg.textContent = "";
  } catch (e) {
    els.authMsg.textContent = e?.message || String(e);
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
    els.authMsg.textContent = e?.message || String(e);
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
    requireLoginOrGuest(() => {
      setActiveNav(els.navPick);
      showView("pick");
      renderPickList(els.pickSearch.value || "");
    });
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
    localStorage.setItem("thw_guest_ok", "1");
    const fn = pendingGuestAction;
    pendingGuestAction = null;
    hideGuestModal();
    if (typeof fn === "function") fn();
  });
  els.guestModal?.addEventListener("click", (e) => {
    if (e.target === els.guestModal) hideGuestModal();
  });

;

  els.homeDaily.addEventListener("click", () => {
    requireLoginOrGuest(() => {
      setActiveNav(els.navDaily);
      if (todayVerse) freshDailyStart(todayVerse);
    });
  });
  els.homePick.addEventListener("click", () => {
    requireLoginOrGuest(() => {
      setActiveNav(els.navPick);
      showView("pick");
      renderPickList("");
      els.pickSearch.focus();
    });
  });

  els.pickSearch.addEventListener("input", () => {
    renderPickList(els.pickSearch.value || "");
  });

  els.btnHint.addEventListener("click", hintNext);
  els.btnFullAttempt.addEventListener("click", startFullAttempt);
  els.btnResetStep.addEventListener("click", resetStep);
  els.btnStartOver.addEventListener("click", startOver);

  els.btnSignIn.addEventListener("click", doSignIn);
  els.btnSignUp.addEventListener("click", doSignUp);
  els.btnSignOut.addEventListener("click", doSignOut);
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

  setActiveNav(els.navHome);
  showView("home");
  renderKidsRow();
  renderStats();
}

wire();
boot();
