/* =====================================================================
   ripasso.js — mazzo di carte con ripetizione dilazionata (Leitner).
   Le carte sbagliate tornano subito, quelle sapute si allontanano nel
   tempo: 0 · 1 · 3 · 7 · 21 giorni.
   ===================================================================== */

import { el, mount, shuffle } from '../core/dom.js';
import { icon } from '../core/ui.js';
import { navigate } from '../core/router.js';
import { CARTE, CARTE_IDS } from '../data/carte.js';
import { gradeCard, dueCards, boxCounts, getState } from '../core/store.js';

let sessione = null;
let nodi = null;

function costruisciCoda(soloScadute) {
  const { fresh, due } = dueCards(CARTE_IDS);
  const ids = soloScadute ? [...due, ...fresh] : shuffle(CARTE_IDS);
  return ids.length ? ids : shuffle(CARTE_IDS);
}

function cartaCorrente() {
  return CARTE.find((c) => c.id === sessione.coda[sessione.i]);
}

function renderBoxes() {
  const counts = boxCounts(CARTE_IDS);
  const nuovi = CARTE_IDS.length - counts.reduce((a, b) => a + b, 0);
  mount(nodi.boxes,
    el('span.boxpill', {}, [document.createTextNode('mai viste '), el('b', { text: String(nuovi) })]),
    ...counts.map((n, i) => el('span.boxpill', {}, [
      document.createTextNode(`scatola ${i + 1} `), el('b', { text: String(n) }),
    ])));
}

function renderCarta() {
  const carta = cartaCorrente();
  if (!carta) return;
  const srs = getState().srs[carta.id];

  mount(nodi.meta,
    el('span', { text: carta.tema }),
    el('span', { text: `carta ${sessione.i + 1} di ${sessione.coda.length}` }),
    srs ? el('span', { text: `scatola ${srs.box}` }) : el('span', { text: 'mai vista' }));

  nodi.q.textContent = carta.q;
  nodi.a.textContent = carta.a;
  nodi.a.hidden = true;
  nodi.showBtn.hidden = false;
  nodi.grade.hidden = true;
  nodi.capBtn.onclick = () => navigate('studio', carta.cap);
}

function valuta(grade) {
  const carta = cartaCorrente();
  gradeCard(carta.id, grade);
  sessione.fatte += 1;
  if (grade === 'ko') sessione.coda.push(carta.id); // torna in fondo alla coda
  sessione.i += 1;
  renderBoxes();
  nodi.count.textContent = `${sessione.fatte} carte ripassate`;

  if (sessione.i >= sessione.coda.length) {
    fineSessione();
    return;
  }
  renderCarta();
}

function fineSessione() {
  mount(nodi.cardHost, el('div.fcard', {}, [
    el('p.meta', {}, [el('span', { text: 'sessione conclusa' })]),
    el('p.q', { text: `Hai ripassato ${sessione.fatte} carte.` }),
    el('p.a', { text: 'Le carte che hai saputo torneranno più avanti; quelle sbagliate te le ripropone domani. Un giro breve tutti i giorni vale più di un\'ora una volta a settimana.' }),
  ]));
  mount(nodi.actions,
    el('button.btn.pri', { type: 'button', onclick: () => avvia(true) }, [icon('refresh'), 'Nuovo giro']),
    el('button.btn', { type: 'button', onclick: () => navigate('simulazioni') }, ['Vai alle simulazioni']));
}

function avvia(soloScadute) {
  sessione = { coda: costruisciCoda(soloScadute), i: 0, fatte: 0 };
  mount(nodi.cardHost, nodi.card);
  mount(nodi.actions, nodi.showBtn, nodi.grade, nodi.capBtn);
  renderCarta();
  renderBoxes();
}

export function render() {
  const meta = el('p.meta');
  const q = el('p.q', { text: '—' });
  const a = el('p.a', { hidden: true });
  const card = el('div.fcard', {}, [meta, q, a]);
  const cardHost = el('div');

  const showBtn = el('button.btn.pri', { type: 'button' }, [icon('info'), 'Mostra la risposta']);
  const grade = el('div.grade', { hidden: true }, [
    el('button.btn.g1', { type: 'button', onclick: () => valuta('ko') }, ['Non la sapevo']),
    el('button.btn.g2', { type: 'button', onclick: () => valuta('quasi') }, ['Incerto']),
    el('button.btn.g3', { type: 'button', onclick: () => valuta('ok') }, ['La sapevo']),
  ]);
  const capBtn = el('button.btn.sm', { type: 'button' }, ['Apri il capitolo']);
  const actions = el('div.grid');

  showBtn.addEventListener('click', () => {
    a.hidden = false;
    showBtn.hidden = true;
    grade.hidden = false;
  });

  const boxes = el('div.boxes');
  const count = el('span', { class: 'lbl', style: { margin: '0' }, text: '0 carte ripassate' });

  const { total } = dueCards(CARTE_IDS);

  nodi = { meta, q, a, card, cardHost, showBtn, grade, capBtn, actions, boxes, count };

  const view = el('div.view', {}, [
    el('div.view-head', {}, [
      el('h2', { text: 'Ripasso' }),
      el('p', { text: 'Domande secche sui punti che vengono chiesti. Rispondi a mente, poi confronta: quello che sbagli torna presto, quello che sai si allontana nel tempo.' }),
    ]),
    el('div.card.tight', { style: { marginBottom: '16px' } }, [
      el('div.row', {}, [
        el('span.lbl', { style: { margin: '0' }, text: `${total} da ripassare oggi` }),
        el('span.spacer'),
        count,
        el('button.btn.sm.pri', { type: 'button', onclick: () => avvia(true) }, [icon('play'), 'Ripassa le scadute']),
        el('button.btn.sm', { type: 'button', onclick: () => avvia(false) }, ['Tutto il mazzo']),
      ]),
      el('div', { style: { marginTop: '10px' } }, [boxes]),
    ]),
    el('div.drill', {}, [cardHost, actions]),
  ]);

  queueMicrotask(() => avvia(true));
  return view;
}

export function destroy() {
  sessione = null;
  nodi = null;
}
