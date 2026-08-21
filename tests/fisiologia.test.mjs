/* =====================================================================
   Collaudo del modello fisiologico.
   Logica pura: gira in Node senza browser.
   Esecuzione:  node --test tests/
   ===================================================================== */

import test from 'node:test';
import assert from 'node:assert/strict';

import { RISERVE_ADULTO, riserveIniziali, perditaVolemica } from '../assets/js/core/fisiologia.js';

test('un adulto sano parte dalle riserve predefinite', () => {
  const r = riserveIniziali({});
  assert.equal(r.volemia, RISERVE_ADULTO.volemia);
  assert.equal(r.ossigenazione, RISERVE_ADULTO.ossigenazione);
  assert.equal(r.dolore, 0);
});

test('il caso può dichiarare solo le riserve che gli interessano', () => {
  const r = riserveIniziali({ volemia: 4800 });
  assert.equal(r.volemia, 4800);
  assert.equal(r.glicemia, RISERVE_ADULTO.glicemia, 'le altre restano ai predefiniti');
});

test('la volemia di partenza resta memorizzata per calcolare la perdita', () => {
  const r = riserveIniziali({ volemia: 5000 });
  assert.equal(r.volemiaIniziale, 5000);
});

test('la perdita si legge come frazione della volemia di partenza', () => {
  const r = { ...riserveIniziali({ volemia: 5000 }), volemia: 4000 };
  assert.equal(perditaVolemica(r), 0.2);
});

test('la perdita non va sotto zero se qualcuno riempie più del dovuto', () => {
  const r = { ...riserveIniziali({ volemia: 5000 }), volemia: 5600 };
  assert.equal(perditaVolemica(r), 0);
});

/* ==================== le fasi del compenso ========================== */

import { faseCompenso, SOGLIE_PERDITA } from '../assets/js/core/fisiologia.js';

test('sotto il quindici per cento non si vede niente', () => {
  assert.equal(faseCompenso(0.10), 'nessuna');
  assert.equal(faseCompenso(0.149), 'nessuna');
});

test('fra il quindici e il trenta il corpo compensa', () => {
  assert.equal(faseCompenso(0.15), 'compenso');
  assert.equal(faseCompenso(0.29), 'compenso');
});

test('oltre il trenta scompensa', () => {
  assert.equal(faseCompenso(0.30), 'scompenso');
  assert.equal(faseCompenso(0.39), 'scompenso');
});

test('oltre il quaranta crolla', () => {
  assert.equal(faseCompenso(0.40), 'crollo');
  assert.equal(faseCompenso(0.80), 'crollo');
});

test('le soglie sono dichiarate, non sparse nel codice', () => {
  assert.deepEqual(SOGLIE_PERDITA, { compenso: 0.15, scompenso: 0.30, crollo: 0.40 });
});
