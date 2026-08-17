/* =====================================================================
   intervento.js — interfaccia dell'intervento.

   Qui non ci sono regole cliniche: tutto quello che il paziente fa lo
   decide sim-engine.js. Questo modulo disegna il diario, il monitor, la
   squadra, la palette delle azioni e il debriefing.
   ===================================================================== */

import { el, mount, $, formatSeconds, clamp } from '../core/dom.js';
import { icon, toast, scoreRing } from '../core/ui.js';
import { navigate } from '../core/router.js';
import { createScope } from '../core/waveform.js';
import { setRibbonRhythm } from '../core/ribbon.js';
import { saveRun } from '../core/store.js';
import { creaIntervento } from '../core/sim-engine.js';
import { AZIONI, CATEGORIE, azioniDi } from '../data/azioni.js';
import { CASI, CASI_INDICE } from '../data/casi.js';

let sim = null;
let scope = null;
let n = null;              // riferimenti ai nodi che si aggiornano
let categoriaAperta = 'valutazione';
let paletteAperta = false;
let modalitaEsame = false;

const NOMI_MEMBRO = { tu: 'Tu', autista: 'Autista', infermiere: 'Infermiere' };

/* Quali parametri del monitor si rilevano con quale azione. */
const AZIONE_PER_PARAMETRO = {
  fc: 'monitor',
  pa: 'misura-pa',
  fr: 'conta-fr',
  spo2: 'monitor',
  temp: 'misura-temp',
  glicemia: 'misura-glicemia',
};

const PARAMETRI = [
  { k: 'fc', label: 'FC', unita: 'bpm', rif: '60-100' },
  { k: 'pa', label: 'PA', unita: 'mmHg', rif: '~120/80' },
  { k: 'fr', label: 'FR', unita: 'atti/min', rif: '12-16' },
  { k: 'spo2', label: 'SpO2', unita: '%', rif: '95-100' },
  { k: 'temp', label: 'T', unita: '°C', rif: '36-37' },
  { k: 'glicemia', label: 'Glicemia', unita: 'mg/dl', rif: '70-110' },
];

/* --------------------------- valutazioni --------------------------- */
function allarme(k, valore, stato) {
  if (valore === undefined || valore === null) return '';
  const num = parseFloat(String(valore));
  if (k === 'pa') {
    const sist = parseFloat(String(valore).split('/')[0]);
    if (sist < 90 || sist > 180) return 'alarm';
    if (sist < 100 || sist > 160) return 'warn';
    return '';
  }
  if (k === 'fc') { if (num > 140 || num < 45) return 'alarm'; if (num > 110 || num < 55) return 'warn'; return ''; }
  if (k === 'spo2') { if (num < 90) return 'alarm'; if (num < 95) return 'warn'; return ''; }
  if (k === 'fr') { if (num > 28 || num < 9) return 'alarm'; if (num > 22 || num < 11) return 'warn'; return ''; }
  if (k === 'glicemia') { if (num < 60 || num > 250) return 'alarm'; if (num < 70 || num > 180) return 'warn'; return ''; }
  if (k === 'temp') { if (num > 39 || num < 35) return 'alarm'; if (num > 37.5 || num < 36) return 'warn'; return ''; }
  return stato ? '' : '';
}

/* ============================== MONITOR ============================= */
function costruisciMonitor() {
  const canvas = el('canvas', { 'aria-label': 'Tracciato del monitor' });
  const griglia = el('div.vitals');
  const testataRitmo = el('span', { text: 'monitor non collegato' });
  const cronometro = el('b', { text: '0s' });

  const pannello = el('div.pmon', {}, [
    el('div.pmon-head', {}, [
      el('span.live'),
      el('span', { text: 'monitor paziente' }),
      el('span', { style: { flex: '1' } }),
      testataRitmo,
    ]),
    canvas,
    griglia,
    el('div.pmon-foot', {}, [
      el('span', {}, [document.createTextNode('sul posto da '), cronometro]),
      el('span', { style: { flex: '1' } }),
      el('span', { id: 'int-stato-paziente' }),
    ]),
  ]);

  return { pannello, canvas, griglia, testataRitmo, cronometro };
}

