# Anamnesi a domande — piano di realizzazione

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Far sì che le informazioni sul paziente si raccolgano facendo *la
domanda giusta alla persona giusta*, con risposte che costano tempo e possono
essere incomplete o false — e che è così che si scopre il betabloccante che in
`shock-v3` tiene nascosto il compenso.

**Architecture:** Un catalogo di dodici domande in `data/domande.js`, la logica
pura in `core/anamnesi.js` (chi risponde, cosa dice, cosa rivela), e un innesto
sottile in `core/sim-engine.js` che ci mette attorno il tempo, il diario e la
pagella. I casi scrivono solo le risposte.

**Tech Stack:** JavaScript, moduli ES nativi, nessuna dipendenza, nessun passo di
build. Test con `node --test`.

**Specifica:** `docs/superpowers/specs/2026-08-21-anamnesi-a-domande-design.md`

---

## Prima di cominciare

Leggere `CLAUDE.md` alla radice. In sintesi, le regole che valgono qui:

- **Niente build.** Moduli ES nativi. Se serve compilare qualcosa, è la soluzione
  sbagliata.
- **Tutto in italiano**: nomi, commenti, testi. I commenti dicono *perché*, non
  *cosa*: chi legge è un volontario che studia.
- **Immutabilità**: si creano oggetti nuovi, non si muta in-place.
- **File piccoli**: 200-400 righe tipiche, 800 il massimo.
- **I testi clinici vengono dai manuali.** Le domande di questo lavoro stanno nel
  Bolognin a `tmp/testi/Manuale-TSSA-2022_cW6HYJE.txt:2715` (SAMPLE) e `:2723`
  (OPQRST). Se `tmp/testi/` è vuoto, il comando per riestrarre è in cima a
  `tmp/testi/FONTI.md`.

Comandi:

```bash
node --test tests/*.test.mjs      # i test
python3 -m http.server 8925       # il server locale, per provare nel browser
```

## Struttura dei file

| File | Responsabilità |
|---|---|
| `assets/js/data/domande.js` | **nuovo.** Il catalogo: sei SAMPLE, sei OPQRST. Solo dati. |
| `assets/js/core/anamnesi.js` | **nuovo.** Logica pura: chi può rispondere, cosa dice, cosa rivela, cosa dire nel debriefing. |
| `assets/js/core/sim-engine.js` | **modificato.** `rivolgitiA()`, `chiedi()`, il registro di quello che sai, l'etichetta nella pagella. |
| `assets/js/data/casi.js` | **modificato.** Blocco `anamnesi` per i due casi. |
| `assets/js/modules/intervento.js` | **modificato.** La categoria Anamnesi nella palette, la scheda nel debriefing. |
| `assets/css/intervento.css` | **modificato.** La riga «risposta» nel diario, la barra degli interlocutori. |
| `tests/domande.test.mjs` | **nuovo.** |
| `tests/anamnesi.test.mjs` | **nuovo.** |

---

## Task 1: Il catalogo delle domande

**Files:**
- Create: `assets/js/data/domande.js`
- Test: `tests/domande.test.mjs`

- [ ] **Step 1: Write the failing test**

Create `tests/domande.test.mjs`:

```js
/* Controlli di integrità sul catalogo delle domande.
   Esecuzione: node --test tests/ */

import test from 'node:test';
import assert from 'node:assert/strict';

import { DOMANDE, DOMANDE_ELENCO } from '../assets/js/data/domande.js';

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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test tests/domande.test.mjs`
Expected: FAIL — `Cannot find module '../assets/js/data/domande.js'`

- [ ] **Step 3: Write the minimal implementation**

Create `assets/js/data/domande.js`:

```js
/* =====================================================================
   domande.js — le domande dell'anamnesi, uguali per tutti gli scenari.

   Il catalogo sta qui e le risposte stanno nei casi: il soccorritore
   impara le domande, non il caso. Sono quelle del Bolognin :2715 per
   il SAMPLE e :2723 per l'OPQRST, con le formulazioni del manuale.

   Ogni domanda porta due testi di ripiego, perché nessun caso è
   obbligato a riempire tutta la griglia:
   · `nonSo`   quando quell'interlocutore non ne sa niente;
   · `confuso` quando risponde un paziente non lucido (AVPU a V), che
               risponde ma non vale — e nessuno te lo dice.

   Le durate sono ASSUNZIONE NOSTRA: una domanda costa meno di una
   pressione (40 s) e più di un refill (15 s).
   ===================================================================== */

/* Le sei dell'OPQRST si chiedono solo a chi ha male: senza dolore non
   hanno senso, e la lista sul telefono resta corta. */
const HA_DOLORE = (p) => (p?.dolore ?? 0) > 0;

const ELENCO = [
  /* ============================== SAMPLE ============================ */
  {
    id: 'disturbi', schema: 'SAMPLE', lettera: 'S', durata: 20,
    testo: 'Quali disturbi lamenta?',
    nonSo: 'Scuote la testa: non l\'ha sentito dire.',
    confuso: '«Eh… non lo so. Sto male.»',
  },
  {
    id: 'allergie', schema: 'SAMPLE', lettera: 'A', durata: 15,
    testo: 'È allergico a farmaci, cibi o sostanze?',
    nonSo: '«Questo non lo so proprio.»',
    confuso: '«Mi pare di no… non mi ricordo.»',
  },
  {
    id: 'terapia', schema: 'SAMPLE', lettera: 'M', durata: 25,
    testo: 'Quali farmaci sta prendendo attualmente?',
    nonSo: 'Alza le spalle: non lo sa dire.',
    confuso: '«Mah… qualcosa per la pressione, mi sa.»',
  },
  {
    id: 'patologie', schema: 'SAMPLE', lettera: 'P', durata: 20,
    testo: 'Soffre di qualche malattia?',
    nonSo: '«Non me l\'ha mai detto.»',
    confuso: '«Il cuore, forse. Non mi viene.»',
  },
  {
    id: 'ultimo-pasto', schema: 'SAMPLE', lettera: 'L', durata: 15,
    testo: 'Quando ha mangiato o bevuto l\'ultima volta?',
    nonSo: '«Non c\'ero, non saprei.»',
    confuso: '«Stamattina… o ieri sera. Non lo so.»',
  },
  {
    id: 'evento', schema: 'SAMPLE', lettera: 'E', durata: 20,
    testo: 'Cosa stava succedendo quando è cominciato?',
    nonSo: '«L\'ho trovato già così.»',
    confuso: 'Ti guarda e non risponde alla domanda.',
  },

  /* ============================== OPQRST =========================== */
  {
    id: 'esordio', schema: 'OPQRST', lettera: 'O', durata: 20,
    testo: 'Com\'è cominciato? Le era già capitato?',
    richiede: HA_DOLORE,
    nonSo: '«Non saprei dirle, non ero con lui.»',
    confuso: '«Prima… non lo so quando.»',
  },
  {
    id: 'allevia', schema: 'OPQRST', lettera: 'P', durata: 20,
    testo: 'Cosa lo fa stare meglio, e cosa peggio?',
    richiede: HA_DOLORE,
    nonSo: 'Non sa rispondere.',
    confuso: '«Uguale. È sempre uguale.»',
  },
  {
    id: 'qualita-dolore', schema: 'OPQRST', lettera: 'Q', durata: 15,
    testo: 'Che tipo di dolore è?',
    richiede: HA_DOLORE,
    nonSo: 'Non è una cosa che può sapere lui.',
    confuso: '«Fa male e basta.»',
  },
  {
    id: 'irradiazione', schema: 'OPQRST', lettera: 'R', durata: 15,
    testo: 'Il dolore si sposta da qualche parte?',
    richiede: HA_DOLORE,
    nonSo: 'Non è una cosa che può sapere lui.',
    confuso: 'Si tocca il petto e non aggiunge altro.',
  },
  {
    id: 'intensita', schema: 'OPQRST', lettera: 'S', durata: 15,
    testo: 'Quanto le fa male, da 1 a 10?',
    richiede: HA_DOLORE,
    nonSo: 'Non è una cosa che può sapere lui.',
    confuso: '«Tanto. Non lo so, tanto.»',
  },
  {
    id: 'durata-dolore', schema: 'OPQRST', lettera: 'T', durata: 20,
    testo: 'Da quanto è cominciato? Quanto dura?',
    richiede: HA_DOLORE,
    nonSo: '«Da un po\', ma non so dirle da quando.»',
    confuso: '«Da stamattina… o da prima.»',
  },
];

export const DOMANDE_ELENCO = ELENCO;
export const DOMANDE = Object.fromEntries(ELENCO.map((d) => [d.id, d]));
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --test tests/domande.test.mjs`
Expected: PASS, 4 test

