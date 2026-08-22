/* Il conto della bombola, contro l'esempio che il manuale fa per esteso. */

import test from 'node:test';
import assert from 'node:assert/strict';

import { creaBombola, conFlusso, consuma, residui, autonomia, riepilogo } from '../assets/js/core/bombola.js';

test('una portatile da 2 litri a 200 bar contiene 400 litri', () => {
  /* «Il contenuto in O2 di ogni bombola è pari al volume moltiplicato
     per le Atmosfere» — Bolognin :3372. */
  const b = creaBombola();
  assert.equal(b.contenuto, 400);
  assert.equal(residui(b), 400);
});

test('l\'autonomia è il contenuto diviso il flusso', () => {
  /* «Basta dividere la quantità dell'ossigeno disponibile per il flusso
     che vado ad erogare» — Bolognin :3377. 400 / 15 = 26,67 minuti. */
  const b = conFlusso(creaBombola(), 15);
  assert.ok(Math.abs(autonomia(b) - 26.67) < 0.01);
  assert.equal(autonomia(creaBombola()), Infinity, 'senza flusso non si consuma niente');
});

test('il consumo non muta la bombola che riceve', () => {
  const prima = conFlusso(creaBombola(), 15);
  const dopo = consuma(prima, 60, 60);
  assert.equal(prima.erogati, 0, 'la bombola di partenza è stata mutata');
  assert.equal(dopo.erogati, 15, 'un minuto a 15 l/min sono 15 litri');
});

test('quando finisce si ferma, e dice a che secondo', () => {
  const b = conFlusso(creaBombola({ litri: 2, bar: 50 }), 15);
  assert.equal(b.contenuto, 100);
  const dopo = consuma(b, 600, 600);
  assert.equal(residui(dopo), 0);
  assert.equal(dopo.flusso, 0, 'finita la bombola non eroga più');
  assert.equal(dopo.finitaA, 600);
  /* Finita una volta, resta finita: non riparte al secondo dopo. */
  assert.equal(consuma(dopo, 60, 660).finitaA, 600);
});

test('senza ossigeno erogato non c\'è niente da raccontare', () => {
  assert.equal(riepilogo(creaBombola()), null);
  const r = riepilogo(consuma(conFlusso(creaBombola(), 15), 120, 120));
  assert.equal(r.erogati, 30);
  assert.equal(r.residui, 370);
  assert.equal(r.minutiResidui, 24);   // 370 / 15 = 24 minuti pieni
});
