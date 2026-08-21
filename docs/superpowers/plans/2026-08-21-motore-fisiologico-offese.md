# Motore fisiologico a offese — piano di realizzazione

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sostituire la deriva lineare scritta a mano con un modello a riserve e
compenso, in cui il caso dichiara la causa e il decorso emerge — fino all'arresto
e alla morte.

**Architecture:** Un modulo nuovo `core/fisiologia.js` di logica pura calcola i
parametri visibili a partire da riserve nascoste. `core/sim-engine.js` lo chiama
da dentro `proietta()`, che è l'unico punto in cui oggi si proiettano le rette:
eventi, soglie, letture e azioni continuano a funzionare senza modifiche.

**Tech Stack:** JavaScript, moduli ES nativi, nessuna dipendenza, nessun passo di
build. Test con `node --test`.

**Specifica:** `docs/superpowers/specs/2026-08-21-motore-fisiologico-offese-design.md`

---

## Prima di cominciare

Leggere `CLAUDE.md` alla radice. In sintesi, le regole che valgono qui:

- **Niente build.** Moduli ES nativi. Se serve compilare qualcosa, è la soluzione
  sbagliata.
- **Tutto in italiano**: nomi, commenti, testi. I commenti dicono *perché*, non
  *cosa*: chi legge è un volontario che studia.
- **Immutabilità**: si creano oggetti nuovi, non si muta in-place.
- **File piccoli**: 200-400 righe tipiche, 800 il massimo.
- **Ogni costante clinica porta la sua fonte nel commento**, o la dicitura
  «assunzione nostra» se fonte non ce n'è. La mappa delle fonti è in
  `tmp/testi/FONTI.md`. Se `tmp/testi/` è vuoto, il comando per riestrarre è in
  cima a quel file.

Comandi:

```bash
node --test tests/*.test.mjs      # i test
python3 -m http.server 8925       # il server locale, per provare nel browser
```

## Struttura dei file

| File | Responsabilità |
|---|---|
| `assets/js/core/fisiologia.js` | **nuovo.** Logica pura: riserve → compenso → parametri. Non sa cosa sia un'azione né che ora è. |
| `assets/js/data/offese.js` | **nuovo.** Catalogo delle offese. Solo dati e funzioni pure. |
| `assets/js/core/sim-engine.js` | **modificato.** `proietta()` chiama la fisiologia. Il resto invariato. |
| `assets/js/data/casi.js` | **modificato.** I due casi riscritti in formato 3. |
| `assets/js/data/azioni.js` | **modificato.** Le azioni agiscono sulle riserve; tre azioni nuove per cercare i segni. |
| `tests/fisiologia.test.mjs` | **nuovo.** |
| `tests/offese.test.mjs` | **nuovo.** |

---

## Task 1: Riserve predefinite e perdita volemica

**Files:**
- Create: `assets/js/core/fisiologia.js`
- Test: `tests/fisiologia.test.mjs`

- [ ] **Step 1: Write the failing test**

Create `tests/fisiologia.test.mjs`:

```js
/* =====================================================================
   Collaudo del modello fisiologico.
   Logica pura: gira in Node senza browser.
   Esecuzione:  node --test tests/
   ===================================================================== */

import test from 'node:test';
import assert from 'node:assert/strict';

import { RISERVE_ADULTO, riserveIniziali, perditaVolemica } from '../assets/js/core/fisiologia.js';

test('un adulto sano parte dalle riserve predefinite', () => {
  const r = riserveIniziali({});
  assert.equal(r.volemia, RISERVE_ADULTO.volemia);
  assert.equal(r.ossigenazione, RISERVE_ADULTO.ossigenazione);
  assert.equal(r.dolore, 0);
});

test('il caso può dichiarare solo le riserve che gli interessano', () => {
  const r = riserveIniziali({ volemia: 4800 });
  assert.equal(r.volemia, 4800);
  assert.equal(r.glicemia, RISERVE_ADULTO.glicemia, 'le altre restano ai predefiniti');
});

test('la volemia di partenza resta memorizzata per calcolare la perdita', () => {
  const r = riserveIniziali({ volemia: 5000 });
  assert.equal(r.volemiaIniziale, 5000);
});

test('la perdita si legge come frazione della volemia di partenza', () => {
  const r = { ...riserveIniziali({ volemia: 5000 }), volemia: 4000 };
  assert.equal(perditaVolemica(r), 0.2);
});

test('la perdita non va sotto zero se qualcuno riempie più del dovuto', () => {
  const r = { ...riserveIniziali({ volemia: 5000 }), volemia: 5600 };
  assert.equal(perditaVolemica(r), 0);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test tests/fisiologia.test.mjs`
Expected: FAIL — `Cannot find module '../assets/js/core/fisiologia.js'`

- [ ] **Step 3: Write the minimal implementation**

Create `assets/js/core/fisiologia.js`:

```js
/* =====================================================================
   fisiologia.js — come sta il paziente, e perché.

   Logica pura: nessun DOM, nessuna dipendenza, nessun orologio. Si
   collauda con `node --test tests/`.

   L'idea portante è che i parametri che vedi sul monitor NON sono
   memorizzati da nessuna parte: si calcolano. Sotto ci sono le riserve
   — quanto sangue, quanto ossigeno, quanto zucchero — che nessuno vede
   mai, e in mezzo c'è il compenso: quello che il corpo fa per restare
   in piedi mentre le riserve si consumano.

   È il motivo per cui un paziente può avere la pressione normale ed
   essere già in mezzo a uno shock: la pressione è l'ultima cosa a
   cedere, non la prima. Vedi Bolognin :6481 e :7636.
   ===================================================================== */

/* Il punto di partenza di un adulto sano. Un caso dichiara solo quello
   che gli serve: il resto viene da qui. */
export const RISERVE_ADULTO = {
  volemia: 5000,          // ml — Bolognin :3560, «circa cinque litri»
  ossigenazione: 0.98,    // frazione: quanto ossigeno arriva ai tessuti
  glicemia: 90,           // mg/dl
  contrattilita: 1,       // quanto pompa il cuore, 1 = normale
  tonoVascolare: 1,       // quanto tengono i vasi, 1 = normale
  dolore: 0,              // 0-10
};

/** Le riserve all'arrivo della squadra, coi predefiniti per quelle non
    dichiarate. `volemiaIniziale` resta impressa: la perdita è sempre
    relativa a quanto ne aveva questo paziente, non a un valore medio. */
export function riserveIniziali(dichiarate = {}) {
  const r = { ...RISERVE_ADULTO, ...dichiarate };
  return { ...r, volemiaIniziale: r.volemia };
}

/** Quanto sangue ha perso, in frazione di quello che aveva. */
export function perditaVolemica(riserve) {
  const iniziale = riserve.volemiaIniziale || RISERVE_ADULTO.volemia;
  return Math.max(0, (iniziale - riserve.volemia) / iniziale);
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --test tests/fisiologia.test.mjs`
Expected: PASS, 5 test

- [ ] **Step 5: Commit**

```bash
git add assets/js/core/fisiologia.js tests/fisiologia.test.mjs
git commit -m "feat(fisiologia): riserve del paziente e perdita volemica"
```

---

## Task 2: Le fasi del compenso

Il cuore del modello. Le soglie vengono dallo schema ATLS/PTC; **il Bolognin dà
solo il 25% pediatrico** (:7636), quindi le soglie adulte vanno marcate come
assunzione nostra finché non arriva il PTC Base completo.

**Files:**
- Modify: `assets/js/core/fisiologia.js`
- Test: `tests/fisiologia.test.mjs`

- [ ] **Step 1: Write the failing test**

Append to `tests/fisiologia.test.mjs`:

```js
import { faseCompenso, SOGLIE_PERDITA } from '../assets/js/core/fisiologia.js';

test('sotto il quindici per cento non si vede niente', () => {
  assert.equal(faseCompenso(0.10), 'nessuna');
  assert.equal(faseCompenso(0.149), 'nessuna');
});

test('fra il quindici e il trenta il corpo compensa', () => {
  assert.equal(faseCompenso(0.15), 'compenso');
  assert.equal(faseCompenso(0.29), 'compenso');
});

test('oltre il trenta scompensa', () => {
  assert.equal(faseCompenso(0.30), 'scompenso');
  assert.equal(faseCompenso(0.39), 'scompenso');
});

test('oltre il quaranta crolla', () => {
  assert.equal(faseCompenso(0.40), 'crollo');
  assert.equal(faseCompenso(0.80), 'crollo');
});

test('le soglie sono dichiarate, non sparse nel codice', () => {
  assert.deepEqual(SOGLIE_PERDITA, { compenso: 0.15, scompenso: 0.30, crollo: 0.40 });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test tests/fisiologia.test.mjs`
Expected: FAIL — `faseCompenso is not a function`

- [ ] **Step 3: Write the minimal implementation**

Append to `assets/js/core/fisiologia.js`:

