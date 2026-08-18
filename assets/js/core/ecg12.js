/* =====================================================================
   ecg12.js — ECG a 12 derivazioni su carta millimetrata, stampabile.

   Il tracciato è DIDATTICO: le dodici derivazioni sono ricostruite da
   una morfologia comune, con l'ampiezza e la polarità tipiche di ogni
   derivazione e, dove il caso lo prevede, lo slivellamento del tratto ST
   nelle derivazioni corrette. Serve a riconoscere un quadro, non a
   refertare.

   Velocità 25 mm/s, ampiezza 10 mm/mV, come sulla carta vera.
   ===================================================================== */

import { el } from './dom.js';

/* Ampiezza relativa e polarità di ogni derivazione. */
const DERIVAZIONI = [
  { id: 'I', amp: 0.70 }, { id: 'aVR', amp: -0.60 }, { id: 'V1', amp: -0.45 }, { id: 'V4', amp: 1.35 },
  { id: 'II', amp: 1.00 }, { id: 'aVL', amp: 0.35 }, { id: 'V2', amp: 0.90 }, { id: 'V5', amp: 1.10 },
  { id: 'III', amp: 0.50 }, { id: 'aVF', amp: 0.78 }, { id: 'V3', amp: 1.20 }, { id: 'V6', amp: 0.80 },
];

/* Quali derivazioni "guardano" ogni parete: serve per gli slivellamenti. */
const PARETI = {
  inferiore: ['II', 'III', 'aVF'],
  anteriore: ['V1', 'V2', 'V3', 'V4'],
  laterale: ['I', 'aVL', 'V5', 'V6'],
};

export const PATTERN_ECG = {
  normale: {
    label: 'Nessuna alterazione acuta',
    st: {},
    referto: 'Ritmo sinusale. Nessuna alterazione acuta della ripolarizzazione.',
  },
  'stemi-inferiore': {
    label: 'Sopraslivellamento ST inferiore',
    st: { inferiore: +0.28, laterale: -0.12 },
    referto: 'Sopraslivellamento del tratto ST in DII, DIII e aVF, con sottoslivellamento speculare in DI e aVL. Quadro compatibile con infarto miocardico acuto della parete inferiore.',
  },
  'stemi-anteriore': {
    label: 'Sopraslivellamento ST anteriore',
    st: { anteriore: +0.32 },
    referto: 'Sopraslivellamento del tratto ST da V1 a V4. Quadro compatibile con infarto miocardico acuto della parete anteriore.',
  },
  ischemia: {
    label: 'Sottoslivellamento ST',
    st: { anteriore: -0.2, laterale: -0.16 },
    referto: 'Sottoslivellamento del tratto ST nelle derivazioni anteriori e laterali. Quadro compatibile con ischemia miocardica.',
  },
  fa: {
    label: 'Fibrillazione atriale',
    st: {}, senzaP: true, irregolare: true,
    referto: 'Assenza di onde P, intervalli R-R irregolari. Fibrillazione atriale a risposta ventricolare media.',
  },
};

/** Spostamento del tratto ST per una singola derivazione. */
function stDi(derivazione, pattern) {
  let st = 0;
  Object.entries(pattern.st || {}).forEach(([parete, valore]) => {
    if (PARETI[parete]?.includes(derivazione)) st += valore;
  });
  return st;
}

/* Morfologia di un battito: p va da 0 a 1. Ampiezze in mV. */
function battito(p, { amp, st, senzaP }) {
  const seg = (v) => v * amp;
  if (p < 0.10) return st * 0;
  if (p < 0.18) return senzaP ? 0 : seg(0.13) * Math.sin(((p - 0.10) / 0.08) * Math.PI);
  if (p < 0.30) return 0;
  if (p < 0.335) return seg(-0.09) * ((p - 0.30) / 0.035);
  if (p < 0.375) return seg(-0.09 + 1.19 * ((p - 0.335) / 0.04));
  if (p < 0.425) return seg(1.10 - 1.42 * ((p - 0.375) / 0.05));
  if (p < 0.47) return seg(-0.32 + 0.32 * ((p - 0.425) / 0.045)) + st * ((p - 0.425) / 0.045);
  if (p < 0.60) return st;                                        // tratto ST
  if (p < 0.86) return st + seg(0.26) * Math.sin(((p - 0.60) / 0.26) * Math.PI);
  return 0;
}

/**
 * Disegna il referto su un canvas.
 * @param {object} opzioni  { pattern, fc, paziente, ora }
 */
