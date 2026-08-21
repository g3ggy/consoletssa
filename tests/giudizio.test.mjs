/* =====================================================================
   Collaudo del giudizio clinico.
   Logica pura: gira in Node senza browser.
   Esecuzione:  node --test tests/giudizio.test.mjs
   ===================================================================== */

import test from 'node:test';
import assert from 'node:assert/strict';

import { CLASSI, GRUPPI_CLASSI } from '../assets/js/data/classi-patologia.js';

/* ==================== le classi della scheda ARES =================== */

test('sono diciassette, e sono quelle della scheda', () => {
  /* Il modulo ARES 118 salta C16, C17 e C18: la scheda vera è quella e
     va imparata com'è, buchi compresi. */
  assert.equal(Object.keys(CLASSI).length, 17);
  ['C16', 'C17', 'C18'].forEach((c) => {
    assert.equal(CLASSI[c], undefined, `${c} non esiste sulla scheda`);
  });
  assert.ok(CLASSI.C01.label.match(/traumatic/i));
  assert.ok(CLASSI.C20.label.match(/non identificat/i));
});

test('ogni classe ha un codice che combacia con la sua chiave', () => {
  Object.entries(CLASSI).forEach(([chiave, c]) => {
    assert.equal(c.codice, chiave, `${chiave} dichiara ${c.codice}`);
  });
});

test('i gruppi coprono tutte le classi, e nessuna due volte', () => {
  /* Servono a non mettere diciassette voci di fila in un elenco su un
     telefono: il raggruppamento è l'unica cosa che lo rende leggibile. */
  const dentro = GRUPPI_CLASSI.flatMap((g) => g.codici);
  assert.equal(dentro.length, 17, `i gruppi contengono ${dentro.length} voci`);
  assert.equal(new Set(dentro).size, 17, 'una classe compare in due gruppi');
  dentro.forEach((c) => assert.ok(CLASSI[c], `${c} non è una classe`));
});

/* ==================== il giudizio ==================================== */

import { indicata, tempoButtato } from '../assets/js/core/giudizio.js';

/* Indicazioni finte: i test del giudizio provano il MECCANISMO, non il
   contenuto clinico, che si collauda coi casi veri. */
const FINTE = {
  'misura-glicemia': {
    quando: (c) => c.coscienza !== 'A' || Boolean(c.saputo.diabetico),
    perche: 'Si misura a chi ha la coscienza alterata o a un diabetico noto.',
    fonte: 'prova',
  },
  collare: {
    quando: (c) => c.caso.tipo === 'trauma',
    perche: 'Senza trauma non c\'è niente da immobilizzare.',
    fonte: 'prova',
  },
};

const CTX = (extra = {}) => ({
  t: 0, coscienza: 'A', letture: {}, saputo: {}, tag: [],
  caso: { tipo: 'medico' }, ...extra,
});

test('un\'azione senza indicazione va sempre bene', () => {
  /* È il principio che tiene sostenibile il lavoro: si scrive
     un'indicazione solo dove il manuale ha una regola, e tutto il resto
     resta lecito senza che nessuno debba dichiararlo. */
  const g = indicata('dpi', CTX(), FINTE);
  assert.equal(g.ok, true);
  assert.equal(g.perche, null);
});

test('la glicemia a un vigile senza niente che punti da quella parte non ci sta', () => {
  const g = indicata('misura-glicemia', CTX(), FINTE);
  assert.equal(g.ok, false);
  assert.match(g.perche, /coscienza alterata/);
  assert.equal(g.fonte, 'prova');
});

test('la stessa glicemia ci sta se è confuso', () => {
  assert.equal(indicata('misura-glicemia', CTX({ coscienza: 'V' }), FINTE).ok, true);
});

test('e ci sta se sai che è diabetico, anche se è vigile', () => {
  /* È il motivo per cui il giudizio si dà nell'istante in cui parte
     l'azione: prima di chiedere è un gesto, dopo è un altro. */
  assert.equal(indicata('misura-glicemia', CTX({ saputo: { diabetico: true } }), FINTE).ok, true);
});

test('il collare su un medico è tempo buttato, su un trauma no', () => {
  assert.equal(indicata('collare', CTX(), FINTE).ok, false);
  assert.equal(indicata('collare', CTX({ caso: { tipo: 'trauma' } }), FINTE).ok, true);
});

test('un predicato che esplode non deve fermare la simulazione', () => {
  /* Un'indicazione scritta male è un bug nostro, e il prezzo non lo paga
     il volontario a metà scenario: nel dubbio il gesto passa. */
  const rotte = { x: { quando: () => { throw new Error('boom'); }, perche: 'x', fonte: 'x' } };
  assert.doesNotThrow(() => indicata('x', CTX(), rotte));
  assert.equal(indicata('x', CTX(), rotte).ok, true);
});

test('il tempo buttato somma le durate di quello che non serviva', () => {
  const catalogo = {
    'misura-glicemia': { id: 'misura-glicemia', label: 'Misura la glicemia', durata: 30 },
    collare: { id: 'collare', label: 'Collare cervicale', durata: 60 },
    dpi: { id: 'dpi', label: 'Indossa i DPI', durata: 20 },
  };
  const fatte = [
    { id: 'dpi', chi: 'tu', t: 20, giudizio: { ok: true, perche: null } },
    { id: 'misura-glicemia', chi: 'tu', t: 60, giudizio: { ok: false, perche: 'no', fonte: 'p' } },
    { id: 'collare', chi: 'tu', t: 140, giudizio: { ok: false, perche: 'no', fonte: 'p' } },
  ];
  const r = tempoButtato(fatte, catalogo);
  assert.equal(r.secondi, 90);
  assert.equal(r.voci.length, 2);
  assert.equal(r.voci[0].label, 'Misura la glicemia');
  assert.equal(r.voci[0].secondi, 30);
});

test('le voci senza giudizio non contano: una decisione non è un gesto', () => {
  /* `rispondiDecisione` scrive in `fatte` senza passare dal giudizio. */
  const r = tempoButtato([{ id: 'decisione:x', chi: 'tu', t: 300 }], {});
  assert.equal(r.secondi, 0);
  assert.deepEqual(r.voci, []);
});
