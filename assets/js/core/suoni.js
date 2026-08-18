/* =====================================================================
   suoni.js — i toni del monitor, sintetizzati dal browser.

   Non sono registrazioni del dispositivo: sono onde generate a runtime
   con le frequenze, i ritmi e le durate del monitor/defibrillatore.
   Nessun file da scaricare, nessun diritto di terzi.

   Specifiche seguite
   ------------------
   battito QRS      circa 0,1 s. 800 Hz con saturazione 98-100%, scende
                    a scatti fino a 200 Hz sotto l'85%
   allarme alto     1000 Hz, onda pura e stridula. Tre bip, micropausa,
                    altri due, poi 2,5 s di silenzio e si ripete
   allarme medio    450 Hz, onda quadra. Due bip lunghi, pausa di 4,5 s
   carica           tono che sale da 300 a 2500 Hz in tre secondi, poi
                    resta fisso a 2500 Hz finché non si eroga o si annulla
   metronomo RCP    104 al minuto, percussivo sui 180 Hz, attacco secco
                    e nessuna coda: non va confuso con un allarme
   ===================================================================== */

import { getState, update } from './store.js';

const VOLUME_BASE = 0.5;

let ctx = null;
let master = null;
let sbloccato = false;

function assicuraContesto() {
  if (ctx) {
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = muto() ? 0 : VOLUME_BASE;
  master.connect(ctx.destination);
  return ctx;
}

/* Il browser non fa partire l'audio finché l'utente non tocca qualcosa. */
if (typeof document !== 'undefined') {
  const sblocca = () => {
    if (sbloccato) return;
    sbloccato = true;
    assicuraContesto();
    document.removeEventListener('pointerdown', sblocca);
    document.removeEventListener('keydown', sblocca);
  };
  document.addEventListener('pointerdown', sblocca);
  document.addEventListener('keydown', sblocca);
}

const muto = () => Boolean(getState().audio?.muto);
export const audioMuto = muto;

export function setMuto(valore) {
  update({ audio: { ...(getState().audio || {}), muto: valore } });
  if (master) master.gain.value = valore ? 0 : VOLUME_BASE;
  if (valore) fermaTutto();
}

/* ------------------------- mattone di base -------------------------- */
function impulso({
  freq, durata, tipo = 'sine', volume = 0.3, quando = 0,
  glide = null, attacco = 0.004, coda = null,
}) {
  const c = assicuraContesto();
  if (!c || muto()) return null;
  const t0 = c.currentTime + quando;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = tipo;
  osc.frequency.setValueAtTime(freq, t0);
  if (glide) osc.frequency.linearRampToValueAtTime(glide, t0 + durata);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.linearRampToValueAtTime(volume, t0 + attacco);
  g.gain.setValueAtTime(volume, t0 + durata - (coda ?? Math.min(0.02, durata / 3)));
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + durata);
  osc.connect(g); g.connect(master);
  osc.start(t0);
  osc.stop(t0 + durata + 0.03);
  return { osc, g, t0 };
}

/* =========================== BATTITO (QRS) ========================== */
/* La frequenza scende a scatti con la saturazione, come sui monitor con
   tono variabile: è così che ci si accorge di una desaturazione senza
   guardare lo schermo. */
const SCALA_SPO2 = [
  [100, 800], [98, 800], [96, 730], [94, 670], [92, 590],
  [90, 500], [88, 420], [86, 320], [85, 250], [80, 210], [70, 200],
];

export function frequenzaBattito(spo2) {
  const s = Math.round(typeof spo2 === 'number' ? spo2 : 100);
  if (s >= 100) return 800;
  if (s <= 70) return 200;
  for (let i = 0; i < SCALA_SPO2.length - 1; i += 1) {
    const [sa, fa] = SCALA_SPO2[i];
    const [sb, fb] = SCALA_SPO2[i + 1];
    if (s <= sa && s >= sb) {
      const k = (s - sb) / (sa - sb || 1);
      return Math.round(fb + (fa - fb) * k);
    }
  }
  return 800;
}

export function battito(spo2) {
  impulso({ freq: frequenzaBattito(spo2), durata: 0.1, tipo: 'sine', volume: 0.3 });
}

/* ============================== ALLARMI ============================= */
const CONFIG_ALLARME = {
  alta: {
    freq: 1000, tipo: 'sine', volume: 0.24, durata: 0.09,
    /* tre bip, micropausa, altri due */
    tempi: [0, 0.13, 0.26, 0.47, 0.60],
    ripetiOgni: 3100,
  },
  media: {
    freq: 450, tipo: 'square', volume: 0.16, durata: 0.18,
    tempi: [0, 0.28],
    ripetiOgni: 4800,
  },
};

let ansaAllarme = null;
let livelloAllarme = null;

function salvaAllarme(livello) {
  const c = CONFIG_ALLARME[livello];
  if (!c) return;
  c.tempi.forEach((quando) => impulso({
    freq: c.freq, durata: c.durata, tipo: c.tipo, volume: c.volume, quando,
  }));
}