export function disegnaEcg12(canvas, opzioni = {}) {
  const pattern = PATTERN_ECG[opzioni.pattern] || PATTERN_ECG.normale;
  const fc = Math.max(30, Math.min(220, opzioni.fc || 75));

  const L = 940;      // larghezza del foglio in px
  const H = 620;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = L * dpr; canvas.height = H * dpr;
  canvas.style.width = '100%';
  const c = canvas.getContext('2d');
  c.setTransform(dpr, 0, 0, dpr, 0, 0);

  /* carta millimetrata */
  c.fillStyle = '#FFF8F6';
  c.fillRect(0, 0, L, H);
  const mm = 4;                       // un millimetro = 4 px
  c.lineWidth = 1;
  for (let x = 0; x <= L; x += mm) {
    c.strokeStyle = (x / mm) % 5 === 0 ? 'rgba(214,120,120,.55)' : 'rgba(214,120,120,.22)';
    c.beginPath(); c.moveTo(x + .5, 0); c.lineTo(x + .5, H); c.stroke();
  }
  for (let y = 0; y <= H; y += mm) {
    c.strokeStyle = (y / mm) % 5 === 0 ? 'rgba(214,120,120,.55)' : 'rgba(214,120,120,.22)';
    c.beginPath(); c.moveTo(0, y + .5); c.lineTo(L, y + .5); c.stroke();
  }

  /* intestazione */
  c.fillStyle = '#1B2A38';
  c.font = '600 15px ui-monospace, monospace';
  c.fillText(opzioni.paziente || 'PAZIENTE — ECG A 12 DERIVAZIONI', 12, 22);
  c.font = '12px ui-monospace, monospace';
  c.fillText(`${opzioni.ora || ''}   FC ${Math.round(fc)}/min   25 mm/s   10 mm/mV`, 12, 40);

  /* dodici riquadri, quattro colonne per tre righe */
  const colonne = 4;
  const righe = 3;
  const margineX = 12;
  const cima = 58;
  const largCol = (L - margineX * 2) / colonne;
  const altRiga = 118;
  const pxPerSec = 25 * mm;           // 25 mm/s
  const mvPerPx = 10 * mm;            // 10 mm/mV

  DERIVAZIONI.forEach((d, i) => {
    const col = i % colonne;
    const rig = Math.floor(i / colonne);
    const x0 = margineX + col * largCol;
    const yBase = cima + rig * altRiga + altRiga / 2;
    const st = stDi(d.id, pattern);

    c.fillStyle = '#1B2A38';
    c.font = '600 12px ui-monospace, monospace';
    c.fillText(d.id, x0 + 4, yBase - altRiga / 2 + 16);

    /* impulso di taratura: un gradino da 1 mV */
    c.strokeStyle = '#101820'; c.lineWidth = 1.4;
    c.beginPath();
    c.moveTo(x0 + 4, yBase);
    c.lineTo(x0 + 10, yBase);
    c.lineTo(x0 + 10, yBase - mvPerPx * 0.6);
    c.lineTo(x0 + 20, yBase - mvPerPx * 0.6);
    c.lineTo(x0 + 20, yBase);
    c.stroke();

    c.beginPath();
    const inizio = x0 + 24;
    const fine = x0 + largCol - 6;
    const periodo = 60 / fc;
    for (let x = inizio; x < fine; x += 1) {
      const t = (x - inizio) / pxPerSec;
      const p = (t % periodo) / periodo;
      const v = battito(p, { amp: d.amp, st, senzaP: pattern.senzaP });
      const y = yBase - v * mvPerPx;
      if (x === inizio) c.moveTo(x, y); else c.lineTo(x, y);
    }
    c.stroke();
  });

  /* striscia lunga di DII in fondo */
  const yStriscia = cima + righe * altRiga + 42;
  c.fillStyle = '#1B2A38';
  c.font = '600 12px ui-monospace, monospace';
  c.fillText('II', margineX + 4, yStriscia - 30);
  c.strokeStyle = '#101820'; c.lineWidth = 1.4;
  c.beginPath();
  const periodo = 60 / fc;
  for (let x = margineX + 24; x < L - margineX; x += 1) {
    const t = (x - margineX - 24) / pxPerSec;
    const p = (t % periodo) / periodo;
    const v = battito(p, { amp: 1, st: stDi('II', pattern), senzaP: pattern.senzaP });
    const y = yStriscia - v * mvPerPx;
    if (x === margineX + 24) c.moveTo(x, y); else c.lineTo(x, y);
  }
  c.stroke();

  return pattern;
}

/**
 * Costruisce il foglio completo, con intestazione, referto e stampa.
 * @param {object} caso   scenario in corso (per nome e pattern)
 */
/* Per stampare solo il tracciato lo si sposta temporaneamente in fondo
   al body: le regole @media print nascondono tutto il resto. */
function stampa(foglio) {
  const dove = foglio.parentNode;
  const segnaposto = document.createComment('ecg');
  dove.replaceChild(segnaposto, foglio);
  document.body.append(foglio);
  const ripristina = () => {
    segnaposto.parentNode?.replaceChild(foglio, segnaposto);
    window.removeEventListener('afterprint', ripristina);
  };
  window.addEventListener('afterprint', ripristina);
  window.print();
  setTimeout(ripristina, 1500);
}

export function foglioEcg12(dati = {}) {
  const canvas = el('canvas.ecg-carta', { 'aria-label': 'Tracciato ECG a 12 derivazioni' });
  const pattern = PATTERN_ECG[dati.pattern] || PATTERN_ECG.normale;

  const foglio = el('div.ecg-foglio', {}, [
    el('div.ecg-testa', {}, [
      el('b', { text: 'ECG a 12 derivazioni' }),
      el('span', { text: dati.paziente || '' }),
      el('span.spacer'),
      el('button.btn.sm', {
        type: 'button',
        onclick: () => stampa(foglio),
      }, ['Stampa il tracciato']),
    ]),
    el('div.ecg-carta-box', {}, [canvas]),
    el('div.ecg-referto', {}, [
      el('div.t', { text: 'lettura' }),
      el('p', { text: pattern.referto }),
      el('p.ecg-nota', { text: 'Tracciato didattico ricostruito: serve a riconoscere il quadro, non ha valore diagnostico. La lettura definitiva è del sanitario.' }),
    ]),
  ]);

  // il canvas si disegna quando è nel documento, così prende le misure
  setTimeout(() => disegnaEcg12(canvas, dati), 0);
  return foglio;
}
