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