export function allarme(livello = 'alta') {
  if (livelloAllarme === livello) return;
  fermaAllarme();
  livelloAllarme = livello;
  salvaAllarme(livello);
  ansaAllarme = setInterval(() => salvaAllarme(livello), CONFIG_ALLARME[livello].ripetiOgni);
}

export function fermaAllarme() {
  if (ansaAllarme) clearInterval(ansaAllarme);
  ansaAllarme = null;
  livelloAllarme = null;
}

export const allarmeAttivo = () => livelloAllarme;

/* ====================== CARICA DEL DEFIBRILLATORE =================== */
/* Due fasi: la salita da 300 a 2500 Hz in tre secondi, poi il tono
   fisso che resta finché non si eroga la scarica o si annulla. */
let caricaNodi = null;

export function caricaDefibrillatore({ secondi = 3, poiFisso = true } = {}) {
  const c = assicuraContesto();
  if (!c || muto()) return;
  fermaCarica();
  const t0 = c.currentTime;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(300, t0);
  osc.frequency.linearRampToValueAtTime(2500, t0 + secondi);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.linearRampToValueAtTime(0.13, t0 + 0.05);
  osc.connect(g); g.connect(master);
  osc.start(t0);
  caricaNodi = { osc, g };

  if (!poiFisso) {
    g.gain.setValueAtTime(0.13, t0 + secondi);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + secondi + 0.1);
    osc.stop(t0 + secondi + 0.15);
    caricaNodi = null;
  }
}

/** Il tono fisso di carica pronta, continuo finché non lo si ferma. */
export function caricaPronta({ durataMassima = 20 } = {}) {
  const c = assicuraContesto();
  if (!c || muto()) return;
  fermaCarica();
  const t0 = c.currentTime;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(2500, t0);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.linearRampToValueAtTime(0.16, t0 + 0.03);
  osc.connect(g); g.connect(master);
  osc.start(t0);
  osc.stop(t0 + durataMassima);
  caricaNodi = { osc, g };
}

export function fermaCarica() {
  if (!caricaNodi || !ctx) return;
  const { osc, g } = caricaNodi;
  try {
    g.gain.cancelScheduledValues(ctx.currentTime);
    g.gain.setValueAtTime(g.gain.value, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.08);
    osc.stop(ctx.currentTime + 0.12);
  } catch { /* già fermato */ }
  caricaNodi = null;
}

/* ============================= METRONOMO ============================ */
/* Percussivo, non elettronico: attacco immediato, nessuna coda, timbro
   basso. Non deve somigliare a un allarme. */
export const BPM_RCP = 104;

let ansaMetronomo = null;
let prossimoClick = 0;

function clickPercussivo(quando = 0) {
  const c = assicuraContesto();
  if (!c || muto()) return;
  const t0 = c.currentTime + quando;

  /* corpo grave */
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(180, t0);
  osc.frequency.exponentialRampToValueAtTime(120, t0 + 0.05);
  g.gain.setValueAtTime(0.34, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.055);
  osc.connect(g); g.connect(master);
  osc.start(t0); osc.stop(t0 + 0.07);

  /* transiente secco che dà il "click" della bacchetta */
  const t = c.createOscillator();
  const tg = c.createGain();
  t.type = 'square';
  t.frequency.setValueAtTime(1400, t0);
  tg.gain.setValueAtTime(0.05, t0);
  tg.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.012);
  t.connect(tg); tg.connect(master);
  t.start(t0); t.stop(t0 + 0.02);
}

export function metronomo() { clickPercussivo(); }

/** Avvia il metronomo a 104 al minuto, con programmazione anticipata
    per non accumulare deriva. */
export function avviaMetronomo(bpm = BPM_RCP) {
  const c = assicuraContesto();
  if (!c) return;
  fermaMetronomo();
  const passo = 60 / bpm;
  prossimoClick = c.currentTime + 0.06;
  const programma = () => {
    if (!ctx) return;
    while (prossimoClick < ctx.currentTime + 0.25) {
      clickPercussivo(prossimoClick - ctx.currentTime);
      prossimoClick += passo;
    }
  };
  programma();
  ansaMetronomo = setInterval(programma, 90);
}

export function fermaMetronomo() {
  if (ansaMetronomo) clearInterval(ansaMetronomo);
  ansaMetronomo = null;
}

export const metronomoAttivo = () => Boolean(ansaMetronomo);

/* --------------------------- altri segnali -------------------------- */
/** Misurazione della pressione conclusa. */
export function nibpConclusa() {
  impulso({ freq: 1046, durata: 0.08, volume: 0.24 });
  impulso({ freq: 1318, durata: 0.1, volume: 0.24, quando: 0.12 });
}

/** Conferma di un comando. */
export function conferma() {
  impulso({ freq: 1400, durata: 0.04, tipo: 'square', volume: 0.14 });
}

export function fermaTutto() {
  fermaAllarme();
  fermaMetronomo();
  fermaCarica();
}
