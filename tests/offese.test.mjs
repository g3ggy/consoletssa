/* Collaudo del catalogo delle offese: ogni offesa è una funzione pura
   che consuma riserve. Esecuzione: node --test tests/ */

import test from 'node:test';
import assert from 'node:assert/strict';

import { OFFESE, applicaOffese, compensoBloccato } from '../assets/js/data/offese.js';
import { riserveIniziali } from '../assets/js/core/fisiologia.js';

test('ogni offesa dichiara la sua fonte', () => {
  Object.values(OFFESE).forEach((o) => {
    assert.ok(o.fonte, `${o.id}: manca la fonte`);
    assert.ok(typeof o.applica === 'function', `${o.id}: manca applica()`);
  });
});

test('le sette del primo giro ci sono tutte', () => {
  for (const id of ['emorragia', 'vasodilatazione', 'ipossia-ventilatoria',
    'ischemia-miocardica', 'dolore-acuto', 'ipoglicemia', 'blocco-compenso']) {
    assert.ok(OFFESE[id], `manca l'offesa ${id}`);
  }
});

test('l\'emorragia consuma volemia alla portata dichiarata', () => {
  const r = riserveIniziali({ volemia: 5000 });
  const dopo = applicaOffese(r, [{ tipo: 'emorragia', portata: 60 }], 60, []);
  assert.equal(dopo.volemia, 4940, 'sessanta ml al minuto per un minuto');
});

test('la compressione riduce la portata ma non la azzera', () => {
  const r = riserveIniziali({ volemia: 5000 });
  const senza = applicaOffese(r, [{ tipo: 'emorragia', portata: 60 }], 60, []);
  const con = applicaOffese(r, [{ tipo: 'emorragia', portata: 60 }], 60, ['compressione']);
  assert.ok(con.volemia > senza.volemia, 'la compressione aiuta');
  assert.ok(con.volemia < 5000, 'ma non ferma tutto: serve il laccio o la sala operatoria');
});

test('il laccio ferma l\'emorragia di un arto', () => {
  const r = riserveIniziali({ volemia: 5000 });
  const dopo = applicaOffese(r, [{ tipo: 'emorragia', portata: 60, sede: 'arto' }], 60, ['laccio']);
  assert.equal(dopo.volemia, 5000);
});

test('il laccio non serve a niente su un\'emorragia interna', () => {
  const r = riserveIniziali({ volemia: 5000 });
  const dopo = applicaOffese(r, [{ tipo: 'emorragia', portata: 60, sede: 'interna' }], 60, ['laccio']);
  assert.equal(dopo.volemia, 4940, 'un laccio sull\'addome non esiste');
});

test('la vasodilatazione non toglie sangue: toglie tenuta', () => {
  const r = riserveIniziali({ volemia: 5000 });
  const dopo = applicaOffese(r, [{ tipo: 'vasodilatazione', intensita: 0.1 }], 60, []);
  assert.equal(dopo.volemia, 5000, 'il sangue c\'è tutto');
  assert.ok(dopo.tonoVascolare < 1, 'ma i vasi non tengono');
});

test('l\'ossigeno frena l\'ipossia ventilatoria', () => {
  const r = riserveIniziali({});
  const senza = applicaOffese(r, [{ tipo: 'ipossia-ventilatoria', intensita: 0.02 }], 60, []);
  const con = applicaOffese(r, [{ tipo: 'ipossia-ventilatoria', intensita: 0.02 }], 60, ['o2']);
  assert.ok(con.ossigenazione > senza.ossigenazione);
});

test('il blocco-compenso e il betabloccante bloccano il compenso', () => {
  assert.equal(compensoBloccato([{ tipo: 'emorragia', portata: 60 }], {}), false);
  assert.equal(compensoBloccato([{ tipo: 'blocco-compenso' }], {}), true,
    'la lesione mielica lo blocca — Bolognin :6487');
  assert.equal(compensoBloccato([], { terapia: ['betabloccante'] }), true,
    'e il betabloccante pure, ma lo scopri solo chiedendo la terapia');
  assert.equal(compensoBloccato([], { terapia: ['antipertensivo'] }), false);
});

test('le offese non mutano le riserve che ricevono', () => {
  const r = riserveIniziali({ volemia: 5000 });
  applicaOffese(r, [{ tipo: 'emorragia', portata: 60 }], 60, []);
  assert.equal(r.volemia, 5000, 'l\'oggetto di partenza è rimasto intatto');
});
