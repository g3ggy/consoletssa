/* =====================================================================
   simulazioni.js — simulatore di intervento.

   Struttura: a sinistra la scena e la decisione da prendere, a destra un
   monitor paziente che resta sempre sott'occhio (tracciato, parametri,
   cronometro della valutazione primaria, diario delle azioni).
   ===================================================================== */

import { el, mount, $, shuffle, pick, formatSeconds } from '../core/dom.js';
import { icon, toast, scoreRing } from '../core/ui.js';
import { navigate } from '../core/router.js';
import { creaLifepak } from '../core/lifepak.js';
import { setRibbonRhythm } from '../core/ribbon.js';
import { saveRun } from '../core/store.js';
import { SCENARI, OPZIONI, VITAL_META, DIFFICOLTA } from '../data/scenari.js';
import { cartellino, badgeCriticita } from '../core/cartellino.js';
import { CASI } from '../data/casi.js';

const PASSI = [
  { key: 'scena', label: 'Sicurezza della scena' },
  { key: 'colpo', label: 'Colpo d\'occhio' },
  { key: 'azione', label: 'Azione immediata' },
  { key: 'parametri', label: 'Parametri' },
  { key: 'sample', label: 'SAMPLE' },
  { key: 'codice', label: 'Codice di gravità' },
  { key: 'sospetto', label: 'Sospetto' },
  { key: 'ragguaglio', label: 'Ragguaglio' },
];

const PUNTI_MAX = 8; // 7 decisioni + 1 punto tempo

let S = null;
let timerId = null;
let host = null;      // riferimenti ai nodi che aggiorniamo dal vivo
let filtro = { tipo: 'tutti', difficolta: 0, esame: false };

/* ============================ utilità ================================ */
const nowSec = () => (S?.t0 ? (Date.now() - S.t0) / 1000 : 0);

function log(text, kind = '') {
  S.log.push({ t: nowSec(), text, kind });
  renderLog();
}

function renderLog() {
  if (!host?.log) return;
  mount(host.log, ...S.log.slice().reverse().map((e) => el(`div.e${e.kind ? ` ${e.kind}` : ''}`, {}, [
    el('span.t', { text: formatSeconds(e.t) }),
    el('span', { text: e.text }),
  ])));
}

function addPunto(passo, ok, dettaglio) {
  S.punti.push({ passo, ok, dettaglio, t: nowSec() });
  if (host?.score) host.score.textContent = String(S.punti.filter((p) => p.ok).length);
}

/* ====================== pannello monitor paziente ==================== */
/* Frequenza, saturazione e pressione stanno sullo schermo del monitor;
   frequenza respiratoria, temperatura e glicemia sono rilevazioni
   manuali e restano sotto. Un valore a parole ("assente", "non
   rilevabile", "gasping") rimpicciolisce da solo invece di sbordare. */
const SUL_MONITOR = { FC: 'hr', SpO2: 'spo2', PA: 'nibp' };

function buildPanel() {
  const lp = creaLifepak({ energia: 200 });
  const vitalsGrid = el('div.vitals.rilevazioni');
  const timerNode = el('span', {}, [document.createTextNode('primaria '), el('b', { text: '—' })]);
  const scoreNode = el('b', { text: '0' });
  const logNode = el('div.simlog');

  const vitBtns = {};

  /* i tre parametri del monitor: si toccano sullo schermo */
  Object.entries(SUL_MONITOR).forEach(([k, chiave]) => {
    const box = lp.riquadro(chiave);
    if (!box) return;
    box.classList.add('lp-toccabile');
    box.setAttribute('role', 'button');
    box.setAttribute('tabindex', '0');
    box.title = `Rileva ${VITAL_META[k].label}`;
    const attiva = () => misura(k, box);
    box.addEventListener('click', attiva);
    box.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); attiva(); }
    });
    vitBtns[k] = box;
  });

  /* le rilevazioni manuali restano riquadri sotto lo schermo */
  ['FR', 'T', 'Gly'].forEach((k) => {
    const meta = VITAL_META[k];
    const btn = el('button.vit', { type: 'button', 'data-k': k, title: `Rileva ${meta.label}` }, [
      el('div.k', {}, [meta.label]),
      el('div.v', { text: '— —' }),
      el('div.ref', { text: meta.ref }),
    ]);
    btn.addEventListener('click', () => misura(k, btn));
    vitBtns[k] = btn;
    vitalsGrid.append(btn);
  });

  const panel = el('div.sim-panel', {}, [
    el('div.pannello-monitor', {}, [
      lp.schermo,
      vitalsGrid,
      el('div.pmon-foot', {}, [
        timerNode,
        el('span', { style: { flex: '1' } }),
        el('span', {}, [document.createTextNode('punti '), scoreNode]),
      ]),
    ]),
    el('div.card.tight', {}, [
      el('p.lbl', { text: 'Diario dell\'intervento' }),
      logNode,
    ]),
  ]);

  host = { lp, vitBtns, timer: timerNode, score: scoreNode, log: logNode, panel };
  return panel;
}

