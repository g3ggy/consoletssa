/* =====================================================================
   Collaudo della squadra: chi c'è, chi è libero, quanti ne serve un
   gesto. Logica pura: gira in Node senza browser.
   ===================================================================== */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  NOMI_MEMBRO, etichettaMembro, versoIlMembro, aParole,
  creaSquadra, aggiungiMembro, candidati, membriLiberi,
  quantiServono, impegnatiPer, occupa, libera,
} from '../assets/js/core/squadra.js';

/* ============================== i nomi ============================== */

test('ogni ruolo ha il suo nome, e uno sconosciuto resta se stesso', () => {
  assert.equal(etichettaMembro('tu'), 'Tu');
  assert.equal(etichettaMembro('autista'), 'Autista');
  assert.equal(etichettaMembro('infermiere'), 'Infermiere');
  assert.equal(etichettaMembro('medico'), 'Medico');
  assert.equal(etichettaMembro('pinco'), 'pinco');
});

test('la preposizione si fonde con l\'articolo', () => {
  /* «Chiedi a autista» non è italiano. È la stessa ragione per cui gli
     interlocutori dell'anamnesi si dichiarano con l'articolo davanti. */
  assert.equal(versoIlMembro('autista'), 'all\'autista');
  assert.equal(versoIlMembro('infermiere'), 'all\'infermiere');
  assert.equal(versoIlMembro('medico'), 'al medico');
});

test('i numeri piccoli si scrivono a parole', () => {
  /* «Si fa in due» si legge, «si fa in 2» inciampa in mezzo alla frase. */
  assert.equal(aParole(2), 'due');
  assert.equal(aParole(3), 'tre');
  assert.equal(aParole(9), '9', 'oltre il quattro non si inventa una parola');
});

/* ============================ chi c'è ============================== */

test('la squadra nasce con tutti liberi e nessuno che fa niente', () => {
  const s = creaSquadra(['tu', 'autista']);
  assert.deepEqual(Object.keys(s), ['tu', 'autista']);
  assert.deepEqual(s.tu, { liberoA: 0, azione: null });
});

test('aggiungere un membro non tocca la squadra di prima', () => {
  const s = creaSquadra(['tu', 'autista']);
  const dopo = aggiungiMembro(s, 'medico', 120);
  assert.equal(s.medico, undefined, 'la squadra di partenza è stata mutata');
  assert.deepEqual(dopo.medico, { liberoA: 120, azione: null });
});

/* ======================= chi può fare cosa ========================== */

test('il medico dell\'automedica incarna il ruolo sanitario', () => {
  /* Il catalogo dichiara un ruolo solo, `infermiere`, e chi lo incarna
     dipende da chi c'è: quello di bordo, o il medico quando arriva. */
  assert.deepEqual(candidati({ chi: ['infermiere'] }), ['infermiere', 'medico']);
  assert.deepEqual(candidati({ chi: ['tu', 'autista'] }), ['tu', 'autista']);
  assert.deepEqual(candidati({}), [], 'un\'azione senza `chi` non ha candidati');
});

test('libero vuol dire che c\'è e che ha finito', () => {
  const s = { tu: { liberoA: 90, azione: 'spinale' }, autista: { liberoA: 0, azione: null } };
  const az = { chi: ['tu', 'autista', 'infermiere'] };
  assert.deepEqual(membriLiberi(az, s, 30), ['autista'], 'tu sei occupato e l\'infermiere non c\'è');
  assert.deepEqual(membriLiberi(az, s, 90), ['tu', 'autista'], 'a fine manovra torni libero');
});

/* ===================== quanti ne serve un gesto ===================== */

test('senza dichiararlo un gesto occupa una persona', () => {
  assert.equal(quantiServono({}, ['tu', 'autista']), 1);
});

test('una manovra a due mani ne occupa due', () => {
  assert.equal(quantiServono({ servono: 2 }, ['tu', 'autista']), 2);
});

test('i DPI li mette chi c\'è, e con tutti occupati resta uno', () => {
  /* `Math.max(1, …)` non è difensivo: senza, un equipaggio tutto occupato
     darebbe zero e il controllo «ci sono abbastanza liberi?» passerebbe. */
  assert.equal(quantiServono({ tuttaLaSquadra: true }, ['tu', 'autista', 'infermiere']), 3);
  assert.equal(quantiServono({ tuttaLaSquadra: true }, []), 1);
});

test('chi hai scelto tiene il posto, gli altri si prendono fra i liberi', () => {
  assert.deepEqual(impegnatiPer('autista', ['tu', 'autista', 'infermiere'], 2), ['autista', 'tu']);
  assert.deepEqual(impegnatiPer('tu', ['tu', 'autista'], 1), ['tu']);
});

/* ===================== occupare e liberare ========================== */

test('occupare scrive una squadra nuova, non tocca quella di prima', () => {
  const s = creaSquadra(['tu', 'autista', 'infermiere']);
  const dopo = occupa(s, ['tu', 'autista'], 180, 'spinale');
  assert.equal(s.tu.liberoA, 0, 'la squadra di partenza è stata mutata');
  assert.deepEqual(dopo.tu, { liberoA: 180, azione: 'spinale' });
  assert.deepEqual(dopo.autista, { liberoA: 180, azione: 'spinale' });
  assert.deepEqual(dopo.infermiere, { liberoA: 0, azione: null }, 'chi non c\'entra resta com\'era');
});

test('liberare toglie il gesto e lascia stare l\'orologio', () => {
  /* `liberoA` non si tocca: dice fino a quando la persona è impegnata, e
     lo decide chi ha fatto partire il gesto, non chi lo chiude. */
  const s = occupa(creaSquadra(['tu', 'autista']), ['tu', 'autista'], 180, 'spinale');
  const dopo = libera(s, ['tu', 'autista']);
  assert.equal(dopo.tu.azione, null);
  assert.equal(dopo.tu.liberoA, 180);
  assert.equal(s.tu.azione, 'spinale', 'la squadra di partenza è stata mutata');
});

test('liberare qualcuno che non c\'è non rompe niente', () => {
  const s = creaSquadra(['tu']);
  assert.deepEqual(libera(s, ['tu', 'medico']).tu, { liberoA: 0, azione: null });
});
