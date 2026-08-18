/* =====================================================================
   cartellino.js — il cartellino della centrale, come appare sul tablet
   di bordo. Ricalca il CARTELLINO DI CO118 del Toughbook: intestazione,
   criticità a destra, campi in colonna, riquadro SCENARIO in fondo.
   ===================================================================== */

import { el } from './dom.js';
import { cartellinoDi, CRITICITA_ESTESA } from '../data/cartellini.js';

const riga = (etichetta, valore, larga = false) => el(`div.crt-riga${larga ? '.larga' : ''}`, {}, [
  el('span.crt-lab', { text: etichetta }),
  el('span.crt-val', { text: valore || '-' }),
]);

/**
 * @param {object} caso        scenario, in uno dei due formati
 * @param {object} opzioni     { compatto: true } per la versione ridotta
 */
export function cartellino(caso, opzioni = {}) {
  const c = cartellinoDi(caso);
  const criticita = c.criticita;

  const intestazione = el('div.crt-top', {}, [
    el('span.crt-marchio', { text: 'CARTELLINO DI CO118' }),
    el('span.crt-titolo', { text: 'DETTAGLIO INTERVENTO' }),
    el('div.crt-criticita', {}, [
      el('span.crt-lab', { text: 'Criticità' }),
      el(`span.crt-badge.crt-${criticita}`, {
        text: criticita,
        title: `Codice ${CRITICITA_ESTESA[criticita] || ''}`,
      }),
    ]),
  ]);

  if (opzioni.compatto) {
    return el('div.cartellino.compatto', {}, [
      intestazione,
      el('div.crt-corpo', {}, [
        riga('Indirizzo intervento', c.indirizzo, true),
        riga('Giudizio di sintesi', c.giudizio, true),
      ]),
    ]);
  }

  return el('div.cartellino', {}, [
    intestazione,
    el('div.crt-corpo', {}, [
      riga('Operatore creazione', c.operatore),
      riga('Data creazione', c.data),
      riga('Patologia', c.patologia),
      riga('Luogo', c.luogo),
      riga('Poco collaborativo', c.collaborativo),
      riga('Giudizio di sintesi', c.giudizio, true),
      riga('Note', c.note, true),
      riga('Indirizzo intervento', c.indirizzo, true),
      riga('Coordinate inserite', c.coordinate),
      riga('Categoria', c.categoria),
    ]),
    el('div.crt-sezione', { text: 'SCENARIO' }),
    el('div.crt-corpo', {}, [
      riga('Vede accaduto', c.accaduto, true),
      riga('Numero persone coinvolte', c.persone),
    ]),
  ]);
}

/** Solo la fascia colorata del codice, per intestazioni e riepiloghi. */
export function badgeCriticita(caso) {
  const c = cartellinoDi(caso);
  return el(`span.badge.crt-badge.crt-${c.criticita}`, {
    text: `codice ${CRITICITA_ESTESA[c.criticita]} dalla centrale`,
  });
}