/** Scrive un valore rilevato, sul monitor o nel riquadro manuale. */
/* Quanto è derivato un parametro dal momento in cui l'hai rilevato.
   Frequenza e saturazione sono continue sul monitor, quindi cambiano
   sotto gli occhi; la pressione resta ferma al valore misurato finché
   non la rilevi di nuovo — esattamente come sul mezzo. */
function valoreDerivato(k, dato) {
  const deriva = S.caso.deriva?.[k];
  const base = parseFloat(String(dato.v));
  if (!deriva || Number.isNaN(base) || S.t0 === null) return dato.v;
  const minuti = Math.max(0, (Date.now() - S.t0) / 60000);
  const v = base + deriva * minuti;
  if (k === 'SpO2') return Math.round(Math.max(50, Math.min(100, v)));
  if (k === 'FC') return Math.round(Math.max(0, v));
  return Math.round(v);
}

/** La pressione derivata mantiene il rapporto fra sistolica e diastolica. */
function pressioneDerivata(dato) {
  const deriva = S.caso.deriva?.PA;
  const testo = String(dato.v);
  if (!deriva || !testo.includes('/') || S.t0 === null) return testo;
  const [sist, dia] = testo.split('/').map(Number);
  const minuti = Math.max(0, (Date.now() - S.t0) / 60000);
  const s2 = Math.round(Math.max(40, sist + deriva * minuti));
  const d2 = Math.round(Math.max(20, dia + deriva * 0.6 * minuti));
  return `${s2}/${d2}`;
}

/* Soglie oltre le quali il monitor suona: non stanno nel caso, stanno
   nel valore che leggi adesso. Cosi se il paziente peggiora davanti a te
   l'allarme parte da solo. */
function fuoriSoglia(k, v) {
  if (typeof v !== 'number' || Number.isNaN(v)) return false;
  if (k === 'FC') return v < 40 || v > 150;
  if (k === 'SpO2') return v < 90;
  return false;
}

function scriviValore(k, dato, opzioni = {}) {
  const meta = VITAL_META[k];
  const nodo = host.vitBtns[k];
  if (!nodo) return;
  let grezzo = k === 'PA' ? pressioneDerivata(dato) : valoreDerivato(k, dato);
  /* Sul monitor frequenza e saturazione ballano di continuo, come quelle
     vere: lo scarto arriva dal LIFEPAK così curve e numeri respirano
     insieme. La pressione no: è una misura singola, resta al suo valore. */
  if (typeof grezzo === 'number' && SUL_MONITOR[k] && k !== 'PA') {
    grezzo = grezzo + host.lp.scarto(SUL_MONITOR[k]);
    if (k === 'SpO2') grezzo = Math.max(50, Math.min(100, grezzo));
    if (k === 'FC') grezzo = Math.max(0, grezzo);
  }
  const testo = String(grezzo);
  const sulMonitor = Boolean(SUL_MONITOR[k]);
  const allarme = dato.flag === 'alarm' || fuoriSoglia(k, typeof grezzo === 'number' ? grezzo : NaN);

  if (sulMonitor) {
    const num = $('.lp-num', nodo);
    const piede = $('.lp-piede', nodo);
    nodo.dataset.lungo = testo.length > 12 ? '2' : (testo.length > 6 ? '1' : '0');
    if (k === 'PA' && testo.includes('/')) {
      const [sist, dia] = testo.split('/');
      num.textContent = sist;
      /* scriviamo dentro .lp-extra e non sul piede intero: così resta in
         piedi anche .lp-ora, che dice da quanto la misura è vecchia */
      const extra = $('.lp-extra', nodo);
      if (extra) extra.textContent = `/ ${dia}`;
      else if (piede) piede.textContent = `/ ${dia}`;
    } else {
      num.textContent = testo;
    }
    nodo.classList.remove('lp-spento');
    nodo.classList.toggle('lp-allarmato', allarme);
    if (opzioni.evidenzia) nodo.classList.add('lp-cambiato');
    return;
  }

  const v = $('.v', nodo);
  nodo.dataset.lungo = testo.length > 10 ? '2' : (testo.length > 5 ? '1' : '0');
  v.innerHTML = `${testo}<span class="u">${typeof dato.v === 'number' ? meta.unit : ''}</span>`;
  nodo.classList.add('on');
  if (dato.flag) nodo.classList.add(dato.flag);
}