function aggiornaMonitor() {
  const s = sim.stato;
  const collegato = s.tag.includes('monitor');

  n.mon.testataRitmo.textContent = collegato ? `derivazione DII · ${s.ritmo}` : 'monitor non collegato';
  n.mon.cronometro.textContent = formatSeconds(sim.t);

  if (collegato && !scope) {
    scope = createScope(n.mon.canvas, { kind: s.ritmo, speed: 130, amp: 0.9 });
    setRibbonRhythm(s.ritmo);
  } else if (collegato && scope && scope.kind !== s.ritmo) {
    scope.setRhythm(s.ritmo);
    setRibbonRhythm(s.ritmo);
  }

  mount(n.mon.griglia, ...PARAMETRI.map((p) => {
    const val = sim.valore(p.k);
    const scaduta = sim.letturaScaduta(p.k);
    const eta = sim.etaLettura(p.k);
    const cls = ['vit'];
    if (val !== undefined && val !== null) cls.push('on');
    const stato = allarme(p.k, val, s);
    if (stato && !scaduta) cls.push(stato);
    if (scaduta && val !== undefined) cls.push('vecchia');

    const azione = AZIONE_PER_PARAMETRO[p.k];
    const nodo = el(`button.${cls.join('.')}`, {
      type: 'button',
      title: val === undefined || val === null
        ? `Non ancora rilevato — ${AZIONI[azione]?.label || ''}`
        : `Rilevato ${eta === 0 ? 'in continuo' : `${formatSeconds(eta)} fa`}`,
      onclick: () => eseguiRapido(azione),
    }, [
      el('div.k', {}, [p.label]),
      el('div.v', { html: (val === undefined || val === null) ? '— —' : `${val}<span class="u">${p.unita}</span>` }),
      el('div.ref', { text: scaduta && val !== undefined ? `${formatSeconds(eta)} fa · rifai` : p.rif }),
    ]);
    return nodo;
  }));

  const box = $('#int-stato-paziente', n.mon.pannello);
  if (box) {
    const testo = s.esito === 'morto' ? 'deceduto'
      : s.tag.includes('arresto') ? 'in arresto'
        : `coscienza ${s.coscienza}`;
    box.textContent = testo;
    box.style.color = s.esito === 'morto' || s.tag.includes('arresto') ? 'var(--cri)' : 'var(--ink-3)';
  }
}

/* ============================== SQUADRA ============================= */
function aggiornaSquadra() {
  mount(n.squadra, ...Object.entries(sim.squadra).map(([id, m]) => {
    const occupato = m.liberoA > sim.t;
    const az = m.azione ? AZIONI[m.azione] : null;
    return el(`div.membro${occupato ? '.occupato' : ''}`, {}, [
      el('b', { text: NOMI_MEMBRO[id] }),
      el('span', {
        text: occupato && az ? `${az.label} · ${m.liberoA - sim.t}s` : 'libero',
      }),
    ]);
  }));
}

/* =============================== DIARIO ============================= */
const ICONA_RIGA = {
  osservazione: '👁', azione: '›', squadra: '»', evento: '!', allarme: '⚠', esito: '■',
};

function aggiornaDiario() {
  mount(n.diario, ...sim.diario.map((r) => el(`div.riga.${r.tipo}`, {}, [
    el('span.ora', { text: formatSeconds(r.t) }),
    el('span.seg', { text: ICONA_RIGA[r.tipo] || '·' }),
    el('span.txt', { text: r.testo }),
  ])));
  n.diarioBox.scrollTop = n.diarioBox.scrollHeight;
}

