/* Controlli di integrità sul catalogo delle domande.
   Esecuzione: node --test tests/ */

import test from 'node:test';
import assert from 'node:assert/strict';

import { DOMANDE, DOMANDE_ELENCO } from '../assets/js/data/domande.js';
import { testoDomanda, PAZIENTE } from '../assets/js/core/anamnesi.js';

test('ci sono le sei del SAMPLE e le sei dell\'OPQRST', () => {
  const sample = DOMANDE_ELENCO.filter((d) => d.schema === 'SAMPLE');
  const opqrst = DOMANDE_ELENCO.filter((d) => d.schema === 'OPQRST');
  assert.equal(sample.length, 6, 'il SAMPLE ha sei lettere');
  assert.equal(opqrst.length, 6, 'l\'OPQRST ne ha sei');
  assert.deepEqual(sample.map((d) => d.lettera), ['S', 'A', 'M', 'P', 'L', 'E']);
  assert.deepEqual(opqrst.map((d) => d.lettera), ['O', 'P', 'Q', 'R', 'S', 'T']);
});

test('ogni domanda è completa', () => {
  DOMANDE_ELENCO.forEach((d) => {
    assert.ok(d.id, 'manca l\'id');
    assert.ok(d.testo && d.testo.length > 10, `${d.id}: la domanda è troppo corta`);
    assert.ok(d.durata >= 15 && d.durata <= 25, `${d.id}: durata fuori scala`);
    assert.ok(d.nonSo, `${d.id}: manca cosa succede se non lo sa`);
    assert.ok(d.confuso, `${d.id}: manca la risposta del paziente confuso`);
  });
});

test('gli id sono unici e l\'indice combacia con l\'elenco', () => {
  const ids = DOMANDE_ELENCO.map((d) => d.id);
  assert.equal(new Set(ids).size, ids.length, 'ci sono id ripetuti');
  ids.forEach((id) => assert.equal(DOMANDE[id].id, id));
});

test('le domande sul dolore compaiono solo se il paziente ha male', () => {
  const opqrst = DOMANDE_ELENCO.filter((d) => d.schema === 'OPQRST');
  opqrst.forEach((d) => {
    assert.ok(typeof d.richiede === 'function', `${d.id}: manca richiede()`);
    assert.equal(d.richiede({ dolore: 0 }), false, `${d.id}: non deve comparire senza dolore`);
    assert.equal(d.richiede({ dolore: 6 }), true, `${d.id}: deve comparire col dolore`);
  });
  DOMANDE_ELENCO.filter((d) => d.schema === 'SAMPLE')
    .forEach((d) => assert.ok(!d.richiede, `${d.id}: il SAMPLE si chiede sempre`));
});

/* ------------------------- le due voci ------------------------------ */

test('ogni domanda ha una voce per il paziente e una per chi gli sta accanto', () => {
  /* In italiano il «lei» di cortesia è terza persona, quindi la stessa
     frase vale rivolta al paziente e detta di lui a un altro: chi legge
     la palette non capisce più a chi sta parlando. Le due voci servono
     proprio a togliere quell'ambiguità. */
  DOMANDE_ELENCO.forEach((d) => {
    assert.ok(d.testoTerzi, `${d.id}: manca la voce per chi sta accanto al paziente`);
    assert.notEqual(d.testoTerzi, d.testo,
      `${d.id}: la seconda voce è identica alla prima, non serve a niente`);
  });
});

test('la voce si sceglie su chi hai davanti', () => {
  const d = DOMANDE.terapia;
  assert.equal(testoDomanda(d, PAZIENTE.id), d.testo);
  assert.equal(testoDomanda(d, 'moglie'), d.testoTerzi);
  /* Un catalogo a metà non deve rompere niente: senza seconda voce si
     ripiega sulla prima. */
  assert.equal(testoDomanda({ testo: 'sola' }, 'moglie'), 'sola');
});
