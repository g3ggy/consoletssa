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

/* ==================== il catalogo vero ============================== */

import { INDICAZIONI } from '../assets/js/data/indicazioni.js';
import { AZIONI } from '../assets/js/data/azioni.js';

test('ogni indicazione parla di un\'azione che esiste', () => {
  Object.keys(INDICAZIONI).forEach((id) => {
    assert.ok(AZIONI[id], `${id}: indicazione per un'azione che non c'è`);
  });
});

test('ogni indicazione dice perché, e da dove viene', () => {
  Object.entries(INDICAZIONI).forEach(([id, r]) => {
    assert.equal(typeof r.quando, 'function', `${id}: manca il predicato`);
    assert.ok(r.perche?.length > 40, `${id}: il perché è troppo corto per insegnare qualcosa`);
    assert.ok(r.fonte?.length, `${id}: manca la fonte`);
  });
});

test('nessun predicato esplode su un contesto vuoto', () => {
  /* Un contesto minimo capita davvero: primo secondo, niente misurato,
     niente chiesto. */
  const vuoto = { t: 0, coscienza: 'A', letture: {}, saputo: {}, tag: [], caso: { tipo: 'medico' } };
  Object.entries(INDICAZIONI).forEach(([id, r]) => {
    assert.doesNotThrow(() => r.quando(vuoto), `${id}: esplode sul contesto vuoto`);
  });
});

test('si copre almeno la ventina di azioni su cui si sbaglia', () => {
  assert.ok(Object.keys(INDICAZIONI).length >= 20,
    `sono ${Object.keys(INDICAZIONI).length}`);
});

/* ==================== i presidi con la misura ======================== */

import { VOCI_PRESIDI } from '../assets/js/data/presidi.js';

/* Una misura senza regola scritta è una misura che il banco approva in
   silenzio: il difetto peggiore, perché non si vede. */
test('ogni presidio con la misura ha la sua regola, con la fonte', () => {
  VOCI_PRESIDI.forEach((v) => {
    const regola = INDICAZIONI[v.id];
    assert.ok(regola, `${v.id}: nessuna indicazione scritta`);
    assert.ok(regola.perche && regola.perche.length > 40, `${v.id}: il perché è troppo corto`);
    assert.ok(regola.fonte, `${v.id}: la regola non dice da dove viene`);
  });
});

test('la Guedel giusta dipende dalla corporatura, e da nient\'altro', () => {
  const ctx = (corporatura) => ({
    coscienza: 'U', letture: {}, saputo: {}, tag: [],
    caso: { tipo: 'medico', corporatura },
  });
  assert.equal(indicata('cannula-3', ctx('media')).ok, true);
  assert.equal(indicata('cannula-5', ctx('media')).ok, false);
  assert.equal(indicata('cannula-4', ctx('robusta')).ok, true);
  assert.equal(indicata('cannula-2', ctx('minuta')).ok, true);
  /* Un caso che non la dichiara vale medio: i sette casi scritti prima
     di questo pezzo non si toccano. */
  assert.equal(indicata('cannula-3', ctx(undefined)).ok, true);
});

test('il calibro grosso è per chi ha bisogno di volume', () => {
  const medico = { coscienza: 'A', letture: {}, saputo: {}, tag: [], caso: { tipo: 'medico' } };
  const ipoteso = { ...medico, letture: { pas: 84 } };
  assert.equal(indicata('ago-18', medico).ok, true);
  assert.equal(indicata('ago-14', medico).ok, false);
  assert.equal(indicata('ago-14', ipoteso).ok, true);
  assert.equal(indicata('ago-20', ipoteso).ok, false);
});

test('sull\'adulto il sondino è il 16 o il 18', () => {
  const conVomito = {
    coscienza: 'V', letture: {}, saputo: { vomito: true }, tag: [],
    caso: { tipo: 'medico' },
  };
  assert.equal(indicata('sondino-16', conVomito).ok, true);
  assert.equal(indicata('sondino-6', conVomito).ok, false);
});

/* ============= quale andava usato al posto di quello =============== */

test('quando bocci un presidio, il banco dice quale andava usato', () => {
  /* Dolore toracico noto, saturazione 95: il reservoir è alto flusso per
     niente, ma l'ossigeno ci vuole. L'alternativa esce dalle stesse
     regole che hanno bocciato il gesto, quindi non può contraddirle — e
     siccome le misure di una famiglia stanno in catalogo dalla più
     leggera alla più pesante, la prima indicata è la più leggera che
     bastava. Nel dolore toracico sono gli occhialini. */
  const c = {
    coscienza: 'A', letture: { spo2: 95 }, saputo: { 'dolore-toracico': true },
    tag: [], caso: { tipo: 'medico' },
  };
  const v = indicata('o2-reservoir', c);
  assert.equal(v.ok, false);
  assert.ok(v.invece, 'nessuna alternativa proposta');
  assert.equal(v.invece.id, 'o2-occhialini');
  assert.ok(v.invece.perche && v.invece.fonte, 'l\'alternativa non porta perché e fonte');
  assert.match(v.invece.label, /occhialini/i);
});

test('se nessuna sorella era indicata non se ne inventa una', () => {
  /* Paziente che respira bene e non ha dolore al petto: nessun presidio
     dell'ossigeno serviva, e dirlo è un'informazione utile quanto l'altra. */
  const c = {
    coscienza: 'A', letture: { spo2: 99 }, saputo: {}, tag: [], caso: { tipo: 'medico' },
  };
  const v = indicata('o2-reservoir', c);
  assert.equal(v.ok, false);
  assert.equal(v.invece, null);
});

test('un\'azione senza famiglia non ha alternative da proporre', () => {
  const c = { coscienza: 'A', letture: {}, saputo: {}, tag: [], caso: { tipo: 'medico' } };
  const v = indicata('collare', c);
  assert.equal(v.ok, false);
  assert.equal(v.invece, null);
});

test('un gesto indicato non si porta dietro nessuna alternativa', () => {
  const c = {
    coscienza: 'A', letture: { spo2: 88 }, saputo: {}, tag: [], caso: { tipo: 'medico' },
  };
  const v = indicata('o2-reservoir', c);
  assert.equal(v.ok, true);
  assert.equal(v.invece, null);
});