```js
/* Le soglie della perdita, in frazione della volemia.

   ATTENZIONE ALLA FONTE. Il Bolognin dà solo la soglia pediatrica: il
   bambino compensa fino al 25% e poi crolla (:7636). Per l'adulto le
   soglie 15/30/40 vengono dallo schema ATLS/PTC, che nei manuali che
   abbiamo non c'è: il PTC Base in `tmp/` è la sola integrazione COVID
   2020. Finché non arriva il PTC completo queste tre soglie sono
   ASSUNZIONE NOSTRA, non linea guida. Se il manuale arriva, si
   correggono qui e i test dicono subito cosa cambia. */
export const SOGLIE_PERDITA = {
  compenso: 0.15,
  scompenso: 0.30,
  crollo: 0.40,
};

/** In che fase è il paziente, data la frazione di sangue persa.

    · nessuna   — non si vede niente, nemmeno cercando
    · compenso  — tachicardia e vasocostrizione, ma la PRESSIONE TIENE.
                  È la fase che inganna: i segni ci sono, i numeri no.
    · scompenso — il compenso non basta più, la pressione cede
    · crollo    — verso l'arresto */
export function faseCompenso(perdita) {
  if (perdita >= SOGLIE_PERDITA.crollo) return 'crollo';
  if (perdita >= SOGLIE_PERDITA.scompenso) return 'scompenso';
  if (perdita >= SOGLIE_PERDITA.compenso) return 'compenso';
  return 'nessuna';
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --test tests/fisiologia.test.mjs`
Expected: PASS, 10 test

- [ ] **Step 5: Commit**

```bash
git add assets/js/core/fisiologia.js tests/fisiologia.test.mjs
git commit -m "feat(fisiologia): le quattro fasi del compenso volemico"
```

---

## Task 3: I parametri circolatori derivati

Qui si vede se il modello ha capito la lezione: **al 20% di perdita la pressione
dev'essere ancora normale** e la frequenza già salita.

**Files:**
- Modify: `assets/js/core/fisiologia.js`
- Test: `tests/fisiologia.test.mjs`

- [ ] **Step 1: Write the failing test**

Append to `tests/fisiologia.test.mjs`:

```js
import { circolo } from '../assets/js/core/fisiologia.js';

const BASE = { fc: 72, pas: 135, pad: 82, spo2: 98, fr: 14 };

test('senza perdita i parametri sono quelli suoi', () => {
  const c = circolo(riserveIniziali({ volemia: 5000 }), BASE, {});
  assert.equal(c.fc, 72);
  assert.equal(c.pas, 135);
});

test('al venti per cento la pressione TIENE e la frequenza è già salita', () => {
  const r = { ...riserveIniziali({ volemia: 5000 }), volemia: 4000 };
  const c = circolo(r, BASE, {});
  assert.equal(c.pas, 135, 'la sistolica non si muove: è questo che inganna');
  assert.ok(c.fc > 95, `la frequenza doveva salire, invece è ${c.fc}`);
  assert.ok(c.pad > BASE.pad, 'la diastolica sale: il differenziale si stringe');
});

test('al trentacinque per cento la pressione cede', () => {
  const r = { ...riserveIniziali({ volemia: 5000 }), volemia: 3250 };
  const c = circolo(r, BASE, {});
  assert.ok(c.pas < 110, `la sistolica doveva cedere, invece è ${c.pas}`);
  assert.ok(c.fc > 110, 'la frequenza è al massimo dello sforzo');
});

test('il polso radiale sparisce sotto gli ottanta di sistolica', () => {
  // Bolognin :8650 — polso radiale presente ⇒ PAS ≥ 80
  const r = { ...riserveIniziali({ volemia: 5000 }), volemia: 2900 };
  const c = circolo(r, BASE, {});
  assert.equal(c.polsoRadiale, c.pas >= 80);
});

test('la diastolica non scavalca mai la sistolica', () => {
  for (const volemia of [5000, 4200, 3500, 3000, 2600, 2200]) {
    const c = circolo({ ...riserveIniziali({ volemia: 5000 }), volemia }, BASE, {});
    assert.ok(c.pad < c.pas, `a ${volemia} ml esce ${c.pas}/${c.pad}`);
  }
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test tests/fisiologia.test.mjs`
Expected: FAIL — `circolo is not a function`

- [ ] **Step 3: Write the minimal implementation**

Append to `assets/js/core/fisiologia.js`:

```js
/* Quanto sale la frequenza a fronte della perdita. Tarato perché a
   metà del compenso (30%) un paziente da 72 arrivi intorno a 120, che
   è quello che si vede sul mezzo. ASSUNZIONE NOSTRA. */
const GUADAGNO_TACHICARDIA = 160;

/* Sotto questa sistolica il polso radiale non si sente più.
   Bolognin :8650, dentro l'algoritmo START. */
const PAS_POLSO_RADIALE = 80;

const fra = (v, min, max) => Math.min(max, Math.max(min, v));

/** Quanto regge la pressione, da 1 (intatta) a 0 (niente).

    Finché il compenso tiene vale 1: è il punto di tutto il modello. La
    vasocostrizione mantiene la sistolica mentre il sangue se ne va, e
    chi guarda solo il monitor non si accorge di niente. Passata la
    soglia dello scompenso il sostegno cade in fretta. */
function tenutaPressoria(perdita, compensoAttivo) {
  const cede = compensoAttivo ? SOGLIE_PERDITA.scompenso : SOGLIE_PERDITA.compenso;
  if (perdita <= cede) return 1;
  return fra(1 - (perdita - cede) / 0.20, 0, 1);
}

/**
 * I parametri del circolo, calcolati dalle riserve.
 * @param {object} riserve
 * @param {object} base           i parametri suoi da sano
 * @param {object} modificatori   { compensoBloccato }
 */
export function circolo(riserve, base, modificatori = {}) {
  const perdita = perditaVolemica(riserve);
  const bloccato = Boolean(modificatori.compensoBloccato);

  /* Senza compenso non c'è tachicardia riflessa: il paziente resta
     sulla sua frequenza mentre la pressione se ne va. È il quadro
     della lesione mielica (Bolognin :6487) e quello di chi prende un
     betabloccante. */
  const fc = bloccato
    ? base.fc
    : Math.round(base.fc + GUADAGNO_TACHICARDIA * perdita * riserve.contrattilita);

  const tenuta = tenutaPressoria(perdita, !bloccato);
  const pas = Math.round(base.pas * tenuta * riserve.tonoVascolare);

  /* La diastolica non segue la sistolica: durante il compenso la
     vasocostrizione la alza, e il differenziale si stringe. È un segno
     precoce, e si legge prima che la sistolica si muova. */
  const differenziale = Math.max(12, (base.pas - base.pad) * (1 - perdita));
  const pad = Math.round(Math.max(0, Math.min(pas - 8, pas - differenziale)));

  return {
    fc: fra(fc, 0, 220),
    pas: fra(pas, 0, 300),
    pad: fra(pad, 0, 200),
    polsoRadiale: pas >= PAS_POLSO_RADIALE,
    perdita,
    fase: faseCompenso(perdita),
  };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --test tests/fisiologia.test.mjs`
Expected: PASS, 15 test

- [ ] **Step 5: Commit**

```bash
git add assets/js/core/fisiologia.js tests/fisiologia.test.mjs
git commit -m "feat(fisiologia): il circolo, con la pressione che tiene finché può"
```

---

## Task 4: Il compenso bloccato

La prova che dice se il modello ha capito la lezione giusta.

**Files:**
- Modify: `assets/js/core/fisiologia.js` (nessuna modifica prevista: `circolo`
  già accetta `compensoBloccato`; se i test passano subito, il task è solo
  test e commit)
- Test: `tests/fisiologia.test.mjs`

- [ ] **Step 1: Write the failing test**

Append to `tests/fisiologia.test.mjs`:

```js
/* Bolognin :6487 — «In caso di lesione mielica lo shock non presenta la
   compensazione tachicardica: si avrà un paziente ipoteso con frequenza
   nella norma o anche bradicardico». Stesso quadro col betabloccante.
   Un modello che fa SEMPRE salire la frequenza quando la pressione
   scende è un modello che non ha capito niente. */

test('col compenso bloccato la frequenza non sale', () => {
  const r = { ...riserveIniziali({ volemia: 5000 }), volemia: 4000 };
  const libero = circolo(r, BASE, {});
  const bloccato = circolo(r, BASE, { compensoBloccato: true });
  assert.ok(libero.fc > 95, 'controllo: senza blocco la frequenza sale');
  assert.equal(bloccato.fc, BASE.fc, 'col blocco resta la sua');
});

test('col compenso bloccato la pressione cede prima', () => {
  const r = { ...riserveIniziali({ volemia: 5000 }), volemia: 4000 };  // 20%
  const libero = circolo(r, BASE, {});
  const bloccato = circolo(r, BASE, { compensoBloccato: true });
  assert.equal(libero.pas, BASE.pas, 'controllo: senza blocco la sistolica tiene');
  assert.ok(bloccato.pas < BASE.pas, `col blocco doveva cedere, invece è ${bloccato.pas}`);
});

test('il quadro ingannevole: ipoteso senza tachicardia', () => {
  const r = { ...riserveIniziali({ volemia: 5000 }), volemia: 3800 };
  const c = circolo(r, BASE, { compensoBloccato: true });
  assert.ok(c.pas < 110, 'è ipoteso');
  assert.ok(c.fc < 90, 'e non ha tachicardia: chi si fida della frequenza sbaglia');
});
```

- [ ] **Step 2: Run the test to verify it fails or passes**

Run: `node --test tests/fisiologia.test.mjs`

Expected: PASS senza modifiche — `circolo` già gestisce `compensoBloccato`. Se
qualcuno di questi tre fallisce, la taratura in Task 3 è sbagliata: correggere
`tenutaPressoria` finché non passano, **senza toccare i test**.