/* ============================= DECISIONE ============================ */
function aggiornaDecisione() {
  const d = sim.decisionePendente;
  if (!d) { n.decisione.hidden = true; mount(n.decisione); return; }

  n.decisione.hidden = false;
  const opzioni = el('div.opts');
  const nodi = d.opzioni.map((o, idx) => {
    const b = el('button.opt', { type: 'button', 'data-key': String.fromCharCode(65 + idx) }, [o.t]);
    b.addEventListener('click', () => {
      if (opzioni.dataset.done) return;
      opzioni.dataset.done = '1';
      if (!modalitaEsame) {
        nodi.forEach((x, j) => {
          x.classList.add(d.opzioni[j].ok ? 'good' : 'bad');
          if (d.opzioni[j].w) x.append(el('span.why', { text: d.opzioni[j].w }));
        });
      } else {
        b.classList.add('chosen');
      }
      setTimeout(() => { sim.rispondiDecisione(idx); aggiornaTutto(); }, modalitaEsame ? 200 : 1400);
    });
    opzioni.append(b);
    return b;
  });

  mount(n.decisione,
    el('p.step-num', { style: { margin: '0' }, text: 'succede adesso' }),
    el('h3', { text: d.domanda }),
    opzioni);
}

/* ============================== PALETTE ============================= */
function eseguiRapido(id) {
  if (!id || !sim) return;
  const az = AZIONI[id];
  if (!az) return;
  const chi = az.chi.find((m) => sim.squadra[m]?.liberoA <= sim.t) || az.chi[0];
  esegui(id, chi);
}

function esegui(id, chi) {
  const esito = sim.esegui(id, chi);
  if (!esito.ok) { toast('Non ora', esito.motivo, 'warn'); return; }
  aggiornaTutto();
}

function aggiornaPalette() {
  const disponibili = sim.azioniDisponibili();
  const inCategoria = azioniDi(categoriaAperta)
    .filter((a) => disponibili.some((d) => d.id === a.id));

  mount(n.paletteTabs, ...CATEGORIE.map((c) => {
    const quante = azioniDi(c.id).filter((a) => disponibili.some((d) => d.id === a.id)).length;
    return el('button.pcat', {
      type: 'button',
      'aria-pressed': String(c.id === categoriaAperta),
      onclick: () => { categoriaAperta = c.id; aggiornaPalette(); },
      title: c.desc,
    }, [c.label, el('i', { text: String(quante) })]);
  }));

  if (!inCategoria.length) {
    mount(n.paletteLista, el('p.palette-vuota', { text: 'Niente da fare in questa categoria, adesso.' }));
    return;
  }

  mount(n.paletteLista, ...inCategoria.map((az) => {
    const liberi = sim.membriLiberi(az);
    const principale = liberi.includes('tu') ? 'tu' : liberi[0];
    const riga = el('div.pal-riga', {}, [
      el('div.az-testo', {}, [
        el('b', { text: az.label }),
        el('span', { text: az.spiega }),
      ]),
      el('div.az-meta', {}, [
        el('span.durata', { text: `${az.durata}s` }),
      ]),
    ]);

    const bottoni = el('div.az-btn');
    if (!principale) {
      bottoni.append(el('span.badge.b-no', { text: 'occupati' }));
    } else {
      bottoni.append(el('button.btn.sm.pri', {
        type: 'button',
        onclick: () => esegui(az.id, principale),
      }, [principale === 'tu' ? 'Fallo tu' : `Chiedi a ${NOMI_MEMBRO[principale].toLowerCase()}`]));

      liberi.filter((m) => m !== principale).forEach((m) => {
        bottoni.append(el('button.btn.sm', {
          type: 'button',
          onclick: () => esegui(az.id, m),
        }, [NOMI_MEMBRO[m]]));
      });
    }
    riga.append(bottoni);
    return riga;
  }));
}

/* ========================== BARRA DEL TEMPO ========================= */
function aggiornaTempo() {
  const durata = 15 * 60;
  const pct = clamp((sim.t / durata) * 100, 0, 100);
  n.tempoBarra.style.width = `${pct}%`;
  n.tempoTxt.textContent = formatSeconds(sim.t);
  mount(n.tempoTacche, ...sim.diario
    .filter((r) => r.tipo === 'evento' || r.tipo === 'allarme')
    .map((r) => el('i', {
      class: r.tipo === 'allarme' ? 'rossa' : '',
      style: { left: `${clamp((r.t / durata) * 100, 0, 100)}%` },
      title: `${formatSeconds(r.t)} — ${r.testo}`,
    })));
}