function misura(k, nodo) {
  if (!S || S.step < 4 || nodo.dataset.busy) return;
  /* la pressione si rimisura: dopo un minuto il valore vecchio non vale
     più niente, ed è il concetto che serve portarsi a casa */
  const rimisurabile = k === 'PA' && S.misuratiA?.[k] && (Date.now() - S.misuratiA[k]) > 60000;
  if (S.misurati[k] && !rimisurabile) return;
  const meta = VITAL_META[k];
  const dato = S.caso.vitali[k];

  const busy = el('div.busy', {}, [el('i')]);
  nodo.append(busy);
  nodo.dataset.busy = '1';
  const bar = $('i', busy);
  const t0 = performance.now();
  const durata = meta.tempo;

  let concluso = false;
  const concludi = () => {
    if (concluso) return;
    concluso = true;
    clearTimeout(scadenza);
    busy.remove();
    delete nodo.dataset.busy;
    S.misurati[k] = true;
    S.misuratiA = { ...(S.misuratiA || {}), [k]: Date.now() };
    scriviValore(k, dato, { evidenzia: true });
    if (k === 'PA') { etaPressione(); host.lp.segnalaNibp(); }
    nodo.title = dato.note;
    log(`${meta.label}: ${dato.v}${typeof dato.v === 'number' ? ` ${meta.unit}` : ''}`, dato.flag === 'alarm' ? 'ko' : '');
    checkPrimaria();
  };

  /* Il conto alla rovescia non dipende da requestAnimationFrame: se la
     scheda passa in secondo piano l'animazione si ferma, ma la
     rilevazione deve concludersi lo stesso. */
  const scadenza = setTimeout(concludi, durata);

  (function anim() {
    if (concluso) return;
    const p = Math.min(1, (performance.now() - t0) / durata);
    bar.style.width = `${p * 100}%`;
    if (p < 1) { requestAnimationFrame(anim); return; }
    concludi();
  })();
}

function checkPrimaria() {
  const totali = Object.keys(VITAL_META).length;
  if (Object.keys(S.misurati).length < totali || S.tPrimaria !== null) return;
  S.tPrimaria = Math.round(nowSec());
  const entro = S.tPrimaria <= 90;
  addPunto('tempo', entro, entro
    ? `Valutazione primaria completata in ${S.tPrimaria}s, sotto i 90 richiesti.`
    : `Valutazione primaria in ${S.tPrimaria}s: oltre i 90 secondi.`);
  log(`Valutazione primaria completata in ${S.tPrimaria}s`, entro ? 'ok' : 'ko');
  if (S.step === 4) { S.step = 5; renderBody(); }
}

/* Frequenza e saturazione, una volta collegato il monitor, continuano
   ad aggiornarsi: è quello che fa un monitor vero, e rende evidente se
   il paziente sta peggiorando mentre tu raccogli l'anamnesi. */
function aggiornaContinui() {
  if (!S || !host?.lp || S.t0 === null) return;
  ['FC', 'SpO2'].forEach((k) => {
    if (!S.misurati[k]) return;
    const dato = S.caso.vitali[k];
    if (typeof dato.v !== 'number') return;    // "assente" non deriva
    scriviValore(k, dato);
  });
  etaPressione();
  /* anche il tracciato accelera o rallenta con la frequenza derivata */
  const fc = valoreDerivato('FC', S.caso.vitali.FC);
  if (typeof fc === 'number' && fc > 0) host.lp.setFrequenzaPleth(fc);
}

/* La pressione non è un valore continuo: è la fotografia di un minuto fa.
   Scriverlo sotto il numero è il modo più diretto per insegnare che va
   ripetuta, e il riquadro si riaccende quando torna rilevabile. */
function etaPressione() {
  const nodo = host.vitBtns.PA;
  const quando = S.misuratiA?.PA;
  if (!nodo || !quando) return;
  const ora = $('.lp-ora', nodo);
  if (!ora) return;
  const secondi = Math.round((Date.now() - quando) / 1000);
  ora.textContent = secondi < 60 ? `${secondi}s fa` : `${Math.floor(secondi / 60)} min fa`;
  const vecchia = secondi > 60;
  nodo.classList.toggle('lp-vecchio', vecchia);
  nodo.title = vecchia
    ? 'Misura di oltre un minuto fa: tocca per rilevarla di nuovo.'
    : 'Pressione appena rilevata.';
}

function tick() {
  if (!S || S.t0 === null) return;
  aggiornaContinui();
  const b = $('b', host.timer);
  const s = S.tPrimaria !== null ? S.tPrimaria : Math.round(nowSec());
  b.textContent = `${s}s`;
  b.style.color = s > 90 ? 'var(--cri)' : '';
}