- [ ] **Step 3: Commit**

```bash
git add tests/fisiologia.test.mjs
git commit -m "test(fisiologia): il quadro senza compenso tachicardico"
```

---

## Task 5: I segni che vanno cercati

**Files:**
- Modify: `assets/js/core/fisiologia.js`
- Test: `tests/fisiologia.test.mjs`

- [ ] **Step 1: Write the failing test**

Append to `tests/fisiologia.test.mjs`:

```js
import { segni } from '../assets/js/core/fisiologia.js';

test('senza perdita la cute è normale e il refill veloce', () => {
  const s = segni(riserveIniziali({ volemia: 5000 }), BASE, {});
  assert.equal(s.cute, 'normale');
  assert.ok(s.refill < 2, 'Bolognin :6489 — il refill normale sta sotto i due secondi');
  assert.equal(s.sete, false);
});

test('in compenso la cute è pallida fredda e sudata, il refill oltre i due secondi', () => {
  const r = { ...riserveIniziali({ volemia: 5000 }), volemia: 3900 };   // 22%
  const s = segni(r, BASE, {});
  assert.equal(s.cute, 'pallida-fredda-sudata');
  assert.ok(s.refill > 2, `il refill doveva allungarsi, invece è ${s.refill}`);
  assert.equal(s.sete, true, 'Bolognin :6485 — il senso di sete è un segno di shock');
});

test('i segni arrivano PRIMA che la pressione si muova', () => {
  const r = { ...riserveIniziali({ volemia: 5000 }), volemia: 4000 };   // 20%
  const c = circolo(r, BASE, {});
  const s = segni(r, BASE, {});
  assert.equal(c.pas, BASE.pas, 'la pressione è ancora quella di prima');
  assert.notEqual(s.cute, 'normale', 'ma la cute lo dice già');
  assert.ok(s.refill > 2, 'e il refill pure');
});

test('la coscienza si altera solo quando il compenso non basta più', () => {
  const compensato = { ...riserveIniziali({ volemia: 5000 }), volemia: 4000 };
  const scompensato = { ...riserveIniziali({ volemia: 5000 }), volemia: 3200 };
  assert.equal(segni(compensato, BASE, {}).coscienza, 'A');
  assert.notEqual(segni(scompensato, BASE, {}).coscienza, 'A');
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test tests/fisiologia.test.mjs`
Expected: FAIL — `segni is not a function`

- [ ] **Step 3: Write the minimal implementation**

Append to `assets/js/core/fisiologia.js`:

```js
/* I segni del compenso, che il soccorritore vede solo se li cerca.

   Nessuno di questi compare da solo nel diario: esistono nello stato e
   basta. Ci vuole l'azione che li va a cercare — il test del refill, il
   colorito, la mano sulla cute, la domanda sulla sete. Chi guarda solo
   il monitor non li vede, ed è esattamente l'errore che il banco deve
   far commettere una volta perché non si ripeta sul mezzo.

   L'elenco è quello del Bolognin :6481: alterazione della coscienza,
   tachipnea, pallore con cute fredda e sudorazione algida, tachicardia,
   senso di sete. */
export function segni(riserve, base, modificatori = {}) {
  const perdita = perditaVolemica(riserve);
  const fase = faseCompenso(perdita);

  /* Il refill si allunga con la vasocostrizione periferica: è il segno
     più precoce che si possa misurare, e costa quindici secondi.
     Normale sotto i due secondi — Bolognin :6489. */
  const refill = Number((1.4 + 7 * Math.max(0, perdita - 0.08)).toFixed(1));

  let cute = 'normale';
  if (perdita >= 0.20) cute = 'pallida-fredda-sudata';
  else if (perdita >= 0.10) cute = 'pallida';

  /* La coscienza è l'ultima a cedere, e quando cede è tardi. */
  let coscienza = 'A';
  if (fase === 'crollo') coscienza = 'U';
  else if (perdita >= 0.35) coscienza = 'P';
  else if (fase === 'scompenso') coscienza = 'V';

  /* Nella lesione mielica manca la tachicardia ma NON la vasocostrizione
     sotto il livello della lesione: il pallore c'è lo stesso. */
  return {
    cute,
    refill,
    sete: perdita >= 0.20,
    coscienza,
    tachipnea: perdita >= SOGLIE_PERDITA.compenso,
    fase,
  };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --test tests/fisiologia.test.mjs`
Expected: PASS, 22 test

- [ ] **Step 5: Commit**

```bash
git add assets/js/core/fisiologia.js tests/fisiologia.test.mjs
git commit -m "feat(fisiologia): i segni del compenso, che arrivano prima dei numeri"
```

---

## Task 6: Il catalogo delle offese

**Files:**
- Create: `assets/js/data/offese.js`
- Test: `tests/offese.test.mjs`

- [ ] **Step 1: Write the failing test**

Create `tests/offese.test.mjs`:

```js
/* Collaudo del catalogo delle offese: ogni offesa è una funzione pura
   che consuma riserve. Esecuzione: node --test tests/ */

import test from 'node:test';
import assert from 'node:assert/strict';

import { OFFESE, applicaOffese, compensoBloccato } from '../assets/js/data/offese.js';
import { riserveIniziali } from '../assets/js/core/fisiologia.js';

test('ogni offesa dichiara la sua fonte', () => {
  Object.values(OFFESE).forEach((o) => {
    assert.ok(o.fonte, `${o.id}: manca la fonte`);
    assert.ok(typeof o.applica === 'function', `${o.id}: manca applica()`);
  });
});

test('le sette del primo giro ci sono tutte', () => {
  for (const id of ['emorragia', 'vasodilatazione', 'ipossia-ventilatoria',
    'ischemia-miocardica', 'dolore-acuto', 'ipoglicemia', 'blocco-compenso']) {
    assert.ok(OFFESE[id], `manca l'offesa ${id}`);
  }
});

test('l\'emorragia consuma volemia alla portata dichiarata', () => {
  const r = riserveIniziali({ volemia: 5000 });
  const dopo = applicaOffese(r, [{ tipo: 'emorragia', portata: 60 }], 60, []);
  assert.equal(dopo.volemia, 4940, 'sessanta ml al minuto per un minuto');
});

test('la compressione riduce la portata ma non la azzera', () => {
  const r = riserveIniziali({ volemia: 5000 });
  const senza = applicaOffese(r, [{ tipo: 'emorragia', portata: 60 }], 60, []);
  const con = applicaOffese(r, [{ tipo: 'emorragia', portata: 60 }], 60, ['compressione']);
  assert.ok(con.volemia > senza.volemia, 'la compressione aiuta');
  assert.ok(con.volemia < 5000, 'ma non ferma tutto: serve il laccio o la sala operatoria');
});

test('il laccio ferma l\'emorragia di un arto', () => {
  const r = riserveIniziali({ volemia: 5000 });
  const dopo = applicaOffese(r, [{ tipo: 'emorragia', portata: 60, sede: 'arto' }], 60, ['laccio']);
  assert.equal(dopo.volemia, 5000);
});

test('il laccio non serve a niente su un\'emorragia interna', () => {
  const r = riserveIniziali({ volemia: 5000 });
  const dopo = applicaOffese(r, [{ tipo: 'emorragia', portata: 60, sede: 'interna' }], 60, ['laccio']);
  assert.equal(dopo.volemia, 4940, 'un laccio sull\'addome non esiste');
});

test('la vasodilatazione non toglie sangue: toglie tenuta', () => {
  const r = riserveIniziali({ volemia: 5000 });
  const dopo = applicaOffese(r, [{ tipo: 'vasodilatazione', intensita: 0.1 }], 60, []);
  assert.equal(dopo.volemia, 5000, 'il sangue c\'è tutto');
  assert.ok(dopo.tonoVascolare < 1, 'ma i vasi non tengono');
});

test('l\'ossigeno frena l\'ipossia ventilatoria', () => {
  const r = riserveIniziali({});
  const senza = applicaOffese(r, [{ tipo: 'ipossia-ventilatoria', intensita: 0.02 }], 60, []);
  const con = applicaOffese(r, [{ tipo: 'ipossia-ventilatoria', intensita: 0.02 }], 60, ['o2']);
  assert.ok(con.ossigenazione > senza.ossigenazione);
});

test('il blocco-compenso e il betabloccante bloccano il compenso', () => {
  assert.equal(compensoBloccato([{ tipo: 'emorragia', portata: 60 }], {}), false);
  assert.equal(compensoBloccato([{ tipo: 'blocco-compenso' }], {}), true,
    'la lesione mielica lo blocca — Bolognin :6487');
  assert.equal(compensoBloccato([], { terapia: ['betabloccante'] }), true,
    'e il betabloccante pure, ma lo scopri solo chiedendo la terapia');
  assert.equal(compensoBloccato([], { terapia: ['antipertensivo'] }), false);
});