/* ============================ AGGIORNAMENTO ========================= */
function aggiornaTutto() {
  if (!sim || !n) return;
  aggiornaMonitor();
  aggiornaSquadra();
  aggiornaDiario();
  aggiornaDecisione();
  aggiornaPalette();
  aggiornaTempo();

  if (sim.stato.esito === 'morto') mostraDebriefing();
}

/* ============================ DEBRIEFING ============================ */
const ESITO_TESTO = {
  migliorato: { t: 'Paziente migliorato', cls: 'b-ok' },
  stabile: { t: 'Paziente stabile', cls: 'b-warn' },
  peggiorato: { t: 'Paziente peggiorato', cls: 'b-shock' },
  morto: { t: 'Paziente deceduto', cls: 'b-shock' },
};

/* Tre riquadri separati invece di un grafico solo: pressione, frequenza e
   saturazione hanno scale diverse, e sovrapporle su due assi è il modo
   più rapido per far leggere una cosa per un'altra. */
const SERIE = [
  { k: 'pas', label: 'Pressione sistolica', unita: 'mmHg', normale: [100, 180], fondo: [40, 200] },
  { k: 'fc', label: 'Frequenza cardiaca', unita: 'bpm', normale: [60, 100], fondo: [30, 190] },
  { k: 'spo2', label: 'Saturazione', unita: '%', normale: [94, 100], fondo: [70, 100] },
];

