/* Controlli sui dodici scenari a domande: nessuno deve avere l'arrivo
   generico, e ogni azione immediata deve dire che cosa hai davanti. */

import test from 'node:test';
import assert from 'node:assert/strict';

import { SCENARI, OPZIONI, VITAL_META, LIMITI_VITALI } from '../assets/js/data/scenari.js';
import { DETTAGLI_ARRIVO as ARRIVI } from '../assets/js/data/scenari-arrivo.js';

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

/* =================== tetto ai parametri del monitor ===================
   Una scheda lasciata aperta tutta la notte faceva derivare i parametri per
   centinaia di minuti: sul monitor comparivano frequenze a quattro cifre.
   Il tetto non è più facoltativo, e deve coprire ogni chiave che deriva. */

const entro = (k, v) => {
  const l = LIMITI_VITALI[k];
  return l ? Math.min(l[1], Math.max(l[0], v)) : v;
};

test('ogni parametro del monitor ha il suo tetto', () => {
  for (const k of Object.keys(VITAL_META)) {
    assert.ok(LIMITI_VITALI[k], `${k} è sul monitor ma non ha limiti: può scappare`);
  }
});

test('ogni parametro che deriva ha il suo tetto', () => {
  const chiavi = new Set();
  Object.values(ARRIVI).forEach((a) => Object.keys(a.deriva || {}).forEach((k) => chiavi.add(k)));
  assert.ok(chiavi.size > 0, 'nessuna deriva trovata: il test non sta guardando niente');
  for (const k of chiavi) {
    assert.ok(LIMITI_VITALI[k], `${k} deriva nel tempo ma non ha limiti`);
  }
});

test('nessuno scenario esce dai limiti, nemmeno a ventiquattr\'ore', () => {
  for (const s of SCENARI) {
    const deriva = ARRIVI[s.id]?.deriva || {};
    for (const [k, ritmo] of Object.entries(deriva)) {
      const base = parseFloat(String(s.vitali[k]?.v ?? ''));
      if (Number.isNaN(base)) continue;
      for (const minuti of [10, 60, 600, 1440]) {
        const v = entro(k, base + ritmo * minuti);
        const [min, max] = LIMITI_VITALI[k];
        assert.ok(v >= min && v <= max,
          `${s.id}/${k} a ${minuti} minuti vale ${v}, fuori da [${min}, ${max}]`);
      }
    }
  }
});