test('le offese non mutano le riserve che ricevono', () => {
  const r = riserveIniziali({ volemia: 5000 });
  applicaOffese(r, [{ tipo: 'emorragia', portata: 60 }], 60, []);
  assert.equal(r.volemia, 5000, 'l\'oggetto di partenza è rimasto intatto');
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test tests/offese.test.mjs`
Expected: FAIL — `Cannot find module '../assets/js/data/offese.js'`

- [ ] **Step 3: Write the minimal implementation**

Create `assets/js/data/offese.js`:

```js
/* =====================================================================
   offese.js — che cosa sta facendo male al paziente.

   Un caso non dichiara più di quanto peggiorano i parametri: dichiara
   la CAUSA, e il decorso viene fuori da solo. È l'impostazione dei
   motori di fisiologia seri (Pulse, BioGears): lì si chiamano "insulti".

   Ogni offesa è una funzione pura che consuma riserve. Riceve anche i
   tag — cioè i provvedimenti già presi — perché comprimere una ferita
   cambia la portata dell'emorragia, non i parametri.
   ===================================================================== */

/** Le sedi su cui un laccio emostatico ha senso. */
const SEDI_DA_LACCIO = ['arto', 'braccio', 'gamba'];

export const OFFESE = {
  emorragia: {
    id: 'emorragia',
    fonte: 'Bolognin :6469 — ipovolemia assoluta',
    /* La compressione diretta riduce molto la portata ma non la ferma:
       finché non si arriva in sala operatoria il sangue continua ad
       andarsene. Il laccio invece chiude, ma solo su un arto: sul
       torace o sull'addome non c'è niente da stringere. */
    applica: (offesa, riserve, dt, tag) => {
      const sedeDaLaccio = SEDI_DA_LACCIO.includes(offesa.sede);
      if (sedeDaLaccio && tag.includes('laccio')) return {};
      const freno = tag.includes('compressione') ? 0.2 : 1;
      return { volemia: -(offesa.portata / 60) * dt * freno };
    },
  },

  vasodilatazione: {
    id: 'vasodilatazione',
    fonte: 'Bolognin :6473 — ipovolemia relativa (anafilassi, shock spinale)',
    /* Il sangue c'è tutto, ma il letto vascolare si è allargato e non
       tiene: la pressione scende con la volemia intatta. Per questo i
       liquidi da soli non bastano e ci vuole l'adrenalina. */
    applica: (offesa, riserve, dt, tag) => {
      const freno = tag.includes('adrenalina') ? -0.5 : 1;   // negativo = recupera
      return { tonoVascolare: -(offesa.intensita / 60) * dt * freno };
    },
  },

  'ipossia-ventilatoria': {
    id: 'ipossia-ventilatoria',
    fonte: 'Bolognin :3277, :6425 — ossigeno ad alti flussi',
    applica: (offesa, riserve, dt, tag) => {
      const freno = tag.includes('o2') ? 0.3 : 1;
      const recupero = tag.includes('pallone') ? -0.4 : freno;
      return { ossigenazione: -(offesa.intensita / 60) * dt * recupero };
    },
  },

  'ischemia-miocardica': {
    id: 'ischemia-miocardica',
    fonte: 'ERC 2025 cap. 5 — sindrome coronarica acuta',
    /* Il miocardio che soffre pompa meno e fa male. Il dolore da solo
       alza frequenza e pressione, che fanno soffrire ancora di più il
       miocardio: è il circolo vizioso che va rotto in fretta. */
    applica: (offesa, riserve, dt, tag) => ({
      contrattilita: -(offesa.intensita / 60) * dt,
      dolore: tag.includes('analgesia') ? 0 : (offesa.intensita * 8 / 60) * dt,
    }),
  },

  'dolore-acuto': {
    id: 'dolore-acuto',
    fonte: 'Bolognin :6481 — compenso adrenergico',
    applica: (offesa, riserve, dt, tag) => ({
      dolore: tag.includes('analgesia') ? -(2 / 60) * dt : (offesa.intensita / 60) * dt,
    }),
  },

  ipoglicemia: {
    id: 'ipoglicemia',
    fonte: 'Bolognin — glicemia e stato di coscienza',
    applica: (offesa, riserve, dt, tag) => {
      if (tag.includes('zucchero') || tag.includes('glucosata')) {
        return { glicemia: (3 / 60) * dt };
      }
      return { glicemia: -(offesa.intensita / 60) * dt };
    },
  },

  'blocco-compenso': {
    id: 'blocco-compenso',
    fonte: 'Bolognin :6487 — lesione mielica, e i betabloccanti',
    /* Non consuma niente: è uno stato. Il suo effetto lo legge
       `parametriVisibili` attraverso il modificatore. */
    applica: () => ({}),
    bloccaCompenso: true,
  },
};

/**
 * Fa agire tutte le offese attive per `dt` secondi.
 * Restituisce riserve NUOVE: quelle in ingresso non si toccano.
 *
 * @param {object}   riserve
 * @param {object[]} offese    le righe scritte nel caso
 * @param {number}   dt        secondi
 * @param {string[]} tag       i provvedimenti già presi
 */
export function applicaOffese(riserve, offese = [], dt = 0, tag = []) {
  return offese.reduce((acc, offesa) => {
    const modello = OFFESE[offesa.tipo];
    if (!modello) return acc;
    const delta = modello.applica(offesa, acc, dt, tag) || {};
    const nuove = { ...acc };
    Object.entries(delta).forEach(([k, v]) => {
      if (typeof nuove[k] === 'number') nuove[k] = nuove[k] + v;
    });
    return nuove;
  }, { ...riserve });
}

/** Il caso ha un'offesa che blocca il compenso tachicardico? */
export function compensoBloccato(offese = [], modificatori = {}) {
  const daOffesa = offese.some((o) => OFFESE[o.tipo]?.bloccaCompenso);
  const daTerapia = (modificatori.terapia || []).includes('betabloccante');
  return daOffesa || daTerapia;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --test tests/offese.test.mjs`
Expected: PASS, 10 test

- [ ] **Step 5: Commit**

```bash
git add assets/js/data/offese.js tests/offese.test.mjs
git commit -m "feat(offese): il catalogo delle sette offese del primo giro"
```

---

## Task 7: I parametri visibili, tutti insieme

**Files:**
- Modify: `assets/js/core/fisiologia.js`
- Test: `tests/fisiologia.test.mjs`

- [ ] **Step 1: Write the failing test**

Append to `tests/fisiologia.test.mjs`:

```js
import { parametriVisibili } from '../assets/js/core/fisiologia.js';

test('i parametri visibili mettono insieme circolo, respiro e segni', () => {
  const p = parametriVisibili(riserveIniziali({ volemia: 5000 }), BASE, {});
  for (const k of ['fc', 'pas', 'pad', 'spo2', 'fr', 'coscienza', 'cute', 'refill', 'polsoRadiale']) {
    assert.ok(k in p, `manca ${k}`);
  }
});

test('la saturazione viene dall\'ossigenazione, non dalla volemia', () => {
  const sanguinante = { ...riserveIniziali({ volemia: 5000 }), volemia: 3500 };
  const ipossico = { ...riserveIniziali({}), ossigenazione: 0.85 };
  assert.ok(parametriVisibili(sanguinante, BASE, {}).spo2 > 94, 'chi sanguina satura ancora bene');
  assert.ok(parametriVisibili(ipossico, BASE, {}).spo2 < 92, 'chi non ventila no');
});

test('il dolore alza frequenza e pressione', () => {
  const calmo = riserveIniziali({});
  const dolorante = { ...riserveIniziali({}), dolore: 9 };
  const a = parametriVisibili(calmo, BASE, {});
  const b = parametriVisibili(dolorante, BASE, {});
  assert.ok(b.fc > a.fc, 'il dolore fa battere il cuore più forte');
  assert.ok(b.pas > a.pas, 'e alza la pressione');
});

test('la glicemia bassa altera la coscienza anche senza perdita di sangue', () => {
  const r = { ...riserveIniziali({}), glicemia: 35 };
  assert.notEqual(parametriVisibili(r, BASE, {}).coscienza, 'A');
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test tests/fisiologia.test.mjs`
Expected: FAIL — `parametriVisibili is not a function`

- [ ] **Step 3: Write the minimal implementation**

Append to `assets/js/core/fisiologia.js`:

```js
/* Quanto il dolore alza frequenza e pressione, per punto di scala.
   ASSUNZIONE NOSTRA: il Bolognin dice che succede (:6481), non di
   quanto. */
const SPINTA_DOLORE_FC = 3.5;
const SPINTA_DOLORE_PAS = 2.5;

const PESO_COSCIENZA = { A: 0, V: 1, P: 2, U: 3 };
const SCALA_COSCIENZA = ['A', 'V', 'P', 'U'];

/** Il peggiore fra due stati di coscienza. */
function peggiore(a, b) {
  return SCALA_COSCIENZA[Math.max(PESO_COSCIENZA[a] ?? 0, PESO_COSCIENZA[b] ?? 0)];
}

/**
 * Tutto quello che un soccorritore può misurare o vedere addosso al
 * paziente, calcolato dalle riserve. Nessuno di questi valori è
 * memorizzato da qualche parte: escono da qui ogni volta.
 */
export function parametriVisibili(riserve, base, modificatori = {}) {
  const c = circolo(riserve, base, modificatori);
  const s = segni(riserve, base, modificatori);

  /* Il dolore tira su frequenza e pressione per via adrenergica: è
     compenso anche quello, e maschera l'ipovolemia. */
  const fc = Math.round(c.fc + riserve.dolore * SPINTA_DOLORE_FC);
  const pas = Math.round(c.pas + riserve.dolore * SPINTA_DOLORE_PAS);

  const spo2 = Math.round(fra(riserve.ossigenazione * 100, 50, 100));

  /* Si respira più in fretta per due motivi diversi: perché manca
     ossigeno, o perché manca sangue da ossigenare. */
  const fr = Math.round(fra(
    base.fr + (s.tachipnea ? 10 : 0) + Math.max(0, (0.95 - riserve.ossigenazione) * 100),
    0, 60,
  ));

  /* Sotto i 50 di glicemia la coscienza va, e non c'entra niente col
     sangue: è il quadro che si confonde con l'ictus e con l'ubriaco. */
  const daGlicemia = riserve.glicemia < 30 ? 'P' : (riserve.glicemia < 50 ? 'V' : 'A');

  return {
    fc: fra(fc, 0, 220),
    pas: fra(pas, 0, 300),
    pad: Math.min(c.pad, fra(pas, 0, 300) - 8),
    spo2,
    fr,
    glicemia: Math.round(riserve.glicemia),
    dolore: Math.round(riserve.dolore),
    coscienza: peggiore(s.coscienza, daGlicemia),
    cute: s.cute,
    refill: s.refill,
    sete: s.sete,
    polsoRadiale: c.polsoRadiale,
    fase: c.fase,
    perdita: c.perdita,
  };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --test tests/fisiologia.test.mjs`
Expected: PASS, 26 test

- [ ] **Step 5: Commit**

```bash
git add assets/js/core/fisiologia.js tests/fisiologia.test.mjs
git commit -m "feat(fisiologia): i parametri visibili, calcolati e non memorizzati"
```

---

## Task 8: Arresto, col ritmo che dipende dalla causa

**Files:**
- Modify: `assets/js/core/fisiologia.js`
- Test: `tests/fisiologia.test.mjs`

- [ ] **Step 1: Write the failing test**

Append to `tests/fisiologia.test.mjs`:

```js
import { verificaArresto, RITMO_PER_CAUSA } from '../assets/js/core/fisiologia.js';

test('non c\'è arresto finché il circolo regge', () => {
  const r = { ...riserveIniziali({ volemia: 5000 }), volemia: 4000 };
  assert.equal(verificaArresto(r, BASE, {}, []), null);
});

test('sotto i quaranta di sistolica il paziente arresta', () => {
  const r = { ...riserveIniziali({ volemia: 5000 }), volemia: 2200 };
  const a = verificaArresto(r, BASE, {}, [{ tipo: 'emorragia', portata: 60 }]);
  assert.ok(a, 'doveva arrestare');
  assert.equal(a.causa, 'emorragia');
});

test('l\'arresto da emorragia NON è defibrillabile', () => {
  const r = { ...riserveIniziali({ volemia: 5000 }), volemia: 2200 };
  const a = verificaArresto(r, BASE, {}, [{ tipo: 'emorragia', portata: 60 }]);
  assert.equal(a.ritmo, 'pea');
  assert.equal(a.defibrillabile, false, 'il DAE non risolve un esanguinamento');
});

test('l\'arresto da ischemia È defibrillabile', () => {
  const r = { ...riserveIniziali({}), contrattilita: 0.05 };
  const a = verificaArresto(r, BASE, {}, [{ tipo: 'ischemia-miocardica', intensita: 0.3 }]);
  assert.ok(a, 'doveva arrestare');
  assert.equal(a.ritmo, 'fv');
  assert.equal(a.defibrillabile, true);
});

test('l\'arresto da ipossia non è defibrillabile', () => {
  const r = { ...riserveIniziali({}), ossigenazione: 0.30 };
  const a = verificaArresto(r, BASE, {}, [{ tipo: 'ipossia-ventilatoria', intensita: 0.05 }]);
  assert.ok(a, 'doveva arrestare');
  assert.equal(a.defibrillabile, false, 'nell\'asfittico servono ventilazione e compressioni');
});

test('la tabella dei ritmi copre tutte le offese che possono uccidere', () => {
  for (const causa of ['emorragia', 'ipossia-ventilatoria', 'ischemia-miocardica',
    'vasodilatazione', 'ipoglicemia']) {
    assert.ok(RITMO_PER_CAUSA[causa], `manca il ritmo per ${causa}`);
  }
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test tests/fisiologia.test.mjs`
Expected: FAIL — `verificaArresto is not a function`

- [ ] **Step 3: Write the minimal implementation**

Append to `assets/js/core/fisiologia.js`:

```js
/* Il ritmo con cui il cuore si ferma dipende da PERCHÉ si è fermato, e
   decide se il defibrillatore serve a qualcosa.

   Un cuore che si ferma perché il miocardio è ischemico va in
   fibrillazione: la scarica ha senso. Un cuore che si ferma perché non
   gli arriva più sangue o più ossigeno continua a produrre attività
   elettrica senza polso, e poi si spegne: la scarica non serve a niente
   e il tempo speso ad attaccare le piastre è tempo tolto alle
   compressioni. È la cosa che si sbaglia più spesso. */
export const RITMO_PER_CAUSA = {
  'ischemia-miocardica': { ritmo: 'fv', defibrillabile: true },
  emorragia: { ritmo: 'pea', defibrillabile: false },
  'ipossia-ventilatoria': { ritmo: 'pea', defibrillabile: false },
  vasodilatazione: { ritmo: 'pea', defibrillabile: false },
  ipoglicemia: { ritmo: 'pea', defibrillabile: false },
};

/* Sotto questa sistolica il circolo non è più compatibile con la vita. */
const PAS_ARRESTO = 40;
const SPO2_ARRESTO = 40;

/**
 * Il paziente è arrestato? Restituisce `null` se no, altrimenti come e
 * perché.
 *
 * La causa è la prima offesa attiva che sappia uccidere: se sono più
 * d'una vince quella dichiarata per prima nel caso, che è anche quella
 * che il soccorritore dovrebbe aver riconosciuto.
 */
export function verificaArresto(riserve, base, modificatori, offese = []) {
  const p = parametriVisibili(riserve, base, modificatori);
  const senzaCircolo = p.pas < PAS_ARRESTO;
  const senzaOssigeno = p.spo2 < SPO2_ARRESTO;
  const senzaPompa = riserve.contrattilita < 0.1;
  if (!senzaCircolo && !senzaOssigeno && !senzaPompa) return null;

  const causa = offese.map((o) => o.tipo).find((tipo) => RITMO_PER_CAUSA[tipo])
    || 'ischemia-miocardica';
  return { causa, ...RITMO_PER_CAUSA[causa] };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --test tests/fisiologia.test.mjs`
Expected: PASS, 32 test

- [ ] **Step 5: Commit**

```bash
git add assets/js/core/fisiologia.js tests/fisiologia.test.mjs
git commit -m "feat(fisiologia): arresto, col ritmo che dipende dalla causa"
```

---

## Task 9: La curva di sopravvivenza

**Files:**
- Modify: `assets/js/core/fisiologia.js`
- Test: `tests/fisiologia.test.mjs`

- [ ] **Step 1: Write the failing test**

Append to `tests/fisiologia.test.mjs`:

```js
import { sopravvivenza } from '../assets/js/core/fisiologia.js';

test('al momento dell\'arresto la probabilità è piena', () => {
  assert.equal(sopravvivenza(0, []), 1);
});

test('senza RCP crolla del sei per cento al minuto', () => {
  // ERC 2025 cap. 4 :961
  assert.ok(Math.abs(sopravvivenza(60, []) - 0.94) < 0.005, 'un minuto: 94%');
  assert.ok(Math.abs(sopravvivenza(300, []) - 0.94 ** 5) < 0.01, 'cinque minuti');
});

test('con la RCP in corso la curva è più piatta', () => {
  const senza = sopravvivenza(300, []);
  const con = sopravvivenza(300, ['rcp']);
  assert.ok(con > senza * 1.5, `la RCP deve contare parecchio: ${con} contro ${senza}`);
});

test('la probabilità non va sotto zero per quanto si aspetti', () => {
  assert.ok(sopravvivenza(3600, []) >= 0);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test tests/fisiologia.test.mjs`
Expected: FAIL — `sopravvivenza is not a function`

- [ ] **Step 3: Write the minimal implementation**

Append to `assets/js/core/fisiologia.js`:

```js
/* Quanto cala la probabilità di farcela, per ogni minuto che passa.

   Il numero senza RCP è delle linee guida: «ogni minuto di ritardo alla
   defibrillazione è associato a un incremento del 6% di probabilità di
   fallire l'interruzione della FV e a un 3-6% di riduzione della
   probabilità di sopravvivenza alla dimissione» — ERC 2025 cap. 4 :961.
   Si prende il 6%, il caso peggiore.

   Il numero CON la RCP in corso è ASSUNZIONE NOSTRA: le linee guida
   dicono che la rianimazione da parte degli astanti aumenta la
   sopravvivenza, ma un coefficiente al minuto non lo danno. Se si trova
   una fonte che lo quantifichi, si corregge qui. */
const CALO_SENZA_RCP = 0.06;
const CALO_CON_RCP = 0.02;      // assunzione nostra

/**
 * Probabilità di farcela, da 1 a 0, dopo `secondi` dall'arresto.
 * @param {string[]} tag   se contiene 'rcp' le compressioni sono in corso
 */
export function sopravvivenza(secondi, tag = []) {
  const minuti = Math.max(0, secondi / 60);
  const calo = tag.includes('rcp') ? CALO_CON_RCP : CALO_SENZA_RCP;
  return Math.max(0, (1 - calo) ** minuti);
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --test tests/fisiologia.test.mjs`
Expected: PASS, 36 test

- [ ] **Step 5: Commit**

```bash
git add assets/js/core/fisiologia.js tests/fisiologia.test.mjs
git commit -m "feat(fisiologia): la curva di sopravvivenza dopo l'arresto"
```

---

## Task 10: Innesto nel motore

Il punto delicato. `proietta()` in `sim-engine.js` è l'unico posto in cui si
proiettano le rette: sostituendolo, eventi, soglie, letture, azioni e pagella
continuano a funzionare senza modifiche.

**Files:**
- Modify: `assets/js/core/sim-engine.js:104-131` (la funzione `proietta`) e
  l'intestazione degli import
- Test: `tests/sim-engine.test.mjs`

- [ ] **Step 1: Write the failing test**

Append to `tests/sim-engine.test.mjs`:

```js
/* ============= il motore col modello fisiologico ==================== */

function casoFisiologico(extra = {}) {
  return {
    id: 'prova-fis', titolo: 'Caso fisiologico', motore: 3,
    fisiologia: {
      base: { fc: 72, pas: 135, pad: 82, spo2: 98, fr: 14, glicemia: 96 },
      riserve: { volemia: 5000 },
      offese: [{ tipo: 'emorragia', sede: 'interna', portata: 60 }],
      modificatori: {},
    },
    eventi: [], soglie: [],
    azioni: { necessarie: [], utili: [], dannose: [] },
    ...extra,
  };
}

test('un caso fisiologico parte dai parametri derivati, non dichiarati', () => {
  const i = avvia(casoFisiologico());
  assert.equal(i.stato.pas, 135);
  assert.equal(i.stato.fc, 72);
});

test('col passare del tempo l\'emorragia si fa sentire', () => {
  const i = avvia(casoFisiologico());
  i.avanza(60 * 15);                       // quindici minuti, 900 ml
  assert.ok(i.stato.fc > 90, `la frequenza doveva salire, invece è ${i.stato.fc}`);
  assert.equal(i.stato.pas, 135, 'ma la pressione tiene ancora: è il compenso');
});

test('passato il ginocchio la pressione cede', () => {
  const i = avvia(casoFisiologico());
  i.avanza(60 * 28);                       // 1680 ml, oltre il 30%
  assert.ok(i.stato.pas < 130, `la pressione doveva cedere, invece è ${i.stato.pas}`);
});

test('senza nessuno che intervenga il paziente arresta', () => {
  const i = avvia(casoFisiologico());
  i.avanza(60 * 50);
  assert.equal(i.stato.esito === 'morto' || i.stato.tag.includes('arresto'), true,
    'dopo cinquanta minuti di emorragia non trattata non si sta bene');
});

test('il vecchio formato con decorso continua a funzionare', () => {
  const i = avvia(casoProva());
  i.avanza(60);
  assert.equal(i.stato.pas, 97, 'i casi senza blocco fisiologia non cambiano');
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test tests/sim-engine.test.mjs`
Expected: FAIL — i parametri restano fermi, `i.stato.fc` è ancora 72 dopo
quindici minuti, perché il motore non conosce ancora le offese.

- [ ] **Step 3: Write the implementation**

In `assets/js/core/sim-engine.js`, aggiungere gli import in cima al file, subito
sotto il commento di intestazione:

```js
/* `verificaArresto` si chiama come una funzione che sim-engine ha già:
   si importa sotto altro nome per non coprirla. */
import {
  riserveIniziali, parametriVisibili, verificaArresto as arrestoDaRiserve,
} from './fisiologia.js';
import { applicaOffese, compensoBloccato } from '../data/offese.js';
```

Poi, dentro `creaIntervento`, subito dopo la riga `let ancoraT = 0;`, aggiungere
lo stato delle riserve:

```js
  /* Un caso di formato 3 porta le sue riserve: da lì escono i parametri.
     I casi vecchi non hanno il blocco `fisiologia` e continuano a
     derivare per rette, finché non saranno convertiti tutti. */
  const fis = caso.fisiologia || null;
  let riserve = fis ? riserveIniziali(fis.riserve) : null;

  /* `gia` sono i millilitri già persi quando la squadra arriva: è così
     che si sceglie la gravità all'arrivo, invece di scrivere a mano i
     parametri. */
  if (fis) {
    const giaPersi = (fis.offese || []).reduce((s, o) => s + (o.gia || 0), 0);
    riserve = { ...riserve, volemia: riserve.volemia - giaPersi };
  }
```

Poi **sostituire per intero** la funzione `proietta()` (righe 104-131) con:

```js
  /** Stato proiettato all'istante corrente, senza toccare l'ancora. */
  function proietta() {
    const minuti = (t - ancoraT) / 60;
    if (fis) return proiettaFisiologico(t - ancoraT);

    const ritmi = ritmiAttivi();
    const s = { ...ancora, tag: [...ancora.tag], respiro: { ...ancora.respiro } };
    if (minuti > 0) {
      DERIVATE.forEach((k) => {
        const r = ritmi[k];
        if (!r || typeof ancora[k] !== 'number') return;
        s[k] = limita(k, arrotonda(ancora[k] + r * minuti));
      });
      s.respiro.fr = s.fr;
    }
    return s;
  }

  /* Il paziente di formato 3 non ha parametri memorizzati: si calcolano
     dalle riserve, che nel frattempo le offese hanno consumato. */
  function proiettaFisiologico(dt) {
    const r = dt > 0 ? applicaOffese(riserve, fis.offese, dt, ancora.tag) : riserve;
    const mod = {
      ...fis.modificatori,
      compensoBloccato: compensoBloccato(fis.offese, fis.modificatori),
    };
    const p = parametriVisibili(r, fis.base, mod);
    return {
      ...ancora,
      ...p,
      tag: [...ancora.tag],
      respiro: { ...ancora.respiro, fr: p.fr },
      riserve: r,
    };
  }
```

Poi **sostituire** `ancoraOra()` con una versione che fissa anche le riserve:

```js
  /** Fissa l'ancora al valore proiettato adesso: da qui riparte il calcolo. */
  function ancoraOra() {
    const s = proietta();
    if (fis) riserve = s.riserve;
    ancora = s;
    ancoraT = t;
  }
```

Infine, dentro `avanza()`, sostituire la riga `verificaArresto();` con:

```js
      verificaArrestoFisiologico();
      verificaArresto();
```

e aggiungere la funzione nuova subito sopra `verificaArresto`:

```js
  /* Nei casi di formato 3 all'arresto ci si arriva consumando le
     riserve, non per evento scritto a mano: è il paziente che muore
     perché nessuno ha fatto la cosa giusta in tempo. */
  function verificaArrestoFisiologico() {
    if (!fis || arrestoA !== null || ancora.esito !== 'in-corso') return;
    const s = proietta();
    const a = arrestoDaRiserve(s.riserve, fis.base, fis.modificatori, fis.offese);
    if (!a) return;
    ancoraOra();
    ancora = { ...ancora, ritmo: a.ritmo, arrestoDefibrillabile: a.defibrillabile };
    entraInArresto();
  }
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test tests/*.test.mjs`
Expected: PASS, tutti. Se il test «il vecchio formato con decorso continua a
funzionare» fallisce, l'innesto ha rotto la strada vecchia: sistemare quello
prima di andare avanti.

- [ ] **Step 5: Commit**

```bash
git add assets/js/core/sim-engine.js tests/sim-engine.test.mjs
git commit -m "feat(sim): il motore calcola i parametri dalle riserve"
```

---

## Task 11: Riscrivere shock-v2 in formato 3

**Files:**
- Modify: `assets/js/data/casi.js:20-152` (il caso `shock-v2`)
- Test: `tests/casi.test.mjs`

- [ ] **Step 1: Write the failing test**

Append to `tests/casi.test.mjs`:

```js
test('i casi di formato 3 dichiarano offese, non derive', () => {
  CASI.filter((c) => c.motore === 3).forEach((c) => {
    assert.ok(c.fisiologia, `${c.id}: manca il blocco fisiologia`);
    assert.ok(c.fisiologia.base, `${c.id}: manca la base`);
    assert.ok(c.fisiologia.offese?.length, `${c.id}: nessuna offesa dichiarata`);
    assert.ok(!c.decorso, `${c.id}: ha ancora il decorso vecchio`);
    assert.ok(!c.iniziale, `${c.id}: ha ancora i parametri iniziali scritti a mano`);
  });
});

test('shock-v3 arriva già in compenso', () => {
  const caso = CASI.find((c) => c.id === 'shock-v3');
  assert.ok(caso, 'manca shock-v3');
  const i = creaIntervento(caso, { azioni: AZIONI });
  assert.ok(i.stato.fc > 100, 'la frequenza è già su');
  assert.ok(i.stato.pas > 110, 'ma la pressione ancora tiene: è la trappola del caso');
});
```

`tests/casi.test.mjs` importa già `creaIntervento`, `AZIONI` e `CASI`: non
serve aggiungere niente in cima.

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test tests/casi.test.mjs`
Expected: FAIL — `manca shock-v3`

- [ ] **Step 3: Write the implementation**

In `assets/js/data/casi.js`, sostituire il caso `shock-v2` con:

```js
  {
    id: 'shock-v3',
    ecg: { pattern: 'normale' },
    titolo: '"Si sente fiacco"',
    tipo: 'medico',
    difficolta: 3,
    motore: 3,
    capitoli: ['cap-29', 'cap-27'],

    dispatch: {
      codice: 'VERDE',
      testo: 'Uomo di 74 anni, "si sente fiacco". Nient\'altro dalla centrale.',
      luogo: 'Abitazione privata, piano terra',
    },
    scena: {
      testo: 'Abitazione ordinata, la moglie vi apre tranquilla e dice che "è solo un po\' stanco". Nessun rischio.',
      sicura: true,
    },
    colpoOcchio: {
      testo: 'Seduto in poltrona, vigile ma spento, risponde lentamente. Cute pallida e fredda, leggermente sudato. Non riferisce dolore.',
      vitale: true,
    },

    fisiologia: {
      /* Il suo normale: un iperteso di settantaquattro anni in terapia. */
      base: { fc: 72, pas: 145, pad: 85, spo2: 98, fr: 14, glicemia: 96 },
      riserve: { volemia: 4800 },
      /* Sanguina nello stomaco da ore: quando arrivate ha già perso
         quasi un litro, ed è per questo che "si sente fiacco". Il laccio
         non serve, la compressione nemmeno: qui l'unica cosa che conta è
         arrivare in ospedale prima del ginocchio. */
      offese: [
        { tipo: 'emorragia', sede: 'interna', portata: 42, gia: 950 },
      ],
      /* Il betabloccante gli tiene la frequenza bassa: il compenso non
         si vede. È la trappola del caso, e si scopre solo chiedendo la
         terapia. */
      modificatori: { eta: 74, terapia: ['betabloccante'] },
    },

    trappola: 'Il paziente parla, la moglie è tranquilla, la centrale ha detto verde. Il betabloccante gli impedisce di tachicardizzare: la frequenza che leggi non ti dice niente. Guardagli la cute e fai il refill, e chiedi sempre la terapia cronica.',

    azioni: {
      necessarie: [
        { id: 'valuta-scena', entro: 60, peso: 1 },
        { id: 'misura-pa', entro: 150, peso: 3 },
        { id: 'monitor', entro: 210, peso: 2 },
        { id: 'refill', entro: 180, peso: 3 },
        { id: 'antishock', entro: 300, peso: 3 },
        { id: 'coperta', entro: 420, peso: 1 },
        { id: 'riferisci-infermiere', entro: 360, peso: 2 },
        { id: 'allerta-co', entro: 420, peso: 1 },
        { id: 'accesso-prepara', entro: 420, peso: 1 },
        { id: 'inf-accesso', entro: 480, peso: 1 },
        { id: 'inf-liquidi', entro: 540, peso: 2 },
        { id: 'carica', entro: 780, peso: 2 },
      ],
      dannose: [
        { id: 'posizione-seduta', penalita: 3, perche: 'In un paziente ipoteso la posizione seduta toglie ritorno venoso: la pressione scende ancora.' },
        { id: 'spinale', perche: 'Nessun trauma: sono tre minuti persi e un paziente scomodo.' },
        { id: 'zucchero-os', perche: 'La glicemia è normale: non è quello il problema.' },
      ],
    },
  },
```

Togliere dal caso le chiavi `iniziale`, `decorso`, `effettiAzioni` e i blocchi
`eventi`/`soglie` che facevano scendere la pressione a mano — quelli che
raccontano una storia (la moglie che porta le scatole della terapia) si tengono.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test tests/*.test.mjs`
Expected: PASS. Se «shock-v3 arriva già in compenso» fallisce, aggiustare `gia`
e `portata` finché i numeri all'arrivo non sono quelli giusti — **non i test**.

- [ ] **Step 5: Commit**

```bash
git add assets/js/data/casi.js tests/casi.test.mjs
git commit -m "feat(casi): shock riscritto in formato 3, col betabloccante che nasconde il compenso"
```

---

## Task 12: Riscrivere toracico-v2 in formato 3

**Files:**
- Modify: `assets/js/data/casi.js` (il caso `toracico-v2`)
- Test: `tests/casi.test.mjs`

- [ ] **Step 1: Write the failing test**

Append to `tests/casi.test.mjs`:

```js
test('toracico-v3 ha dolore e miocardio che soffre', () => {
  const caso = CASI.find((c) => c.id === 'toracico-v3');
  assert.ok(caso, 'manca toracico-v3');
  const tipi = caso.fisiologia.offese.map((o) => o.tipo);
  assert.ok(tipi.includes('ischemia-miocardica'), 'deve avere l\'ischemia');
});

test('toracico-v3 non trattato arresta in fibrillazione, e il DAE serve', () => {
  const caso = CASI.find((c) => c.id === 'toracico-v3');
  const i = creaIntervento(caso, { azioni: AZIONI });
  i.avanza(60 * 45);
  assert.ok(i.stato.tag.includes('arresto') || i.stato.esito === 'morto',
    'quarantacinque minuti di infarto non trattato finiscono male');
  assert.equal(i.stato.ritmo, 'fv', 'il cuore ischemico fibrilla: la scarica ha senso');
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test tests/casi.test.mjs`
Expected: FAIL — `manca toracico-v3`

- [ ] **Step 3: Write the implementation**

Sostituire il caso `toracico-v2` cambiando `id` in `toracico-v3`, `motore` in `3`,
togliendo `iniziale`, `decorso`, `effettiAzioni`, e mettendo al loro posto:

```js
    fisiologia: {
      base: { fc: 78, pas: 150, pad: 88, spo2: 97, fr: 16, glicemia: 104 },
      riserve: { volemia: 5000 },
      /* Il miocardio soffre da quaranta minuti. Il dolore da solo alza
         frequenza e pressione, che fanno soffrire ancora di più il
         miocardio: è il circolo vizioso da rompere. L'ossigeno e la
         posizione seduta lo rallentano, la corsa in ospedale lo chiude. */
      offese: [
        { tipo: 'ischemia-miocardica', intensita: 0.020 },
        { tipo: 'dolore-acuto', intensita: 0.9 },
      ],
      modificatori: { eta: 68, terapia: [] },
    },
```

Le chiavi `dispatch`, `scena`, `colpoOcchio`, `eventi`, `soglie`, `azioni` e
`trappola` restano come sono.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test tests/*.test.mjs`
Expected: PASS. Se l'arresto non arriva entro i quarantacinque minuti, alzare
`intensita` dell'ischemia; se arriva troppo presto, abbassarla.

- [ ] **Step 5: Commit**

```bash
git add assets/js/data/casi.js tests/casi.test.mjs
git commit -m "feat(casi): dolore toracico riscritto in formato 3"
```

---

## Task 13: Le azioni agiscono sulle riserve

Oggi un'azione dichiara `{ pas: +3.5 }`. Nel formato 3 le azioni mettono un tag,
e sono le offese a leggerlo.

**Files:**
- Modify: `assets/js/data/azioni.js` (le azioni `compressione`, `laccio`,
  `inf-liquidi`, `o2-reservoir`, `o2-maschera`, `o2-occhialini`, `pallone`,
  `zucchero-os`, `inf-glucosata`, `inf-adrenalina`)
- Test: `tests/azioni.test.mjs`

- [ ] **Step 1: Write the failing test**

Append to `tests/azioni.test.mjs`:

```js
/* Le offese leggono i tag: se un'azione non mette il tag giusto, il
   provvedimento non ha alcun effetto sul paziente. */
const TAG_ATTESI = {
  compressione: 'compressione',
  laccio: 'laccio',
  'o2-reservoir': 'o2',
  'o2-maschera': 'o2',
  'o2-occhialini': 'o2',
  pallone: 'pallone',
  'inf-liquidi': 'liquidi',
  'zucchero-os': 'zucchero',
  'inf-glucosata': 'glucosata',
  'inf-adrenalina': 'adrenalina',
};

test('le azioni che curano mettono il tag che le offese leggono', () => {
  Object.entries(TAG_ATTESI).forEach(([id, tag]) => {
    const az = AZIONI[id];
    assert.ok(az, `manca l'azione ${id}`);
    assert.ok(az.applica, `${id}: manca applica()`);
    const eff = az.applica({ viePervie: true, tag: [] }, {});
    assert.equal(eff.tag, tag, `${id} doveva mettere il tag "${tag}"`);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test tests/azioni.test.mjs`
Expected: FAIL — le azioni mettono tag diversi o non ne mettono affatto.

- [ ] **Step 3: Write the implementation**

In `assets/js/data/azioni.js`, dentro `ELENCO`, sostituire l'`applica` di
queste dieci azioni. **Non toccare le altre chiavi** (`cat`, `label`, `durata`,
`chi`, `richiede`, `diario`, `spiega`): si cambia solo `applica`.

Tre tag cambiano nome, ed è voluto:

- `compressione` e `laccio` oggi mettono **lo stesso** tag `'emostasi'`, ma il
  modello deve distinguerli: la compressione riduce la portata, il laccio la
  azzera — e solo su un arto. Diventano `'compressione'` e `'laccio'`.
- `pallone` metteva `'ventilazione'`; diventa `'pallone'`, che è quello che
  l'offesa `ipossia-ventilatoria` legge per distinguerlo dall'ossigeno passivo.

Nessuno dei tre tag vecchi è letto da qualche altra parte del progetto: la
verifica è stata fatta, si possono rinominare senza rompere niente.

```js
// riga ~184
applica: () => ({ tag: 'compressione' }),

// riga ~190
applica: () => ({ tag: 'laccio' }),

// riga ~127 · o2-occhialini — l'effetto sulla saturazione ora lo calcola
// la fisiologia dalla riserva di ossigenazione, non un delta fisso
applica: () => ({ tag: 'o2' }),

// riga ~134 · o2-maschera
applica: () => ({ tag: 'o2' }),

// riga ~141 · o2-reservoir
applica: () => ({ tag: 'o2' }),

// riga ~149 · pallone
applica: () => ({ tag: 'pallone' }),

// riga ~418 · inf-liquidi
applica: () => ({ tag: 'liquidi' }),

// riga ~289 · zucchero-os
applica: () => ({ tag: 'zucchero' }),

// riga ~447 · inf-glucosata
applica: () => ({ tag: 'glucosata' }),

// riga ~427 · inf-adrenalina
applica: () => ({ tag: 'adrenalina' }),
```

Spariscono tutti i delta numerici (`{ spo2: +5 }`, `{ pas: +18 }`,
`{ glicemia: +45 }`, `{ pas: +30, spo2: +6 }`): non è più un'azione a decidere
di quanto migliora un parametro, è la fisiologia a calcolarlo dalla riserva che
l'azione ha rimesso a posto.

Attenzione a `inf-glucosata`, che metteva anche `coscienza: 'A'`: quello va
tolto: la coscienza torna da sola quando la glicemia risale, ed è giusto che ci
metta il suo tempo.

Le azioni che restano invariate sono tutte le altre: valutazioni, immobilizzo,
comunicazione, scena.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test tests/*.test.mjs`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add assets/js/data/azioni.js tests/azioni.test.mjs
git commit -m "feat(azioni): i provvedimenti agiscono sulle riserve, non sui numeri"
```

---

## Task 14: Le tre azioni che cercano i segni

Senza queste, i segni del compenso restano invisibili e il modello non insegna
niente.

**Files:**
- Modify: `assets/js/data/azioni.js`
- Test: `tests/azioni.test.mjs`

- [ ] **Step 1: Write the failing test**

Append to `tests/azioni.test.mjs`:

```js
test('ci sono le azioni per cercare i segni del compenso', () => {
  for (const id of ['refill', 'colorito', 'chiedi-sete']) {
    const az = AZIONI[id];
    assert.ok(az, `manca l'azione ${id}`);
    assert.ok(az.rileva, `${id}: deve rilevare qualcosa`);
    assert.ok(az.durata > 0 && az.durata <= 30, `${id}: deve costare poco tempo`);
  }
});

test('il refill è più veloce di una pressione: è per questo che si fa prima', () => {
  assert.ok(AZIONI.refill.durata < AZIONI['misura-pa'].durata);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test tests/azioni.test.mjs`
Expected: FAIL — `manca l'azione refill`

- [ ] **Step 3: Write the implementation**

In `assets/js/data/azioni.js`, nella categoria `valutazione`, aggiungere:

```js
  {
    id: 'refill', cat: 'valutazione', label: 'Test del riempimento capillare',
    durata: 15, chi: ['tu'], rileva: 'refill',
    /* Quindici secondi per un segno che arriva molto prima che la
       pressione si muova. Si preme sull'unghia cinque secondi tenendo
       la mano più in alto del cuore, e si conta quanto ci mette a
       tornare il colore. Normale sotto i due secondi — Bolognin :6489. */
    spiega: 'Sopra i due secondi la periferia è vasocostretta: il paziente sta compensando, anche se la pressione è ancora buona.',
  },
  {
    id: 'colorito', cat: 'valutazione', label: 'Guarda il colorito e tocca la cute',
    durata: 10, chi: ['tu'], rileva: 'cute',
    spiega: 'Pallore, cute fredda e sudorazione algida sono vasocostrizione: il sangue viene tolto alla pelle per darlo agli organi nobili.',
  },
  {
    id: 'chiedi-sete', cat: 'valutazione', label: 'Chiedigli se ha sete',
    durata: 10, chi: ['tu'], rileva: 'sete',
    spiega: 'Il senso di sete è un segno di shock che il paziente riferisce da solo, se glielo chiedi.',
  },
```

Poi, in `assets/js/core/sim-engine.js`, dentro `valoreGrezzo`, aggiungere le tre
grandezze nuove subito dopo la riga `if (chiave === 'polso') …`:

```js
    if (chiave === 'refill') return `${s.refill} s`;
    if (chiave === 'cute') return ({
      normale: 'normale', pallida: 'pallida',
      'pallida-fredda-sudata': 'pallida, fredda, sudata',
    })[s.cute] || s.cute;
    if (chiave === 'sete') return s.sete ? 'ha sete' : 'no';
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test tests/*.test.mjs`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add assets/js/data/azioni.js assets/js/core/sim-engine.js tests/azioni.test.mjs
git commit -m "feat(azioni): refill, colorito e sete — i segni si cercano"
```

---

## Task 15: Prova nel browser e rilascio

I test coprono la logica. Il resto si prova davvero, a larghezza telefono.

**Files:**
- Modify: `assets/js/versione.js`
- Modify: `sw.js:11`

- [ ] **Step 1: Avviare il server e provare i due casi**

```bash
python3 -m http.server 8925
```

Aprire `http://localhost:8925/index.html#intervento` **a larghezza telefono**
(400px). Per ognuno dei due casi verificare che:

- all'arrivo i parametri siano plausibili e coerenti col racconto del colpo d'occhio;
- il refill e il colorito diano un quadro **peggiore** di quello che dice il monitor;
- lasciando passare il tempo senza fare niente il paziente arrivi all'arresto;
- nello `shock-v3` la frequenza **non** salga (betabloccante) mentre la cute peggiora;
- nel `toracico-v3` l'arresto sia in FV e il DAE proponga la scarica;
- le tessere dei parametri non si rompano coi valori lunghi — c'è l'attributo
  `data-lungo` con gli scalini di font-size, va usato.

Controllare la console: non devono esserci errori.

- [ ] **Step 2: Alzare il numero di versione**

In `assets/js/versione.js`:

```js
export const VERSIONE = '1.7.0';
export const DATA_VERSIONE = '<la data di oggi>';
```

e come prima riga di `NOVITA`:

```js
  { v: '1.7.0', t: 'Il paziente ha una fisiologia. Non peggiora più a ritmo fisso: compensa finché può — la pressione tiene mentre la cute impallidisce e il refill si allunga — e poi scompensa. Se nessuno interviene arriva all\'arresto, e il ritmo con cui si ferma dipende dal perché si è fermato. I segni del compenso non compaiono da soli: vanno cercati.' },
```

In `sw.js` riga 11:

```js
const CACHE = 'consoletssa-1.7.0';
```

- [ ] **Step 3: Verificare che i test siano ancora tutti verdi**

Run: `node --test tests/*.test.mjs`
Expected: PASS, nessun fallimento

- [ ] **Step 4: Commit e pubblicazione**

```bash
git add -A
git commit -m "feat: il paziente ha una fisiologia, e può morire"
git push origin HEAD
```

- [ ] **Step 5: Verificare la pubblicazione**

```bash
curl -s "https://g3ggy.github.io/consoletssa/assets/js/versione.js?x=$RANDOM" | grep VERSIONE
```

Expected: `export const VERSIONE = '1.7.0';`

GitHub Pages ci mette un minuto o due: se esce ancora la versione vecchia,
riprovare. Verificare anche che `sw.js` pubblicato riporti la stessa versione,
altrimenti si finisce con versioni mescolate in cache.

---

## Cosa questo piano NON fa, di proposito

La specifica disegna anche **la forma dei dati dell'anamnesi** (sezione 7). Qui
non si realizza: aggiungere adesso un blocco `anamnesi` ai casi vorrebbe dire
scrivere dati che nessuno legge. La forma è ferma e documentata nella specifica,
e i casi la accoglieranno quando ci sarà il comportamento che la usa.

L'unico pezzo di quella giuntura che entra qui è `modificatori.terapia`, perché
serve già alla fisiologia: `shock-v3` nasce col betabloccante attivo. Oggi il
soccorritore non ha modo di scoprirlo — lo avrà con l'anamnesi, ed è esattamente
la ragione per cui quel lavoro viene subito dopo questo.

## Dopo questo piano

Nell'ordine, e ognuno con la sua specifica:

1. **Anamnesi a domande** — la forma dei dati è già disegnata nella specifica di
   questo lavoro; manca il comportamento. È lì che il betabloccante di
   `shock-v3` si scopre facendo la domanda giusta.
2. **I dieci scenari legacy** sul formato 3 — e con quelli muore il motore
   vecchio a otto passi, e `modules/simulazioni.js` si butta invece di spezzarlo.
3. **Le cinque offese del secondo giro** — servono per cocaina, ictus,
   schiacciamento.
4. **BLS-D e triage** — moduli a sé, fonti già pronte in `tmp/testi/FONTI.md`.

## Le due lacune di fonte

Sono marcate nel codice e vanno riviste se arriva il manuale giusto:

- **`SOGLIE_PERDITA` in `fisiologia.js`** — le soglie 15/30/40% dell'adulto sono
  assunzione nostra. Il Bolognin dà solo il 25% pediatrico (:7636). Servirebbe il
  **PTC Base completo**: quello in `tmp/` è la sola integrazione COVID 2020.
- **`CALO_CON_RCP` in `fisiologia.js`** — di quanto la rianimazione appiattisca
  la curva. Il calo *senza* RCP è delle linee guida (ERC 2025 cap. 4 :961), quello
  con la RCP no. Da cercare nel capitolo 3.
