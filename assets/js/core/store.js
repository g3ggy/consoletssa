/* =====================================================================
   store.js — stato persistente (localStorage), immutabile in lettura.
   Ogni scrittura produce un nuovo oggetto: niente mutazioni in-place.
   ===================================================================== */

const KEY = 'consoletssa.v1';

const DEFAULTS = Object.freeze({
  theme: 'monitor',
  read: {},          // { 'cap-3': timestamp }  capitoli marcati come letti
  lastChapter: null, // slug ultimo capitolo aperto
  srs: {},           // { cardId: {box:1..5, due:ts, seen:n, ok:n, ko:n} }
  runs: [],          // storico simulazioni [{id, ts, score, max, seconds, errors:[]}]
  rhythmQuiz: { seen: 0, ok: 0, per: {} },   // per: { fv: {seen, ok}, ... }
  streak: { last: null, days: 0 },
  audio: { muto: false },      // i toni del monitor
});

let state = load();
const listeners = new Set();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULTS };
    const parsed = JSON.parse(raw);
    return { ...DEFAULTS, ...parsed };
  } catch (err) {
    console.warn('[store] stato illeggibile, riparto dai valori di default', err);
    return { ...DEFAULTS };
  }
}

function persist(next) {
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch (err) {
    // quota piena o storage disabilitato (navigazione privata): l'app continua
    // a funzionare in memoria, ma va detto.
    console.warn('[store] salvataggio non riuscito', err);
    return false;
  }
  return true;
}

/** Legge lo stato corrente (sola lettura: non modificarlo direttamente). */
export const getState = () => state;

/** Applica un aggiornamento immutabile e notifica gli iscritti. */
export function update(patch) {
  const delta = typeof patch === 'function' ? patch(state) : patch;
  const next = { ...state, ...delta };
  state = next;
  persist(next);
  listeners.forEach((fn) => {
    try { fn(next); } catch (err) { console.error('[store] listener in errore', err); }
  });
  return next;
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function resetAll() {
  state = { ...DEFAULTS };
  try { localStorage.removeItem(KEY); } catch { /* ignorato */ }
  listeners.forEach((fn) => fn(state));
}

/* ------------------------------ tema -------------------------------- */
export function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  update({ theme });
}

/* ---------------------------- capitoli ------------------------------ */
export function markRead(slug, read = true) {
  update((s) => {
    const next = { ...s.read };
    if (read) next[slug] = Date.now(); else delete next[slug];
    return { read: next };
  });
  touchStreak();
}

export const isRead = (slug) => Boolean(state.read[slug]);

/* ------------------------------- SRS -------------------------------- */
/* Leitner a 5 scatole: intervalli in giorni 0 / 1 / 3 / 7 / 21.
   grade: 'ko' (torna a 1) · 'quasi' (resta) · 'ok' (sale di una). */
const INTERVALS = [0, 1, 3, 7, 21];

export function gradeCard(cardId, grade) {
  update((s) => {
    const prev = s.srs[cardId] || { box: 1, due: 0, seen: 0, ok: 0, ko: 0 };
    let box = prev.box;
    if (grade === 'ok') box = Math.min(5, box + 1);
    else if (grade === 'ko') box = 1;
    const days = INTERVALS[box - 1];
    return {
      srs: {
        ...s.srs,
        [cardId]: {
          box,
          due: Date.now() + days * 86400000,
          seen: prev.seen + 1,
          ok: prev.ok + (grade === 'ok' ? 1 : 0),
          ko: prev.ko + (grade === 'ko' ? 1 : 0),
          last: Date.now(),
        },
      },
    };
  });
  touchStreak();
}

/** Carte da ripassare adesso: mai viste prima, oppure scadute. */
export function dueCards(allIds) {
  const now = Date.now();
  const srs = state.srs;
  const fresh = allIds.filter((id) => !srs[id]);
  const due = allIds.filter((id) => srs[id] && srs[id].due <= now);
  return { fresh, due, total: fresh.length + due.length };
}

export function boxCounts(allIds) {
  const counts = [0, 0, 0, 0, 0];
  allIds.forEach((id) => {
    const c = state.srs[id];
    if (c) counts[c.box - 1] += 1;
  });
  return counts;
}

/* --------------------------- simulazioni ---------------------------- */
export function saveRun(run) {
  update((s) => ({ runs: [...s.runs, { ...run, ts: Date.now() }].slice(-120) }));
  touchStreak();
}

/* ---------------------------- quiz ritmi ---------------------------- */
export function recordRhythmAnswer(correct, ritmo) {
  update((s) => {
    const per = { ...(s.rhythmQuiz.per || {}) };
    if (ritmo) {
      const prima = per[ritmo] || { seen: 0, ok: 0 };
      per[ritmo] = { seen: prima.seen + 1, ok: prima.ok + (correct ? 1 : 0) };
    }
    return {
      rhythmQuiz: {
        seen: s.rhythmQuiz.seen + 1,
        ok: s.rhythmQuiz.ok + (correct ? 1 : 0),
        per,
      },
    };
  });
  touchStreak();
}

/* ------------------------------ streak ------------------------------ */
function dayKey(ts = Date.now()) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function touchStreak() {
  const today = dayKey();
  const { last, days } = state.streak;
  if (last === today) return;
  const yesterday = dayKey(Date.now() - 86400000);
  update({ streak: { last: today, days: last === yesterday ? days + 1 : 1 } });
}

export { dayKey };