/* ============================ componenti ============================= */
function opzioni(lista, onPick) {
  const wrap = el('div.opts');
  const nodi = lista.map((o, i) => {
    const b = el('button.opt', { type: 'button', 'data-key': String.fromCharCode(65 + i) }, [o.t]);
    b.addEventListener('click', () => {
      if (wrap.dataset.done) return;
      wrap.dataset.done = '1';
      if (filtro.esame) {
        b.classList.add('chosen');
        b.style.borderColor = 'var(--blue)';
      } else {
        nodi.forEach((n, j) => {
          const oo = lista[j];
          n.classList.add(oo.ok ? 'good' : 'bad');
          if (n === b) n.classList.add('chosen');
          if (oo.w) n.append(el('span.why', { text: oo.w }));
        });
      }
      onPick(o);
    });
    wrap.append(b);
    return b;
  });
  return wrap;
}

function stepHead(n, titolo, sottotitolo) {
  return el('div.step-head', {}, [
    el('div', {}, [
      el('p.step-num', { style: { margin: '0' }, text: `Passo ${n} di ${PASSI.length}` }),
      el('h3', { text: titolo }),
      sottotitolo ? el('p.sub', { text: sottotitolo }) : null,
    ]),
  ]);
}

function avanti(label, fn) {
  return el('button.btn.pri', { type: 'button', style: { marginTop: '14px' }, onclick: fn },
    [label, icon('next')]);
}

