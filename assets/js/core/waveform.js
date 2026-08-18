/* =====================================================================
   waveform.js — motore dei tracciati (ECG e respiro).
   Il disegno è "a spazzata" come sui monitor veri: un cursore avanza da
   sinistra a destra e riscrive la traccia, con una finestra di
   cancellazione davanti a sé.
   ===================================================================== */

import { createCanvasHost } from './dom.js';

/* --------------------------- morfologia ECG ------------------------- */
/* p = fase 0..1 all'interno di un ciclo cardiaco. Ampiezze in "mm". */
function pqrst(p, { pWave = 1, qrs = 1, tWave = 1 } = {}) {
  if (p < 0.10) return 0;
  if (p < 0.18) return pWave * 5 * Math.sin(((p - 0.10) / 0.08) * Math.PI);   // onda P
  if (p < 0.30) return 0;                                                      // PR
  if (p < 0.335) return qrs * -6 * ((p - 0.30) / 0.035);                       // Q
  if (p < 0.375) return qrs * (-6 + 58 * ((p - 0.335) / 0.04));                // R
  if (p < 0.425) return qrs * (52 - 66 * ((p - 0.375) / 0.05));                // S
  if (p < 0.47) return qrs * (-14 + 14 * ((p - 0.425) / 0.045));               // ritorno
  if (p < 0.60) return 0;                                                      // ST
  if (p < 0.86) return tWave * 11 * Math.sin(((p - 0.60) / 0.26) * Math.PI);   // onda T
  return 0;
}

/**
 * Definizione dei ritmi. `rate` è in bpm; `jitter` rende irregolare
 * l'intervallo R-R (fibrillazione atriale); `custom` sostituisce del
 * tutto la morfologia.
 */
export const RHYTHMS = {
  sinusale: {
    label: 'Ritmo sinusale', short: 'Sinusale', rate: 74, color: '#34D399',
    shock: false, perfusing: true,
    desc: 'Attività elettrica organizzata, ogni QRS preceduto da un\'onda P, e una pompa efficace. Il paziente ha un polso.',
    teach: 'È il riferimento: 60-100 bpm, complessi stretti e regolari.',
  },
  tachicardia: {
    label: 'Tachicardia sinusale', short: 'Tachicardia', rate: 148, color: '#F2B441',
    shock: false, perfusing: true,
    desc: 'Oltre 100 bpm. Da sola non dice nulla: va letta insieme alla pressione. Se la PA è crollata, la tachicardia è il compenso, non la malattia.',
    teach: 'Cerca la causa: dolore, febbre, ipovolemia, ipossia, ansia, sostanze.',
  },
  bradicardia: {
    label: 'Bradicardia', short: 'Bradicardia', rate: 40, color: '#5AA9E6',
    shock: false, perfusing: true,
    desc: 'Sotto 60 bpm. Può essere fisiologica nell\'atleta, oppure tono vagale, farmaci (betabloccanti, digitale) o un blocco di conduzione.',
    teach: 'Diventa un problema quando non regge la pressione: guarda coscienza e cute.',
  },
  fa: {
    label: 'Fibrillazione atriale', short: 'FA', rate: 110, color: '#A98BE0',
    shock: false, perfusing: true, jitter: 0.34, pWave: 0,
    desc: 'Nessuna onda P e intervalli R-R completamente irregolari. Il polso è aritmico e spesso più lento del battito centrale.',
    teach: 'Rilevante nel ragguaglio: questi pazienti sono quasi sempre in terapia anticoagulante.',
  },
  tv: {
    label: 'Tachicardia ventricolare senza polso', short: 'TV', rate: 190, color: '#E0243C',
    shock: true, perfusing: false, custom: (p) => 26 * Math.sin(p * 2 * Math.PI) + 8 * Math.sin(p * 4 * Math.PI + 1),
    desc: 'Complessi larghi, regolari e rapidi. L\'attività elettrica è organizzata ma inefficace: nessuna gittata, nessun polso.',
    teach: 'È defibrillabile. Con polso è un\'altra storia clinica: qui parliamo della forma in arresto.',
  },
  fv: {
    label: 'Fibrillazione ventricolare', short: 'FV', rate: 300, color: '#E0243C',
    shock: true, perfusing: false, chaotic: true,
    desc: 'Attività elettrica caotica: il cuore "vermicola" e non pompa. È il ritmo più frequente nell\'arresto cardiaco improvviso dell\'adulto.',
    teach: 'Trovarla significa che l\'arresto è recente. Defibrillazione appena disponibile.',
  },
  pea: {
    label: 'Attività elettrica senza polso (PEA)', short: 'PEA', rate: 58, color: '#F2B441',
    shock: false, perfusing: false, qrs: 0.75, tWave: 0.6,
    desc: 'Sul monitor si vede un ritmo che sembra organizzato, ma il paziente non ha polso. Il monitor non dice se c\'è gittata: lo dice il paziente.',
    teach: 'Non defibrillabile: RCP e ricerca delle cause reversibili.',
  },
  asistolia: {
    label: 'Asistolia', short: 'Asistolia', rate: 0, color: '#8FA3B0',
    shock: false, perfusing: false, flat: true,
    desc: 'Nessuna attività elettrica. In genere indica un arresto che dura da oltre 4-5 minuti. Prognosi nettamente peggiore.',
    teach: 'Non defibrillabile. Prima di dichiararla, verifica derivazioni e guadagno.',
  },
};

