/* =====================================================================
   Collaudo delle letture: come si scrive un valore, e da quanto ce l'hai.
   Logica pura: gira in Node senza browser.
   ===================================================================== */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  CONTINUE, VALIDITA_LETTURA, valoreGrezzo, scaduta, valore, eta,
} from '../assets/js/core/letture.js';

const STATO = {
  pas: 128.4, pad: 78.2, fc: 96.6, spo2: 94.4, temp: 36.72, glicemia: 82.3,
  coscienza: 'V', ritmo: 'tachicardia', polsoRadiale: false,
  refill: 3, cute: 'pallida-fredda-sudata', sete: true,
};

/* ====================== come si scrive un valore ==================== */

test('la pressione è una stringa, non un numero', () => {
  /* È la trappola già pagata: un predicato che scrive `letture.pa < 90`
     confronta una stringa con un numero e restituisce `false` in
     silenzio, per sempre. */
  assert.equal(valoreGrezzo('pa', STATO), '128/78');
});

test('i numeri si arrotondano, la temperatura tiene il decimale', () => {
  assert.equal(valoreGrezzo('fc', STATO), 97);
  assert.equal(valoreGrezzo('spo2', STATO), 94);
  assert.equal(valoreGrezzo('temp', STATO), 36.7);
});

test('quello che non è un numero si dice a parole', () => {
  assert.equal(valoreGrezzo('avpu', STATO), 'V');
  assert.equal(valoreGrezzo('ritmo', STATO), 'tachicardia');
  assert.equal(valoreGrezzo('polso', STATO), 'assente');
  assert.equal(valoreGrezzo('refill', STATO), '3 s');
  assert.equal(valoreGrezzo('cute', STATO), 'pallida, fredda, sudata');
  assert.equal(valoreGrezzo('sete', STATO), 'ha sete');
});

test('una cute che il catalogo non conosce si scrive com\'è', () => {
  assert.equal(valoreGrezzo('cute', { ...STATO, cute: 'marezzata' }), 'marezzata');
});

/* ========================= da quanto ce l'hai ======================= */

test('quello che non hai mai misurato è scaduto', () => {
  assert.equal(scaduta('glicemia', {}, 300, false), true);
});

test('una rilevazione invecchia e scade', () => {
  const letture = { glicemia: { t: 100, val: 82 } };
  assert.equal(scaduta('glicemia', letture, 100 + VALIDITA_LETTURA, false), false);
  assert.equal(scaduta('glicemia', letture, 100 + VALIDITA_LETTURA + 1, false), true);
});

test('col monitor attaccato le grandezze continue non scadono mai', () => {
  /* Frequenza, saturazione e ritmo il monitor li tiene sotto controllo:
     non c'è niente da rifare. La pressione no — quella la misuri. */
  CONTINUE.forEach((k) => assert.equal(scaduta(k, {}, 9999, true), false, k));
  assert.equal(scaduta('pa', {}, 9999, true), true, 'la pressione non è continua');
});

test('l\'età è quella della rilevazione, e zero col monitor', () => {
  const letture = { fc: { t: 40, val: 90 }, pa: { t: 40, val: '120/80' } };
  assert.equal(eta('pa', letture, 100, true), 60);
  assert.equal(eta('fc', letture, 100, true), 0, 'col monitor la frequenza è di adesso');
  assert.equal(eta('fc', letture, 100, false), 60, 'senza monitor invecchia come le altre');
  assert.equal(eta('glicemia', letture, 100, false), null, 'mai misurata: nessuna età');
});

/* ===================== quale numero si legge ======================== */

test('col monitor il valore continuo è quello di adesso, non quello scritto', () => {
  const letture = { fc: { t: 10, val: 60 } };
  assert.equal(valore('fc', letture, STATO, true), 97, 'ha letto il numero vecchio');
  assert.equal(valore('fc', letture, STATO, false), 60, 'senza monitor vale quello che hai misurato');
});

test('quello che non hai misurato non si legge', () => {
  assert.equal(valore('glicemia', {}, STATO, true), undefined);
});