/* ============================== flusso =============================== */
function renderBody() {
  const box = host.body;
  const caso = S.caso;
  box.replaceChildren();

  /* il cartellino della centrale, come arriva sul tablet di bordo */
  box.append(cartellino(caso));

  /* passo 1 — l'arrivo, diverso per ogni caso */
  if (S.step === 0) {
    const arrivo = caso.arrivo;
    const lista = arrivo
      ? shuffle(arrivo.scelte)
      : (() => {
        const generiche = shuffle(OPZIONI.scena).slice(0, 3);
        if (!generiche.some((o) => o.ok)) generiche[0] = OPZIONI.scena.find((o) => o.ok);
        return shuffle(generiche);
      })();

    const s = el('div.step', {}, [
      stepHead(1, 'Sei arrivato sul posto', arrivo ? arrivo.domanda : 'Cosa fai per prima cosa?'),
    ]);
    if (arrivo) {
      s.append(el('div.box.arrivo', {}, [el('p', { text: arrivo.testo })]));
    }
    s.append(opzioni(lista, (o) => {
      addPunto('scena', o.ok, o.w);
      log(o.ok ? 'Arrivo gestito correttamente' : 'Arrivo sul posto: scelta non corretta', o.ok ? 'ok' : 'ko');
      s.append(avanti('Guarda la scena', () => { S.step = 1; renderBody(); }));
    }));
    box.append(s);
  }

  /* da qui in poi mostriamo scena e colpo d'occhio */
  if (S.step >= 1) {
    box.append(el('div.obs', {}, [
      el('div.box', {}, [
        el('p.lbl', { text: 'La scena' }),
        el('p', { text: caso.scena.testo }),
        caso.scena.rischio
          ? el('p', { style: { marginTop: '8px' } }, [el('span.badge.b-warn', { text: `rischio: ${caso.scena.rischio}` })])
          : null,
      ]),
      el('div.box', {}, [
        el('p.lbl', { text: 'Colpo d\'occhio' }),
        el('p', { text: caso.colpoOcchio.testo }),
      ]),
    ]));
  }

  /* passo 2 — vitale o no */
  if (S.step === 1) {
    const lista = OPZIONI.colpo.map((o) => ({
      ...o,
      ok: o.v === caso.colpoOcchio.vitale,
      w: o.v === caso.colpoOcchio.vitale
        ? 'Corretto: quello che conta è se si muove, parla o reagisce.'
        : 'Rileggi il colpo d\'occhio: conta se si muove e reagisce, non se "sta bene". Il gasping non è respiro.',
    }));
    const s = el('div.step', {}, [stepHead(2, 'Vitale o non vitale?', 'La primissima discriminazione, prima di ogni ABCDE.')]);
    s.append(opzioni(lista, (o) => {
      addPunto('colpo', o.ok, o.w);
      log(o.v ? 'Paziente giudicato vitale' : 'Paziente giudicato non vitale', o.ok ? 'ok' : 'ko');
      s.append(avanti('Agisci', () => {
        S.step = 2;
        S.t0 = Date.now();
        startTimer();
        renderBody();
      }));
    }));
    box.append(s);
  }

  /* passo 3 — azione immediata */
  if (S.step === 2) {
    const giusta = OPZIONI.azione[caso.azione];
    /* Prima i distrattori scritti per QUESTO caso: sono errori plausibili
       qui e adesso, non frasi buone per qualunque scenario. */
    const specifici = (caso.azioniSbagliate || []).map((x) => ({ ...x, ok: false }));
    const generici = shuffle(OPZIONI.azioneDistrattori)
      .slice(0, Math.max(1, 3 - specifici.length))
      .map((x) => ({ ...x, ok: false }));
    const lista = shuffle([
      { t: giusta.t, ok: true, w: giusta.w },
      ...specifici,
      ...generici,
    ]);
    const s = el('div.step', {}, [
      /* Niente sottotitolo generico: il principio lo enunciava senza mai
         dire quale fosse il problema. Lo dice il riquadro qui sotto. */
      stepHead(3, 'Azione immediata',
        'Quello che minaccia la vita si tratta adesso, prima di raccogliere altri dati.'),
    ]);
    if (caso.situazione) {
      s.append(el('div.box.situazione', {}, [
        el('p.lbl', { text: 'Che cosa hai davanti' }),
        el('p', { text: caso.situazione }),
      ]));
    }
    s.append(opzioni(lista, (o) => {
      addPunto('azione', o.ok, o.w);
      log(o.ok ? `Azione: ${giusta.t}` : 'Azione immediata non corretta', o.ok ? 'ok' : 'ko');
      s.append(avanti('Rileva i parametri', () => {
        S.step = 4;
        attaccaMonitor();
        renderBody();
      }));
    }));
    box.append(s);
  }

  /* passo 4 — parametri */
  if (S.step >= 4) {
    const s = el('div.step', {}, [
      stepHead(4, 'Parametri', 'Tocca ogni parametro sul monitor per rilevarlo: ognuno richiede il suo tempo, come sul campo.'),
      el('p.sub', { text: 'Obiettivo: valutazione primaria completa sotto i 90 secondi.' }),
    ]);
    if (S.step === 4 && !$('.vit.on', host.panel)) {
      s.append(el('div.row', {}, [el('span.badge.b-warn', { text: 'in attesa delle rilevazioni' })]));
    }
    box.append(s);
  }

  /* passo 5 — SAMPLE */
  if (S.step >= 5) {
    const nomi = { S: 'Segni e sintomi', A: 'Allergie', M: 'Medicine', P: 'Patologie', L: 'Ultimo pasto', E: 'Evento' };
    const g = el('div.sample');
    Object.entries(caso.sample).forEach(([k, v]) => {
      const b = el('button.sq', { type: 'button' }, [
        el('div.h', {}, [el('b', { text: k }), el('span', { text: nomi[k] })]),
        el('span.a', { text: S.chiesti[k] ? v : '' }),
      ]);
      if (S.chiesti[k]) b.classList.add('asked');
      b.addEventListener('click', () => {
        if (S.chiesti[k]) return;
        S.chiesti[k] = true;
        b.classList.add('asked');
        $('.a', b).textContent = v;
        log(`Domanda ${k}: ${nomi[k]}`);
        if (Object.keys(S.chiesti).length === 6 && S.step === 5) {
          $('#sample-next')?.removeAttribute('disabled');
        }
      });
      g.append(b);
    });
    const s = el('div.step', {}, [
      stepHead(5, 'SAMPLE', 'Valutazione secondaria: domande mirate e rapide, non la storia della vita.'),
      g,
    ]);
    if (S.step === 5) {
      const btn = avanti('Assegna il codice', () => {
        const chieste = Object.keys(S.chiesti).length;
        addPunto('sample', chieste >= 5, chieste >= 5
          ? `SAMPLE raccolto (${chieste}/6 voci).`
          : `Solo ${chieste} voci su 6: la M e la P sono quelle che cambiano più spesso il quadro.`);
        S.step = 6;
        renderBody();
      });
      btn.id = 'sample-next';
      s.append(btn);
    }
    box.append(s);
  }

  /* passo 6 — codice */
  if (S.step === 6) {
    const lista = OPZIONI.codice.map((o) => ({ ...o, ok: o.k === caso.codice }));
    const s = el('div.step', {}, [
      stepHead(6, 'Che codice assegni?', 'Guarda le funzioni vitali, non l\'impressione generale.'),
    ]);
    s.append(opzioni(lista, (o) => {
      addPunto('codice', o.ok, o.ok ? o.w : `Il codice corretto era ${caso.codice.toUpperCase()}. ${OPZIONI.codice.find((c) => c.k === caso.codice).w}`);
      log(`Codice assegnato: ${o.k.toUpperCase()}`, o.ok ? 'ok' : 'ko');
      s.append(avanti('Formula il sospetto', () => { S.step = 7; renderBody(); }));
    }));
    box.append(s);
  }

  /* passo 7 — sospetto */
  if (S.step === 7) {
    const giusto = OPZIONI.sospetto[caso.sospetto];
    const altri = shuffle(Object.entries(OPZIONI.sospetto).filter(([k]) => k !== caso.sospetto)).slice(0, 3);
    const lista = shuffle([
      { t: giusto, ok: true, w: 'Sul soccorso non si fa diagnosi: si formula un sospetto e lo si dichiara come tale.' },
      ...altri.map(([, t]) => ({ t, ok: false, w: 'Non regge con quello che hai raccolto.' })),
    ]);
    const s = el('div.step', {}, [
      stepHead(7, 'Con cosa lo consegni?', 'Un sospetto, mai una diagnosi.'),
    ]);
    s.append(opzioni(lista, (o) => {
      addPunto('sospetto', o.ok, o.ok ? o.w : `Il sospetto corretto era: ${giusto}.`);
      log(`Sospetto: ${o.t}`, o.ok ? 'ok' : 'ko');
      s.append(avanti('Prepara il ragguaglio', () => { S.step = 8; renderBody(); }));
    }));
    box.append(s);
  }

  /* passo 8 — apertura del ragguaglio */
  if (S.step === 8) {
    const giusta = OPZIONI.apertura[caso.apertura];
    const altra = Object.entries(OPZIONI.apertura).find(([k]) => k !== caso.apertura)[1];
    const lista = shuffle([
      { t: giusta.t, ok: true, w: giusta.w },
      { t: altra.t, ok: false, w: 'Non è l\'ordine giusto per questo caso: qui pesa di più l\'altro elemento.' },
      ...shuffle(OPZIONI.aperturaDistrattori).slice(0, 2).map((x) => ({ ...x, ok: false })),
    ]);
    const s = el('div.step', {}, [
      stepHead(8, 'Come apri il ragguaglio?', 'Quattro punti: chi è · patologie rilevanti · evento e parametri salienti · prestazioni eseguite. Poi ti fermi.'),
    ]);
    s.append(opzioni(lista, (o) => {
      addPunto('ragguaglio', o.ok, o.w);
      log('Ragguaglio consegnato', o.ok ? 'ok' : 'ko');
      // Il ragguaglio per esteso, da leggere ad alta voce: sapere che
      // ordine seguire non basta, serve sentire come suona.
      s.append(el('div.copione', {}, [
        el('div.t', { text: 'quello che dici, per esteso' }),
        el('p', { text: caso.ragguaglio }),
        el('p.copione-nota', { text: 'Provalo ad alta voce: se ci metti più di trenta secondi, stai raccontando invece di consegnare.' }),
      ]));
      s.append(avanti('Vedi il debriefing', () => { S.step = 9; stopTimer(); renderBody(); }));
    }));
    box.append(s);
  }

  /* debriefing */
  if (S.step === 9) box.append(debrief());
}