export const RHYTHM_KEYS = Object.keys(RHYTHMS);

/* ------------------------- generatore di valori --------------------- */
export function createEcgSource(kindKey) {
  let kind = kindKey;
  let phase = 0;         // fase nel ciclo corrente 0..1
  let cycleScale = 1;    // moltiplicatore per la irregolarità R-R
  let chaosT = 0;

  function advance(dt) {
    const r = RHYTHMS[kind];
    chaosT += dt;
    if (r.flat) return;
    const period = 60 / Math.max(1, r.rate) * cycleScale;
    phase += dt / period;
    while (phase >= 1) {
      phase -= 1;
      cycleScale = r.jitter ? 1 + (Math.random() * 2 - 1) * r.jitter : 1;
    }
  }

  function value() {
    const r = RHYTHMS[kind];
    if (r.flat) return Math.sin(chaosT * 7.1) * 0.9 + Math.sin(chaosT * 23) * 0.4;
    if (r.chaotic) {
      const t = chaosT * 9;
      return 17 * Math.sin(t * 1.43 + 1.3) + 11 * Math.sin(t * 3.52)
           + 7 * Math.sin(t * 5.9 + 2.1) + 4 * Math.sin(t * 8.8);
    }
    if (r.custom) return r.custom(phase);
    return pqrst(phase, { pWave: r.pWave ?? 1, qrs: r.qrs ?? 1, tWave: r.tWave ?? 1 });
  }

  return {
    advance,
    value,
    get phase() { return phase; },
    get kind() { return kind; },
    set kind(k) { if (RHYTHMS[k]) { kind = k; phase = 0; cycleScale = 1; } },
  };
}

/* --------------------------- render a spazzata ---------------------- */
/**
 * @param {HTMLCanvasElement} canvas
 * @param {object} opts  kind, speed (px/s), amp, grid, onBeat
 */
