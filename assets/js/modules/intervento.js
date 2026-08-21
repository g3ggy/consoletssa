/* =====================================================================
   intervento.js — interfaccia dell'intervento.

   Qui non ci sono regole cliniche: tutto quello che il paziente fa lo
   decide sim-engine.js. Questo modulo disegna il diario, il monitor, la
   squadra e la palette delle azioni. La schermata di fine intervento
   sta in debriefing.js.
   ===================================================================== */

import { el, mount, $, formatSeconds, clamp } from '../core/dom.js';
import { icon, toast } from '../core/ui.js';
import { creaLifepak } from '../core/lifepak.js';
import { setRibbonRhythm } from '../core/ribbon.js';
import { creaIntervento } from '../core/sim-engine.js';
import { AZIONI, CATEGORIE, azioniDi } from '../data/azioni.js';
import { CASI, CASI_INDICE } from '../data/casi.js';
import { cartellino, badgeCriticita } from '../core/cartellino.js';
import { foglioEcg12 } from '../core/ecg12.js';
import { mostraDebriefing as disegnaDebriefing, ICONA_RIGA } from './debriefing.js';
import { GRUPPI_CLASSI, nomeClasse } from '../data/classi-patologia.js';

let sim = null;
let chiusure = [];
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
  refill: 'refill',
  cute: 'colorito',
  sete: 'chiedi-sete',
  pupille: 'pupille',
};

/* --------------------------- valutazioni --------------------------- */
function gravitaTessera(k, valore, stato) {
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
  /* I segni del compenso si accendono mentre il monitor è ancora
     tranquillo: è tutto il senso del modello, e va visto a colpo
     d'occhio. Refill normale sotto i due secondi — Bolognin :6489. */
  if (k === 'refill') { if (num > 3) return 'alarm'; if (num > 2) return 'warn'; return ''; }
  if (k === 'cute') return String(valore) === 'normale' ? '' : 'warn';
  if (k === 'sete') return String(valore) === 'no' ? '' : 'warn';
  if (k === 'pupille') return String(valore) === 'normali' ? '' : 'warn';
  return stato ? '' : '';
}

/* ============================== MONITOR ============================= */
/* Il monitor è quello di bordo: HR, saturazione e pressione stanno sullo
   schermo del LIFEPAK; frequenza respiratoria, temperatura e glicemia
   sono rilevazioni manuali e stanno sotto, con l'età della misura. */
const MANUALI = [
  { k: 'fr', label: 'FR', unita: 'atti/min', rif: '12-16' },
  { k: 'temp', label: 'T', unita: '°C', rif: '36-37' },
  { k: 'glicemia', label: 'Glicemia', unita: 'mg/dl', rif: '70-110' },
  { k: 'refill', label: 'Refill', unita: '', rif: 'sotto 2 s' },
  { k: 'cute', label: 'Cute', unita: '', rif: 'colorito e temperatura' },
  { k: 'sete', label: 'Sete', unita: '', rif: 'glielo chiedi tu' },
  { k: 'pupille', label: 'Pupille', unita: '', rif: 'isocoriche, reattive' },
];

function costruisciMonitor() {
  const lp = creaLifepak({ energia: 200 });
  const griglia = el('div.vitals.rilevazioni');
  const cronometro = el('b', { text: '0s' });

  const pannello = el('div.pannello-monitor', {}, [
    lp.schermo,
    griglia,
    el('div.pmon-foot', {}, [
      el('span', {}, [document.createTextNode('sul posto da '), cronometro]),
      el('span', { style: { flex: '1' } }),
      el('span', { id: 'int-stato-paziente' }),
    ]),
  ]);

  return { pannello, lp, griglia, cronometro, precedenti: {}, letturaVista: {} };
}

/* La riga piccola della tessera. Finché il numero non c'è dice quanto
   dovrebbe valere — che è quello che serve a decidere se misurarlo; una
   volta che ce l'hai dice anche da quanto, perché è da lì che si capisce
   se va rifatto. */
function rigaSotto(p, val, eta, scaduta) {
  if (val === undefined || val === null) return p.rif;
  if (scaduta) return `${formatSeconds(eta)} fa · rifai`;
  return eta === 0 ? `${p.rif} · ora` : `${p.rif} · ${formatSeconds(eta)} fa`;
}

