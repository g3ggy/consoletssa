/* Collaudo dell'anamnesi: logica pura, gira in Node senza browser.
   Esecuzione: node --test tests/ */

import test from 'node:test';
import assert from 'node:assert/strict';

import { PAZIENTE, interlocutoriDi, puoRispondere } from '../assets/js/core/anamnesi.js';

test('il paziente c\'è sempre, e sta per primo', () => {
  const soli = interlocutoriDi({});
  assert.equal(soli.length, 1);
  assert.equal(soli[0].id, PAZIENTE.id);
});

test('gli altri presenti li dichiara il caso', () => {
  const caso = { anamnesi: { interlocutori: [{ id: 'moglie', label: 'la moglie' }] } };
  const chi = interlocutoriDi(caso);
  assert.deepEqual(chi.map((i) => i.id), ['paziente', 'moglie']);
  assert.equal(chi[1].label, 'la moglie');
});

test('un paziente vigile risponde', () => {
  assert.equal(puoRispondere('paziente', 'A').ok, true);
});

test('un paziente confuso risponde lo stesso: è questo il problema', () => {
  assert.equal(puoRispondere('paziente', 'V').ok, true);
});

test('a P e a U non risponde, e il motivo lo dice', () => {
  for (const coscienza of ['P', 'U']) {
    const esito = puoRispondere('paziente', coscienza);
    assert.equal(esito.ok, false);
    assert.match(esito.motivo, /chiedi a chi c/i, 'il motivo deve dire cosa fare invece');
  }
});

test('chi non è il paziente risponde comunque, qualunque cosa faccia lui', () => {
  assert.equal(puoRispondere('moglie', 'U').ok, true);
});

/* ==================== la risposta =================================== */

import { rispostaA } from '../assets/js/core/anamnesi.js';
import { DOMANDE } from '../assets/js/data/domande.js';

const CASO_PROVA = {
  anamnesi: {
    interlocutori: [{ id: 'moglie', label: 'la moglie' }],
    risposte: {
      terapia: {
        paziente: { t: '«Quella per la pressione, mi pare.»', qualita: 'vaga' },
        moglie: {
          t: '«Il Cardicor, e il Coumadin da tre anni.»',
          qualita: 'buona',
          rivela: ['betabloccante', 'anticoagulante'],
        },
      },
      allergie: {
        paziente: { t: '«No, niente.»', qualita: 'buona' },
      },
    },
  },
};

const chiedi = (idDomanda, interlocutore, coscienza = 'A') => rispostaA({
  domanda: DOMANDE[idDomanda],
  anamnesi: CASO_PROVA.anamnesi,
  interlocutore,
  coscienza,
});

test('la risposta scritta esce com\'è, con quello che rivela', () => {
  const r = chiedi('terapia', 'moglie');
  assert.equal(r.testo, '«Il Cardicor, e il Coumadin da tre anni.»');
  assert.equal(r.qualita, 'buona');
  assert.deepEqual(r.rivela, ['betabloccante', 'anticoagulante']);
  assert.equal(r.ripiego, null);
});

test('la stessa domanda a un\'altra persona dà un\'altra risposta', () => {
  const dalPaziente = chiedi('terapia', 'paziente');
  assert.equal(dalPaziente.qualita, 'vaga');
  assert.deepEqual(dalPaziente.rivela, [], 'una risposta vaga non rivela niente');
});

test('se il caso non ha scritto niente, quello lì non lo sa', () => {
  const r = chiedi('terapia', 'figlio');
  assert.equal(r.testo, DOMANDE.terapia.nonSo);
  assert.equal(r.ripiego, 'nonSo');
  assert.deepEqual(r.rivela, []);
});

test('vale anche per una domanda che il caso non ha proprio previsto', () => {
  const r = chiedi('ultimo-pasto', 'moglie');
  assert.equal(r.testo, DOMANDE['ultimo-pasto'].nonSo);
  assert.equal(r.ripiego, 'nonSo');
});

test('una risposta senza rivelazioni non rompe niente', () => {
  const r = chiedi('allergie', 'paziente');
  assert.equal(r.qualita, 'buona');
  assert.deepEqual(r.rivela, []);
});

/* ==================== il paziente confuso =========================== */

test('a coscienza V il paziente risponde, ma non vale niente', () => {
  const r = chiedi('terapia', 'paziente', 'V');
  assert.equal(r.testo, DOMANDE.terapia.confuso);
  assert.equal(r.ripiego, 'confuso');
  assert.deepEqual(r.rivela, []);
});

test('il confuso non contagia gli altri presenti', () => {
  const r = chiedi('terapia', 'moglie', 'V');
  assert.equal(r.qualita, 'buona', 'la moglie è lucida anche se lui non lo è');
  assert.deepEqual(r.rivela, ['betabloccante', 'anticoagulante']);
});

test('una risposta buona che diventa confusa perde le rivelazioni', () => {
  const lucido = rispostaA({
    domanda: DOMANDE.allergie,
    anamnesi: { risposte: { allergie: { paziente: { t: '«Alla penicillina.»', qualita: 'buona', rivela: ['allergia-penicillina'] } } } },
    interlocutore: 'paziente',
    coscienza: 'A',
  });
  const confuso = rispostaA({
    domanda: DOMANDE.allergie,
    anamnesi: { risposte: { allergie: { paziente: { t: '«Alla penicillina.»', qualita: 'buona', rivela: ['allergia-penicillina'] } } } },
    interlocutore: 'paziente',
    coscienza: 'V',
  });
  assert.deepEqual(lucido.rivela, ['allergia-penicillina']);
  assert.deepEqual(confuso.rivela, [], 'da un confuso non porti via niente di sicuro');
});

test('chi mente continua a mentire anche da confuso', () => {
  const anamnesi = {
    risposte: { terapia: { paziente: { t: '«Non prendo niente.»', qualita: 'falsa' } } },
  };
  const r = rispostaA({ domanda: DOMANDE.terapia, anamnesi, interlocutore: 'paziente', coscienza: 'V' });
  assert.equal(r.testo, '«Non prendo niente.»', 'la bugia resta la sua');
  assert.equal(r.qualita, 'falsa');
  assert.equal(r.ripiego, null);
});

/* ==================== la lista delle domande ======================== */

import { domandeDisponibili } from '../assets/js/core/anamnesi.js';

test('senza dolore si vede solo il SAMPLE', () => {
  const lista = domandeDisponibili({ dolore: 0 });
  assert.equal(lista.length, 6);
  assert.ok(lista.every((d) => d.schema === 'SAMPLE'));
});

test('col dolore compaiono anche le sei dell\'OPQRST', () => {
  const lista = domandeDisponibili({ dolore: 7 });
  assert.equal(lista.length, 12);
  assert.ok(lista.some((d) => d.id === 'irradiazione'));
});

test('l\'ordine è quello dello schema, non a caso', () => {
  const lista = domandeDisponibili({ dolore: 7 });
  assert.deepEqual(lista.slice(0, 6).map((d) => d.lettera), ['S', 'A', 'M', 'P', 'L', 'E']);
  assert.deepEqual(lista.slice(6).map((d) => d.lettera), ['O', 'P', 'Q', 'R', 'S', 'T']);
});

test('uno stato incompleto non fa esplodere niente', () => {
  assert.doesNotThrow(() => domandeDisponibili({}));
  assert.doesNotThrow(() => domandeDisponibili(undefined));
});