- [ ] **Step 5: Commit**

```bash
git add assets/js/data/domande.js tests/domande.test.mjs
git commit -m "feat(domande): il catalogo SAMPLE e OPQRST, coi testi del manuale"
```

---

## Task 2: Chi c'è e chi può rispondere

**Files:**
- Create: `assets/js/core/anamnesi.js`
- Test: `tests/anamnesi.test.mjs`

- [ ] **Step 1: Write the failing test**

Create `tests/anamnesi.test.mjs`:

```js
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test tests/anamnesi.test.mjs`
Expected: FAIL — `Cannot find module '../assets/js/core/anamnesi.js'`

- [ ] **Step 3: Write the minimal implementation**

Create `assets/js/core/anamnesi.js`:

```js
/* =====================================================================
   anamnesi.js — raccogliere informazioni facendo domande.

   Logica pura: nessun DOM, nessun orologio. Si collauda con
   `node --test tests/`.

   L'idea portante è che una risposta non è un dato: è quello che una
   persona ti ha detto. Cambia a seconda di chi la dà — il paziente
   confuso, la moglie che sa il nome del farmaco, il figlio che parla
   senza sapere — e nessuno ti dice quale delle due valga. Per esserne
   sicuro devi chiedere a un altro e confrontare.

   Il Bolognin dice perché conta: «se il paziente dovesse entrare in
   stato di incoscienza prima dell'arrivo in ospedale non sarebbe più in
   grado di riferire alcun dato» (:2708). Chi non chiede finché parla,
   dopo non chiede più.
   ===================================================================== */

/* Il paziente c'è sempre e non va dichiarato dal caso. */
export const PAZIENTE = { id: 'paziente', label: 'il paziente' };

/** Chi si può interrogare in questo caso, col paziente per primo. */
export function interlocutoriDi(caso) {
  const altri = caso?.anamnesi?.interlocutori || [];
  return [PAZIENTE, ...altri];
}

/**
 * Questo interlocutore è in grado di rispondere adesso?
 * Solo il paziente può non esserlo: gli altri parlano comunque.
 */
export function puoRispondere(idInterlocutore, coscienza) {
  if (idInterlocutore !== PAZIENTE.id) return { ok: true };
  /* A e V rispondono: a V risponde male, ma risponde — ed è la
     trappola. Da P in giù non c'è più nessuno con cui parlare. */
  if (coscienza === 'A' || coscienza === 'V') return { ok: true };
  return { ok: false, motivo: 'Non risponde alle domande: chiedi a chi c\'è.' };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --test tests/anamnesi.test.mjs`
Expected: PASS, 6 test

- [ ] **Step 5: Commit**

```bash
git add assets/js/core/anamnesi.js tests/anamnesi.test.mjs
git commit -m "feat(anamnesi): gli interlocutori e chi è in grado di rispondere"
```

---

## Task 3: La risposta, e il ripiego di chi non sa

**Files:**
- Modify: `assets/js/core/anamnesi.js`
- Test: `tests/anamnesi.test.mjs`

- [ ] **Step 1: Write the failing test**

Append to `tests/anamnesi.test.mjs`:

```js
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test tests/anamnesi.test.mjs`
Expected: FAIL — `rispostaA is not a function`

- [ ] **Step 3: Write the minimal implementation**

Append to `assets/js/core/anamnesi.js`:

```js
/**
 * Cosa risponde questa persona a questa domanda, adesso.
 *
 * @param {object} domanda        la voce del catalogo
 * @param {object} anamnesi       il blocco `anamnesi` del caso
 * @param {string} interlocutore  a chi l'hai chiesto
 * @param {string} coscienza      AVPU del paziente in questo momento
 * @returns {{testo: string, qualita: string, rivela: string[], ripiego: string|null}}
 */
export function rispostaA({ domanda, anamnesi, interlocutore, coscienza }) {
  const scritta = anamnesi?.risposte?.[domanda.id]?.[interlocutore];

  /* Nessuno è obbligato a sapere tutto: se il caso non ha scritto la
     risposta per questa persona, quella persona non lo sa. È il modo di
     dire «chiedilo a qualcun altro» senza scriverlo trentasei volte. */
  if (!scritta) {
    return { testo: domanda.nonSo, qualita: 'vaga', rivela: [], ripiego: 'nonSo' };
  }

  return {
    testo: scritta.t,
    qualita: scritta.qualita || 'buona',
    /* Solo una risposta buona rivela qualcosa: una vaga ti lascia dove
       eri, una sbagliata ti porta altrove. */
    rivela: scritta.qualita === 'buona' ? [...(scritta.rivela || [])] : [],
    ripiego: null,
  };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --test tests/anamnesi.test.mjs`
Expected: PASS, 11 test

- [ ] **Step 5: Commit**

```bash
git add assets/js/core/anamnesi.js tests/anamnesi.test.mjs
git commit -m "feat(anamnesi): la risposta scritta, e il ripiego di chi non sa"
```

---

## Task 4: Il paziente confuso

Il pezzo che lega l'anamnesi alla fisiologia: la coscienza scende, e quello che
ti dice smette di valere. Nessuno te lo segnala.

**Files:**
- Modify: `assets/js/core/anamnesi.js`
- Test: `tests/anamnesi.test.mjs`

- [ ] **Step 1: Write the failing test**

