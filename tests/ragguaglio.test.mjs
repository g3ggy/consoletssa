/* Collaudo del confronto del ragguaglio: logica pura, gira in Node.
   Esecuzione: node --test tests/ */

import test from 'node:test';
import assert from 'node:assert/strict';

import { revisioneRagguaglio } from '../assets/js/core/ragguaglio.js';

const CASO = {
  ragguaglioVoci: [
    { t: 'Donna di 71 anni, ipertesa in terapia', da: 'domanda:patologie' },
    { t: 'Vista bene alle 9:40', da: 'sapere:esordio-9-40' },
    { t: 'Emiparesi destra', da: 'azione:esame-neurologico' },
    { t: 'PA 178/95', da: 'lettura:pa' },
    { t: 'Trasportata con preallerta' },
  ],
};

const vuoto = { fatte: [], saputo: {}, letture: {} };

test('senza aver fatto niente, solo la voce che non dipende da niente è tua', () => {
  const r = revisioneRagguaglio(CASO, vuoto);
  assert.equal(r.totale, 5);
  assert.equal(r.tue, 1);
  assert.equal(r.voci[4].tuo, true, 'una voce senza `da` è sempre tua');
  assert.equal(r.voci[0].tuo, false);
});

test('l\'azione si cerca fra le cose fatte, col suo id nudo', () => {
  const r = revisioneRagguaglio(CASO, { ...vuoto, fatte: [{ id: 'esame-neurologico', chi: 'tu', t: 60 }] });
  assert.equal(r.voci[2].tuo, true);
  assert.equal(r.voci[0].tuo, false, 'la domanda non l\'ha fatta');
});

test('la domanda si cerca col prefisso, come la registra il motore', () => {
  const r = revisioneRagguaglio(CASO, { ...vuoto, fatte: [{ id: 'domanda:patologie', chi: 'tu', t: 40 }] });
  assert.equal(r.voci[0].tuo, true);
});

test('quello che hai saputo vale solo se qualcuno te l\'ha rivelato', () => {
  const senza = revisioneRagguaglio(CASO, { ...vuoto, saputo: { 'altra-cosa': { da: 'marito', t: 10 } } });
  assert.equal(senza.voci[1].tuo, false);
  const con = revisioneRagguaglio(CASO, { ...vuoto, saputo: { 'esordio-9-40': { da: 'marito', t: 10 } } });
  assert.equal(con.voci[1].tuo, true);
});

test('una lettura vale anche se è vecchia: l\'hai comunque rilevata', () => {
  const r = revisioneRagguaglio(CASO, { ...vuoto, letture: { pa: { t: 30, val: '178/95' } } });
  assert.equal(r.voci[3].tuo, true);
});

test('un caso che non dichiara le voci non rompe niente', () => {
  const r = revisioneRagguaglio({}, vuoto);
  assert.deepEqual(r.voci, []);
  assert.equal(r.totale, 0);
  assert.equal(r.tue, 0);
});

test('si può chiamare senza dati, e non esplode', () => {
  assert.doesNotThrow(() => revisioneRagguaglio(CASO));
  assert.equal(revisioneRagguaglio(CASO).tue, 1);
});

test('un prefisso che nessuno conosce non vale come fatto', () => {
  const r = revisioneRagguaglio({ ragguaglioVoci: [{ t: 'x', da: 'fantasia:cosa' }] }, vuoto);
  assert.equal(r.voci[0].tuo, false);
});
