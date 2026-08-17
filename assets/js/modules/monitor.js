/* =====================================================================
   monitor.js — ritmi cardiaci e pattern respiratori.
   I canvas si dimensionano da soli (ResizeObserver): il tracciato
   compare subito all'apertura della sezione, senza attendere un resize.
   ===================================================================== */

import { el, mount, $, pick } from '../core/dom.js';
import { createScope, createBreathScope, RHYTHMS, RHYTHM_KEYS, BREATHS } from '../core/waveform.js';
import { recordRhythmAnswer, getState } from '../core/store.js';
import { icon } from '../core/ui.js';
import { setRibbonRhythm } from '../core/ribbon.js';

let scope = null;
let breath = null;

/* ============================== ECG ================================== */
function ecgCard() {
  const canvas = el('canvas.scope', { 'aria-label': 'Tracciato elettrocardiografico' });
  const picker = el('div.rhythm-pick');
  const verdict = el('div.verdict');
  const teach = el('p', { class: 'lbl', style: { textTransform: 'none', letterSpacing: '0', fontFamily: 'var(--body)', margin: '10px 0 0' } });

  const decayTxt = el('span.big');
  const decayBar = el('div.meter', {}, [el('i', { style: { width: '100%' } })]);
  const decayRange = el('input', { type: 'range', min: '0', max: '15', value: '0', step: '1', 'aria-label': 'Minuti dall\'arresto' });
  const decayNote = el('p', { style: { margin: '10px 0 0' } }, [
    el('small', { text: 'La probabilità di conversione cala del 7-10% per ogni minuto senza defibrillazione. La RCP non converte una FV, ma la mantiene defibrillabile più a lungo: rallenta la caduta, non la annulla.' }),
  ]);

  let current = 'sinusale';
  let quiz = null;   // {key} quando la modalità quiz è attiva

  const buttons = RHYTHM_KEYS.map((k) => el('button.btn.sm', {
    type: 'button', 'data-r': k,
    onclick: () => (quiz ? answerQuiz(k) : setRhythm(k)),
  }, [RHYTHMS[k].short]));
  picker.append(...buttons);

  function syncButtons(activeKey) {
    buttons.forEach((b) => b.classList.toggle('pri', !quiz && b.dataset.r === activeKey));
  }

  function setRhythm(key) {
    current = key;
    const r = RHYTHMS[key];
    scope.setRhythm(key);
    setRibbonRhythm(key);
    syncButtons(key);

    mount(verdict,
      el(`span.badge.${r.shock ? 'b-shock' : r.perfusing ? 'b-ok' : 'b-no'}`, {
        text: r.shock ? 'defibrillabile' : r.perfusing ? 'ritmo perfusivo' : 'non defibrillabile',
      }),
      el('span.badge.b-no', { text: r.rate ? `${r.rate} bpm` : 'nessuna attività' }),
      el('p', { html: `<b>${r.label}.</b> ${r.desc}` }));
    teach.textContent = r.teach;

    decayRange.disabled = !r.shock;
    updateDecay();
  }

  function updateDecay() {
    const min = Number(decayRange.value);
    const shockable = RHYTHMS[current].shock;
    const pct = shockable ? Math.max(2, Math.round(100 * (0.91 ** min))) : 0;
    $('i', decayBar).style.width = `${shockable ? pct : 0}%`;
    decayTxt.textContent = shockable ? `~${pct}%` : '—';
    decayTxt.style.color = pct > 60 ? 'var(--phos)' : pct > 30 ? 'var(--amber)' : 'var(--cri)';
    decayNote.firstChild.textContent = shockable
      ? `A ${min} minuti dall'arresto restano circa il ${pct}% delle probabilità che aveva una scarica immediata: si perde il 7-10% per ogni minuto. La RCP non converte una FV, ma la mantiene defibrillabile più a lungo.`
      : 'Questo ritmo non è defibrillabile: la scarica non ha nulla da riorganizzare. Si comprime e si cercano le cause reversibili.';
  }
  decayRange.addEventListener('input', updateDecay);

  /* ------------------------------ quiz ------------------------------- */
  const quizBar = el('div.quizbar');

  function renderQuizIdle() {
    const { seen, ok } = getState().rhythmQuiz;
    mount(quizBar,
      el('span.q', { text: 'Riconosci il ritmo' }),
      el('span', { class: 'lbl', style: { margin: '0', textTransform: 'none', letterSpacing: '0', fontFamily: 'var(--body)' },
        text: seen ? `${ok}/${seen} corretti finora` : 'Il monitor mostra un ritmo a caso: dillo tu.' }),
      el('span.spacer'),
      el('button.btn.sm.pri', { type: 'button', onclick: startQuiz }, [icon('play'), 'Avvia']));
  }

  function startQuiz() {
    quiz = { key: pick(RHYTHM_KEYS) };
    scope.setRhythm(quiz.key, '#34D399');
    setRibbonRhythm(quiz.key);
    syncButtons(null);
    mount(verdict, el('p', { text: 'Guarda il tracciato e scegli il ritmo qui sopra.' }));
    teach.textContent = '';
    mount(quizBar,
      el('span.q', { text: 'Che ritmo è?' }),
      el('span.spacer'),
      el('button.btn.sm', { type: 'button', onclick: () => { quiz = null; renderQuizIdle(); setRhythm(current); } }, ['Esci dal quiz']));
  }

  function answerQuiz(key) {
    const right = quiz.key;
    const correct = key === right;
    recordRhythmAnswer(correct);
    const r = RHYTHMS[right];
    quiz = null;
    scope.setRhythm(right);
    syncButtons(right);
    current = right;
    mount(verdict,
      el(`span.badge.${correct ? 'b-ok' : 'b-shock'}`, { text: correct ? 'corretto' : 'sbagliato' }),
      el('p', { html: `Era <b>${r.label}</b>. ${r.desc}` }));
    teach.textContent = r.teach;
    decayRange.disabled = !r.shock;
    updateDecay();
    const { seen, ok } = getState().rhythmQuiz;
    mount(quizBar,
      el('span.q', { text: `${ok}/${seen} corretti` }),
      el('span.spacer'),
      el('button.btn.sm.pri', { type: 'button', onclick: startQuiz }, [icon('refresh'), 'Un altro']));
  }

  const card = el('div.card', {}, [
    el('p.lbl', { text: 'Monitor — seleziona un ritmo' }),
    picker,
    canvas,
    el('div.scope-legend', {}, [
      el('span', { html: 'velocità <b>25 mm/s</b>' }),
      el('span', { html: 'derivazione <b>DII</b>' }),
      el('span', { text: 'tracciato didattico, non diagnostico' }),
    ]),
    verdict,
    teach,
    quizBar,
    el('div.decay', {}, [
      el('div.row', {}, [
        el('p.lbl', { style: { margin: '0' }, text: 'Efficacia della scarica rispetto alla defibrillazione immediata' }),
        el('span.spacer'),
        decayTxt,
      ]),
      decayBar,
      decayRange,
      decayNote,
    ]),
  ]);

  queueMicrotask(() => {
    scope = createScope(canvas, { kind: 'sinusale', speed: 150, amp: 1.15 });
    setRhythm('sinusale');
    renderQuizIdle();
  });

  return card;
}

