/* =====================================================================
   Collaudo del giudizio clinico.
   Logica pura: gira in Node senza browser.
   Esecuzione:  node --test tests/giudizio.test.mjs
   ===================================================================== */

import test from 'node:test';
import assert from 'node:assert/strict';

import { CLASSI, GRUPPI_CLASSI } from '../assets/js/data/classi-patologia.js';

/* ==================== le classi della scheda ARES =================== */

test('sono diciassette, e sono quelle della scheda', () => {
  /* Il modulo ARES 118 salta C16, C17 e C18: la scheda vera è quella e
     va imparata com'è, buchi compresi. */
  assert.equal(Object.keys(CLASSI).length, 17);
  ['C16', 'C17', 'C18'].forEach((c) => {
    assert.equal(CLASSI[c], undefined, `${c} non esiste sulla scheda`);
  });
  assert.ok(CLASSI.C01.label.match(/traumatic/i));
  assert.ok(CLASSI.C20.label.match(/non identificat/i));
});

test('ogni classe ha un codice che combacia con la sua chiave', () => {
  Object.entries(CLASSI).forEach(([chiave, c]) => {
    assert.equal(c.codice, chiave, `${chiave} dichiara ${c.codice}`);
  });
});

test('i gruppi coprono tutte le classi, e nessuna due volte', () => {
  /* Servono a non mettere diciassette voci di fila in un elenco su un
     telefono: il raggruppamento è l'unica cosa che lo rende leggibile. */
  const dentro = GRUPPI_CLASSI.flatMap((g) => g.codici);
  assert.equal(dentro.length, 17, `i gruppi contengono ${dentro.length} voci`);
  assert.equal(new Set(dentro).size, 17, 'una classe compare in due gruppi');
  dentro.forEach((c) => assert.ok(CLASSI[c], `${c} non è una classe`));
});
