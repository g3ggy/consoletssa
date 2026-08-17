/* =====================================================================
   progressi.js — cruscotto: cosa hai fatto, dove sbagli più spesso.
   ===================================================================== */

import { el } from '../core/dom.js';
import { icon, toast } from '../core/ui.js';
import { navigate } from '../core/router.js';
import { getState, dueCards, boxCounts, resetAll, dayKey } from '../core/store.js';
import { CARTE_IDS } from '../data/carte.js';
import { loadManual } from '../core/manual.js';
import { SCENARI } from '../data/scenari.js';

const NOMI_PASSO = {
  scena: 'Sicurezza della scena',
  colpo: 'Colpo d\'occhio',
  azione: 'Azione immediata',
  sample: 'Raccolta SAMPLE',
  codice: 'Codice di gravità',
  sospetto: 'Formulazione del sospetto',
  ragguaglio: 'Ragguaglio',
  tempo: 'Tempo della primaria',
};

function stat(k, v, d, tone = '') {
  return el('div.stat', {}, [
    el('div.k', { text: k }),
    el(`div.v${tone ? ` ${tone}` : ''}`, { text: String(v) }),
    d ? el('div.d', { text: d }) : null,
  ]);
}

function barra(label, valore, totale, nota) {
  const pct = totale ? Math.round((valore / totale) * 100) : 0;
  return el('div.bar', {}, [
    el('div.h', {}, [
      el('span', { text: label }),
      el('b', { text: nota || `${valore}/${totale}` }),
    ]),
    el('div.meter.solid', {}, [el('i', { style: { width: `${pct}%` } })]),
  ]);
}

/** Ultimi 42 giorni di attività, dal più vecchio al più recente. */
function heatmap(runs, srs) {
  const giorni = new Map();
  const bump = (ts) => {
    const k = dayKey(ts);
    giorni.set(k, (giorni.get(k) || 0) + 1);
  };
  runs.forEach((r) => bump(r.ts));
  Object.values(srs).forEach((c) => { if (c.last) bump(c.last); });

  const celle = [];
  for (let i = 41; i >= 0; i -= 1) {
    const k = dayKey(Date.now() - i * 86400000);
    const n = giorni.get(k) || 0;
    celle.push(el('i', {
      'data-l': String(n === 0 ? 0 : n < 3 ? 1 : n < 8 ? 2 : 3),
      title: `${k}: ${n} attività`,
    }));
  }
  return el('div.heat', {}, celle);
}

