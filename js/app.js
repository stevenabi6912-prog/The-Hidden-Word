// Verse Ladder — client-only, GitHub Pages friendly
// No accounts. No leaderboards. Just a gentle daily habit.

const STOPWORDS = new Set([
  "the","and","of","to","in","that","is","it","for","on","with","as","be","are","was","were",
  "a","an","at","by","from","or","but","not","this","these","those","his","her","their","thy",
  "ye","you","your","our","we","us","he","she","they","them","him","i","me","my","mine",
  "shall","unto","hath","have","had","do","did","doth","may","might","will","would","can","could",
  "there","here","then","than","when","where","who","whom","which","what","why","how"
]);

const ENCOURAGEMENTS = [
  "Nice work. Keep going — one word at a time.",
  "Steady steps build strong memory.",
  "That’s it. Let it sink in for a moment.",
  "You’re doing the kind of work that lasts.",
  "Small wins add up.",
  "Good! Now try the next word.",
  "Keep the pace friendly. You’re learning."
];

const LS = {
  completed: "verseLadder:completed",
  streak: "verseLadder:streak",
  progressPrefix: "verseLadder:progress:",   // + YYYY-MM-DD (daily) OR "practice:<verseId>"
  lastMode: "verseLadder:lastMode"
};

const els = {
  verseRef: document.getElementById("verseRef"),
  verseDate: document.getElementById("verseDate"),
  verseText: document.getElementById("verseText"),
  pills: document.getElementById("pills"),
  hintBtn: document.getElementById("hintBtn"),
  resetStepBtn: document.getElementById("resetStepBtn"),
  startOverBtn: document.getElementById("startOverBtn"),
  progressLabel: document.getElementById("progressLabel"),
  progressDots: document.getElementById("progressDots"),
  encourageText: document.getElementById("encourageText"),
  streakCount: document.getElementById("streakCount"),
  modeBadge: document.getElementById("modeBadge"),
  myVersesBtn: document.getElementById("myVersesBtn"),
  practiceBtn: document.getElementById("practiceBtn"),

  modalOverlay: document.getElementById("modalOverlay"),
  myVersesModal: document.getElementById("myVersesModal"),
  closeModalBtn: document.getElementById("closeModalBtn"),
  closeModalBtn2: document.getElementById("closeModalBtn2"),
  completedList: document.getElementById("completedList"),
  emptyState: document.getElementById("emptyState"),

  practiceModal: document.getElementById("practiceModal"),
  practiceList: document.getElementById("practiceList"),
  practiceSearch: document.getElementById("practiceSearch"),
  closePracticeBtn: document.getElementById("closePracticeBtn"),
  closePracticeBtn2: document.getElementById("closePracticeBtn2"),
};

let VERSE_DATA = null;
let current = null; // game state object

// ---------- Utilities ----------
function clamp(n, a, b){ return Math.max(a, Math.min(b, n)); }

function todayISO(){
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,"0");
  const day = String(d.getDate()).padStart(2,"0");
  return `${y}-${m}-${day}`;
}

function parseISO(iso){
  const [y,m,d] = iso.split("-").map(Number);
  return new Date(y, m-1, d);
}

function daysBetween(aISO, bISO){
  const a = parseISO(aISO);
  const b = parseISO(bISO);
  const ms = 24*60*60*1000;
  return Math.floor((Date.UTC(b.getFullYear(),b.getMonth(),b.getDate()) - Date.UTC(a.getFullYear(),a.getMonth(),a.getDate()))/ms);
}