/* ============================ debriefing ============================= */
function debrief() {
  const caso = S.caso;
  const ok = S.punti.filter((p) => p.ok).length;
  const codice = OPZIONI.codice.find((c) => c.k === caso.codice);

  if (!S.salvato) {
    S.salvato = true;
    saveRun({
      id: caso.id,
      titolo: caso.titolo,
      tipo: caso.tipo,
      score: ok,
      max: PUNTI_MAX,
      seconds: S.tPrimaria,
      errori: S.punti.filter((p) => !p.ok).map((p) => p.passo),
    });
  }

  const nomiPasso = Object.fromEntries(PASSI.map((p) => [p.key, p.label]));
  nomiPasso.tempo = 'Tempo della primaria';

  const linea = S.punti.map((p) => el(`div.tl.${p.ok ? 'ok' : 'ko'}`, {}, [
    el('span.t', { text: formatSeconds(p.t) }),
    el('span.m'),
    el('span', {}, [
      el('b', { text: nomiPasso[p.passo] || p.passo }),
      el('div', { style: { color: 'var(--ink-3)', fontSize: '13px' }, text: p.dettaglio || '' }),
    ]),
    el('span.p', { text: p.ok ? '+1' : '0' }),
  ]));

  const giudizio = ok >= 7 ? 'Intervento condotto bene: hai tenuto la gerarchia.'
    : ok >= 5 ? 'Impianto corretto, ma qualcosa è scivolato. Guarda le righe rosse.'
      : 'Rivedi il caso con calma: qui sotto trovi i capitoli che lo spiegano.';

  return el('div.step.debrief', {}, [
    el('h3', { text: 'Debriefing' }),
    el('div.score-hero', {}, [
      scoreRing(ok, PUNTI_MAX),
      el('div', { style: { flex: '1', minWidth: '220px' } }, [
        el('p', { style: { margin: '0 0 6px', fontSize: '17px' }, text: giudizio }),
        el('p', { style: { margin: '0', color: 'var(--ink-3)', fontSize: '14px' },
          text: S.tPrimaria !== null
            ? `Valutazione primaria completata in ${S.tPrimaria} secondi.`
            : 'Valutazione primaria non completata.' }),
        el('div.row', { style: { marginTop: '12px' } }, [
          el('button.btn.pri', { type: 'button', onclick: () => nuovoCaso() }, [icon('refresh'), 'Altro scenario']),
          el('button.btn', { type: 'button', onclick: () => nuovoCaso(caso.id) }, ['Ripeti questo']),
        ]),
      ]),
    ]),
    el('div.dbox', {}, [
      el('div.t', { text: 'come si sviluppa l\'intervento' }),
      el('div.timeline', {}, linea),
    ]),
    el('div.dbox.ok', {}, [
      el('div.t', { text: 'chiave di lettura' }),
      el('p', { style: { margin: '0' }, text: caso.chiave }),
    ]),
    el('div.dbox.warn', {}, [
      el('div.t', { text: 'la trappola' }),
      el('p', { style: { margin: '0' }, text: caso.trappola }),
    ]),
    el('div.dbox', {}, [
      el('div.t', { text: 'il ragguaglio, come lo diresti' }),
      el('p.handover', { style: { margin: '0' }, text: caso.ragguaglio }),
    ]),
    el('div.dbox', {}, [
      el('div.t', { text: 'codice corretto' }),
      el('p', { style: { margin: '0' }, html: `<span class="badge b-${caso.codice}">${codice.t}</span> — ${codice.w}` }),
    ]),
    el('div.dbox', {}, [
      el('div.t', { text: 'da rileggere sul manuale' }),
      el('div.links-out', {}, caso.capitoli.map((slug) => el('button.btn.sm', {
        type: 'button', onclick: () => navigate('studio', slug),
      }, [`Capitolo ${slug.replace('cap-', '')}`]))),
    ]),
  ]);
}

