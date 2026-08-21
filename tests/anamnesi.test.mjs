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

/* ==================== la revisione finale =========================== */

import { revisioneAnamnesi } from '../assets/js/core/anamnesi.js';

test('quello che hai raccolto si legge per domanda, con chi te l\'ha detto', () => {
  const r = revisioneAnamnesi(CASO_PROVA, [
    { domanda: 'terapia', interlocutore: 'moglie', qualita: 'buona', rivela: ['betabloccante'], ripiego: null, t: 120 },
  ]);
  assert.equal(r.voci.length, 1);
  assert.equal(r.voci[0].domanda, 'terapia');
  assert.equal(r.voci[0].da, 'la moglie');
  assert.deepEqual(r.voci[0].rivela, ['betabloccante']);
});

test('la stessa domanda chiesta a due persone resta una voce sola, la migliore', () => {
  const r = revisioneAnamnesi(CASO_PROVA, [
    { domanda: 'terapia', interlocutore: 'paziente', qualita: 'vaga', rivela: [], ripiego: null, t: 60 },
    { domanda: 'terapia', interlocutore: 'moglie', qualita: 'buona', rivela: ['betabloccante'], ripiego: null, t: 120 },
  ]);
  assert.equal(r.voci.length, 1);
  assert.equal(r.voci[0].qualita, 'buona', 'vale la risposta migliore che hai ottenuto');
  assert.equal(r.avvisi.length, 0, 'ha incrociato: non c\'è niente da rimproverargli');
});

test('se ti sei fermato alla risposta vaga, il debriefing te lo dice', () => {
  const r = revisioneAnamnesi(CASO_PROVA, [
    { domanda: 'terapia', interlocutore: 'paziente', qualita: 'vaga', rivela: [], ripiego: null, t: 60 },
  ]);
  assert.equal(r.avvisi.length, 1);
  assert.match(r.avvisi[0], /la moglie/, 'deve dire chi avrebbe risposto meglio');
});

test('nessun avviso se non c\'era nessun altro che sapesse', () => {
  const r = revisioneAnamnesi(CASO_PROVA, [
    { domanda: 'allergie', interlocutore: 'paziente', qualita: 'buona', rivela: [], ripiego: null, t: 30 },
  ]);
  assert.equal(r.avvisi.length, 0);
});

test('quello che non hai chiesto non compare fra le voci', () => {
  const r = revisioneAnamnesi(CASO_PROVA, []);
  assert.deepEqual(r.voci, []);
  assert.deepEqual(r.avvisi, []);
});

/* ==================== come si nomina chi hai davanti ================ */

import { aChi, daChi } from '../assets/js/core/anamnesi.js';

test('«a» e l\'articolo si fondono, come si parla', () => {
  assert.equal(aChi('il paziente'), 'al paziente');
  assert.equal(aChi('la moglie'), 'alla moglie');
  assert.equal(aChi('il figlio'), 'al figlio');
  assert.equal(aChi('lo zio'), 'allo zio');
  assert.equal(aChi('l\'amica'), 'all\'amica');
  assert.equal(aChi('i colleghi'), 'ai colleghi');
  assert.equal(aChi('gli agenti'), 'agli agenti');
  assert.equal(aChi('le figlie'), 'alle figlie');
});

test('senza articolo resta com\'è, con la preposizione davanti', () => {
  assert.equal(aChi('Marco'), 'a Marco');
  assert.equal(aChi('un passante'), 'a un passante');
});

test('vale anche per «da», che nel debriefing dice chi te l\'ha detto', () => {
  assert.equal(daChi('il paziente'), 'dal paziente');
  assert.equal(daChi('la moglie'), 'dalla moglie');
  assert.equal(daChi('lo zio'), 'dallo zio');
  assert.equal(daChi('l\'amica'), 'dall\'amica');
  assert.equal(daChi('gli agenti'), 'dagli agenti');
  assert.equal(daChi('Marco'), 'da Marco');
});

/* ==================== le risposte a varianti ======================== */

const CON_VARIANTI = {
  risposte: {
    evento: {
      paziente: [
        { se: (tag) => tag.includes('in-disparte'),
          t: '«…ho tirato.»', qualita: 'buona', rivela: ['cocaina'] },
        { t: '«Eravamo a una festa.»', qualita: 'vaga' },
      ],
    },
  },
};

const DOM_EVENTO = { id: 'evento', nonSo: 'non so', confuso: 'boh' };

test('senza il tag vince la variante di ripiego', () => {
  const r = rispostaA({ domanda: DOM_EVENTO, anamnesi: CON_VARIANTI, interlocutore: 'paziente', coscienza: 'A', tag: [] });
  assert.match(r.testo, /festa/);
  assert.deepEqual(r.rivela, []);
});

test('col tag giusto vince la variante che rivela', () => {
  const r = rispostaA({ domanda: DOM_EVENTO, anamnesi: CON_VARIANTI, interlocutore: 'paziente', coscienza: 'A', tag: ['in-disparte'] });
  assert.match(r.testo, /tirato/);
  assert.deepEqual(r.rivela, ['cocaina']);
});

test('senza tag passati non esplode e prende il ripiego', () => {
  const r = rispostaA({ domanda: DOM_EVENTO, anamnesi: CON_VARIANTI, interlocutore: 'paziente', coscienza: 'A' });
  assert.match(r.testo, /festa/);
});

test('un elenco senza nessuna variante buona vale come non saperlo', () => {
  const soloSe = { risposte: { evento: { paziente: [{ se: (tag) => tag.includes('mai'), t: 'x', qualita: 'buona' }] } } };
  const r = rispostaA({ domanda: DOM_EVENTO, anamnesi: soloSe, interlocutore: 'paziente', coscienza: 'A', tag: [] });
  assert.equal(r.ripiego, 'nonSo');
});

test('a coscienza V la variante non serve: risponde confuso lo stesso', () => {
  const r = rispostaA({ domanda: DOM_EVENTO, anamnesi: CON_VARIANTI, interlocutore: 'paziente', coscienza: 'V', tag: ['in-disparte'] });
  assert.equal(r.ripiego, 'confuso');
});

test('la revisione sa che chi ha varianti poteva rispondere meglio', () => {
  const caso = { anamnesi: CON_VARIANTI };
  const r = revisioneAnamnesi(caso, [
    { domanda: 'evento', interlocutore: 'paziente', qualita: 'vaga', rivela: [], ripiego: null, t: 30 },
  ]);
  assert.equal(r.voci.length, 1);
  assert.doesNotThrow(() => JSON.stringify(r.avvisi));
});
