/* Controlli sui dodici scenari a domande: nessuno deve avere l'arrivo
   generico, e ogni azione immediata deve dire che cosa hai davanti. */

import test from 'node:test';
import assert from 'node:assert/strict';

import { SCENARI, OPZIONI } from '../assets/js/data/scenari.js';

test('ogni scenario ha un arrivo tutto suo', () => {
  SCENARI.forEach((c) => {
    assert.ok(c.arrivo, `${c.id}: manca l'arrivo`);
    assert.ok(c.arrivo.testo?.length > 60, `${c.id}: il testo d'arrivo è troppo scarno`);
    assert.ok(c.arrivo.domanda?.length > 5, `${c.id}: manca la domanda d'arrivo`);
    assert.ok(c.arrivo.scelte?.length >= 3, `${c.id}: servono almeno tre scelte`);
    const giuste = c.arrivo.scelte.filter((s) => s.ok);
    assert.equal(giuste.length, 1, `${c.id}: deve esserci una sola scelta corretta`);
    c.arrivo.scelte.forEach((s) => {
      assert.ok(s.t?.length > 10, `${c.id}: scelta senza testo`);
      assert.ok(s.w?.length > 30, `${c.id}: scelta senza spiegazione: ${s.t}`);
    });
  });
});

test('gli arrivi non sono copie l\'uno dell\'altro', () => {
  const testi = SCENARI.map((c) => c.arrivo.testo);
  assert.equal(new Set(testi).size, testi.length, 'ci sono arrivi identici');
  const domande = SCENARI.map((c) => c.arrivo.domanda);
  assert.ok(new Set(domande).size >= 6, 'le domande d\'arrivo si somigliano troppo');
});

test('ogni azione immediata dice che cosa hai davanti', () => {
  SCENARI.forEach((c) => {
    assert.ok(c.situazione?.length > 120,
      `${c.id}: la situazione deve descrivere il quadro, non enunciare un principio`);
    assert.ok(c.azioniSbagliate?.length >= 2, `${c.id}: servono errori plausibili per questo caso`);
    c.azioniSbagliate.forEach((a) => {
      assert.ok(a.t && a.w?.length > 30, `${c.id}: distrattore senza spiegazione`);
    });
    assert.ok(OPZIONI.azione[c.azione], `${c.id}: azione corretta sconosciuta (${c.azione})`);
  });
});

test('arrivo e descrizione della scena non si contraddicono', () => {
  SCENARI.forEach((c) => {
    const testo = `${c.arrivo.testo} ${c.scena.testo}`.toLowerCase();
    const diceCheCe = /\bascensore funzionante|c'è l'ascensore/.test(testo);
    const diceCheNonCe = /niente ascensore|senza ascensore/.test(testo);
    assert.ok(!(diceCheCe && diceCheNonCe), `${c.id}: l'ascensore c'è e non c'è insieme`);
  });
});