Append to `tests/anamnesi.test.mjs`:

```js
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test tests/anamnesi.test.mjs`
Expected: FAIL — la risposta a coscienza V esce ancora com'è scritta nel caso

- [ ] **Step 3: Write the implementation**

In `assets/js/core/anamnesi.js`, **sostituire per intero** `rispostaA` con:

```js
/**
 * Cosa risponde questa persona a questa domanda, adesso.
 *
 * @param {object} domanda        la voce del catalogo
 * @param {object} anamnesi       il blocco `anamnesi` del caso
 * @param {string} interlocutore  a chi l'hai chiesto
 * @param {string} coscienza      AVPU del paziente in questo momento
 * @returns {{testo: string, qualita: string, rivela: string[], ripiego: string|null}}
 */
export function rispostaA({ domanda, anamnesi, interlocutore, coscienza }) {
  const scritta = anamnesi?.risposte?.[domanda.id]?.[interlocutore];

  /* Nessuno è obbligato a sapere tutto: se il caso non ha scritto la
     risposta per questa persona, quella persona non lo sa. È il modo di
     dire «chiedilo a qualcun altro» senza scriverlo trentasei volte. */
  if (!scritta) {
    return { testo: domanda.nonSo, qualita: 'vaga', rivela: [], ripiego: 'nonSo' };
  }

  /* Un paziente a coscienza V risponde: solo che quello che dice non
     vale. È una regola sola e non una scala — qualunque fosse la qualità
     scritta nel caso, da confuso esce il testo di ripiego e non rivela
     niente. Chi già mentiva continua a mentire: un bugiardo confuso non
     diventa sincero, e il debriefing deve poterlo dire.

     ASSUNZIONE NOSTRA: che un confuso sia inattendibile lo dice la
     clinica, dove si fermi esattamente l'attendibilità no. */
  const confuso = interlocutore === PAZIENTE.id
    && coscienza === 'V'
    && scritta.qualita !== 'falsa';
  if (confuso) {
    return { testo: domanda.confuso, qualita: 'vaga', rivela: [], ripiego: 'confuso' };
  }

  return {
    testo: scritta.t,
    qualita: scritta.qualita || 'buona',
    /* Solo una risposta buona rivela qualcosa: una vaga ti lascia dove
       eri, una sbagliata ti porta altrove. */
    rivela: scritta.qualita === 'buona' ? [...(scritta.rivela || [])] : [],
    ripiego: null,
  };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --test tests/anamnesi.test.mjs`
Expected: PASS, 15 test

- [ ] **Step 5: Commit**

```bash
git add assets/js/core/anamnesi.js tests/anamnesi.test.mjs
git commit -m "feat(anamnesi): il paziente confuso risponde, e non vale"
```

---

## Task 5: Quali domande si possono fare adesso

**Files:**
- Modify: `assets/js/core/anamnesi.js`
- Test: `tests/anamnesi.test.mjs`

- [ ] **Step 1: Write the failing test**

Append to `tests/anamnesi.test.mjs`:

```js
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test tests/anamnesi.test.mjs`
Expected: FAIL — `domandeDisponibili is not a function`

- [ ] **Step 3: Write the minimal implementation**

Append to `assets/js/core/anamnesi.js` (l'import va in cima al file, sotto il
commento di intestazione):

```js
import { DOMANDE_ELENCO } from '../data/domande.js';
```

e in fondo:

```js
/** Le domande che ha senso fare col paziente in questo stato. */
export function domandeDisponibili(stato) {
  return DOMANDE_ELENCO.filter((d) => !d.richiede || d.richiede(stato || {}));
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --test tests/anamnesi.test.mjs`
Expected: PASS, 19 test

- [ ] **Step 5: Commit**

```bash
git add assets/js/core/anamnesi.js tests/anamnesi.test.mjs
git commit -m "feat(anamnesi): le domande sul dolore compaiono solo a chi ha male"
```

---

## Task 6: Cosa dire nel debriefing

**Files:**
- Modify: `assets/js/core/anamnesi.js`
- Test: `tests/anamnesi.test.mjs`

- [ ] **Step 1: Write the failing test**

Append to `tests/anamnesi.test.mjs`:

```js
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test tests/anamnesi.test.mjs`
Expected: FAIL — `revisioneAnamnesi is not a function`

- [ ] **Step 3: Write the minimal implementation**

Append to `assets/js/core/anamnesi.js`:

```js
/* Da quale risposta si è cavato di più: serve a tenere la migliore
   quando la stessa domanda è stata fatta a due persone. */
const PESO_QUALITA = { buona: 3, vaga: 2, sbagliata: 1, falsa: 0 };

/**
 * Cosa dire alla fine: quello che ha raccolto, e dove si è fermato
 * troppo presto.
 *
 * @param {object} caso
 * @param {object[]} raccolte  { domanda, interlocutore, qualita, rivela, ripiego, t }
 */
export function revisioneAnamnesi(caso, raccolte = []) {
  const chi = interlocutoriDi(caso);
  const etichetta = (id) => chi.find((i) => i.id === id)?.label || id;

  /* Di ogni domanda resta la risposta migliore che ha ottenuto: se ha
     chiesto prima al paziente e poi alla moglie, quello che sa è quello
     che gli ha detto la moglie. */
  const migliori = new Map();
  raccolte.forEach((r) => {
    const attuale = migliori.get(r.domanda);
    if (!attuale || PESO_QUALITA[r.qualita] > PESO_QUALITA[attuale.qualita]) {
      migliori.set(r.domanda, r);
    }
  });

  const voci = [...migliori.values()].map((r) => ({
    domanda: r.domanda,
    da: etichetta(r.interlocutore),
    qualita: r.qualita,
    rivela: [...(r.rivela || [])],
    t: r.t,
  }));

  /* L'avviso non è per quello che non ha chiesto — di quello se ne
     occupa la pagella — ma per quello che ha chiesto alla persona
     sbagliata e ha dato per buono. */
  const avvisi = voci
    .filter((v) => v.qualita !== 'buona')
    .map((v) => {
      const risposte = caso?.anamnesi?.risposte?.[v.domanda] || {};
      const chiSapeva = Object.keys(risposte)
        .filter((id) => risposte[id]?.qualita === 'buona')
        .filter((id) => !raccolte.some((r) => r.domanda === v.domanda && r.interlocutore === id));
      if (!chiSapeva.length) return null;
      return `${etichetta(chiSapeva[0])} avrebbe risposto meglio: chiedere a chi c'è costa pochi secondi.`;
    })
    .filter(Boolean);

  return { voci, avvisi };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --test tests/anamnesi.test.mjs`
Expected: PASS, 24 test

- [ ] **Step 5: Commit**

```bash
git add assets/js/core/anamnesi.js tests/anamnesi.test.mjs
git commit -m "feat(anamnesi): la revisione finale, e chi avrebbe risposto meglio"
```

---

## Task 7: Il motore fa le domande

Il punto delicato: da qui in poi l'anamnesi costa tempo e finisce nel diario.

**Files:**
- Modify: `assets/js/core/sim-engine.js`
- Test: `tests/sim-engine.test.mjs`

- [ ] **Step 1: Write the failing test**

Append to `tests/sim-engine.test.mjs`:

```js
/* ============= l'anamnesi dentro il motore ========================== */

