/* Le due inversioni che contano. Non sono cronometro: sono metodo. */

import test from 'node:test';
import assert from 'node:assert/strict';

import { inversioni } from '../assets/js/core/sequenza.js';

const fatto = (id, t) => ({ id, t, chi: 'tu' });

test('toccare il paziente senza aver valutato la scena si vede', () => {
  /* I DPI ci sono, e vanno messi prima: qui l'unica cosa fuori posto è
     la scena, e deve uscire da sola. */
  const r = inversioni([fatto('dpi', 10), fatto('misura-pa', 30), fatto('valuta-scena', 90)]);
  assert.equal(r.length, 1);
  assert.match(r[0].perche, /scena/i);
  assert.equal(r[0].primoContatto, 'misura-pa');
});

test('chi valuta la scena e poi tocca non ha invertito niente', () => {
  const r = inversioni([fatto('valuta-scena', 20), fatto('dpi', 40), fatto('misura-pa', 80)]);
  assert.deepEqual(r, []);
});

test('toccare senza DPI si vede', () => {
  const r = inversioni([fatto('valuta-scena', 20), fatto('refill', 40)]);
  assert.equal(r.length, 1);
  assert.match(r[0].perche, /DPI/);
});

test('le domande e le azioni di scena non contano come contatto', () => {
  /* Chiedere non è toccare, e allontanare i curiosi nemmeno. */
  const r = inversioni([fatto('domanda:disturbi', 10), fatto('allontana-curiosi', 30),
    fatto('valuta-scena', 60), fatto('dpi', 80), fatto('misura-pa', 100)]);
  assert.deepEqual(r, []);
});

test('senza niente di fatto non si inventa nessuna inversione', () => {
  assert.deepEqual(inversioni([]), []);
});

test('chi non fa niente di giusto si prende tutte e due le segnalazioni', () => {
  const r = inversioni([fatto('misura-pa', 30)]);
  assert.deepEqual(r.map((x) => x.id), ['scena-prima', 'dpi-prima']);
});