function grafico(storico, eventi) {
  const wrap = el('div.grafico');
  if (storico.length < 2) return el('p', { text: 'Intervento troppo breve per un grafico.' });

  const tMax = storico[storico.length - 1].t || 1;

  SERIE.forEach((serie) => {
    const canvas = el('canvas.gcanvas', { 'aria-label': `${serie.label} nel tempo` });
    const legenda = el('div.glegenda', {}, [
      el('b', { text: serie.label }),
      el('span', { text: `${serie.unita} · fascia di normalità evidenziata` }),
      el('span.gvalore'),
    ]);
    const box = el('div.gserie', {}, [legenda, canvas]);
    wrap.append(box);

    const disegna = (evidenziaT = null) => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = canvas.clientWidth || 320;
      const h = canvas.clientHeight || 90;
      canvas.width = w * dpr; canvas.height = h * dpr;
      const c = canvas.getContext('2d');
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      c.clearRect(0, 0, w, h);

      const stile = getComputedStyle(document.documentElement);
      const inchiostro = stile.getPropertyValue('--ink-3').trim() || '#7B8D9B';
      const linea = stile.getPropertyValue('--phos').trim() || '#34D399';
      const bordo = stile.getPropertyValue('--line').trim() || '#24313B';

      /* Il dominio segue i dati, non il fondo scala: una pressione che
         scende da 96 a 84 su un asse 40-200 sarebbe una riga piatta.
         La fascia di normalità entra comunque nel dominio, così resta
         il riferimento visivo. */
      const valori = storico.map((p2) => p2[serie.k]);
      let min = Math.min(...valori, serie.normale[0]);
      let max = Math.max(...valori, serie.normale[1]);
      const margine = Math.max((max - min) * 0.18, 4);
      min = Math.max(serie.fondo[0], min - margine);
      max = Math.min(serie.fondo[1], max + margine);
      if (max - min < 1) max = min + 1;
      const y = (v) => h - 6 - ((clamp(v, min, max) - min) / (max - min)) * (h - 12);
      const x = (t) => 4 + (t / tMax) * (w - 8);

      // fascia di normalità: uno sfondo, non una linea in più
      c.fillStyle = 'rgba(52,211,153,.08)';
      c.fillRect(0, y(serie.normale[1]), w, y(serie.normale[0]) - y(serie.normale[1]));

      // assi discreti
      c.strokeStyle = bordo; c.lineWidth = 1;
      c.beginPath(); c.moveTo(0, h - 0.5); c.lineTo(w, h - 0.5); c.stroke();

      // eventi
      eventi.forEach((ev) => {
        c.strokeStyle = ev.tipo === 'allarme' ? 'rgba(224,36,60,.55)' : 'rgba(242,180,65,.4)';
        c.setLineDash([3, 3]);
        c.beginPath(); c.moveTo(x(ev.t), 0); c.lineTo(x(ev.t), h); c.stroke();
        c.setLineDash([]);
      });

      // la traccia
      c.strokeStyle = linea; c.lineWidth = 2; c.lineJoin = 'round'; c.lineCap = 'round';
      c.beginPath();
      storico.forEach((p, i) => {
        const px = x(p.t); const py = y(p[serie.k]);
        if (i) c.lineTo(px, py); else c.moveTo(px, py);
      });
      c.stroke();

      // punto finale, sempre etichettato
      const ultimo = storico[storico.length - 1];
      c.fillStyle = linea;
      c.beginPath(); c.arc(x(ultimo.t), y(ultimo[serie.k]), 3.5, 0, Math.PI * 2); c.fill();

      if (evidenziaT !== null) {
        const vicino = storico.reduce((a, b) => (Math.abs(b.t - evidenziaT) < Math.abs(a.t - evidenziaT) ? b : a));
        c.strokeStyle = inchiostro; c.lineWidth = 1;
        c.beginPath(); c.moveTo(x(vicino.t), 0); c.lineTo(x(vicino.t), h); c.stroke();
        c.fillStyle = linea;
        c.beginPath(); c.arc(x(vicino.t), y(vicino[serie.k]), 4.5, 0, Math.PI * 2); c.fill();
        $('.gvalore', legenda).textContent = `${formatSeconds(vicino.t)} · ${Math.round(vicino[serie.k])} ${serie.unita}`;
      } else {
        $('.gvalore', legenda).textContent = `${Math.round(ultimo[serie.k])} ${serie.unita} alla consegna`;
      }
    };

    const posizione = (e) => {
      const r = canvas.getBoundingClientRect();
      const frazione = clamp((e.clientX - r.left) / r.width, 0, 1);
      disegna(frazione * tMax);
    };
    canvas.addEventListener('pointermove', posizione);
    canvas.addEventListener('pointerleave', () => disegna(null));

    requestAnimationFrame(() => disegna(null));
    new ResizeObserver(() => disegna(null)).observe(canvas);
  });

  // versione leggibile senza grafico
  const tabella = el('details.gtabella', {}, [
    el('summary', { text: 'Vedi i valori in tabella' }),
  ]);
  const t = el('table');
  t.innerHTML = `<thead><tr><th>Tempo</th>${SERIE.map((s) => `<th>${s.label}</th>`).join('')}</tr></thead>
    <tbody>${storico.map((p) => `<tr><td>${formatSeconds(p.t)}</td>${SERIE.map((s) => `<td>${Math.round(p[s.k])}</td>`).join('')}</tr>`).join('')}</tbody>`;
  tabella.append(el('div.table-wrap', {}, [t]));
  wrap.append(tabella);

  return wrap;
}