export async function render() {
  const s = getState();
  const { total: dueOggi } = dueCards(CARTE_IDS);
  const boxes = boxCounts(CARTE_IDS);

  let capitoliTot = 36;
  try {
    const manuale = await loadManual();
    capitoliTot = manuale.chapters.length;
  } catch {
    /* senza manuale mostriamo comunque il resto */
  }
  const letti = Object.keys(s.read).length;

  const runs = s.runs || [];
  const media = runs.length
    ? Math.round((runs.reduce((a, r) => a + (r.score / r.max) * 100, 0) / runs.length))
    : 0;
  const migliore = runs.reduce((m, r) => Math.max(m, Math.round((r.score / r.max) * 100)), 0);

  /* dove si sbaglia più spesso */
  const conteggi = {};
  runs.forEach((r) => (r.errori || []).forEach((e) => { conteggi[e] = (conteggi[e] || 0) + 1; }));
  const deboli = Object.entries(conteggi).sort((a, b) => b[1] - a[1]).slice(0, 5);

  /* scenari mai affrontati */
  const visti = new Set(runs.map((r) => r.id));
  const mancanti = SCENARI.filter((c) => !visti.has(c.id));

  const srsSeen = Object.values(s.srs).reduce((a, c) => a + c.seen, 0);
  const srsOk = Object.values(s.srs).reduce((a, c) => a + c.ok, 0);

  const view = el('div.view', {}, [
    el('div.view-head', {}, [
      el('h2', { text: 'Progressi' }),
      el('p', { text: 'Tutto resta sul tuo dispositivo: nessun account, nessun invio. Serve solo a te per capire dove stai, e soprattutto dove sbagli più spesso.' }),
    ]),

    el('div.stats', { style: { marginBottom: '16px' } }, [
      stat('giorni di fila', s.streak.days || 0, s.streak.days ? 'continua così' : 'inizia oggi', 'phos'),
      stat('capitoli letti', `${letti}/${capitoliTot}`, `${Math.round((letti / capitoliTot) * 100)}% del manuale`),
      stat('carte da ripassare', dueOggi, dueOggi ? 'pronte adesso' : 'nulla in scadenza', dueOggi ? 'amber' : 'phos'),
      stat('simulazioni', runs.length, runs.length ? `media ${media}% · migliore ${migliore}%` : 'mai provate'),
    ]),

    el('div.grid.g-2', {}, [
      el('div.grid', {}, [
        el('div.card', {}, [
          el('p.lbl', { text: 'Dove sbagli più spesso' }),
          deboli.length
            ? el('div.bars', {}, deboli.map(([k, n]) => barra(
              NOMI_PASSO[k] || k, n, runs.length, `${n} volte su ${runs.length}`,
            )))
            : el('div.emptybox', { text: 'Completa qualche simulazione: qui compaiono i passi che ti sfuggono più spesso.' }),
        ]),

        el('div.card', {}, [
          el('p.lbl', { text: 'Ultime simulazioni' }),
          runs.length
            ? el('div.timeline', {}, runs.slice(-8).reverse().map((r) => el(`div.tl.${(r.score / r.max) >= 0.75 ? 'ok' : 'ko'}`, {}, [
              el('span.t', { text: new Date(r.ts).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' }) }),
              el('span.m'),
              el('span', {}, [
                el('b', { text: r.titolo || r.id }),
                el('div', { style: { color: 'var(--ink-3)', fontSize: '13px' },
                  text: r.seconds !== null && r.seconds !== undefined ? `primaria in ${r.seconds}s` : 'primaria non completata' }),
              ]),
              el('span.p', { text: `${r.score}/${r.max}` }),
            ])))
            : el('div.emptybox', { text: 'Nessuna simulazione registrata.' }),
        ]),

        el('div.card', {}, [
          el('p.lbl', { text: 'Scenari non ancora affrontati' }),
          mancanti.length
            ? el('div.row', {}, mancanti.map((c) => el('button.chip', {
              type: 'button', onclick: () => navigate('simulazioni'),
            }, [c.titolo])))
            : el('div.emptybox', { text: 'Li hai visti tutti almeno una volta.' }),
        ]),
      ]),

      el('div.grid', {}, [
        el('div.card', {}, [
          el('p.lbl', { text: 'Attività delle ultime sei settimane' }),
          heatmap(runs, s.srs),
          el('p', { style: { marginTop: '10px' } }, [
            el('small', { text: 'Ogni quadrato è un giorno: più è acceso, più hai lavorato.' }),
          ]),
        ]),

        el('div.card', {}, [
          el('p.lbl', { text: 'Mazzo di ripasso' }),
          el('div.bars', {}, boxes.map((n, i) => {
            const giorni = [0, 1, 3, 7, 21][i];
            const quando = giorni === 0 ? 'subito' : giorni === 1 ? 'dopo 1 giorno' : `dopo ${giorni} giorni`;
            return barra(`Scatola ${i + 1} · ${quando}`, n, CARTE_IDS.length, n === 1 ? '1 carta' : `${n} carte`);
          })),
          el('p', { style: { marginTop: '12px' } }, [
            el('small', {
              text: srsSeen
                ? `${srsOk} ${srsOk === 1 ? 'risposta esatta' : 'risposte esatte'} su ${srsSeen} ${srsSeen === 1 ? 'valutazione' : 'valutazioni'}.`
                : 'Nessuna carta ancora valutata.',
            }),
          ]),
        ]),

        el('div.card', {}, [
          el('p.lbl', { text: 'Riconoscimento dei ritmi' }),
          s.rhythmQuiz.seen
            ? barra('Risposte esatte', s.rhythmQuiz.ok, s.rhythmQuiz.seen,
              `${Math.round((s.rhythmQuiz.ok / s.rhythmQuiz.seen) * 100)}%`)
            : el('div.emptybox', { text: 'Prova il quiz nel modulo Monitor.' }),
          el('div.row', { style: { marginTop: '12px' } }, [
            el('button.btn.sm', { type: 'button', onclick: () => navigate('monitor') }, [icon('monitor'), 'Vai al monitor']),
          ]),
        ]),

        el('div.card', {}, [
          el('p.lbl', { text: 'Dati' }),
          el('p', {}, [el('small', { text: 'Avanzamento, mazzo e storico sono salvati solo in questo browser.' })]),
          el('button.btn.sm', {
            type: 'button',
            onclick: () => {
              // eslint-disable-next-line no-alert
              if (!window.confirm('Azzero avanzamento, mazzo di ripasso e storico delle simulazioni. Confermi?')) return;
              resetAll();
              toast('Dati azzerati', 'Riparti da capo.');
              navigate('progressi');
              setTimeout(() => window.location.reload(), 400);
            },
          }, ['Azzera tutto']),
        ]),
      ]),
    ]),
  ]);

  return view;
}

export function destroy() { /* niente da smontare */ }