/* ============================= RESPIRO =============================== */
function breathCard() {
  const canvas = el('canvas.scope.sm', { 'aria-label': 'Tracciato respiratorio' });
  const picker = el('div.breath-pick');
  const info = el('div');

  const NOMI = { normale: 'Normale', bradipnea: 'Bradipnea', dispnea: 'Dispnea', gasping: 'Gasping' };
  const buttons = Object.keys(BREATHS).map((k) => el('button.btn.sm', {
    type: 'button', 'data-b': k, onclick: () => setMode(k),
  }, [NOMI[k] || k]));
  picker.append(...buttons);

  function setMode(k) {
    breath.setMode(k);
    buttons.forEach((b) => b.classList.toggle('pri', b.dataset.b === k));
    const b = BREATHS[k];
    mount(info,
      el('div.row', {}, [
        el(`span.badge.${b.verdict === 'ok' ? 'b-ok' : b.verdict === 'alarm' ? 'b-shock' : 'b-warn'}`, { text: b.label }),
        el('span.badge.b-no', { text: `~${b.rate} atti/min` }),
      ]),
      el('p', { style: { marginTop: '10px', color: 'var(--ink-2)' }, text: b.desc }),
      el('p.lbl', { style: { marginTop: '12px' }, text: 'Come lo riconosci' }),
      el('ul', { style: { margin: '0 0 12px', paddingLeft: '18px', color: 'var(--ink-2)', fontSize: '14px' },
        html: b.signs.map((s) => `<li>${s}</li>`).join('') }),
      el(`div.dbox.${b.verdict === 'alarm' ? 'warn' : 'ok'}`, {}, [
        el('div.t', { text: 'cosa fai' }),
        el('p', { style: { margin: '0' }, text: b.action }),
      ]));
  }

  const card = el('div.card', {}, [
    el('p.lbl', { text: 'Respiro — normale, alterato o agonico?' }),
    picker,
    el('div.breath-body', {}, [
      el('div', {}, [canvas, el('div.scope-legend', {}, [
        el('span', { html: 'escursione toracica nel tempo' }),
      ])]),
      info,
    ]),
  ]);

  queueMicrotask(() => {
    breath = createBreathScope(canvas, { mode: 'normale' });
    setMode('normale');
  });

  return card;
}

/* ============================== VISTA ================================ */
export function render() {
  return el('div.view', {}, [
    el('div.view-head', {}, [
      el('h2', { text: 'Monitor' }),
      el('p', { text: 'I ritmi che devi saper riconoscere e i pattern respiratori che cambiano la condotta. Il tracciato scorre come su un monitor vero: guarda la forma, non solo il numero.' }),
    ]),
    el('div.grid', {}, [ecgCard(), breathCard()]),
  ]);
}

export function destroy() {
  scope?.destroy(); scope = null;
  breath?.destroy(); breath = null;
}