function mostraDebriefing() {
  const p = sim.chiudi();
  const caso = sim.caso;
  if (scope) { scope.destroy(); scope = null; }
  setRibbonRhythm('sinusale');

  saveRun({
    id: caso.id,
    titolo: caso.titolo,
    tipo: caso.tipo,
    score: Math.round(p.punti),
    max: p.max,
    seconds: p.secondi,
    errori: [
      ...p.necessarie.filter((r) => !r.fatta).map((r) => r.id),
      ...p.dannose.map((r) => r.id),
    ],
  });

  const esito = ESITO_TESTO[p.esitoPaziente];
  const eventi = sim.diario.filter((r) => r.tipo === 'evento' || r.tipo === 'allarme');

  const vista = el('div.view.debrief', {}, [
    el('div.view-head', {}, [
      el('h2', { text: 'Debriefing' }),
      el('p', { text: caso.titolo }),
    ]),

    el('div.score-hero', {}, [
      scoreRing(Math.round(p.punti), p.max),
      el('div', { style: { flex: '1', minWidth: '240px' } }, [
        el('div.row', {}, [
          el(`span.badge.${esito.cls}`, { text: esito.t }),
          el('span.badge.b-no', { text: `${Math.round(p.secondi / 60)} minuti sul posto` }),
        ]),
        el('p', { style: { margin: '12px 0 0', color: 'var(--ink-2)' }, text: caso.chiave }),
        el('div.row', { style: { marginTop: '14px' } }, [
          el('button.btn.pri', { type: 'button', onclick: () => navigate('intervento', caso.id) },
            [icon('refresh'), 'Ripeti']),
          el('button.btn', { type: 'button', onclick: () => navigate('simulazioni') }, ['Altri scenari']),
        ]),
      ]),
    ]),

    el('div.dbox', {}, [
      el('div.t', { text: 'come è andato il paziente' }),
      grafico(p.storico, eventi),
    ]),

    el('div.dbox', {}, [
      el('div.t', { text: 'quello che serviva' }),
      el('div.pagella', {}, p.necessarie.map((r) => el(`div.voce.${r.fatta ? (r.ritardo ? 'tardi' : 'ok') : 'no'}`, {}, [
        el('span.m'),
        el('span.l', {}, [
          el('b', { text: r.label }),
          el('span', {
            text: !r.fatta ? 'non fatto'
              : r.ritardo ? `fatto a ${formatSeconds(r.t)}, oltre il tempo utile (${formatSeconds(r.entro)})`
                : `fatto a ${formatSeconds(r.t)}`,
          }),
        ]),
        el('span.p', { text: `${r.punti}/${r.peso}` }),
      ]))),
    ]),

    p.dannose.length ? el('div.dbox.warn', {}, [
      el('div.t', { text: 'quello che ha fatto danno' }),
      ...p.dannose.map((r) => el('p', { style: { margin: '0 0 8px' } }, [
        el('b', { text: `${r.label}. ` }),
        r.perche,
      ])),
    ]) : null,

    el('div.dbox.warn', {}, [
      el('div.t', { text: 'la trappola' }),
      el('p', { style: { margin: '0' }, text: caso.trappola }),
    ]),

    el('div.dbox', {}, [
      el('div.t', { text: 'il ragguaglio, come lo diresti' }),
      el('p.handover', { style: { margin: '0' }, text: caso.ragguaglio }),
    ]),

    el('div.dbox', {}, [
      el('div.t', { text: 'da rileggere sul manuale' }),
      el('div.links-out', {}, (caso.capitoli || []).map((slug) => el('button.btn.sm', {
        type: 'button', onclick: () => navigate('studio', slug),
      }, [`Capitolo ${slug.replace('cap-', '')}`]))),
    ]),

    el('div.dbox', {}, [
      el('div.t', { text: 'il diario completo' }),
      el('div.diario.statico', {}, sim.diario.map((r) => el(`div.riga.${r.tipo}`, {}, [
        el('span.ora', { text: formatSeconds(r.t) }),
        el('span.seg', { text: ICONA_RIGA[r.tipo] || '·' }),
        el('span.txt', { text: r.testo }),
      ]))),
    ]),
  ]);

  mount(n.radice, vista);
}

