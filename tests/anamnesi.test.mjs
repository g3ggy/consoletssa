/* Collaudo dell'anamnesi: logica pura, gira in Node senza browser.
   Esecuzione: node --test tests/ */

import test from 'node:test';
import assert from 'node:assert/strict';

import { PAZIENTE, interlocutoriDi, puoRispondere } from '../assets/js/core/anamnesi.js';

test('il paziente c\'è sempre, e sta per primo', () => {
  const soli = interlocutoriDi({});
  assert.equal(soli.length, 1);
  assert.equal(soli[0].id, PAZIENTE.id);
});

test('gli altri presenti li dichiara il caso', () => {
  const caso = { anamnesi: { interlocutori: [{ id: 'moglie', label: 'la moglie' }] } };
  const chi = interlocutoriDi(caso);
  assert.deepEqual(chi.map((i) => i.id), ['paziente', 'moglie']);
  assert.equal(chi[1].label, 'la moglie');
});

test('un paziente vigile risponde', () => {
  assert.equal(puoRispondere('paziente', 'A').ok, true);
});

test('un paziente confuso risponde lo stesso: è questo il problema', () => {
  assert.equal(puoRispondere('paziente', 'V').ok, true);
});

test('a P e a U non risponde, e il motivo lo dice', () => {
  for (const coscienza of ['P', 'U']) {
    const esito = puoRispondere('paziente', coscienza);
    assert.equal(esito.ok, false);
    assert.match(esito.motivo, /chiedi a chi c/i, 'il motivo deve dire cosa fare invece');
  }
});

test('chi non è il paziente risponde comunque, qualunque cosa faccia lui', () => {
  assert.equal(puoRispondere('moglie', 'U').ok, true);
});