function casoConAnamnesi(extra = {}) {
  return {
    id: 'prova-anamnesi', titolo: 'Caso con anamnesi', motore: 3,
    fisiologia: {
      base: { fc: 72, pas: 135, pad: 82, spo2: 98, fr: 14, glicemia: 96 },
      riserve: { volemia: 5000 },
      offese: [],
      modificatori: {},
    },
    anamnesi: {
      interlocutori: [{ id: 'moglie', label: 'la moglie' }],
      risposte: {
        terapia: {
          paziente: { t: '«Quella per la pressione, mi pare.»', qualita: 'vaga' },
          moglie: { t: '«Il Cardicor.»', qualita: 'buona', rivela: ['betabloccante'] },
        },
      },
    },
    eventi: [], soglie: [],
    azioni: { necessarie: [], utili: [], dannose: [] },
    ...extra,
  };
}

test('si parte parlando col paziente', () => {
  const i = avvia(casoConAnamnesi());
  assert.equal(i.interlocutore, 'paziente');
  assert.deepEqual(i.interlocutori.map((x) => x.id), ['paziente', 'moglie']);
});

test('la domanda costa il suo tempo e finisce nel diario', () => {
  const i = avvia(casoConAnamnesi());
  const esito = i.chiedi('terapia');
  assert.equal(esito.ok, true);
  assert.equal(i.t, 25, 'venticinque secondi, quelli del catalogo');
  const testi = i.diario.map((r) => r.testo);
  assert.ok(testi.some((t) => /Quali farmaci/.test(t)), 'la domanda si legge nel diario');
  assert.ok(testi.some((t) => /Quella per la pressione/.test(t)), 'e la risposta pure');
});

test('la domanda si registra fra le cose fatte, per la pagella', () => {
  const i = avvia(casoConAnamnesi());
  i.chiedi('terapia');
  assert.ok(i.fatte.some((f) => f.id === 'domanda:terapia'));
});

test('voltarsi verso un altro costa dieci secondi', () => {
  const i = avvia(casoConAnamnesi());
  const esito = i.rivolgitiA('moglie');
  assert.equal(esito.ok, true);
  assert.equal(i.interlocutore, 'moglie');
  assert.equal(i.t, 10);
});

test('la stessa domanda a due persone dà due risposte diverse', () => {
  const i = avvia(casoConAnamnesi());
  i.chiedi('terapia');
  i.rivolgitiA('moglie');
  i.chiedi('terapia');
  const testi = i.diario.map((r) => r.testo);
  assert.ok(testi.some((t) => /Quella per la pressione/.test(t)));
  assert.ok(testi.some((t) => /Cardicor/.test(t)));
});

test('non si può parlare con chi non c\'è', () => {
  const i = avvia(casoConAnamnesi());
  const esito = i.rivolgitiA('cugino');
  assert.equal(esito.ok, false);
  assert.equal(i.interlocutore, 'paziente');
});

test('a coscienza P il paziente non risponde e la domanda è rifiutata', () => {
  const i = avvia(casoConAnamnesi({
    fisiologia: {
      base: { fc: 72, pas: 135, pad: 82, spo2: 98, fr: 14, glicemia: 96 },
      riserve: { volemia: 5000, glicemia: 25 },      // ipoglicemia: coscienza a terra
      offese: [],
      modificatori: {},
    },
  }));
  assert.equal(i.stato.coscienza, 'P', 'controllo: il caso parte con la coscienza alterata');
  const esito = i.chiedi('terapia');
  assert.equal(esito.ok, false);
  assert.match(esito.motivo, /chiedi a chi c/i);
  assert.equal(i.t, 0, 'una domanda rifiutata non consuma tempo');
});

