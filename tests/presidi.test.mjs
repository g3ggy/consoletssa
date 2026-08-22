/* Il generatore delle famiglie: se sbaglia qui, sbagliano tutte e
   ventidue le voci insieme. */

import test from 'node:test';
import assert from 'node:assert/strict';

import { VOCI_PRESIDI, FAMIGLIE_META, IDS } from '../assets/js/data/presidi.js';

test('ogni famiglia genera gli id che il resto del progetto nomina', () => {
  assert.deepEqual(IDS.guedel,
    ['cannula-0', 'cannula-1', 'cannula-2', 'cannula-3', 'cannula-4', 'cannula-5']);
  assert.deepEqual(IDS.sondino,
    ['sondino-6', 'sondino-10', 'sondino-16', 'sondino-18']);
  assert.deepEqual(IDS.ago,
    ['ago-14', 'ago-16', 'ago-18', 'ago-20']);
  assert.deepEqual(IDS.ossigeno,
    ['o2-occhialini', 'o2-maschera', 'o2-venturi', 'o2-reservoir', 'o2-nebulizzatore']);
});

test('le voci portano quello che il motore e la palette si aspettano', () => {
  assert.equal(VOCI_PRESIDI.length, 19);
  const ids = VOCI_PRESIDI.map((v) => v.id);
  assert.equal(new Set(ids).size, ids.length, 'ci sono id ripetuti');

  VOCI_PRESIDI.forEach((v) => {
    assert.ok(v.label, `${v.id}: manca l'etichetta`);
    assert.ok(v.cat, `${v.id}: manca la categoria`);
    assert.ok(FAMIGLIE_META[v.famiglia], `${v.id}: famiglia "${v.famiglia}" sconosciuta`);
    assert.ok(v.durata > 0, `${v.id}: durata non valida`);
    assert.ok(Array.isArray(v.chi) && v.chi.length, `${v.id}: nessun esecutore`);
    assert.ok(v.spiega && v.spiega.length > 20, `${v.id}: spiegazione troppo corta`);
    assert.ok(v.etichettaMisura, `${v.id}: la palette non ha niente da scrivere sul bottone`);
  });
});

test('ogni famiglia dice come si misura, e da dove viene', () => {
  Object.values(FAMIGLIE_META).forEach((f) => {
    assert.ok(f.label, 'famiglia senza etichetta');
    assert.ok(f.comeSiMisura && f.comeSiMisura.length > 20, `${f.id}: manca il come si misura`);
    assert.ok(f.fonteMisura, `${f.id}: il promemoria non porta la fonte`);
    assert.ok(f.ids.length >= 4, `${f.id}: famiglia troppo corta per essere una famiglia`);
  });
});

test('le Guedel portano il colore della check-list', () => {
  const attesi = ['nera', 'bianca', 'verde', 'gialla', 'rossa', 'arancione'];
  IDS.guedel.forEach((id, i) => {
    const v = VOCI_PRESIDI.find((x) => x.id === id);
    assert.match(v.etichettaMisura, new RegExp(attesi[i]), `${id}: colore sbagliato`);
    assert.ok(v.colore, `${id}: manca il colore da mettere sul bottone`);
  });
});

test('solo l\'ossigeno dichiara un flusso: è quello che consuma la bombola', () => {
  const conFlusso = VOCI_PRESIDI.filter((v) => v.flusso).map((v) => v.id);
  assert.deepEqual(conFlusso, IDS.ossigeno);
  VOCI_PRESIDI.filter((v) => v.flusso).forEach((v) => {
    assert.ok(v.flusso >= 2 && v.flusso <= 15, `${v.id}: flusso fuori scala`);
  });
});

test('una cannula sola: messa quella, le altre cinque non si possono più mettere', () => {
  const v = VOCI_PRESIDI.find((x) => x.id === 'cannula-3');
  const incosciente = { coscienza: 'U', tag: [] };
  assert.equal(v.richiede(incosciente, {}), true);
  assert.equal(v.richiede({ coscienza: 'U', tag: ['cannula'] }, {}), false);
  assert.equal(v.richiede({ coscienza: 'A', tag: [] }, {}), false);
});