function aggiornaMonitor() {
  const s = sim.stato;
  const collegato = s.tag.includes('monitor');
  const lp = n.mon.lp;

  if (collegato) {
    lp.collega(s.ritmo);
    lp.collegaSpo2(s.fc);
    lp.setMessaggio('');
    setRibbonRhythm(s.ritmo);
  }

  const pa = sim.valore('pa');
  const etaPa = sim.etaLettura('pa');
  lp.aggiorna({
    orologio: formatSeconds(sim.t),
    hr: collegato ? sim.valore('fc') : undefined,
    spo2: collegato ? sim.valore('spo2') : undefined,
    pa,
    paOra: etaPa === null ? '' : (etaPa === 0 ? 'ora' : `${formatSeconds(etaPa)} fa`),
    ritmo: s.ritmo,
  });

  /* Quello che cambia lampeggia: è così che si vede l'effetto
     dell'ossigeno o della posizione, senza doverlo scrivere. */
  ['fc', 'spo2', 'pa'].forEach((k) => {
    const ora = sim.valore(k);
    const prima = n.mon.precedenti[k];
    if (ora !== undefined && prima !== undefined && ora !== prima) {
      lp.evidenzia(k === 'fc' ? 'hr' : (k === 'pa' ? 'nibp' : k));
    }
    if (k === 'pa' && ora !== undefined && prima === undefined) lp.segnalaNibp();
    n.mon.precedenti[k] = ora;
  });

  if (s.tag.includes('arresto')) lp.setMessaggio('ANALIZZARE IL RITMO — RCP IN CORSO');
  else if (s.esito === 'morto') lp.setMessaggio('NESSUNA ATTIVITA');

  n.mon.cronometro.textContent = formatSeconds(sim.t);

  mount(n.mon.griglia, ...MANUALI.map((p) => {
    const val = sim.valore(p.k);
    const scaduta = sim.letturaScaduta(p.k);
    const eta = sim.etaLettura(p.k);
    const cls = ['vit'];
    if (val !== undefined && val !== null) cls.push('on');
    const stato = gravitaTessera(p.k, val, s);
    if (stato && !scaduta) cls.push(stato);
    if (scaduta && val !== undefined) cls.push('vecchia');

    /* Una rilevazione ripetuta va vista anche quando il numero non
       cambia: senza il lampeggio sembra che il tocco sia andato perso,
       e la temperatura di prima e quella di adesso si somigliano quasi
       sempre. Il confronto è sull'ora della lettura, non sul valore. */
    const lettura = sim.letture[p.k];
    if (lettura && n.mon.letturaVista[p.k] !== lettura.t) {
      n.mon.letturaVista[p.k] = lettura.t;
      cls.push('appena');
    }

    const azione = AZIONE_PER_PARAMETRO[p.k];
    /* "pallida, fredda, sudata" non sta nello spazio di un numero a tre
       cifre: la tessera cambia corpo invece di sbordare. */
    const lungo = String(val ?? '').length;
    return el(`button.${cls.join('.')}`, {
      type: 'button',
      'data-lungo': lungo > 12 ? '2' : (lungo > 6 ? '1' : '0'),
      title: val === undefined || val === null
        ? `Non ancora rilevato — ${AZIONI[azione]?.label || ''}`
        : `Rilevato ${formatSeconds(eta)} fa`,
      onclick: () => eseguiRapido(azione),
    }, [
      el('div.k', {}, [p.label]),
      el('div.v', { html: (val === undefined || val === null) ? '— —' : `${val}<span class="u">${p.unita}</span>` }),
      el('div.ref', { text: rigaSotto(p, val, eta, scaduta) }),
    ]);
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

/* ============================== SOSPETTO ============================ */
/* Cosa pensi di avere davanti. Un `select` nativo e non una griglia di
   bottoni: diciassette voci su un telefono le sa mostrare solo il
   selettore di sistema, e per giunta gratis. */
function costruisciSospetto() {
  const sel = el('select.sospetto-sel', { 'aria-label': 'Cosa sospetti' });
  sel.append(el('option', { value: '', text: '— cosa sospetti? —' }));
  GRUPPI_CLASSI.forEach((g) => {
    const gruppo = el('optgroup', { label: g.label });
    g.codici.forEach((c) => {
      gruppo.append(el('option', { value: c, text: nomeClasse(c) }));
    });
    sel.append(gruppo);
  });
  sel.addEventListener('change', () => {
    if (!sel.value) return;
    sim.dichiaraSospetto(sel.value);
    aggiornaTutto();
  });
  return sel;
}

function aggiornaSospetto() {
  if (!n.sospetto) return;
  /* Senza una classe giusta dichiarata dal caso non c'è niente da
     correggere, e un campo che non viene mai valutato è peggio che
     assente. */
  const attivo = Boolean(sim.caso.classe);
  n.sospetto.box.hidden = !attivo;
  if (!attivo) return;
  const s = sim.sospetto;
  n.sospetto.sel.value = s?.codice || '';
  n.sospetto.quando.textContent = s ? `dalle ${formatSeconds(s.t)}` : '';
}

/* =============================== DIARIO ============================= */
function aggiornaDiario() {
  /* In modalità esame nessuno ti corregge mentre lavori. Le righe del
     giudizio il motore le scrive comunque: si vedono tutte alla fine,
     nel debriefing, che il diario lo mostra per intero. */
  const righe = sim.diario.filter((r) => !(modalitaEsame && r.tipo === 'giudizio'));
  mount(n.diario, ...righe.map((r) => el(`div.riga.${r.tipo}`, {}, [
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
  // se sta succedendo qualcosa, la palette si toglie di mezzo: la carta
  // della decisione deve essere la cosa che vedi
  if (paletteAperta) n.chiudiPalette?.();
  n.decisione.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
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

/* La barra di chi hai davanti, e sotto le domande che gli puoi fare.
   Un tocco per domanda: chi si è girato verso la moglie continua a
   parlare con lei finché non si gira di nuovo. */
function pannelloAnamnesi() {
  const barra = el('div.anam-chi', {}, sim.interlocutori.map((persona) => el('button.anam-p', {
    type: 'button',
    'aria-pressed': String(persona.id === sim.interlocutore),
    onclick: () => {
      const esito = sim.rivolgitiA(persona.id);
      if (!esito.ok) { toast('Non ora', esito.motivo, 'warn'); return; }
      aggiornaTutto();
    },
  }, [persona.label])));

  const disponibili = sim.domandeDisponibili();
  const righe = disponibili.map((d) => {
    const gia = sim.raccolte.some((r) => r.domanda === d.id && r.interlocutore === sim.interlocutore);
    return el(`div.pal-riga${gia ? '.gia-chiesta' : ''}`, {}, [
      el('div.az-testo', {}, [
        el('b', {}, [el('span.anam-lettera', { text: d.lettera }), d.testo]),
        el('span', { text: gia ? 'Gliel\'hai già chiesto' : `Schema ${d.schema}` }),
      ]),
      el('div.az-meta', {}, [el('span.durata', { text: `${d.durata}s` })]),
      el('div.az-btn', {}, [
        el('button.btn.sm.pri', {
          type: 'button',
          onclick: () => {
            const esito = sim.chiedi(d.id);
            if (!esito.ok) { toast('Non ora', esito.motivo, 'warn'); return; }
            aggiornaTutto();
          },
        }, ['Chiedi']),
      ]),
    ]);
  });

  return el('div.anam', {}, [
    el('div.anam-head', {}, [el('span', { text: 'parli con' }), barra]),
    ...righe,
  ]);
}

function aggiornaPalette() {
  const disponibili = sim.azioniDisponibili();
  const inCategoria = azioniDi(categoriaAperta)
    .filter((a) => disponibili.some((d) => d.id === a.id));

  mount(n.paletteTabs, ...CATEGORIE.map((c) => {
    const quante = c.id === 'anamnesi'
      ? sim.domandeDisponibili().length
      : azioniDi(c.id).filter((a) => disponibili.some((d) => d.id === a.id)).length;
    return el('button.pcat', {
      type: 'button',
      'aria-pressed': String(c.id === categoriaAperta),
      onclick: () => { categoriaAperta = c.id; aggiornaPalette(); },
      title: c.desc,
    }, [c.label, el('i', { text: String(quante) })]);
  }));

  /* L'anamnesi non è fatta di azioni: è fatta di domande, e prima delle
     domande c'è la persona a cui le fai. */
  if (categoriaAperta === 'anamnesi') {
    mount(n.paletteLista, pannelloAnamnesi());
    return;
  }

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
function aggiornaEcg() {
  if (!n?.ecg) return;
  const fatto = sim.stato.tag.includes('ecg-fatto');
  if (!fatto || n.ecg.dataset.pronto) return;
  n.ecg.dataset.pronto = '1';
  n.ecg.hidden = false;
  mount(n.ecg, foglioEcg12({
    pattern: sim.caso.ecg?.pattern || 'normale',
    fc: Number(sim.valore('fc')) || sim.stato.fc,
    paziente: sim.caso.titolo,
    ora: `acquisito a ${formatSeconds(sim.t)} dall'arrivo`,
  }));
}

function aggiornaTutto() {
  if (!sim || !n) return;
  aggiornaMonitor();
  aggiornaSquadra();
  aggiornaSospetto();
  aggiornaDiario();
  aggiornaDecisione();
  aggiornaPalette();
  aggiornaTempo();
  aggiornaEcg();

  if (sim.stato.esito === 'morto') disegnaDebriefing(sim, n);
}

/* =============================== VISTA ============================== */
export function render(params) {
  const idCaso = params?.[0];
  const caso = CASI_INDICE[idCaso] || CASI[0];

  const radice = el('div');
  const mon = costruisciMonitor();
  const squadra = el('div.squadra-box');
  const selSospetto = costruisciSospetto();
  const quandoSospetto = el('span.sospetto-quando');
  const boxSospetto = el('div.sospetto-box', { hidden: true }, [
    el('span.sospetto-eti', { text: 'Sospetti' }), selSospetto, quandoSospetto,
  ]);
  const diario = el('div.diario', { role: 'log', 'aria-live': 'polite', 'aria-relevant': 'additions' });
  const diarioBox = el('div.diario-box', {}, [diario]);
  const decisione = el('div.decisione.step', { hidden: true, role: 'alertdialog', 'aria-live': 'assertive' });
  const ecgBox = el('div', { hidden: true });
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
    if (consegnaArmata) { clearTimeout(timerConsegna); disegnaDebriefing(sim, n); return; }
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
  const paletteBox = el('div.palette', { role: 'dialog', 'aria-label': 'Azioni disponibili', 'aria-hidden': 'true' }, [
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
    paletteBox.setAttribute('aria-hidden', String(!aperta));
    apriPalette.setAttribute('aria-expanded', String(aperta));
    if (aperta) {
      // il fuoco entra nel pannello, altrimenti chi naviga da tastiera
      // continua a muoversi dietro le quinte
      setTimeout(() => paletteBox.querySelector('.pcat')?.focus(), 60);
    } else {
      apriPalette.focus();
    }
  };
  apriPalette.addEventListener('click', () => togglePalette(!paletteAperta));
  $('.palette-chiudi', paletteBox).addEventListener('click', () => togglePalette(false));

  const vista = el('div.view.intervento', {}, [
    el('div.int-top', {}, [
      el('div', {}, [
        el('p.step-num', { style: { margin: '0' }, text: caso.tipo }),
        el('h2', { text: caso.titolo }),
      ]),
      badgeCriticita(caso),
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
        cartellino(caso),
        el('div.obs', {}, [
          el('div.box', {}, [el('p.lbl', { text: 'La scena' }), el('p', { text: caso.scena.testo })]),
          el('div.box', {}, [el('p.lbl', { text: 'Colpo d\'occhio' }), el('p', { text: caso.colpoOcchio.testo })]),
        ]),
        decisione,
        ecgBox,
        el('p.lbl', { style: { marginTop: '18px' }, text: 'Diario dell\'intervento' }),
        diarioBox,
        apriPalette,
      ]),
      el('div.int-lato', {}, [
        mon.pannello,
        el('div.card.tight', {}, [el('p.lbl', { text: 'Squadra' }), squadra]),
        el('div.card.tight', {}, [boxSospetto]),
      ]),
    ]),
    paletteBox,
  ]);

  // Esc chiude il pannello delle azioni
  const suTasto = (e) => {
    if (e.key === 'Escape' && paletteAperta) { e.preventDefault(); togglePalette(false); }
  };
  document.addEventListener('keydown', suTasto);
  chiusure.push(() => document.removeEventListener('keydown', suTasto));

  mount(radice, vista);

  n = {
    radice, mon, squadra, diario, diarioBox, decisione,
    sospetto: { box: boxSospetto, sel: selSospetto, quando: quandoSospetto },
    paletteTabs, paletteLista, tempoBarra, tempoTacche, tempoTxt, ecg: ecgBox,
    chiudiPalette: () => togglePalette(false),
  };

  sim = creaIntervento(caso, { azioni: AZIONI });
  categoriaAperta = 'scena';
  setTimeout(() => { aggiornaTutto(); }, 0);

  return radice;
}

export function destroy() {
  chiusure.forEach((fn) => fn());
  chiusure = [];
  n?.mon?.lp?.distruggi();
  sim = null;
  n = null;
}