test('le domande sul dolore non si possono fare a chi non ha male', () => {
  const i = avvia(casoConAnamnesi());
  const esito = i.chiedi('irradiazione');
  assert.equal(esito.ok, false);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test tests/sim-engine.test.mjs`
Expected: FAIL — `i.chiedi is not a function`

- [ ] **Step 3: Write the implementation**

In `assets/js/core/sim-engine.js`, aggiungere gli import sotto quelli della
fisiologia:

```js
import {
  PAZIENTE, interlocutoriDi, puoRispondere, rispostaA, domandeDisponibili,
  revisioneAnamnesi,
} from './anamnesi.js';
import { DOMANDE } from '../data/domande.js';
```

Dentro `creaIntervento`, subito dopo `let storico = [];`, aggiungere lo stato
dell'anamnesi:

```js
  /* Con chi stai parlando adesso. Ti giri una volta e da lì tutte le
     domande vanno a lui, finché non ti giri di nuovo. */
  let interlocutore = PAZIENTE.id;
  let raccolte = [];                // { domanda, interlocutore, qualita, rivela, ripiego, t }
  let saputo = {};                  // { chiave: { da, t } } — quello che hai scoperto
```

Subito sotto la costante `COSTO_DELEGA`, aggiungere:

```js
  /* Voltarsi verso un'altra persona costa quanto voltarsi. */
  const COSTO_VOLTARSI = opzioni.costoVoltarsi ?? 10;
```

Poi, subito prima di `/* ------------------------------ pagella ------- */`,
aggiungere le due funzioni:

```js
  /* ----------------------------- anamnesi -------------------------- */
  const etichettaInterlocutore = (id) => interlocutoriDi(caso).find((i) => i.id === id)?.label || id;

  /** Ti giri verso un'altra persona presente sulla scena. */
  function rivolgitiA(id) {
    if (decisionePendente) return { ok: false, motivo: 'Prima rispondi a quello che sta succedendo.' };
    if (ancora.esito !== 'in-corso') return { ok: false, motivo: 'L\'intervento è chiuso.' };
    if (!interlocutoriDi(caso).some((i) => i.id === id)) {
      return { ok: false, motivo: 'Qui non c\'è nessuno con cui parlare.' };
    }
    if (id === interlocutore) return { ok: true };
    if (squadra.tu?.liberoA > t) return { ok: false, motivo: 'Sei occupato.' };

    interlocutore = id;
    avanza(COSTO_VOLTARSI);
    scrivi('azione', `Ti giri verso ${etichettaInterlocutore(id)}.`, `interlocutore:${id}`);
    notifica();
    return { ok: true };
  }

  /**
   * Fai una domanda a chi hai davanti. La risposta arriva alla fine
   * della domanda, non all'inizio: se nel frattempo il paziente
   * peggiora, ti risponde com'è adesso.
   */
  function chiedi(idDomanda) {
    const d = DOMANDE[idDomanda];
    if (!d) return { ok: false, motivo: 'Domanda sconosciuta.' };
    if (decisionePendente) return { ok: false, motivo: 'Prima rispondi a quello che sta succedendo.' };
    if (ancora.esito !== 'in-corso') return { ok: false, motivo: 'L\'intervento è chiuso.' };
    if (squadra.tu?.liberoA > t) return { ok: false, motivo: 'Sei occupato.' };
    if (!domandeDisponibili(proietta()).some((x) => x.id === d.id)) {
      return { ok: false, motivo: 'Non è una domanda che ha senso adesso.' };
    }
    const permesso = puoRispondere(interlocutore, proietta().coscienza);
    if (!permesso.ok) return { ok: false, motivo: permesso.motivo };

    squadra = { ...squadra, tu: { liberoA: t + d.durata, azione: `domanda:${d.id}` } };
    scrivi('azione', `Chiedi a ${etichettaInterlocutore(interlocutore)}: ${d.testo}`, `domanda:${d.id}`);
    avanza(d.durata);

    const r = rispostaA({
      domanda: d,
      anamnesi: caso.anamnesi,
      interlocutore,
      coscienza: proietta().coscienza,
    });

    fatte = [...fatte, { id: `domanda:${d.id}`, chi: 'tu', t }];
    raccolte = [...raccolte, { domanda: d.id, interlocutore, qualita: r.qualita, rivela: r.rivela, ripiego: r.ripiego, t }];
    r.rivela.forEach((chiave) => { saputo = { ...saputo, [chiave]: { da: interlocutore, t } }; });

    scrivi('risposta', r.testo, `risposta:${d.id}`);
    squadra = { ...squadra, tu: { ...squadra.tu, azione: null } };
    notifica();
    return { ok: true, risposta: r };
  }
```

Infine, nell'oggetto `api`, subito sotto `get storico() { return storico; },`,
aggiungere:

```js
    get interlocutore() { return interlocutore; },
    get interlocutori() { return interlocutoriDi(caso); },
    get saputo() { return saputo; },
    get raccolte() { return raccolte; },
    domandeDisponibili: () => domandeDisponibili(proietta()),
    chiedi,
    rivolgitiA,
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test tests/*.test.mjs`
Expected: PASS, tutti. Se «a coscienza P il paziente non risponde» fallisce
perché lo stato di partenza non è P, controllare che la glicemia dichiarata nelle
riserve sia davvero sotto 30: è `parametriVisibili` a derivarne la coscienza.

- [ ] **Step 5: Commit**

```bash
git add assets/js/core/sim-engine.js tests/sim-engine.test.mjs
git commit -m "feat(sim): le domande costano tempo e finiscono nel diario"
```

---

## Task 8: L'anamnesi nella pagella

**Files:**
- Modify: `assets/js/core/sim-engine.js` (dentro `pagella()`)
- Test: `tests/sim-engine.test.mjs`

- [ ] **Step 1: Write the failing test**

Append to `tests/sim-engine.test.mjs`:

```js
test('una domanda necessaria si conta come le altre cose da fare', () => {
  const i = avvia(casoConAnamnesi({
    azioni: {
      necessarie: [{ id: 'domanda:terapia', entro: 120, peso: 2 }],
      utili: [], dannose: [],
    },
  }));
  i.chiedi('terapia');
  const p = i.chiudi();
  assert.equal(p.punti, 2, 'fatta in tempo, punteggio pieno');
  assert.match(p.necessarie[0].label, /farmaci/i, 'l\'etichetta viene dal catalogo delle domande');
});

test('la domanda non fatta pesa come un\'azione non fatta', () => {
  const i = avvia(casoConAnamnesi({
    azioni: {
      necessarie: [{ id: 'domanda:terapia', entro: 120, peso: 2 }],
      utili: [], dannose: [],
    },
  }));
  const p = i.chiudi();
  assert.equal(p.punti, 0);
  assert.equal(p.necessarie[0].fatta, false);
});

test('la pagella porta quello che hai raccolto e cosa ti sei perso', () => {
  const i = avvia(casoConAnamnesi());
  i.chiedi('terapia');                       // al paziente: vaga
  const p = i.chiudi();
  assert.equal(p.anamnesi.voci.length, 1);
  assert.equal(p.anamnesi.voci[0].da, 'il paziente');
  assert.equal(p.anamnesi.avvisi.length, 1, 'la moglie sapeva il nome del farmaco');
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test tests/sim-engine.test.mjs`
Expected: FAIL — l'etichetta esce come `domanda:terapia` e `p.anamnesi` non
esiste

- [ ] **Step 3: Write the implementation**

In `assets/js/core/sim-engine.js`, dentro `pagella()`, **sostituire** la funzione
`etichetta` con:

```js
    /* Una voce può essere un'azione o una domanda dell'anamnesi: il
       nome si va a prendere nel catalogo giusto. */
    const nome = (x) => (String(x).startsWith('domanda:')
      ? DOMANDE[String(x).slice('domanda:'.length)]?.testo
      : catalogo[x]?.label) || x;
    const etichetta = (voce) => (Array.isArray(voce.id)
      ? voce.id.map((x) => nome(x)).join(' oppure ')
      : nome(voce.id));
```

e nell'oggetto restituito da `pagella()`, subito dopo `dannose,`, aggiungere:

```js
      anamnesi: revisioneAnamnesi(caso, raccolte),
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test tests/*.test.mjs`
Expected: PASS, tutti

- [ ] **Step 5: Commit**

```bash
git add assets/js/core/sim-engine.js tests/sim-engine.test.mjs
git commit -m "feat(sim): le domande contano nella pagella come le azioni"
```

---

## Task 9: L'anamnesi di shock-v3

È il caso per cui esiste tutto questo lavoro: il betabloccante che tiene nascosto
il compenso si scopre chiedendo alla moglie.

**Files:**
- Modify: `assets/js/data/casi.js` (il caso `shock-v3`)
- Test: `tests/casi.test.mjs`

- [ ] **Step 1: Write the failing test**

Append to `tests/casi.test.mjs`:

```js
/* ==================== l'anamnesi nei casi =========================== */

test('shock-v3 ha qualcuno a cui chiedere, oltre al paziente', () => {
  const caso = CASI.find((c) => c.id === 'shock-v3');
  assert.ok(caso.anamnesi, 'manca il blocco anamnesi');
  assert.ok(caso.anamnesi.interlocutori.some((i) => i.id === 'moglie'));
});

test('in shock-v3 il betabloccante lo sa solo la moglie', () => {
  const caso = CASI.find((c) => c.id === 'shock-v3');
  const i = avvia(caso);

  i.chiedi('terapia');
  assert.deepEqual(i.saputo, {}, 'dal paziente non cavi il nome del farmaco');

  i.rivolgitiA('moglie');
  i.chiedi('terapia');
  assert.ok(i.saputo.betabloccante, 'la moglie sa cosa prende, ed è la chiave del caso');
});

test('quello che la moglie rivela è la stessa chiave che agisce sul paziente', () => {
  const caso = CASI.find((c) => c.id === 'shock-v3');
  const rivelate = Object.values(caso.anamnesi.risposte)
    .flatMap((perInterlocutore) => Object.values(perInterlocutore))
    .flatMap((r) => r.rivela || []);
  caso.fisiologia.modificatori.terapia.forEach((farmaco) => {
    assert.ok(rivelate.includes(farmaco),
      `${farmaco} agisce sul paziente ma nessuno può dirtelo: l'anamnesi non lo copre`);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test tests/casi.test.mjs`
Expected: FAIL — `manca il blocco anamnesi`

- [ ] **Step 3: Write the implementation**

In `assets/js/data/casi.js`, dentro il caso `shock-v3`, subito **dopo** il blocco
`fisiologia` e prima di `trappola`, aggiungere:

```js
    anamnesi: {
      interlocutori: [{ id: 'moglie', label: 'la moglie' }],
      risposte: {
        disturbi: {
          paziente: { t: '«Mi sento le gambe molli. Stamattina mi sono alzato e mi girava tutto.»', qualita: 'buona' },
          moglie: { t: '«È da ieri che è spento, non ha voluto cenare.»', qualita: 'buona' },
        },
        allergie: {
          paziente: { t: '«No, niente allergie.»', qualita: 'buona' },
        },
        /* La trappola del caso: lui il nome non se lo ricorda, e finché
           ti fermi a lui quel betabloccante resta invisibile. */
        terapia: {
          paziente: { t: '«Quella per la pressione, mi pare. Una la mattina.»', qualita: 'vaga' },
          moglie: {
            t: '«Il Cardicor per il cuore, e la cardioaspirina. Gliela do io tutte le mattine.»',
            qualita: 'buona',
            rivela: ['betabloccante'],
          },
        },
        patologie: {
          paziente: { t: '«La pressione alta. E il cuore che batte storto, ogni tanto.»', qualita: 'vaga' },
          moglie: { t: '«Ipertensione, e ha l\'aritmia. L\'anno scorso l\'hanno tenuto due giorni in ospedale.»', qualita: 'buona' },
        },
        'ultimo-pasto': {
          paziente: { t: '«Stamattina un caffè. Non mi va giù niente.»', qualita: 'buona' },
          moglie: { t: '«Ieri a pranzo, poi più niente. E ha fatto due volte il bagno, scuro.»', qualita: 'buona', rivela: ['melena'] },
        },
        evento: {
          paziente: { t: '«Niente, mi sono solo sentito debole. Non sono caduto.»', qualita: 'buona' },
          moglie: { t: '«Ieri sera è stato male in bagno, ma non ha voluto che chiamassi.»', qualita: 'buona' },
        },
      },
    },
```

e nell'elenco `azioni.necessarie` dello stesso caso, subito dopo la riga di
`refill`, aggiungere:

```js
        { id: 'domanda:terapia', entro: 300, peso: 3 },
        { id: 'domanda:patologie', entro: 360, peso: 1 },
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test tests/*.test.mjs`
Expected: PASS, tutti. Se «facendo le azioni necessarie il paziente non peggiora»
fallisce perché il tempo non basta più, controllare che le due domande nuove non
sforino l'`entro` delle voci successive: in caso, allargare i loro `entro` di
quaranta secondi.

- [ ] **Step 5: Commit**

```bash
git add assets/js/data/casi.js tests/casi.test.mjs
git commit -m "feat(casi): in shock-v3 il betabloccante si scopre chiedendo alla moglie"
```

---

## Task 10: L'anamnesi di toracico-v3

**Files:**
- Modify: `assets/js/data/casi.js` (il caso `toracico-v3`)
- Test: `tests/casi.test.mjs`

- [ ] **Step 1: Write the failing test**

Append to `tests/casi.test.mjs`:

```js
test('toracico-v3 ha il figlio sulla scena e le domande sul dolore', () => {
  const caso = CASI.find((c) => c.id === 'toracico-v3');
  assert.ok(caso.anamnesi, 'manca il blocco anamnesi');
  assert.ok(caso.anamnesi.interlocutori.some((i) => i.id === 'figlio'));

  const i = avvia(caso);
  assert.ok(i.domandeDisponibili().some((d) => d.id === 'irradiazione'),
    'ha dolore: l\'OPQRST deve essere disponibile');
  assert.equal(i.chiedi('irradiazione').ok, true);
});

test('nel toracico l\'irradiazione la sa solo il paziente', () => {
  const caso = CASI.find((c) => c.id === 'toracico-v3');
  const i = avvia(caso);
  i.rivolgitiA('figlio');
  const esito = i.chiedi('irradiazione');
  assert.equal(esito.ok, true);
  assert.equal(esito.risposta.ripiego, 'nonSo', 'il dolore lo sente lui, non il figlio');
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test tests/casi.test.mjs`
Expected: FAIL — `manca il blocco anamnesi`

- [ ] **Step 3: Write the implementation**

In `assets/js/data/casi.js`, dentro il caso `toracico-v3`, subito **dopo** il
blocco `fisiologia`, aggiungere:

```js
    anamnesi: {
      interlocutori: [{ id: 'figlio', label: 'il figlio' }],
      risposte: {
        disturbi: {
          paziente: { t: '«Un peso qui in mezzo. Come se ci fosse qualcuno seduto sopra.»', qualita: 'buona' },
          figlio: { t: '«Dice che è il petto. È tutto sudato, guardi.»', qualita: 'buona' },
        },
        allergie: {
          paziente: { t: '«Nessuna.»', qualita: 'buona' },
          figlio: { t: '«Che io sappia no.»', qualita: 'vaga' },
        },
        terapia: {
          paziente: { t: '«Una per la pressione e una per il colesterolo.»', qualita: 'buona' },
          figlio: { t: '«Ramipril e atorvastatina. Le scatole sono di là.»', qualita: 'buona' },
        },
        patologie: {
          paziente: { t: '«Pressione alta, colesterolo. Fumo da quando avevo vent\'anni.»', qualita: 'buona', rivela: ['fumatore'] },
          figlio: { t: '«Il medico gli dice sempre di smettere di fumare.»', qualita: 'vaga' },
        },
        'ultimo-pasto': {
          paziente: { t: '«Ho pranzato verso l\'una.»', qualita: 'buona' },
        },
        evento: {
          paziente: { t: '«È cominciato mentre portavo su la spesa. Mi sono dovuto fermare.»', qualita: 'buona', rivela: ['esordio-da-sforzo'] },
          figlio: { t: '«L\'ho trovato seduto sulle scale, bianco.»', qualita: 'buona' },
        },
        esordio: {
          paziente: { t: '«Così, tutto insieme. Non mi era mai capitato.»', qualita: 'buona', rivela: ['prima-volta'] },
        },
        allevia: {
          paziente: { t: '«Niente. Mi sono seduto e non è passato.»', qualita: 'buona', rivela: ['non-passa-a-riposo'] },
        },
        'qualita-dolore': {
          paziente: { t: '«Un peso, una morsa. Non è una fitta.»', qualita: 'buona' },
        },
        /* Il dolore lo sente lui: al figlio non si può chiedere, e il
           ripiego del catalogo lo dice senza che il caso scriva niente. */
        irradiazione: {
          paziente: { t: '«Adesso arriva anche qui, alla mascella. E dentro il braccio.»', qualita: 'buona', rivela: ['dolore-irradiato'] },
        },
        intensita: {
          paziente: { t: '«Otto. Forse nove.»', qualita: 'buona' },
        },
        'durata-dolore': {
          paziente: { t: '«Da quaranta minuti buoni, e non molla.»', qualita: 'buona' },
        },
      },
    },
```

e nell'elenco `azioni.necessarie` dello stesso caso, subito dopo la riga di
`misura-pa`, aggiungere:

```js
        { id: 'domanda:durata-dolore', entro: 300, peso: 2 },
        { id: 'domanda:terapia', entro: 420, peso: 1 },
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test tests/*.test.mjs`
Expected: PASS, tutti

- [ ] **Step 5: Commit**

```bash
git add assets/js/data/casi.js tests/casi.test.mjs
git commit -m "feat(casi): l'anamnesi del dolore toracico, col figlio sulla scena"
```

---

## Task 11: La categoria Anamnesi nella palette

Da qui in poi si lavora nel browser: i test coprono la logica, non i tocchi.

**Files:**
- Modify: `assets/js/modules/intervento.js` (la funzione `aggiornaPalette`, righe
  254-300 circa, e la lista `CATEGORIE` che vi si legge)
- Modify: `assets/css/intervento.css`

- [ ] **Step 1: Aggiungere la categoria al catalogo**

In `assets/js/data/azioni.js`, in fondo alla lista `CATEGORIE`, aggiungere:

```js
  { id: 'anamnesi', label: 'Anamnesi', desc: 'Domande al paziente e a chi c\'è' },
```

Il test `ogni categoria ha almeno un'azione` in `tests/azioni.test.mjs`
fallirebbe: nella categoria `anamnesi` non ci sono azioni, ci sono domande.
Sostituire quel test con:

```js
test('ogni categoria di azioni ha almeno un\'azione', () => {
  /* L'anamnesi non ha azioni: ha domande, e stanno in domande.js. */
  CATEGORIE.filter((c) => c.id !== 'anamnesi').forEach((c) => {
    assert.ok(azioniDi(c.id).length > 0, `categoria vuota: ${c.id}`);
  });
});
```

Run: `node --test tests/azioni.test.mjs`
Expected: PASS

- [ ] **Step 2: Disegnare la categoria nella palette**

In `assets/js/modules/intervento.js`, aggiungere l'import in cima:

```js
import { DOMANDE_ELENCO } from '../data/domande.js';
```

Poi, dentro `aggiornaPalette()`, **subito dopo** il blocco `mount(n.paletteTabs, …)`
e **prima** di `if (!inCategoria.length)`, inserire:

```js
  /* L'anamnesi non è fatta di azioni: è fatta di domande, e prima delle
     domande c'è la persona a cui le fai. */
  if (categoriaAperta === 'anamnesi') {
    mount(n.paletteLista, pannelloAnamnesi());
    return;
  }
```

E il conteggio nella linguetta, che per l'anamnesi deve contare le domande e non
le azioni: dentro il `map` su `CATEGORIE`, sostituire la riga

```js
    const quante = azioniDi(c.id).filter((a) => disponibili.some((d) => d.id === a.id)).length;
```

con

```js
    const quante = c.id === 'anamnesi'
      ? sim.domandeDisponibili().length
      : azioniDi(c.id).filter((a) => disponibili.some((d) => d.id === a.id)).length;
```

Infine, subito **prima** di `function aggiornaPalette()`, aggiungere il pannello:

```js
/* La barra di chi hai davanti, e sotto le domande che gli puoi fare.
   Un tocco per domanda: chi si è girato verso la moglie continua a
   parlare con lei finché non si gira di nuovo. */
function pannelloAnamnesi() {
  const barra = el('div.anam-chi', {}, sim.interlocutori.map((persona) => el('button.anam-p', {
    type: 'button',
    'aria-pressed': String(persona.id === sim.interlocutore),
    onclick: () => {
      const esito = sim.rivolgitiA(persona.id);
      if (!esito.ok) { toast('Non ora', esito.motivo, 'warn'); return; }
      aggiornaTutto();
    },
  }, [persona.label])));

  const disponibili = sim.domandeDisponibili();
  const righe = disponibili.map((d) => {
    const gia = sim.raccolte.some((r) => r.domanda === d.id && r.interlocutore === sim.interlocutore);
    return el(`div.pal-riga${gia ? '.gia-chiesta' : ''}`, {}, [
      el('div.az-testo', {}, [
        el('b', {}, [el('span.anam-lettera', { text: d.lettera }), d.testo]),
        el('span', { text: gia ? 'Gliel\'hai già chiesto' : `Schema ${d.schema}` }),
      ]),
      el('div.az-meta', {}, [el('span.durata', { text: `${d.durata}s` })]),
      el('div.az-btn', {}, [
        el('button.btn.sm.pri', {
          type: 'button',
          onclick: () => {
            const esito = sim.chiedi(d.id);
            if (!esito.ok) { toast('Non ora', esito.motivo, 'warn'); return; }
            aggiornaTutto();
          },
        }, ['Chiedi']),
      ]),
    ]);
  });

  return el('div.anam', {}, [
    el('div.anam-head', {}, [el('span', { text: 'parli con' }), barra]),
    ...righe,
  ]);
}
```

- [ ] **Step 3: La riga «risposta» nel diario**

In `assets/js/modules/intervento.js`, nella mappa `ICONA_RIGA`, aggiungere la
voce:

```js
  risposta: '“',
```

In `assets/css/intervento.css`, sotto le altre regole `.riga.*`, aggiungere:

```css
/* Quello che una persona ti ha detto: si legge come parlato, non come
   un dato rilevato. */
.riga.risposta .txt { color: var(--ink-2); font-style: italic; }
.riga.risposta .seg { color: var(--ink-3); }

/* --- anamnesi nella palette --- */
.anam-head { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 10px; }
.anam-head > span { font-size: 12px; letter-spacing: .08em; text-transform: uppercase; color: var(--ink-3); }
.anam-chi { display: flex; gap: 6px; flex-wrap: wrap; }
.anam-p {
  padding: 6px 12px; border-radius: 999px; border: 1px solid var(--line);
  background: transparent; color: var(--ink-2); font: inherit; font-size: 14px; cursor: pointer;
}
.anam-p[aria-pressed="true"] { border-color: var(--phos); color: var(--phos); }
.anam-lettera {
  display: inline-block; min-width: 18px; margin-right: 8px;
  color: var(--phos); font-weight: 700;
}
.pal-riga.gia-chiesta { opacity: .55; }
```

- [ ] **Step 4: Provare nel browser**

```bash
python3 -m http.server 8925
```

Aprire `http://localhost:8925/index.html#/intervento/shock-v3` **a larghezza
telefono** (400 px) e verificare che:

- la linguetta «Anamnesi» conti sei domande, e dodici in `toracico-v3`;
- toccando «la moglie» il tempo avanzi di dieci secondi e la barra cambi;
- la domanda scriva due righe nel diario, la domanda e la risposta in corsivo;
- una domanda già fatta a quella persona resti in lista, ma spenta;
- non ci siano errori in console.

- [ ] **Step 5: Commit**

```bash
git add assets/js/modules/intervento.js assets/js/data/azioni.js assets/css/intervento.css tests/azioni.test.mjs
git commit -m "feat(intervento): la palette dell'anamnesi, con chi hai davanti"
```

---

## Task 12: La scheda nel debriefing

**Files:**
- Modify: `assets/js/modules/intervento.js` (dentro `mostraDebriefing`)

- [ ] **Step 1: Scrivere la scheda**

In `assets/js/modules/intervento.js`, dentro `mostraDebriefing()`, subito
**dopo** il `el('div.dbox', …)` di «quello che serviva» e **prima** del blocco
`p.dannose.length ? …`, inserire:

```js
    p.anamnesi.voci.length ? el('div.dbox', {}, [
      el('div.t', { text: 'quello che hai raccolto' }),
      el('div.pagella', {}, p.anamnesi.voci.map((v) => el(`div.voce.${v.qualita === 'buona' ? 'ok' : 'tardi'}`, {}, [
        el('span.m'),
        el('span.l', {}, [
          el('b', { text: DOMANDE[v.domanda]?.testo || v.domanda }),
          el('span', {
            text: v.rivela.length
              ? `da ${v.da}: ${v.rivela.join(', ')}`
              : `da ${v.da}`,
          }),
        ]),
        el('span.p', { text: formatSeconds(v.t) }),
      ]))),
      ...p.anamnesi.avvisi.map((testo) => el('p', {
        style: { margin: '10px 0 0', color: 'var(--amber)' }, text: testo,
      })),
    ]) : null,
```

Aggiungere l'import in cima al file, accanto a quello di `DOMANDE_ELENCO`:

```js
import { DOMANDE, DOMANDE_ELENCO } from '../data/domande.js';
```

(sostituendo l'import del Task 11, che importava solo `DOMANDE_ELENCO`).

- [ ] **Step 2: Provare nel browser**

Con il server già avviato, giocare `shock-v3` chiedendo la terapia **solo al
paziente**, poi consegnare. Verificare che:

- compaia la scheda «quello che hai raccolto» con la voce in ambra;
- sotto ci sia la riga «la moglie avrebbe risposto meglio…»;
- rifacendo lo scenario e chiedendo anche alla moglie, la voce diventi verde,
  riporti «betabloccante» e l'avviso sparisca.

- [ ] **Step 3: Commit**

```bash
git add assets/js/modules/intervento.js
git commit -m "feat(intervento): il debriefing dice cosa hai raccolto e da chi"
```

---

## Task 13: Prova completa e rilascio

**Files:**
- Modify: `assets/js/versione.js`
- Modify: `sw.js:11`

- [ ] **Step 1: Provare i due casi per intero**

Con `python3 -m http.server 8925`, a larghezza telefono (400 px), per ognuno dei
due casi:

- l'anamnesi si fa senza uscire dalla palette, e ogni domanda costa il suo tempo;
- il paziente di `shock-v3`, quando la pressione cede e la coscienza va a V,
  comincia a rispondere in modo confuso — **senza che niente lo segnali**;
- quando arriva a P, la domanda viene rifiutata col messaggio «chiedi a chi c'è»;
- in `toracico-v3` le sei domande sull'OPQRST ci sono, e al figlio non si può
  chiedere dove si irradia il dolore;
- le righe del diario non sbordano sulle tessere strette;
- la console è pulita.

- [ ] **Step 2: Verificare che i test siano tutti verdi**

Run: `node --test tests/*.test.mjs`
Expected: PASS, nessun fallimento

- [ ] **Step 3: Alzare il numero di versione**

In `assets/js/versione.js`:

```js
export const VERSIONE = '1.8.0';
export const DATA_VERSIONE = '<la data di oggi>';
```

e come prima riga di `NOVITA`:

```js
  { v: '1.8.0', t: 'L\'anamnesi si fa a domande. Le sei del SAMPLE si chiedono sempre, le sei dell\'OPQRST quando il paziente ha dolore, e ognuna costa il suo tempo. La stessa domanda dà risposte diverse a seconda di chi la riceve: il paziente confuso non è attendibile e nessuno te lo dice, e c\'è chi sa cose che lui non ricorda. È così che si scopre il betabloccante che teneva nascosto il compenso.' },
```

In `sw.js` riga 11:

```js
const CACHE = 'consoletssa-1.8.0';
```

- [ ] **Step 4: Commit e pubblicazione**

```bash
git add -A
git commit -m "feat: l'anamnesi si fa a domande, e le risposte non sono tutte vere"
git push origin HEAD
```

- [ ] **Step 5: Verificare la pubblicazione**

```bash
curl -s "https://g3ggy.github.io/consoletssa/assets/js/versione.js?x=$RANDOM" | grep VERSIONE
curl -s "https://g3ggy.github.io/consoletssa/sw.js?x=$RANDOM" | grep CACHE
```

Expected: `1.8.0` in tutti e due. GitHub Pages ci mette un minuto o due; se esce
ancora la versione vecchia, riprovare. Se i due file non si allineano si
finisce con versioni mescolate in cache.

---

## Cosa questo piano NON fa, di proposito

- **Il ragguaglio generato** dalle risposte raccolte: il testo del `ragguaglio`
  resta scritto a mano nel caso. Comporlo è un lavoro a sé e non serve a
  insegnare la lezione di questo pezzo.
- **Insistere su una risposta**: niente rilancio, niente «chiedi meglio». Per
  avere di meglio si chiede a un altro.
- **Interlocutori che entrano ed escono** dalla scena: gli eventi del caso
  possono già raccontarlo. Se servirà davvero, si aggiunge un `presenteSe` al
  singolo interlocutore e lo si filtra in `interlocutoriDi`.
- **I dodici scenari legacy**: tengono il loro `sample` a sei riquadri finché non
  vengono convertiti. Il motore vecchio non si tocca.

## Dopo questo piano

1. **I dieci scenari legacy** sul formato 3, con l'anamnesi scritta caso per
   caso. Con quelli muore il motore vecchio a otto passi.
2. **Le cinque offese del secondo giro** — cocaina, oppiacei, ictus,
   schiacciamento, ipotermia.
3. **BLS-D e triage**, moduli a sé, con le fonti già mappate in
   `tmp/testi/FONTI.md`.

## Le assunzioni nostre, marcate nel codice

- **le durate delle domande** (15-25 s) e i dieci secondi per voltarsi verso
  un'altra persona: nessun manuale li dà;
- **il degrado del paziente confuso**: che un confuso risponda in modo
  inaffidabile è clinica ovvia, ma la regola «a V il testo di ripiego e nessuna
  rivelazione» è una scelta nostra, scritta in `anamnesi.js`.
