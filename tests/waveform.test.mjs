/* La sorgente ECG deve esporre una fase che avanza in modo prevedibile:
   è su quella che il monitor sincronizza il tono del battito. */

import test from 'node:test';
import assert from 'node:assert/strict';

import { createEcgSource, RHYTHMS } from '../assets/js/core/waveform.js';

/** Conta quante volte la fase attraversa il picco R in un intervallo. */
function battiti(kind, secondi, passo = 1 / 120) {
  const src = createEcgSource(kind);
  let precedente = src.phase;
  let n = 0;
  for (let t = 0; t < secondi; t += passo) {
    src.advance(passo);
    const f = src.phase;
    if (precedente < 0.375 && f >= 0.375) n += 1;
    precedente = f;
  }
  return n;
}

test('la fase è leggibile e resta fra zero e uno', () => {
  const src = createEcgSource('sinusale');
  assert.equal(typeof src.phase, 'number');
  for (let i = 0; i < 500; i += 1) {
    src.advance(0.01);
    assert.ok(src.phase >= 0 && src.phase < 1, `fase fuori scala: ${src.phase}`);
  }
});

test('il numero di battiti in un minuto corrisponde alla frequenza dichiarata', () => {
  ['sinusale', 'tachicardia', 'bradicardia'].forEach((k) => {
    const attesi = RHYTHMS[k].rate;
    const contati = battiti(k, 60);
    assert.ok(Math.abs(contati - attesi) <= 2,
      `${k}: attesi circa ${attesi} battiti, contati ${contati}`);
  });
});

test('in asistolia non passa nessun complesso', () => {
  assert.equal(battiti('asistolia', 30), 0);
});