/* ============================ ciclo di vita ========================== */
function startTimer() {
  stopTimer();
  timerId = setInterval(tick, 250);
}
function stopTimer() {
  if (timerId) clearInterval(timerId);
  timerId = null;
}

function attaccaMonitor() {
  const caso = S.caso;
  host.lp.collega(caso.ritmo);
  host.lp.collegaSpo2(Number(String(caso.vitali.FC.v).replace(/\D/g, '')) || 75);
  host.lp.setMessaggio('');
  setRibbonRhythm(caso.ritmo);
  log('Monitor applicato');
}

function candidati() {
  return SCENARI.filter((c) => (filtro.tipo === 'tutti' || c.tipo === filtro.tipo)
    && (!filtro.difficolta || c.difficolta === filtro.difficolta));
}

function nuovoCaso(forceId) {
  const pool = candidati();
  const scelto = forceId
    ? SCENARI.find((c) => c.id === forceId)
    : pick(pool.length ? pool : SCENARI);

  S = {
    caso: scelto,
    step: 0,
    punti: [],
    t0: null,
    tPrimaria: null,
    misurati: {},
    misuratiA: {},
    chiesti: {},
    log: [],
    salvato: false,
  };
  stopTimer();

  // reset del pannello
  Object.entries(host.vitBtns).forEach(([k, nodo]) => {
    delete nodo.dataset.busy;
    nodo.dataset.lungo = '0';
    if (SUL_MONITOR[k]) {
      nodo.classList.remove('lp-allarmato', 'lp-cambiato', 'lp-vecchio');
      nodo.classList.add('lp-spento');
      nodo.removeAttribute('title');
      $('.lp-num', nodo).textContent = '- - -';
      /* svuotiamo i due campi del piede senza smontarli: servono ancora
         per il valore diastolico e per l'età della misura */
      const extra = $('.lp-extra', nodo);
      const ora = $('.lp-ora', nodo);
      if (extra) extra.textContent = '';
      if (ora) ora.textContent = '';
      if (!extra && !ora) { const p = $('.lp-piede', nodo); if (p) p.textContent = ''; }
    } else {
      nodo.classList.remove('on', 'warn', 'alarm');
      $('.v', nodo).textContent = '— —';
    }
  });
  host.score.textContent = '0';
  $('b', host.timer).textContent = '—';
  host.lp.setMessaggio('COLLEGARE GLI ELETTRODI');
  setRibbonRhythm('sinusale');

  host.title.textContent = scelto.titolo;
  host.meta.replaceChildren(...[
    badgeCriticita(scelto),
    el('span.badge.b-no', { text: scelto.tipo }),
    el('span.badge.b-no', { text: DIFFICOLTA[scelto.difficolta].label }),
    filtro.esame ? el('span.badge.b-warn', { text: 'modalità esame' }) : null,
  ].filter(Boolean));

  S.log = [];
  renderLog();
  renderBody();
}