export function createScope(canvas, opts = {}) {
  const src = createEcgSource(opts.kind || 'sinusale');
  const onBeat = opts.onBeat || null;
  let fasePrec = 0;
  let color = opts.color || RHYTHMS[src.kind].color;
  let speed = opts.speed || 130;
  let amp = opts.amp ?? 1;
  const showGrid = opts.grid !== false;

  let samples = new Float32Array(0);
  let cursor = 0;
  let filled = 0;

  const host = createCanvasHost(canvas, {
    onResize({ w }) {
      samples = new Float32Array(Math.max(2, w));
      cursor = 0; filled = 0;
    },
    onFrame({ ctx, w, h, dt, forced }) {
      if (!forced) {
        const steps = Math.max(1, Math.round(speed * dt));
        const subDt = dt / steps;
        for (let s = 0; s < steps; s += 1) {
          src.advance(subDt);
          samples[cursor] = src.value();
          cursor = (cursor + 1) % w;
          filled = Math.min(filled + 1, w);

          /* il picco R passa a fase 0,375: è lì che il monitor emette
             il tono, quindi suono e disegno restano in sincrono */
          if (onBeat) {
            const f = src.phase;
            if (fasePrec < 0.375 && f >= 0.375) onBeat(src.kind);
            fasePrec = f;
          }
        }
      }
      draw(ctx, w, h);
    },
  });

  function draw(ctx, w, h) {
    ctx.clearRect(0, 0, w, h);

    if (showGrid) {
      ctx.strokeStyle = 'rgba(52,211,153,.06)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = 0; x < w; x += 16) { ctx.moveTo(x + .5, 0); ctx.lineTo(x + .5, h); }
      for (let y = 0; y < h; y += 16) { ctx.moveTo(0, y + .5); ctx.lineTo(w, y + .5); }
      ctx.stroke();
    }

    const mid = h * 0.58;
    const k = (h / 130) * amp;

    ctx.strokeStyle = color;
    ctx.lineWidth = 1.9;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.beginPath();
    let started = false;
    for (let x = 0; x < w; x += 1) {
      // la finestra davanti al cursore resta vuota: è la "scia" del monitor
      const ahead = (x - cursor + w) % w;
      if (ahead > 0 && ahead < 14) { started = false; continue; }
      if (filled < w && x > cursor) { started = false; continue; }
      const y = mid - samples[x] * k;
      if (started) ctx.lineTo(x, y); else { ctx.moveTo(x, y); started = true; }
    }
    ctx.stroke();

    // testina luminosa
    const hx = (cursor - 1 + w) % w;
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.95;
    ctx.beginPath();
    ctx.arc(hx, mid - samples[hx] * k, 2.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  return {
    host,
    get kind() { return src.kind; },
    setRhythm(key, nextColor) {
      src.kind = key;
      color = nextColor || RHYTHMS[key].color;
      host.redraw();
    },
    setSpeed(v) { speed = v; },
    destroy() { host.destroy(); },
  };
}

/* ========================= PLETISMOGRAFIA ============================ */
/* La traccia del saturimetro: un'onda pulsatile con incisura dicrota,
   sincronizzata con la frequenza cardiaca. Non è un secondo ECG. */
export function createPlethScope(canvas, opts = {}) {
  let rate = opts.rate || 75;
  let color = opts.color || '#41A9F0';
  let t = 0;
  let samples = new Float32Array(0);
  let cursor = 0, filled = 0;

  const valore = (tempo) => {
    const p = ((tempo * rate) / 60) % 1;
    if (p < 0.18) return Math.sin((p / 0.18) * (Math.PI / 2));          // salita rapida
    if (p < 0.42) return Math.cos(((p - 0.18) / 0.24) * 1.1) * 0.72 + 0.24;
    if (p < 0.52) return 0.34 + Math.sin(((p - 0.42) / 0.1) * Math.PI) * 0.1;  // incisura
    return Math.max(0, 0.34 * (1 - (p - 0.52) / 0.48));
  };

  const host = createCanvasHost(canvas, {
    onResize({ w }) { samples = new Float32Array(Math.max(2, w)); cursor = 0; filled = 0; },
    onFrame({ ctx, w, h, dt, forced }) {
      if (!forced) {
        const steps = Math.max(1, Math.round(90 * dt));
        for (let i = 0; i < steps; i += 1) {
          t += dt / steps;
          samples[cursor] = valore(t);
          cursor = (cursor + 1) % w;
          filled = Math.min(filled + 1, w);
        }
      }
      ctx.clearRect(0, 0, w, h);
      ctx.strokeStyle = color; ctx.lineWidth = 1.8; ctx.lineJoin = 'round';
      ctx.beginPath();
      let started = false;
      const base = h * 0.88, k = h * 0.72;
      for (let x = 0; x < w; x += 1) {
        const ahead = (x - cursor + w) % w;
        if (ahead > 0 && ahead < 12) { started = false; continue; }
        if (filled < w && x > cursor) { started = false; continue; }
        const y = base - samples[x] * k;
        if (started) ctx.lineTo(x, y); else { ctx.moveTo(x, y); started = true; }
      }
      ctx.stroke();
    },
  });

  return {
    host,
    setRate(v) { rate = Math.max(20, v || 75); },
    setColor(c) { color = c; },
    destroy() { host.destroy(); },
  };
}

/* ============================== RESPIRO ============================== */
export const BREATHS = {
  normale: {
    label: 'Respiro normale', color: '#34D399', rate: 14,
    desc: 'Da 12 a 16 atti al minuto nell\'adulto. Il torace si espande in modo simmetrico, c\'è flusso d\'aria, il paziente completa le frasi.',
    signs: ['Frasi complete senza pause', 'Nessun muscolo accessorio', 'SpO₂ 95-100%'],
    action: 'Nessuna azione immediata sul respiro: prosegui la valutazione.',
    verdict: 'ok',
  },
  bradipnea: {
    label: 'Bradipnea', color: '#5AA9E6', rate: 7,
    desc: 'Sotto 9-10 atti al minuto. Spesso da depressione del centro del respiro: oppiacei, trauma cranico, intossicazioni, coma.',
    signs: ['Atti radi e profondi o superficiali', 'Spesso coscienza alterata', 'Rischio di ipercapnia'],
    action: 'Ossigeno, monitoraggio stretto, pronto a ventilare con pallone.',
    verdict: 'warn',
  },
  dispnea: {
    label: 'Dispnea / tachipnea', color: '#F2B441', rate: 30,
    desc: 'Oltre 24 atti al minuto e superficiale. Il paziente usa i muscoli accessori, parla a frasi spezzate, spesso è ortopnoico (seduto, proteso in avanti).',
    signs: ['Frasi spezzate', 'Alette nasali, tirage, muscoli accessori', 'Posizione ortopnoica'],
    action: 'Ossigeno e posizione seduta. Non farlo sdraiare per prendergli la pressione.',
    verdict: 'warn',
  },
  gasping: {
    label: 'Gasping — respiro agonico', color: '#E0243C', rate: 5,
    desc: 'Boccheggia rumorosamente a intervalli lunghi e irregolari, ma non c\'è espansione toracica efficace né flusso d\'aria. NON è respiro.',
    signs: ['Boccheggia a bocca aperta, poi lunghe pause', 'Nessun movimento toracico efficace', 'Paziente incosciente'],
    action: 'È un arresto cardiaco: RCP immediata e DAE. Non aspettare "se riprende".',
    verdict: 'alarm',
  },
};

export function createBreathScope(canvas, opts = {}) {
  let mode = opts.mode || 'normale';
  let t = 0;
  let samples = new Float32Array(0);
  let cursor = 0, filled = 0;

  function val(time) {
    const b = BREATHS[mode];
    const cyc = (time * b.rate) / 60;
    const p = cyc % 1;
    if (mode === 'gasping') {
      // boccheggio breve seguito da una pausa lunga
      return p < 0.14 ? Math.sin((p / 0.14) * Math.PI) * 0.92 : Math.max(0, 0.04 * Math.sin(p * 14));
    }
    if (mode === 'dispnea') {
      return (Math.sin(p * Math.PI * 2 - Math.PI / 2) * 0.5 + 0.5) * 0.55 + Math.sin(p * 26) * 0.05;
    }
    if (mode === 'bradipnea') {
      return p < 0.6 ? Math.sin((p / 0.6) * Math.PI) * 0.88 : 0;
    }
    return Math.sin(p * Math.PI * 2 - Math.PI / 2) * 0.5 + 0.5;
  }

  const host = createCanvasHost(canvas, {
    onResize({ w }) { samples = new Float32Array(Math.max(2, w)); cursor = 0; filled = 0; },
    onFrame({ ctx, w, h, dt, forced }) {
      if (!forced) {
        const steps = Math.max(1, Math.round(70 * dt));
        for (let s = 0; s < steps; s += 1) {
          t += dt / steps;
          samples[cursor] = val(t);
          cursor = (cursor + 1) % w;
          filled = Math.min(filled + 1, w);
        }
      }
      const b = BREATHS[mode];
      ctx.clearRect(0, 0, w, h);
      ctx.strokeStyle = 'rgba(90,169,230,.07)';
      ctx.beginPath();
      for (let x = 0; x < w; x += 22) { ctx.moveTo(x + .5, 0); ctx.lineTo(x + .5, h); }
      ctx.stroke();

      const base = h * 0.86, k = h * 0.64;
      ctx.strokeStyle = b.color; ctx.lineWidth = 2.3; ctx.lineJoin = 'round';
      ctx.beginPath();
      let started = false;
      for (let x = 0; x < w; x += 1) {
        const ahead = (x - cursor + w) % w;
        if (ahead > 0 && ahead < 12) { started = false; continue; }
        if (filled < w && x > cursor) { started = false; continue; }
        const y = base - samples[x] * k;
        if (started) ctx.lineTo(x, y); else { ctx.moveTo(x, y); started = true; }
      }
      ctx.stroke();
    },
  });

  return {
    host,
    get mode() { return mode; },
    get level() { return val(t); },
    setMode(m) { mode = m; host.redraw(); },
    destroy() { host.destroy(); },
  };
}
