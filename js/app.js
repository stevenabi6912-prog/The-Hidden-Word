/* The Hidden Word — root stable release
   Version: 1.0.0-root
   Built: 2026-03-03 17:58:48Z
*/
(() => {
  "use strict";

  const LS = {
    streak: "thw_streak_v1",
    completed: "thw_completed_v1",
    progressPrefix: "thw_progress_v1:", // + verseKey
  };

  const els = {
    navHome: document.getElementById("navHome"),
    navDaily: document.getElementById("navDaily"),
    navPick: document.getElementById("navPick"),
    navVerses: document.getElementById("navVerses"),
    viewHome: document.getElementById("viewHome"),
    viewPick: document.getElementById("viewPick"),
    viewVerses: document.getElementById("viewVerses"),
    viewGame: document.getElementById("viewGame"),
    streakHome: document.getElementById("streakHome"),
    completedHome: document.getElementById("completedHome"),
    homeDaily: document.getElementById("homeDaily"),
    homePick: document.getElementById("homePick"),
    todayRef: document.getElementById("todayRef"),
    todayText: document.getElementById("todayText"),
    healthVersion: document.getElementById("healthVersion"),
    healthVerses: document.getElementById("healthVerses"),
    healthStatus: document.getElementById("healthStatus"),
    pickSearch: document.getElementById("pickSearch"),
    pickList: document.getElementById("pickList"),
    myList: document.getElementById("myList"),
    gameRef: document.getElementById("gameRef"),
    gameMode: document.getElementById("gameMode"),
    streakGame: document.getElementById("streakGame"),
    verseBox: document.getElementById("verseBox"),
    pillRow: document.getElementById("pillRow"),
    btnHint: document.getElementById("btnHint"),
    btnResetStep: document.getElementById("btnResetStep"),
    btnStartOver: document.getElementById("btnStartOver"),
    stepLabel: document.getElementById("stepLabel"),
  };

  let todayVerse = null;
  let library = [];
  let state = null;

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

  function loadLS(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }
  function saveLS(key, val) {
    localStorage.setItem(key, JSON.stringify(val));
  }

  function getVerseKey(v) {
    return v.ref + "|" + v.text.slice(0, 40);
  }

  function normalizeTokens(text) {
    const parts = [];
    const re = /[A-Za-z']+|\d+|[^\sA-Za-z0-9]+/g;
    const m = text.match(re) || [];
    for (const p of m) parts.push(p);
    return parts;
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
    for (const b of [els.navHome, els.navDaily, els.navPick, els.navVerses]) {
      b.classList.toggle("isActive", b === btn);
    }
  }
  function showView(name) {
    els.viewHome.hidden = name !== "home";
    els.viewPick.hidden = name !== "pick";
    els.viewVerses.hidden = name !== "verses";
    els.viewGame.hidden = name !== "game";
  }

  function getStreak() {
    const s = loadLS(LS.streak, { currentStreak: 0, lastCompleted: null });
    if (!s || typeof s !== "object") return { currentStreak: 0, lastCompleted: null };
    return {
      currentStreak: Number.isFinite(+s.currentStreak) ? +s.currentStreak : 0,
      lastCompleted: typeof s.lastCompleted === "string" ? s.lastCompleted : null,
    };
  }

  function setStreakOnComplete(dateStr) {
    const s = getStreak();
    if (s.lastCompleted === dateStr) return;

    const d = new Date(dateStr + "T00:00:00");
    const y = new Date(d);
    y.setDate(y.getDate() - 1);
    const yStr = `${y.getFullYear()}-${String(y.getMonth() + 1).padStart(2, "0")}-${String(
      y.getDate()
    ).padStart(2, "0")}`;

    const next = s.lastCompleted === yStr ? s.currentStreak + 1 : 1;
    saveLS(LS.streak, { currentStreak: next, lastCompleted: dateStr });
  }

  function getCompletedList() {
    const items = loadLS(LS.completed, []);
    return Array.isArray(items) ? items : [];
  }
  function addCompleted(verse) {
    const items = getCompletedList();
    const key = getVerseKey(verse);
    if (!items.some((x) => x.key === key)) {
      items.push({ key, ref: verse.ref, text: verse.text, at: new Date().toISOString() });
      saveLS(LS.completed, items);
    }
  }

  function renderStats() {
    const s = getStreak();
    els.streakHome.textContent = String(s.currentStreak);
    els.streakGame.textContent = String(s.currentStreak);
    els.completedHome.textContent = String(getCompletedList().length);
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

  function renderPickList(filter = "") {
    const q = filter.trim().toLowerCase();
    const items = !q ? library : library.filter((v) => (v.ref + " " + v.text).toLowerCase().includes(q));
    if (!items.length) {
      els.pickList.innerHTML = `<div class="empty">No results.</div>`;
      return;
    }
    els.pickList.innerHTML = items
      .slice(0, 200)
      .map(
        (v) => `
      <button class="itemBtn" type="button" data-ref="${escapeHTML(v.ref)}">
        <div class="itemRef">${escapeHTML(v.ref)}</div>
        <div class="itemText">${escapeHTML(v.text)}</div>
      </button>
    `
      )
      .join("");
    els.pickList.querySelectorAll(".itemBtn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const ref = btn.getAttribute("data-ref");
        const verse = library.find((x) => x.ref === ref);
        if (verse) startGame(verse, "pick");
      });
    });
  }

  function renderMyVerses() {
    const items = getCompletedList().slice().reverse();
    if (!items.length) {
      els.myList.innerHTML = `<div class="empty">No completed verses yet. Finish a verse and it will show up here.</div>`;
      return;
    }
    els.myList.innerHTML = items
      .map(
        (v) => `
      <button class="itemBtn" type="button" data-key="${escapeHTML(v.key)}">
        <div class="itemRef">${escapeHTML(v.ref)}</div>
        <div class="itemText">${escapeHTML(v.text)}</div>
      </button>
    `
      )
      .join("");
    els.myList.querySelectorAll(".itemBtn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const key = btn.getAttribute("data-key");
        const found = items.find((x) => x.key === key);
        if (found) startGame({ ref: found.ref, text: found.text }, "pick");
      });
    });
  }

  function initState(verse, mode) {
    const tokens = normalizeTokens(verse.text);
    const wordIdx = tokens.map((t, i) => (isWordToken(t) ? i : -1)).filter((i) => i >= 0);

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
    };
  }

  function saveProgress() {
    if (!state) return;
    saveLS(LS.progressPrefix + state.key, {
      mode: state.mode,
      verse: state.verse,
      step: state.step,
      revealed: Array.from(state.revealed),
    });
  }
  function loadProgress(verse) {
    const key = getVerseKey(verse);
    const payload = loadLS(LS.progressPrefix + key, null);
    if (!payload || typeof payload !== "object") return null;
    if (!payload.verse || payload.verse.ref !== verse.ref) return null;
    return payload;
  }
  function clearProgress(verse) {
    localStorage.removeItem(LS.progressPrefix + getVerseKey(verse));
  }

  function startGame(verse, mode) {
    const existing = loadProgress(verse);
    state = initState(verse, mode);
    state.hint = null;
    if (existing) {
      state.step = Math.max(1, Math.min(state.hiddenIdx.length, +existing.step || 1));
      state.revealed = new Set((existing.revealed || []).filter((n) => Number.isInteger(n)));
    }
    els.gameRef.textContent = verse.ref;
    els.gameMode.textContent = mode === "daily" ? `Today: ${todayISO()}` : "Practice (doesn't affect streak)";
    renderStats();
    showView("game");
    setActiveNav(mode === "daily" ? els.navDaily : els.navPick);
    renderGame();
  }

  function currentHiddenSlice() {
    const n = Math.min(state.step, state.hiddenIdx.length);
    return state.hiddenIdx.slice(0, n);
  }

  function renderVerseWithBlanks() {
    const hideSet = new Set(currentHiddenSlice());
    const parts = state.tokens.map((t, i) => {
      if (hideSet.has(i) && !state.revealed.has(i)) return `<span class="blank">____</span>`;
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

  function nextExpectedIndex() {
    const slice = currentHiddenSlice();
    for (const idx of slice) if (!state.revealed.has(idx)) return idx;
    return null;
  }

  function buildPills() {
    const slice = currentHiddenSlice();
    const remaining = slice.filter((i) => !state.revealed.has(i));
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

  function renderGame() {
    if (!state) return;

    els.stepLabel.textContent = `Step ${state.step} of ${state.hiddenIdx.length}`;
    els.verseBox.innerHTML = renderVerseWithBlanks();

    const expected = nextExpectedIndex();
    if (expected === null) {
      // Finished current step. Either advance to the next (with MORE blanks) or complete the verse.
      if (state.step >= state.hiddenIdx.length) {
        els.pillRow.innerHTML = "";
        els.stepLabel.textContent = "Complete 🎉";
        onVerseComplete();
        celebrateAndGoHome();
        return;
      }

      state.step += 1;

      // IMPORTANT: each step is a fresh attempt with more blanks.
      // So we clear revealed words for the new step (kids are rebuilding the verse each time).
      state.revealed.clear();
      state.hint = null;

      saveProgress();
      renderGame();
      return;
    }

    const built = buildPills();
    if (!built) return;
    const { correctWord, correctIdx, pills } = built;

    els.pillRow.innerHTML = pills
      .map((w) => {
        const hinted = state.hint && w === state.hint;
        return `
      <button class="pill${hinted ? " hint" : ""}" type="button" data-word="${escapeHTML(w)}">${escapeHTML(w)}</button>
    `;
      })
      .join("");

    els.pillRow.querySelectorAll(".pill").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (state.locked) return;
        state.locked = true;
        state.hint = null;

        const w = btn.getAttribute("data-word") || "";
        const ok = w === correctWord;
        btn.classList.add(ok ? "good" : "bad");

        if (ok) {
          state.revealed.add(correctIdx);
          saveProgress();
          setTimeout(() => {
            state.locked = false;
            renderGame();
          }, 430);
        } else {
          setTimeout(() => {
            btn.classList.remove("bad");
            state.locked = false;
          }, 420);
        }
      });
    });
  }

  function hintNext() {
    if (!state) return;
    const idx = nextExpectedIndex();
    if (idx === null) return;
    // Highlight the correct pill (kid still taps it).
    state.hint = state.tokens[idx];
    renderGame();
  }

  function resetStep() {
    if (!state) return;
    const slice = currentHiddenSlice();
    for (const idx of slice) state.revealed.delete(idx);
    state.hint = null;
    saveProgress();
    renderGame();
  }

  function startOver() {
    if (!state) return;
    state.step = 1;
    state.revealed.clear();
    state.hint = null;
    clearProgress(state.verse);
    saveProgress();
    renderGame();
  }

  
  function celebrateAndGoHome() {
    // A quick, kid-friendly celebration then return to Home.
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

    // Auto-return home after the animation.
    setTimeout(() => {
      overlay.remove();
      setActiveNav(els.navHome);
      showView("home");
      renderStats();
      renderToday();
    }, 1200);
  }

  function onVerseComplete() {
    addCompleted(state.verse);
    if (state.mode === "daily") setStreakOnComplete(todayISO());
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
      if (todayVerse) startGame(todayVerse, "daily");
    });
    els.navPick.addEventListener("click", () => {
      setActiveNav(els.navPick);
      showView("pick");
      renderPickList(els.pickSearch.value || "");
    });
    els.navVerses.addEventListener("click", () => {
      setActiveNav(els.navVerses);
      showView("verses");
      renderMyVerses();
    });

    els.homeDaily.addEventListener("click", () => {
      setActiveNav(els.navDaily);
      if (todayVerse) startGame(todayVerse, "daily");
    });
    els.homePick.addEventListener("click", () => {
      setActiveNav(els.navPick);
      showView("pick");
      renderPickList("");
      els.pickSearch.focus();
    });

    els.pickSearch.addEventListener("input", () => {
      renderPickList(els.pickSearch.value || "");
    });

    els.btnHint.addEventListener("click", hintNext);
    els.btnResetStep.addEventListener("click", resetStep);
    els.btnStartOver.addEventListener("click", startOver);
  }

  async function boot() {
    const stamp =
      window.__THW_BUILD__ && typeof window.__THW_BUILD__ === "object"
        ? window.__THW_BUILD__
        : { version: "?", built: "?" };
    els.healthVersion.textContent = `${stamp.version} · built ${stamp.built}`;

    try {
      const count = await loadVerses();
      els.healthVerses.textContent = String(count);
      els.healthStatus.textContent = "OK";
      todayVerse = pickDaily(todayISO());
      renderToday();
      renderStats();
      setActiveNav(els.navHome);
      showView("home");
      console.log("[THW] boot", stamp, "verses:", count);
    } catch (err) {
      els.healthStatus.textContent = "ERROR";
      els.todayRef.textContent = "Could not load verses";
      els.todayText.textContent = String(err && err.message ? err.message : err);
      console.error(err);
    }
  }

  wire();
  boot();
})();