/* =============================== VISTA =============================== */
export function render() {
  const body = el('div');
  const title = el('h2', { text: '—' });
  const meta = el('div.row');

  const tipoChips = [
    { k: 'tutti', l: 'Tutti' }, { k: 'medico', l: 'Medico' }, { k: 'trauma', l: 'Trauma' },
  ].map((t) => el('button.chip', {
    type: 'button', 'aria-pressed': String(filtro.tipo === t.k), 'data-t': t.k,
  }, [t.l]));

  const diffChips = [
    { k: 0, l: 'Ogni livello' }, { k: 1, l: 'Base' }, { k: 2, l: 'Intermedio' }, { k: 3, l: 'Difficile' },
  ].map((d) => el('button.chip', {
    type: 'button', 'aria-pressed': String(filtro.difficolta === d.k), 'data-d': String(d.k),
  }, [d.l]));

  const esameChip = el('button.chip', {
    type: 'button', 'aria-pressed': String(filtro.esame),
  }, ['Modalità esame']);

  tipoChips.forEach((c) => c.addEventListener('click', () => {
    filtro = { ...filtro, tipo: c.dataset.t };
    tipoChips.forEach((x) => x.setAttribute('aria-pressed', String(x === c)));
  }));
  diffChips.forEach((c) => c.addEventListener('click', () => {
    filtro = { ...filtro, difficolta: Number(c.dataset.d) };
    diffChips.forEach((x) => x.setAttribute('aria-pressed', String(x === c)));
  }));
  esameChip.addEventListener('click', () => {
    filtro = { ...filtro, esame: !filtro.esame };
    esameChip.setAttribute('aria-pressed', String(filtro.esame));
    toast(filtro.esame ? 'Modalità esame attiva' : 'Modalità esame disattivata',
      filtro.esame ? 'Nessun riscontro fino al debriefing.' : 'Riscontro immediato a ogni risposta.');
  });

  /* Su telefono i filtri stanno chiusi dietro un pulsante: altrimenti si
     mangiano mezzo schermo prima ancora di iniziare lo scenario. */
  const filtriToggle = el('button.chip.filtri-toggle', {
    type: 'button', 'aria-expanded': 'false',
  }, ['Filtri']);

  const barraFiltri = el('div.card.tight.simbar', { style: { marginBottom: '16px' } }, [
    el('div.row.simbar-head', {}, [
      filtriToggle,
      el('span.spacer'),
      el('button.btn.sm.pri', { type: 'button', onclick: () => nuovoCaso() },
        [icon('refresh'), 'Nuovo scenario']),
    ]),
    el('div.row.sim-filters', {}, [
      el('span.lbl', { style: { margin: '0' }, text: 'Tipo' }), ...tipoChips,
      el('span', { style: { width: '10px' } }),
      el('span.lbl', { style: { margin: '0' }, text: 'Livello' }), ...diffChips,
      el('span.spacer'),
      esameChip,
    ]),
  ]);
  filtriToggle.addEventListener('click', () => {
    const open = barraFiltri.classList.toggle('open');
    filtriToggle.setAttribute('aria-expanded', String(open));
  });

  const panel = buildPanel();
  host.body = body;
  host.title = title;
  host.meta = meta;

  /* I casi del motore nuovo stanno in cima: sono interventi veri, con il
     paziente che evolve. Gli altri restano nel formato a domande finché
     non vengono convertiti. */
  const nuovi = el('div.card', { style: { marginBottom: '16px' } }, [
    el('div.row', {}, [
      el('p.lbl', { style: { margin: '0' }, text: 'Interventi in tempo simulato' }),
      el('span.badge.b-ok', { text: 'nuovo' }),
    ]),
    el('p', { style: { color: 'var(--ink-3)', fontSize: '14px', margin: '8px 0 12px' },
      text: 'Il paziente peggiora se non intervieni, ogni azione costa tempo e puoi dividerti il lavoro con autista e infermiere.' }),
    el('div.pickgrid', {}, CASI.map((c) => el('button.pickcard', {
      type: 'button', onclick: () => navigate('intervento', c.id),
    }, [
      el('b', { text: c.titolo }),
      el('span', { text: c.dispatch.testo }),
      el('div.row', { style: { marginTop: '8px' } }, [
        el('span.badge.b-no', { text: c.tipo }),
        el('span.badge.b-no', { text: DIFFICOLTA[c.difficolta].label }),
      ]),
    ]))),
  ]);

  const view = el('div.view', {}, [
    el('div.view-head', {}, [
      el('h2', { text: 'Simulazioni' }),
      el('p', { text: 'Un intervento per volta, dalla chiamata al ragguaglio. Il monitor a lato resta sempre visibile: parametri, cronometro della primaria e diario delle azioni. Alla fine il debriefing ti dice dove hai sbagliato e perché.' }),
    ]),
    nuovi,
    el('p.lbl', { text: 'Scenari a domande' }),
    barraFiltri,
    el('div.sim', {}, [
      el('div.card', {}, [
        el('div.row', { style: { marginBottom: '4px' } }, [meta]),
        title,
        body,
      ]),
      panel,
    ]),
  ]);

  queueMicrotask(() => nuovoCaso());
  return view;
}

export function destroy() {
  stopTimer();
  host?.lp?.distruggi();
  host = null;
  S = null;
}
