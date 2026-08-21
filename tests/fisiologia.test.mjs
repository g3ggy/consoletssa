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

/* ==================== i parametri del circolo ======================= */

import { circolo } from '../assets/js/core/fisiologia.js';

const BASE = { fc: 72, pas: 135, pad: 82, spo2: 98, fr: 14 };

test('senza perdita i parametri sono quelli suoi', () => {
  const c = circolo(riserveIniziali({ volemia: 5000 }), BASE, {});
  assert.equal(c.fc, 72);
  assert.equal(c.pas, 135);
});

test('al venti per cento la pressione TIENE e la frequenza è già salita', () => {
  const r = { ...riserveIniziali({ volemia: 5000 }), volemia: 4000 };
  const c = circolo(r, BASE, {});
  assert.equal(c.pas, 135, 'la sistolica non si muove: è questo che inganna');
  assert.ok(c.fc > 95, `la frequenza doveva salire, invece è ${c.fc}`);
  assert.ok(c.pad > BASE.pad, 'la diastolica sale: il differenziale si stringe');
});

test('al trentacinque per cento la pressione cede', () => {
  const r = { ...riserveIniziali({ volemia: 5000 }), volemia: 3250 };
  const c = circolo(r, BASE, {});
  assert.ok(c.pas < 110, `la sistolica doveva cedere, invece è ${c.pas}`);
  assert.ok(c.fc > 110, 'la frequenza è al massimo dello sforzo');
});

test('il polso radiale sparisce sotto gli ottanta di sistolica', () => {
  // Bolognin :8650 — polso radiale presente ⇒ PAS ≥ 80
  const r = { ...riserveIniziali({ volemia: 5000 }), volemia: 2900 };
  const c = circolo(r, BASE, {});
  assert.equal(c.polsoRadiale, c.pas >= 80);
});

test('la diastolica non scavalca mai la sistolica', () => {
  for (const volemia of [5000, 4200, 3500, 3000, 2600, 2200]) {
    const c = circolo({ ...riserveIniziali({ volemia: 5000 }), volemia }, BASE, {});
    assert.ok(c.pad < c.pas, `a ${volemia} ml esce ${c.pas}/${c.pad}`);
  }
});