function seedFromString(str){
  // xmur3 + mulberry32-ish
  let h = 1779033703 ^ str.length;
  for (let i=0;i<str.length;i++){
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return function(){
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return h >>> 0;
  };
}
function mulberry32(seed){
  return function(){
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function shuffle(arr, rnd){
  const a = arr.slice();
  for (let i=a.length-1;i>0;i--){
    const j = Math.floor(rnd()*(i+1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function choice(arr, rnd){
  return arr[Math.floor(rnd()*arr.length)];
}

function safeJSONParse(s, fallback){
  try{
    if (s === null || s === undefined) return fallback;
    const v = JSON.parse(s);
    return (v === null || v === undefined) ? fallback : v;
  } catch {
    return fallback;
  }
}

function saveLS(key, val){ localStorage.setItem(key, JSON.stringify(val)); }
function loadLS(key, fallback){
  const v = safeJSONParse(localStorage.getItem(key), fallback);
  return (v === null || v === undefined) ? fallback : v;
}

// ---------- Verse tokenization & rendering ----------
function tokenize(text){
  // Tokens: words (letters/digits with optional apostrophe), or punctuation.
  // Keeps punctuation as separate tokens, so blanks don't eat commas/colons.
  const re = /([A-Za-z0-9]+(?:['’][A-Za-z0-9]+)?)|([^\w\s])/g;
  const out = [];
  let m;
  while ((m = re.exec(text)) !== null){
    if (m[1]) out.push({type:"word", raw:m[1]});
    else if (m[2]) out.push({type:"punc", raw:m[2]});
  }
  // also keep spaces by reconstructing from original? We'll render with spaces between
  // words and punctuation rules.
  return out;
}

function joinTokens(tokens, renderWord){
  // Render with good spacing:
  // - space between word-word, word-(opening quote?) etc
  // - no space before punctuation like , . : ; ? ! )
  // - no space after opening punctuation like (
  const noSpaceBefore = new Set([",",".",":",";","?","!","’","'"]);
  const noSpaceAfter = new Set(["(","[","{","“","‘"]);
  let html = "";
  for (let i=0;i<tokens.length;i++){
    const t = tokens[i];
    const prev = tokens[i-1];
    const prevRaw = prev?.raw;
    const raw = t.raw;

    const needSpace =
      i>0 &&
      prev &&
      !noSpaceAfter.has(prevRaw) &&
      !noSpaceBefore.has(raw);

    if (needSpace) html += " ";

    if (t.type === "word"){
      html += renderWord(i, t.raw);
    } else {
      html += `<span class="punc">${escapeHTML(raw)}</span>`;
    }
  }
  return html;
}

function escapeHTML(s){
  return s.replaceAll("&","&amp;")
          .replaceAll("<","&lt;")
          .replaceAll(">","&gt;")
          .replaceAll('"',"&quot;");
}

function getWordTokenIndices(tokens){
  const idxs = [];
  for (let i=0;i<tokens.length;i++){
    if (tokens[i].type === "word") idxs.push(i);
  }
  return idxs;
}

// ---------- Step plan ----------
function buildStepPlan(verse, dateKey){
  const tokens = tokenize(verse.text);
  const wordTokenIdxs = getWordTokenIndices(tokens);

  const seedFn = seedFromString(`${dateKey}|${verse.ref}|${verse.text.length}`);
  const rnd = mulberry32(seedFn());

  // Rank candidate words: prefer longer, non-stopwords first.
  const candidates = wordTokenIdxs.map((ti, order) => {
    const w = tokens[ti].raw;
    const lower = w.toLowerCase();
    const isStop = STOPWORDS.has(lower);
    const len = w.length;
    // score: long words > short, stopwords later
    const score = (isStop ? 0 : 1000) + len*10 + rnd(); // rnd breaks ties
    return { tokenIndex: ti, word: w, lower, score };
  });

  candidates.sort((a,b)=> b.score - a.score);

  const totalWords = wordTokenIdxs.length;
  const maxStep = totalWords; // you asked: up to the entire verse

  // stepBlanks[k] = array of tokenIndices blanked at step k (1-based)
  const stepBlanks = [];
  const picked = [];
  for (let k=1;k<=maxStep;k++){
    // pick the next best candidate not already picked
    const next = candidates[k-1];
    picked.push(next.tokenIndex);
    const blanks = picked.slice().sort((a,b)=>a-b);
    stepBlanks.push(blanks);
  }

  return { tokens, wordTokenIdxs, maxStep, stepBlanks };
}

function initStateForVerse(verse, dateKey, mode){
  const plan = buildStepPlan(verse, dateKey);
  const seedFn = seedFromString(`pills|${dateKey}|${verse.ref}`);
  const rnd = mulberry32(seedFn());

  return {
    mode, // "daily" or "practice"
    dateKey,
    verseId: verse.ref, // simple id
    verse,
    plan,
    step: 1,
    filled: {}, // tokenIndex -> word
    nextBlankCursor: 0, // within current blanks list
    hintsUsed: 0,
    completed: false,
    rndSeed: seedFn(), // stable for pill shuffles
    rndOffset: 0,
  };
}

function progressKey(state){
  if (state.mode === "daily") return `${LS.progressPrefix}${state.dateKey}`;
  return `${LS.progressPrefix}practice:${state.verseId}`;
}

function saveProgress(){
  if (!current) return;
  const payload = {
    mode: current.mode,
    dateKey: current.dateKey,
    verseId: current.verseId,
    step: current.step,
    filled: current.filled,
    nextBlankCursor: current.nextBlankCursor,
    hintsUsed: current.hintsUsed,
    completed: current.completed,
  };
  saveLS(progressKey(current), payload);
}

function loadProgressFor(state){
  const payload = loadLS(progressKey(state), null);
  if (!payload) return state;
  // only trust progress if same verse
  if (payload.verseId !== state.verseId) return state;

  state.step = clamp(payload.step ?? 1, 1, state.plan.maxStep);
  state.filled = payload.filled ?? {};
  state.nextBlankCursor = payload.nextBlankCursor ?? 0;
  state.hintsUsed = payload.hintsUsed ?? 0;
  state.completed = !!payload.completed;
  return state;
}

// ---------- Daily verse selection ----------
function getDailyVerse(todayKey){
  const start = VERSE_DATA.startDate;
  const verses = VERSE_DATA.verses;
  const idx = ((daysBetween(start, todayKey) % verses.length) + verses.length) % verses.length;
  return { verse: verses[idx], index: idx };
}

// ---------- Rendering ----------
function setModeBadge(){
  els.modeBadge.textContent = current.mode === "daily" ? "Daily" : "Practice";
}

function renderVerse(){
  const { tokens } = current.plan;
  const blanks = current.plan.stepBlanks[current.step - 1];
  // Next blank order is left-to-right (sorted)
  const nextBlankIndex = blanks[current.nextBlankCursor];

  const html = joinTokens(tokens, (tokenIndex, word) => {
    if (blanks.includes(tokenIndex)){
      const filledWord = current.filled[tokenIndex];
      if (filledWord){
        return `<span class="filled">${escapeHTML(filledWord)}</span>`;
      } else {
        // show a friendly blank bubble
        const isNext = tokenIndex === nextBlankIndex;
        const label = isNext ? "next blank" : "blank";
        return `<span class="blank" data-token="${tokenIndex}" aria-label="${label}">_____</span>`;
      }
    }
    return `<span class="word">${escapeHTML(word)}</span>`;
  });

  els.verseText.innerHTML = html;
}

function renderProgress(){
  els.progressLabel.textContent = current.completed
    ? "Completed today 🎉"
    : `Step ${current.step} of ${current.plan.maxStep}`;

  const maxDots = Math.min(current.plan.maxStep, 12);
  els.progressDots.innerHTML = "";
  for (let i=1;i<=maxDots;i++){
    const d = document.createElement("div");
    d.className = "dot" + (i <= Math.ceil((current.step/current.plan.maxStep)*maxDots) ? " on" : "");
    els.progressDots.appendChild(d);
  }
}

function rndForPills(){
  // deterministic but changes a bit as you advance
  const base = current.rndSeed + current.step*1337 + current.rndOffset*17;
  return mulberry32(base >>> 0);
}

function nextRequiredWord(){
  const blanks = current.plan.stepBlanks[current.step - 1];
  const tokenIndex = blanks[current.nextBlankCursor];
  if (tokenIndex == null) return null;
  return current.plan.tokens[tokenIndex].raw;
}

function buildPillWords(){
  // Always include the correct next word.
  const correct = nextRequiredWord();
  if (!correct) return [];

  const rnd = rndForPills();
  const tokens = current.plan.tokens;

  // Candidate decoys: other words in verse that are not the correct one and not already filled.
  const used = new Set([correct.toLowerCase()]);
  const decoys = [];

  // Pull from verse first
  const verseWords = current.plan.wordTokenIdxs
    .map(i => tokens[i].raw)
    .filter(w => w && w.toLowerCase() !== correct.toLowerCase());

  const shuffled = shuffle(verseWords, rnd);
  for (const w of shuffled){
    const lw = w.toLowerCase();
    if (used.has(lw)) continue;
    used.add(lw);
    decoys.push(w);
    if (decoys.length >= 3) break;
  }

  // If still short, add some gentle common decoys
  const commons = ["the","and","of","to","in","that","unto","shall","hath","ye"];
  const shuffledC = shuffle(commons, rnd);
  for (const w of shuffledC){
    if (used.has(w)) continue;
    used.add(w);
    decoys.push(w);
    if (decoys.length >= 4) break;
  }

  const all = [correct, ...decoys.slice(0,4)];
  return shuffle(all, rnd);
}

function renderPills(){
  els.pills.innerHTML = "";
  const words = buildPillWords();

  // If completed, no pills
  if (current.completed){
    els.pillsLabel = "Done!";
    return;
  }

  for (const w of words){
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "pill";
    btn.textContent = w;
    btn.addEventListener("click", () => onPillClick(btn, w));
    els.pills.appendChild(btn);
  }
}

function setEncouragement(text=null){
  const msg = text ?? choice(ENCOURAGEMENTS, rndForPills());
  els.encourageText.textContent = msg;
}

// ---------- Game actions ----------
function markCompletedIfDone(){
  if (current.step !== current.plan.maxStep) return false;

  const blanks = current.plan.stepBlanks[current.step - 1];
  for (const t of blanks){
    if (!current.filled[t]) return false;
  }

  current.completed = true;
  saveProgress();

  if (current.mode === "daily"){
    // Add to completed list (idempotent for the day)
    const completed = loadLS(LS.completed, []);
    const existing = completed.find(x => x.dateKey === current.dateKey);
    if (!existing){
      completed.unshift({
        dateKey: current.dateKey,
        ref: current.verse.ref,
        text: current.verse.text,
        hintsUsed: current.hintsUsed
      });
      saveLS(LS.completed, completed);
    }
    updateStreakOnCompletion(current.dateKey);
  }

  renderAll();
  setEncouragement("Completed! Let it sit in your mind for a moment. ✨");
  return true;
}

function advanceStepIfStepDone(){
  const blanks = current.plan.stepBlanks[current.step - 1];
  // Find first unfilled blank cursor
  let cursor = 0;
  while (cursor < blanks.length && current.filled[blanks[cursor]]) cursor++;
  current.nextBlankCursor = cursor;

  if (cursor >= blanks.length){
    // Step complete
    if (current.step < current.plan.maxStep){
      current.step++;
      current.nextBlankCursor = 0;
      // Keep existing filled words (they remain filled in later steps)
      current.rndOffset++;
      saveProgress();
      renderAll();
      setEncouragement();
    } else {
      markCompletedIfDone();
    }
  } else {
    saveProgress();
    renderAll();
  }
}

function onPillClick(btn, word){
  if (current.completed) return;

  const correct = nextRequiredWord();
  if (!correct) return;

  if (word.toLowerCase() === correct.toLowerCase()){
    btn.classList.remove("wrong");
    btn.classList.add("correct");
    setTimeout(()=>btn.classList.remove("correct"), 800);

    // Fill the next blank
    const blanks = current.plan.stepBlanks[current.step - 1];
    const tokenIndex = blanks[current.nextBlankCursor];
    current.filled[tokenIndex] = correct;

    // Move cursor forward
    current.nextBlankCursor++;
    saveProgress();

    // re-render (shows word pop-in)
    renderAll();

    // if step done, move forward
    advanceStepIfStepDone();
  } else {
    btn.classList.remove("correct");
    btn.classList.add("wrong");
    setTimeout(()=>btn.classList.remove("wrong"), 800);
    setEncouragement("Close! Try a different word.");
  }
}

function onHint(){
  if (current.completed) return;
  const correct = nextRequiredWord();
  if (!correct) return;

  current.hintsUsed++;
  // Fill directly without needing click
  const blanks = current.plan.stepBlanks[current.step - 1];
  const tokenIndex = blanks[current.nextBlankCursor];
  current.filled[tokenIndex] = correct;
  current.nextBlankCursor++;
  saveProgress();
  renderAll();
  setEncouragement("Hint used — nice. Now keep going.");
  advanceStepIfStepDone();
}

function resetStep(){
  if (!current) return;
  const blanks = current.plan.stepBlanks[current.step - 1];
  for (const t of blanks){
    delete current.filled[t];
  }
  current.nextBlankCursor = 0;
  current.completed = false;
  current.rndOffset++;
  saveProgress();
  renderAll();
  setEncouragement("Step reset. No worries — go again.");
}

function startOver(){
  if (!current) return;
  current.step = 1;
  current.filled = {};
  current.nextBlankCursor = 0;
  current.hintsUsed = 0;
  current.completed = false;
  current.rndOffset++;
  saveProgress();
  renderAll();
  setEncouragement("Fresh start. One word at a time.");
}

// ---------- Completed list / Modals ----------
function openModal(modalEl){
  els.modalOverlay.hidden = false;
  modalEl.hidden = false;
  document.body.style.overflow = "hidden";
}
function closeModal(modalEl){
  modalEl.hidden = true;
  // If no other modal open, hide overlay
  const anyOpen = !els.myVersesModal.hidden || !els.practiceModal.hidden;
  if (!anyOpen) els.modalOverlay.hidden = true;
  document.body.style.overflow = "";
}

function renderCompletedList(){
  const completed = loadLS(LS.completed, []);
  els.completedList.innerHTML = "";

  els.emptyState.hidden = completed.length !== 0;

  for (const item of completed){
    const row = document.createElement("div");
    row.className = "rowItem";

    const left = document.createElement("div");
    left.className = "rowLeft";
    left.innerHTML = `
      <div class="rowRef">${escapeHTML(item.ref)}</div>
      <div class="rowMeta">Completed: ${escapeHTML(item.dateKey)} • Hints used: ${item.hintsUsed ?? 0}</div>
    `;

    const btns = document.createElement("div");
    btns.className = "rowBtns";

    const viewBtn = document.createElement("button");
    viewBtn.type = "button";
    viewBtn.className = "smallBtn";
    viewBtn.textContent = "View";
    viewBtn.addEventListener("click", () => {
      alert(`${item.ref}\n\n${item.text}\n\nCompleted: ${item.dateKey}`);
    });

    const practiceBtn = document.createElement("button");
    practiceBtn.type = "button";
    practiceBtn.className = "smallBtn primary";
    practiceBtn.textContent = "Practice";
    practiceBtn.addEventListener("click", () => {
      closeModal(els.myVersesModal);
      loadPracticeVerse({ref:item.ref, text:item.text});
    });

    btns.appendChild(viewBtn);
    btns.appendChild(practiceBtn);

    row.appendChild(left);
    row.appendChild(btns);
    els.completedList.appendChild(row);
  }
}

function openMyVerses(){
  renderCompletedList();
  openModal(els.myVersesModal);
}

function buildPracticeList(filterText=""){
  const q = filterText.trim().toLowerCase();
  const verses = VERSE_DATA.verses;
  const list = [];

  for (const v of verses){
    const hay = (v.ref + " " + v.text).toLowerCase();
    if (!q || hay.includes(q)) list.push(v);
  }
  return list;
}

function renderPracticePicker(){
  els.practiceList.innerHTML = "";
  const verses = buildPracticeList(els.practiceSearch.value ?? "");
  for (const v of verses){
    const row = document.createElement("div");
    row.className = "rowItem";

    const left = document.createElement("div");
    left.className = "rowLeft";
    left.innerHTML = `
      <div class="rowRef">${escapeHTML(v.ref)}</div>
      <div class="rowMeta">${escapeHTML(v.text.slice(0, 90))}${v.text.length>90 ? "…" : ""}</div>
    `;

    const btns = document.createElement("div");
    btns.className = "rowBtns";

    const pickBtn = document.createElement("button");
    pickBtn.type = "button";
    pickBtn.className = "smallBtn primary";
    pickBtn.textContent = "Open";
    pickBtn.addEventListener("click", () => {
      closeModal(els.practiceModal);
      loadPracticeVerse(v);
    });

    btns.appendChild(pickBtn);
    row.appendChild(left);
    row.appendChild(btns);
    els.practiceList.appendChild(row);
  }
}

function openPracticePicker(){
  els.practiceSearch.value = "";
  renderPracticePicker();
  openModal(els.practiceModal);
  els.practiceSearch.focus();
}

function loadPracticeVerse(verse){
  const dateKey = `practice-${todayISO()}`; // stable enough for plan seed; not used for streak
  current = initStateForVerse(verse, dateKey, "practice");
  current = loadProgressFor(current);
  saveLS(LS.lastMode, { mode:"practice", verseId: verse.ref, verseText: verse.text });
  renderAll();
}

// ---------- Streak ----------
function getYesterdayISO(todayKey){
  const d = parseISO(todayKey);
  d.setDate(d.getDate()-1);
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,"0");
  const day = String(d.getDate()).padStart(2,"0");
  return `${y}-${m}-${day}`;
}

function updateStreakOnCompletion(dateKey){
  const s = loadLS(LS.streak, { currentStreak:0, lastCompletedDate:null });

  if (s.lastCompletedDate === dateKey){
    // already counted today
    saveLS(LS.streak, s);
    renderStreak();
    return;
  }

  const yest = getYesterdayISO(dateKey);
  if (s.lastCompletedDate === yest){
    s.currentStreak = (s.currentStreak || 0) + 1;
  } else {
    s.currentStreak = 1;
  }
  s.lastCompletedDate = dateKey;

  saveLS(LS.streak, s);
  renderStreak();
}

function renderStreak(){
  const s = loadLS(LS.streak, { currentStreak:0, lastCompletedDate:null });
  els.streakCount.textContent = String(s.currentStreak || 0);
}

// ---------- Main render ----------
function renderAll(){
  setModeBadge();
  els.verseRef.textContent = current.verse.ref;

  if (current.mode === "daily"){
    els.verseDate.textContent = `Today: ${current.dateKey}`;
  } else {
    els.verseDate.textContent = `Practice mode (no streak impact)`;
  }

  renderVerse();
  renderProgress();
  renderPills();
  renderStreak();

  // hint button state
  els.hintBtn.disabled = current.completed;
  els.resetStepBtn.disabled = current.completed;
}

async function loadData(){
  const url = new URL("./data/verses.json", window.location.href);
  const res = await fetch(url.toString(), { cache:"no-store" });
  if (!res.ok) throw new Error(`HTTP ${res.status} loading ${url}`);
  const txt = await res.text();
  try{
    VERSE_DATA = JSON.parse(txt);
  } catch (e){
    throw new Error(`Invalid JSON in ${url}: ${e.message}`);
  }
}


function restoreLastModeOrDaily(){
  const todayKey = todayISO();
  const { verse } = getDailyVerse(todayKey);
  current = initStateForVerse(verse, todayKey, "daily");
  current = loadProgressFor(current);
  saveLS(LS.lastMode, { mode:"daily" });
  renderAll();
  setEncouragement();
}

function wireUI(){
  els.hintBtn.addEventListener("click", onHint);
  els.resetStepBtn.addEventListener("click", resetStep);
  els.startOverBtn.addEventListener("click", startOver);

  els.myVersesBtn.addEventListener("click", openMyVerses);
  els.closeModalBtn.addEventListener("click", () => closeModal(els.myVersesModal));
  els.closeModalBtn2.addEventListener("click", () => closeModal(els.myVersesModal));

  els.practiceBtn.addEventListener("click", openPracticePicker);
  els.closePracticeBtn.addEventListener("click", () => closeModal(els.practiceModal));
  els.closePracticeBtn2.addEventListener("click", () => closeModal(els.practiceModal));

  els.practiceSearch.addEventListener("input", () => renderPracticePicker());

  els.modalOverlay.addEventListener("click", () => {
    if (!els.myVersesModal.hidden) closeModal(els.myVersesModal);
    if (!els.practiceModal.hidden) closeModal(els.practiceModal);
  });

  // Allow ESC to close modals
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape"){
      if (!els.myVersesModal.hidden) closeModal(els.myVersesModal);
      if (!els.practiceModal.hidden) closeModal(els.practiceModal);
    }
  });
}

// ---------- Boot ----------
(async function(){
  try{
    await loadData();
    wireUI();
    restoreLastModeOrDaily();
  } catch (err){
    console.error(err);
    els.verseRef.textContent = "Error";
    els.verseDate.textContent = "Could not load verse data.";
    els.verseText.textContent =
      "Check that data/verses.json exists next to index.html (same folder) and is valid JSON.\n" +
      "If you're opening the file directly (file://), use a local server or GitHub Pages.";
    // Clear UI bits so we don't show stale pills
    els.pills.innerHTML = "";
    // Keep navigation usable even if verse data fails to load
    els.hintBtn.disabled = true;
    els.resetStepBtn.disabled = true;
    els.startOverBtn.disabled = true;
  }
})();