/* =============================== VISTA ============================== */
export function render(params) {
  const idCaso = params?.[0];
  const caso = CASI_INDICE[idCaso] || CASI[0];

  const radice = el('div');
  const mon = costruisciMonitor();
  const squadra = el('div.squadra-box');
  const diario = el('div.diario');
  const diarioBox = el('div.diario-box', {}, [diario]);
  const decisione = el('div.decisione.step', { hidden: true });
  const paletteTabs = el('div.palette-tabs');
  const paletteLista = el('div.palette-lista');
  const tempoBarra = el('i');
  const tempoTacche = el('div.tacche');
  const tempoTxt = el('b', { text: '0s' });

  const esameChip = el('button.chip', { type: 'button', 'aria-pressed': String(modalitaEsame) }, ['Modalità esame']);
  esameChip.addEventListener('click', () => {
    modalitaEsame = !modalitaEsame;
    esameChip.setAttribute('aria-pressed', String(modalitaEsame));
  });

  /* Conferma in due tempi invece di una finestra di sistema: resta
     dentro la pagina e non interrompe chi sta usando il telefono. */
  const consegna = el('button.btn.sm', { type: 'button' }, ['Consegna e chiudi']);
  let consegnaArmata = false;
  let timerConsegna = null;
  consegna.addEventListener('click', () => {
    if (consegnaArmata) { clearTimeout(timerConsegna); mostraDebriefing(); return; }
    consegnaArmata = true;
    consegna.classList.add('pri');
    consegna.textContent = 'Confermi? Tocca di nuovo';
    timerConsegna = setTimeout(() => {
      consegnaArmata = false;
      consegna.classList.remove('pri');
      consegna.textContent = 'Consegna e chiudi';
    }, 4000);
  });

  const apriPalette = el('button.btn.pri.palette-apri', { type: 'button' }, [icon('layers'), 'Azioni']);
  const paletteBox = el('div.palette', {}, [
    el('div.palette-head', {}, [
      el('span.lbl', { style: { margin: '0' }, text: 'Cosa fai adesso' }),
      el('span.spacer'),
      el('button.btn.sm.palette-chiudi', { type: 'button' }, ['Chiudi']),
    ]),
    paletteTabs,
    paletteLista,
  ]);
  const togglePalette = (aperta) => {
    paletteAperta = aperta;
    paletteBox.classList.toggle('aperta', aperta);
  };
  apriPalette.addEventListener('click', () => togglePalette(!paletteAperta));
  $('.palette-chiudi', paletteBox).addEventListener('click', () => togglePalette(false));

  const vista = el('div.view.intervento', {}, [
    el('div.int-top', {}, [
      el('div', {}, [
        el('p.step-num', { style: { margin: '0' }, text: `${caso.tipo} · ${caso.dispatch.codice} dalla centrale` }),
        el('h2', { text: caso.titolo }),
      ]),
      el('span.spacer'),
      esameChip,
      consegna,
    ]),

    el('div.tempo', {}, [
      el('div.tempo-barra', {}, [tempoBarra, tempoTacche]),
      el('span.tempo-txt', {}, [document.createTextNode('sul posto da '), tempoTxt]),
    ]),

    el('div.int-corpo', {}, [
      el('div.int-scena', {}, [
        el('div.dispatch', {}, [
          el('div.hdr', {}, [
            el('span', { text: `dispatch · codice ${caso.dispatch.codice}` }),
            el('span.t', { text: caso.dispatch.luogo }),
          ]),
          el('div', { text: caso.dispatch.testo }),
        ]),
        el('div.obs', {}, [
          el('div.box', {}, [el('p.lbl', { text: 'La scena' }), el('p', { text: caso.scena.testo })]),
          el('div.box', {}, [el('p.lbl', { text: 'Colpo d\'occhio' }), el('p', { text: caso.colpoOcchio.testo })]),
        ]),
        decisione,
        el('p.lbl', { style: { marginTop: '18px' }, text: 'Diario dell\'intervento' }),
        diarioBox,
        apriPalette,
      ]),
      el('div.int-lato', {}, [
        mon.pannello,
        el('div.card.tight', {}, [el('p.lbl', { text: 'Squadra' }), squadra]),
      ]),
    ]),
    paletteBox,
  ]);

  mount(radice, vista);

  n = { radice, mon, squadra, diario, diarioBox, decisione, paletteTabs, paletteLista, tempoBarra, tempoTacche, tempoTxt };

  sim = creaIntervento(caso, { azioni: AZIONI });
  categoriaAperta = 'scena';
  setTimeout(() => { aggiornaTutto(); }, 0);

  return radice;
}

export function destroy() {
  scope?.destroy();
  scope = null;
  sim = null;
  n = null;
}
