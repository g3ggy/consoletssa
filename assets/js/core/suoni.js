/* =====================================================================
   suoni.js — i toni del monitor, sintetizzati.

   Non sono registrazioni del LIFEPAK: sono toni generati dal browser
   seguendo lo schema della norma IEC 60601-1-8, quella che detta come
   devono suonare gli allarmi degli apparecchi elettromedicali. Il
   risultato è riconoscibile e si comporta allo stesso modo — in
   particolare il tono del battito che si abbassa quando la saturazione
   scende, che è il motivo per cui in ambulanza ci si accorge di una
   desaturazione senza guardare il monitor.

   Niente file audio da scaricare, niente diritti di terzi.
   ===================================================================== */

import { getState, update } from './store.js';

let ctx = null;
let master = null;
let sbloccato = false;

/* Il browser non lascia partire l'audio finché l'utente non tocca
   qualcosa: si prepara al primo gesto, qualunque esso sia. */
function assicuraContesto() {
  if (ctx) {
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = 0.5;
  master.connect(ctx.destination);
  return ctx;
}

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

export const audioMuto = () => getState().audio?.muto !== false ? getState().audio?.muto ?? false : false;

export function setMuto(muto) {
  update({ audio: { ...(getState().audio || {}), muto } });
  if (master) master.gain.value = muto ? 0 : 0.5;
}

/** Un tono singolo. */
function tono({ freq = 880, durata = 0.06, tipo = 'sine', volume = 0.5, quando = 0, glide = null }) {
  const c = assicuraContesto();
  if (!c || audioMuto()) return;
  const t0 = c.currentTime + quando;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = tipo;
  osc.frequency.setValueAtTime(freq, t0);
  if (glide) osc.frequency.linearRampToValueAtTime(glide, t0 + durata);
  /* attacco e rilascio morbidi: un'onda troncata di netto fa "click" */
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(volume, t0 + 0.006);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + durata);
  osc.connect(g); g.connect(master);
  osc.start(t0);
  osc.stop(t0 + durata + 0.02);
}

/* --------------------------- battito cardiaco ---------------------- */
/* Il tono scende con la saturazione: 100% ≈ 880 Hz, 85% ≈ 590 Hz.
   È esattamente quello che fa il monitor vero, ed è la ragione per cui
   una desaturazione si sente prima di vederla. */
function frequenzaBattito(spo2) {
  const s = typeof spo2 === 'number' ? Math.max(70, Math.min(100, spo2)) : 100;
  return 560 + (s - 70) * 10.7;
}

export function battito(spo2) {
  tono({ freq: frequenzaBattito(spo2), durata: 0.055, tipo: 'sine', volume: 0.32 });
}

/* ------------------------------ allarmi ---------------------------- */
let ansaAllarme = null;
let livelloCorrente = null;

/** Salve di impulsi secondo lo schema della norma: cinque per l'alta
    priorità, tre per la media. */
function salva(livello) {
  const alta = livello === 'alta';
  const base = alta ? 960 : 620;
  const passi = alta ? [0, 0.14, 0.28, 0.56, 0.70] : [0, 0.16, 0.32];
  const scala = alta ? [0, 2, 4, 0, 2] : [0, 2, 4];
  passi.forEach((quando, i) => {
    tono({
      freq: base * (2 ** (scala[i] / 12)),
      durata: 0.1,
      tipo: 'square',
      volume: alta ? 0.22 : 0.16,
      quando,
    });
  });
}

export function allarme(livello = 'alta') {
  if (livelloCorrente === livello) return;
  fermaAllarme();
  livelloCorrente = livello;
  salva(livello);
  ansaAllarme = setInterval(() => salva(livello), livello === 'alta' ? 3000 : 6000);
}

export function fermaAllarme() {
  if (ansaAllarme) clearInterval(ansaAllarme);
  ansaAllarme = null;
  livelloCorrente = null;
}

/* --------------------------- altri segnali -------------------------- */
/** Misurazione della pressione conclusa: due note brevi. */
export function nibpConclusa() {
  tono({ freq: 1046, durata: 0.07, volume: 0.28 });
  tono({ freq: 1318, durata: 0.09, volume: 0.28, quando: 0.11 });
}

/** Carica del defibrillatore: tono che sale. */
export function caricaInCorso() {
  tono({ freq: 420, glide: 1250, durata: 1.6, tipo: 'sawtooth', volume: 0.12 });
}

/** Carica completa: tono continuo di pronto. */
export function caricaPronta() {
  for (let i = 0; i < 6; i += 1) {
    tono({ freq: 1250, durata: 0.14, tipo: 'square', volume: 0.16, quando: i * 0.18 });
  }
}

/** Conferma di un comando. */
export function conferma() {
  tono({ freq: 1400, durata: 0.035, tipo: 'square', volume: 0.14 });
}

/** Segnale del metronomo per le compressioni (110 al minuto). */
export function metronomo() {
  tono({ freq: 1800, durata: 0.03, tipo: 'square', volume: 0.2 });
}

export function fermaTutto() {
  fermaAllarme();
}
