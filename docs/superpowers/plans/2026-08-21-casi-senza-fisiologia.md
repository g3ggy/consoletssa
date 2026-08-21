# I casi senza fisiologia — piano di realizzazione

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Portare `ictus` e `sincope` sul motore a tempo, dove i parametri
non peggiorano e il prezzo dell'errore è fisico dove esiste (la sincope che
risviene) e informativo dove il fisico non c'è (il tempo bruciato e il
ragguaglio che non sei in grado di dare).

**Architecture:** Un modulo nuovo di logica pura, `core/ragguaglio.js`, che
confronta le voci del ragguaglio modello con quello che hai davvero
raccolto. Due chiavi facoltative nel formato dei casi — `esordio` e
`ragguaglioVoci` — lette dalla pagella. Un'azione nuova nel catalogo. E i
due casi, che non dichiarano nessuna offesa.

**Tech Stack:** JavaScript, moduli ES nativi, nessuna dipendenza, nessun
passo di build. Test con `node --test`.

**Specifica:** `docs/superpowers/specs/2026-08-21-casi-senza-fisiologia-design.md`

---

## Prima di cominciare

Leggere `CLAUDE.md` alla radice. In sintesi:

- **Niente build.** Moduli ES nativi. Se serve compilare, è la strada sbagliata.
- **Tutto in italiano**: nomi, commenti, testi. I commenti dicono *perché*.
- **Immutabilità**: oggetti nuovi, non mutazione in-place.
- **File piccoli**: 200-400 righe tipiche, 800 il massimo.
- **I testi clinici vengono dai manuali.** Le fonti di questo lavoro stanno
  in `tmp/testi/Manuale-TSSA-2022_cW6HYJE.txt` alle righe indicate nella
  specifica. Se `tmp/testi/` è vuoto si riestrae col comando in cima a
  `tmp/testi/FONTI.md`.

```bash
node --test tests/*.test.mjs      # i test
python3 -m http.server 8925       # il server locale, per provare nel browser
```

## Due trappole già pagate durante la calibrazione

Chi esegue questo piano le incontrerà. Sono scritte qui per non ripagarle.

**1 · `base.glicemia` e `base.spo2` non si vedono.** Nel formato 3 la
glicemia e la saturazione mostrate **escono dalle riserve**, non dalla
base: `parametriVisibili` fa `glicemia: Math.round(riserve.glicemia)` e
`spo2 = riserve.ossigenazione * 100`. Un caso che scrive `base.glicemia:
118` e non tocca le riserve mostra 90, che è il valore di
`RISERVE_ADULTO`. Vanno dichiarate **nelle riserve**.

**2 · Due test generici danno per scontato che ogni paziente peggiori.**
`i casi di formato 3 dichiarano offese, non derive` pretende
`offese.length > 0`, e `senza fare nulla il paziente peggiora` pretende
`esitoPaziente` fra `peggiorato` e `morto`. Questi due casi non peggiorano
per definizione. Il Task 5 li allenta **prima** di scrivere i casi: farlo
dopo significa lavorare con la suite rossa.

## Struttura dei file

| File | Responsabilità |
|---|---|
| `assets/js/core/ragguaglio.js` | **nuovo.** Confronta le voci del ragguaglio con quello che hai. Logica pura. |
| `assets/js/data/azioni.js` | **modificato.** L'azione `esame-neurologico`. |
| `assets/js/core/sim-engine.js` | **modificato.** `esordio` e `ragguaglio` nella pagella. |
| `assets/js/data/casi.js` | **modificato.** `sincope-v3` e `ictus-v3`. |
| `assets/js/modules/intervento.js` | **modificato.** Due riquadri nel debriefing. |
| `assets/css/intervento.css` | **modificato.** Il conto del tempo e le voci del ragguaglio. |
| `assets/js/data/scenari.js` | **modificato.** Via i due doppioni. |
| `assets/js/data/scenari-arrivo.js` | **modificato.** Via le due voci orfane. |
| `tests/ragguaglio.test.mjs` | **nuovo.** |

---

## Task 1: Il confronto del ragguaglio

**Files:**
- Create: `assets/js/core/ragguaglio.js`
- Test: `tests/ragguaglio.test.mjs`

- [ ] **Step 1: Write the failing test**

Create `tests/ragguaglio.test.mjs`:

```js
/* Collaudo del confronto del ragguaglio: logica pura, gira in Node.
   Esecuzione: node --test tests/ */

import test from 'node:test';
import assert from 'node:assert/strict';

import { revisioneRagguaglio } from '../assets/js/core/ragguaglio.js';

const CASO = {
  ragguaglioVoci: [
    { t: 'Donna di 71 anni, ipertesa in terapia', da: 'domanda:patologie' },
    { t: 'Vista bene alle 9:40', da: 'sapere:esordio-9-40' },
    { t: 'Emiparesi destra', da: 'azione:esame-neurologico' },
    { t: 'PA 178/95', da: 'lettura:pa' },
    { t: 'Trasportata con preallerta' },
  ],
};

const vuoto = { fatte: [], saputo: {}, letture: {} };

test('senza aver fatto niente, solo la voce che non dipende da niente è tua', () => {
  const r = revisioneRagguaglio(CASO, vuoto);
  assert.equal(r.totale, 5);
  assert.equal(r.tue, 1);
  assert.equal(r.voci[4].tuo, true, 'una voce senza `da` è sempre tua');
  assert.equal(r.voci[0].tuo, false);
});

test('l\'azione si cerca fra le cose fatte, col suo id nudo', () => {
  const r = revisioneRagguaglio(CASO, { ...vuoto, fatte: [{ id: 'esame-neurologico', chi: 'tu', t: 60 }] });
  assert.equal(r.voci[2].tuo, true);
  assert.equal(r.voci[0].tuo, false, 'la domanda non l\'ha fatta');
});

test('la domanda si cerca col prefisso, come la registra il motore', () => {
  const r = revisioneRagguaglio(CASO, { ...vuoto, fatte: [{ id: 'domanda:patologie', chi: 'tu', t: 40 }] });
  assert.equal(r.voci[0].tuo, true);
});

test('quello che hai saputo vale solo se qualcuno te l\'ha rivelato', () => {
  const senza = revisioneRagguaglio(CASO, { ...vuoto, saputo: { 'altra-cosa': { da: 'marito', t: 10 } } });
  assert.equal(senza.voci[1].tuo, false);
  const con = revisioneRagguaglio(CASO, { ...vuoto, saputo: { 'esordio-9-40': { da: 'marito', t: 10 } } });
  assert.equal(con.voci[1].tuo, true);
});

test('una lettura vale anche se è vecchia: l\'hai comunque rilevata', () => {
  const r = revisioneRagguaglio(CASO, { ...vuoto, letture: { pa: { t: 30, val: '178/95' } } });
  assert.equal(r.voci[3].tuo, true);
});

test('un caso che non dichiara le voci non rompe niente', () => {
  const r = revisioneRagguaglio({}, vuoto);
  assert.deepEqual(r.voci, []);
  assert.equal(r.totale, 0);
  assert.equal(r.tue, 0);
});

test('si può chiamare senza dati, e non esplode', () => {
  assert.doesNotThrow(() => revisioneRagguaglio(CASO));
  assert.equal(revisioneRagguaglio(CASO).tue, 1);
});

test('un prefisso che nessuno conosce non vale come fatto', () => {
  const r = revisioneRagguaglio({ ragguaglioVoci: [{ t: 'x', da: 'fantasia:cosa' }] }, vuoto);
  assert.equal(r.voci[0].tuo, false);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test tests/ragguaglio.test.mjs`
Expected: FAIL — `Cannot find module '../assets/js/core/ragguaglio.js'`

- [ ] **Step 3: Write the minimal implementation**

Create `assets/js/core/ragguaglio.js`:

```js
/* =====================================================================
   ragguaglio.js — quello che il ragguaglio dice, e quello che tu hai.

   Logica pura: nessun DOM, nessun orologio. Si collauda con
   `node --test tests/`.

   Il ragguaglio scritto nel caso è un modello: dice come si parla al
   Pronto Soccorso, e lo dice uguale a chi ha lavorato bene e a chi non
   ha fatto niente. Qui il caso dichiara anche le VOCI di quel modello,
   ognuna con la condizione che la rende davvero tua, e il debriefing
   può mostrare la differenza.

   Non si compone niente in prosa: comporre italiano corretto da dati
   sparsi è un lavoro a sé e suona finto. Si confronta e basta.
   ===================================================================== */

/* Le quattro provenienze di una voce. Sono tre fonti, non quattro:
   `azione` e `domanda` guardano nello stesso elenco delle cose fatte,
   ma con l'id scritto come il motore lo registra — le domande ci
   entrano già col loro prefisso. */
const FONTI = {
  azione: (chiave, d) => d.fatte.some((f) => f.id === chiave),
  domanda: (chiave, d) => d.fatte.some((f) => f.id === `domanda:${chiave}`),
  sapere: (chiave, d) => Boolean(d.saputo[chiave]),
  /* Una lettura vecchia vale: l'hai rilevata, e quel numero lo puoi
     dire. Che sia da rifare è un altro discorso, e lo dice la tessera. */
  lettura: (chiave, d) => d.letture[chiave] !== undefined,
};

function risolvi(da, dati) {
  const taglio = String(da).indexOf(':');
  if (taglio < 0) return false;
  const fonte = FONTI[String(da).slice(0, taglio)];
  return fonte ? fonte(String(da).slice(taglio + 1), dati) : false;
}

/**
 * Quali voci del ragguaglio modello sei davvero in grado di dire.
 *
 * @param {object} caso
 * @param {object} dati  { fatte, saputo, letture } — come li tiene il motore
 * @returns {{voci: {t: string, da: string|null, tuo: boolean}[], tue: number, totale: number}}
 */
export function revisioneRagguaglio(caso, dati = {}) {
  const d = { fatte: [], saputo: {}, letture: {}, ...dati };
  const voci = (caso?.ragguaglioVoci || []).map((v) => ({
    t: v.t,
    da: v.da || null,
    /* Una voce senza `da` non dipende da niente che tu abbia fatto:
       «trasportata con preallerta» è vera perché l'hai trasportata. */
    tuo: v.da ? risolvi(v.da, d) : true,
  }));
  return { voci, tue: voci.filter((v) => v.tuo).length, totale: voci.length };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --test tests/ragguaglio.test.mjs`
Expected: PASS, 8 test

- [ ] **Step 5: Commit**

```bash
git add assets/js/core/ragguaglio.js tests/ragguaglio.test.mjs
git commit -m "feat(ragguaglio): il confronto fra quello che il modello dice e quello che hai"
```

---

## Task 2: L'esame neurologico

**Files:**
- Modify: `assets/js/data/azioni.js`
- Test: `tests/azioni.test.mjs`

- [ ] **Step 1: Write the failing test**

Append to `tests/azioni.test.mjs`:

```js
test('c\'è l\'esame neurologico, e si può rifare', () => {
  const az = AZIONI['esame-neurologico'];
  assert.ok(az, 'manca l\'azione esame-neurologico');
  assert.equal(az.cat, 'D', 'sta in D, con la coscienza');
  assert.ok(az.durata > 0 && az.durata <= 60);
  assert.ok(az.chi.includes('tu'));
  assert.ok(!az.unaVolta, 'in viaggio si ricontrolla: non è una sola volta');
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test tests/azioni.test.mjs`
Expected: FAIL — `manca l'azione esame-neurologico`

- [ ] **Step 3: Write the implementation**

In `assets/js/data/azioni.js`, **subito prima** della voce `misura-glicemia`
(cercare la riga `id: 'misura-glicemia', cat: 'D',`), inserire:

```js
  {
    /* I tre segni sono quelli del Bolognin :4112-4125: far sorridere o
       mostrare i denti, far tenere le braccia estese dieci secondi a
       occhi chiusi, far ripetere una frase. «L'alterazione di ciascuno
       dei tre segni è fortemente suggestiva per un ictus.» In inglese
       lo stesso schema è il FAST, dove la T sta per Time.

       Il catalogo dice cosa fai; cosa trovi lo dice il caso con
       `diarioAzioni`, perché il deficit è di questo paziente e non
       della fisiologia. Non è `unaVolta`: in viaggio si ricontrolla. */
    id: 'esame-neurologico', cat: 'D', label: 'Esame neurologico rapido',
    durata: 30, chi: ['tu'],
    diario: 'Le chiedi di sorridere, di tenere le braccia avanti a occhi chiusi, di ripetere una frase.',
    spiega: 'Faccia, braccia, linguaggio. Basta che uno dei tre sia alterato. E serve anche a escludere: l\'ipoglicemia imita l\'ictus in tutto.',
  },
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test tests/*.test.mjs`
Expected: PASS, tutti

- [ ] **Step 5: Commit**

```bash
git add assets/js/data/azioni.js tests/azioni.test.mjs
git commit -m "feat(azioni): l'esame neurologico rapido, coi tre segni del manuale"
```

---

## Task 3: Il conto del tempo dall'esordio

**Files:**
- Modify: `assets/js/core/sim-engine.js` (dentro `pagella()`)
- Test: `tests/sim-engine.test.mjs`

- [ ] **Step 1: Write the failing test**

Append to `tests/sim-engine.test.mjs`:

```js
/* ============= il tempo dall'esordio ================================ */

test('un caso che dichiara l\'esordio porta il conto nella pagella', () => {
  const i = avvia({ ...casoConAnamnesi(), esordio: 35 });
  i.avanza(120);
  const p = i.chiudi();
  assert.equal(p.esordio.primaDiVoi, 35 * 60, 'i minuti dichiarati, in secondi');
  assert.equal(p.esordio.vostro, 120, 'quanto ci avete messo voi');
  assert.equal(p.esordio.allaPartenza, 35 * 60 + 120, 'la somma è quello che porti in ospedale');
});

test('un caso che non lo dichiara non ha il conto, e non rompe', () => {
  const i = avvia(casoConAnamnesi());
  const p = i.chiudi();
  assert.equal(p.esordio, null);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test tests/sim-engine.test.mjs`
Expected: FAIL — `Cannot read properties of undefined (reading 'primaDiVoi')`

- [ ] **Step 3: Write the implementation**

In `assets/js/core/sim-engine.js`, dentro `pagella()`, nell'oggetto
restituito, **subito dopo** la riga `anamnesi: revisioneAnamnesi(caso, raccolte),`
aggiungere:

```js
      /* Il tempo dall'esordio, per i casi in cui il tempo è la terapia.
         Il viaggio non lo sappiamo e non lo inventiamo: il conto si
         ferma a quando la squadra parte, che è l'unico pezzo che
         dipende da lei. */
      esordio: typeof caso.esordio === 'number'
        ? {
          primaDiVoi: caso.esordio * 60,
          vostro: t,
          allaPartenza: caso.esordio * 60 + t,
        }
        : null,
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test tests/*.test.mjs`
Expected: PASS, tutti

- [ ] **Step 5: Commit**

```bash
git add assets/js/core/sim-engine.js tests/sim-engine.test.mjs
git commit -m "feat(sim): il conto del tempo dall'esordio nella pagella"
```

---

## Task 4: Il ragguaglio nella pagella

**Files:**
- Modify: `assets/js/core/sim-engine.js`
- Test: `tests/sim-engine.test.mjs`

- [ ] **Step 1: Write the failing test**

Append to `tests/sim-engine.test.mjs`:

```js
/* ============= il ragguaglio a confronto ============================ */

function casoConRagguaglio() {
  return {
    ...casoConAnamnesi(),
    ragguaglioVoci: [
      { t: 'Prende il Cardicor', da: 'sapere:betabloccante' },
      { t: 'Glicemia rilevata', da: 'lettura:glicemia' },
      { t: 'Trasportato', da: 'azione:misura-pa' },
      { t: 'Uomo adulto' },
    ],
  };
}

test('chi non fa niente ha solo la voce che non dipende da niente', () => {
  const i = avvia(casoConRagguaglio());
  const p = i.chiudi();
  assert.equal(p.ragguaglio.totale, 4);
  assert.equal(p.ragguaglio.tue, 1);
});

test('quello che raccogli si vede nel confronto', () => {
  const i = avvia(casoConRagguaglio());
  i.rivolgitiA('moglie');
  i.chiedi('terapia');                 // rivela 'betabloccante'
  i.esegui('misura-glicemia', 'tu');   // lettura glicemia
  i.esegui('misura-pa', 'tu');         // azione misura-pa
  const p = i.chiudi();
  assert.equal(p.ragguaglio.tue, 4, 'adesso il ragguaglio è tutto tuo');
});

test('un caso senza voci ha un confronto vuoto, non un errore', () => {
  const i = avvia(casoConAnamnesi());
  const p = i.chiudi();
  assert.equal(p.ragguaglio.totale, 0);
  assert.deepEqual(p.ragguaglio.voci, []);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test tests/sim-engine.test.mjs`
Expected: FAIL — `Cannot read properties of undefined (reading 'totale')`

- [ ] **Step 3: Write the implementation**

In `assets/js/core/sim-engine.js`, aggiungere l'import subito sotto quello
di `anamnesi.js`:

```js
import { revisioneRagguaglio } from './ragguaglio.js';
```

Poi, dentro `pagella()`, nell'oggetto restituito, **subito dopo** il blocco
`esordio: ...` aggiunto nel Task 3:

```js
      /* Il ragguaglio scritto nel caso resta e si legge com'è: serve a
         sapere come si dice. Questo è quanto di quel testo sei in grado
         di sostenere davvero. */
      ragguaglio: revisioneRagguaglio(caso, { fatte, saputo, letture }),
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test tests/*.test.mjs`
Expected: PASS, tutti

- [ ] **Step 5: Commit**

```bash
git add assets/js/core/sim-engine.js tests/sim-engine.test.mjs
git commit -m "feat(sim): la pagella dice quanto del ragguaglio sai sostenere"
```

---

## Task 5: Ammettere il paziente che non peggiora

Va fatto **prima** di scrivere i due casi: sono i test generici su tutti
gli scenari, e senza questo passo il Task 6 nasce con la suite rossa.

**Files:**
- Modify: `tests/casi.test.mjs`

- [ ] **Step 1: Sostituire i due controlli**

In `tests/casi.test.mjs`, **sostituire** la riga

```js
    assert.ok(c.fisiologia.offese?.length, `${c.id}: nessuna offesa dichiarata`);
```

con

```js
    /* Un caso di formato 3 dichiara il blocco `fisiologia`, non per
       forza un'offesa: l'ictus non ha niente che consuma riserve, e un
       paziente che non peggiora è legittimo. */
    assert.ok(Array.isArray(c.fisiologia.offese), `${c.id}: le offese devono essere un elenco, anche vuoto`);
```

E **sostituire per intero** il test `senza fare nulla il paziente peggiora, e nessun caso esplode` con:

```js
/* Un caso senza offese non ha niente che consumi le riserve: il paziente
   resta com'è, e deve restarci senza che il motore inventi nulla. */
const puoPeggiorare = (c) => c.motore !== 3 || (c.fisiologia.offese || []).length > 0;

test('senza fare nulla il paziente peggiora, e nessun caso esplode', () => {
  CASI.forEach((c) => {
    const i = avvia(c);
    for (let giro = 0; giro < 20; giro += 1) {
      i.avanza(60);
      rispondiSeServe(i);
    }
    const p = i.chiudi();
    if (puoPeggiorare(c)) {
      assert.ok(['peggiorato', 'morto'].includes(p.esitoPaziente),
        `${c.id}: senza far nulla dovrebbe peggiorare, invece è ${p.esitoPaziente}`);
    } else {
      assert.equal(p.esitoPaziente, 'stabile',
        `${c.id}: non ha offese, quindi non deve peggiorare da solo`);
    }
    assert.equal(p.punti, 0, `${c.id}: senza far nulla il punteggio deve essere zero`);
  });
});
```

- [ ] **Step 2: Run the tests to verify nothing broke**

Run: `node --test tests/*.test.mjs`
Expected: PASS, tutti. I quattro casi che ci sono adesso hanno tutti
almeno un'offesa, quindi passano dal ramo `puoPeggiorare`.

- [ ] **Step 3: Commit**

```bash
git add tests/casi.test.mjs
git commit -m "test(casi): un caso di formato 3 può non avere offese, e non peggiorare"
```

---

## Task 6: `sincope-v3`

**Files:**
- Modify: `assets/js/data/casi.js`
- Test: `tests/casi.test.mjs`

- [ ] **Step 1: Write the failing test**

Append to `tests/casi.test.mjs`:

```js
/* ==================== sincope-v3 ==================================== */

const sinc = () => CASI.find((c) => c.id === 'sincope-v3');

test('sincope-v3 arriva già ripresa, come dice la definizione', () => {
  const caso = sinc();
  assert.ok(caso, 'manca sincope-v3');
  const i = avvia(caso);
  /* «Un paziente ancora con alterazione della coscienza all'arrivo del
     mezzo non va mai considerato una sincope» — Bolognin :4314. */
  assert.equal(i.stato.coscienza, 'A');
  assert.equal(i.stato.pas, 90, 'ipotensione transitoria, non shock');
  assert.equal(i.stato.glicemia, 84, 'la glicemia va nelle riserve, non nella base');
  assert.equal(i.stato.spo2, 99);
});

test('supina resta bene anche se non fai niente', () => {
  const i = avvia(sinc());
  lasciaPassare(i, 15);
  assert.equal(i.stato.coscienza, 'A');
  assert.equal(i.chiudi().esitoPaziente, 'stabile');
});

test('se la tiri su risviene, e non per copione', () => {
  const i = avvia(sinc());
  assert.equal(i.stato.coscienza, 'A');
  i.esegui('posizione-seduta', 'tu');
  assert.ok(i.stato.pas < 75, `seduta la pressione cede: invece è ${i.stato.pas}`);
  assert.equal(i.stato.coscienza, 'V', 'ed è la seconda sincope che il manuale annuncia');
});

test('la posizione seduta è fra le dannose, col perché', () => {
  const caso = sinc();
  const d = caso.azioni.dannose.find((x) => x.id === 'posizione-seduta');
  assert.ok(d, 'la posizione seduta deve contare come errore');
  assert.match(d.perche, /supin|antishock|risven/i);
});

test('l\'impiegata sa quanto è durata, lei no', () => {
  const caso = sinc();
  assert.ok(caso.anamnesi.interlocutori.some((x) => x.id === 'impiegata'));
  const i = avvia(caso);
  i.rivolgitiA('impiegata');
  i.chiedi('evento');
  assert.ok(i.saputo['durata-breve'], 'chi ha visto sa quanto è durata');
});

test('le domande che escludono il quadro grave sono nel caso', () => {
  const caso = sinc();
  const disturbi = caso.anamnesi.risposte.disturbi.paziente;
  /* «La concomitanza con dolore toracico, dispnea, dolore addominale
     deve suggerire sempre una patologia maggiore» — Bolognin :4324. */
  assert.match(disturbi.t, /male|dolore|respir/i);
  assert.ok(disturbi.rivela?.includes('nessun-segno-grave'));
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test tests/casi.test.mjs`
Expected: FAIL — `manca sincope-v3`

- [ ] **Step 3: Write the implementation**

In `assets/js/data/casi.js`, **prima** della riga `];` che chiude
l'elenco `CASI` (quella subito sopra `export const CASI_INDICE`),
aggiungere:

```js
  /* ================================================================= */
  {
    id: 'sincope-v3',
    ecg: { pattern: 'normale' },
    titolo: 'Svenimento in coda alle poste',
    tipo: 'medico',
    difficolta: 1,
    motore: 3,
    capitoli: ['cap-28', 'cap-25'],

    dispatch: {
      codice: 'VERDE',
      testo: 'Donna di 24 anni svenuta mentre era in fila. Ora è cosciente.',
      luogo: 'Ufficio postale',
    },
    scena: {
      testo: 'Sala d\'attesa affollata e calda, persone intorno che guardano. Nessun rischio, ma serve spazio per lavorare.',
      sicura: true,
    },
    colpoOcchio: {
      testo: 'Sdraiata a terra, cosciente e orientata, pallida e sudata. Dice che le è già successo una volta al prelievo del sangue.',
      vitale: true,
    },

    fisiologia: {
      /* Il suo normale: ventiquattro anni, sportiva, nessuna patologia.
         La frequenza a 58 è ASSUNZIONE NOSTRA e copre una lacuna: il
         motore muove la frequenza col compenso e col dolore, mai verso
         il basso, quindi la bradicardia vagale del manuale non è
         modellabile e si dichiara come se fosse la sua di base. */
      base: { fc: 58, pas: 112, pad: 70, spo2: 99, fr: 14, glicemia: 84, temp: 36.3 },
      /* Il vago ha ancora la mano sul freno: il letto vascolare è
         allargato e la pressione sta bassa. Il sangue c'è tutto.
         Glicemia e ossigenazione stanno QUI e non nella base: è dalle
         riserve che escono i numeri che si vedono. */
      riserve: { volemia: 5000, tonoVascolare: 0.80, ossigenazione: 0.99, glicemia: 84 },
      /* Nessuna offesa: la sincope è già finita quando arrivate, e se
         il quadro peggiorasse non sarebbe più una sincope. */
      offese: [],
      modificatori: { eta: 24, terapia: [] },
    },

    anamnesi: {
      interlocutori: [{ id: 'impiegata', label: 'l\'impiegata' }],
      risposte: {
        /* Il «no» che ricevi è il reperto: è così che una sincope resta
           una sincope invece di essere qualcos'altro che non hai
           cercato (Bolognin :4324). */
        disturbi: {
          paziente: {
            t: '«Adesso solo un po\' di debolezza. Non ho male da nessuna parte, né al petto né alla pancia, e respiro bene.»',
            qualita: 'buona',
            rivela: ['nessun-segno-grave'],
          },
          impiegata: { t: '«Era bianca come un lenzuolo. Adesso ha già ripreso colore.»', qualita: 'buona' },
        },
        allergie: {
          paziente: { t: '«Nessuna.»', qualita: 'buona' },
        },
        terapia: {
          paziente: { t: '«Non prendo niente. E no, non sono incinta.»', qualita: 'buona' },
        },
        patologie: {
          paziente: { t: '«Niente. Mi era già successo una volta, al prelievo del sangue.»', qualita: 'buona', rivela: ['gia-successo'] },
        },
        'ultimo-pasto': {
          paziente: { t: '«Non ho fatto colazione, sono uscita di corsa.»', qualita: 'buona', rivela: ['digiuno'] },
        },
        evento: {
          paziente: {
            t: '«Ero in fila da venti minuti, faceva caldissimo. Mi è venuta la nausea e la vista si è chiusa.»',
            qualita: 'buona',
            rivela: ['prodromi', 'fattore-scatenante'],
          },
          impiegata: {
            t: '«È scivolata giù piano, non ha battuto la testa. Meno di un minuto ed era di nuovo con noi, lucida.»',
            qualita: 'buona',
            rivela: ['durata-breve', 'nessun-trauma'],
          },
        },
      },
    },

    eventi: [
      {
        id: 'vuole-alzarsi', t: 120,
        testo: 'Si tira su su un gomito: «Sto bene adesso, davvero. Posso alzarmi? Mi vergogno, mi guardano tutti».',
        decisione: {
          domanda: 'Cosa le dici?',
          opzioni: [
            {
              t: 'Le chiedo di restare giù ancora un po\', e faccio allontanare le persone',
              ok: true,
              w: 'Il manuale è esplicito: farla sedere o alzare adesso può farla risvenire. E il capannello è metà del suo imbarazzo.',
            },
            {
              t: 'La faccio sedere piano: se sta bene non ha senso tenerla a terra',
              ok: false,
              effetto: { tonoVascolare: -0.04 },
              w: 'È presto. Il tono vascolare non è ancora tornato, e tirarla su toglie il ritorno venoso che la sta tenendo cosciente.',
            },
          ],
        },
      },
      {
        id: 'colore', t: 300, se: (p) => p.coscienza === 'A',
        testo: 'Riprende colore in viso e comincia a fare domande su cosa è successo: è completamente tornata.',
      },
    ],

    arresto: { finestraRcp: 60 },

    soglie: [
      { id: 's-risviene', se: (p) => p.coscienza !== 'A', testo: 'Gli occhi le si rovesciano indietro e non risponde più: è svenuta un\'altra volta.' },
      { id: 's-caldo', se: (p) => p.tag.includes('antishock'), testo: 'Con le gambe sollevate il colorito migliora a vista d\'occhio.' },
    ],

    azioni: {
      necessarie: [
        { id: 'valuta-scena', entro: 60, peso: 2 },
        { id: 'allontana-curiosi', entro: 150, peso: 2 },
        { id: 'avpu', entro: 150, peso: 1 },
        { id: 'antishock', entro: 210, peso: 3 },
        { id: 'misura-glicemia', entro: 240, peso: 3 },
        { id: 'misura-pa', entro: 300, peso: 2 },
        { id: 'domanda:disturbi', entro: 360, peso: 3 },
        { id: 'domanda:evento', entro: 420, peso: 2 },
        { id: 'carica', entro: 600, peso: 2 },
      ],
      utili: ['dpi', 'rassicura', 'conta-fr', 'colorito', 'monitor', 'copri', 'domanda:ultimo-pasto', 'domanda:patologie'],
      dannose: [
        {
          id: 'posizione-seduta', penalita: 3,
          perche: 'Il manuale dice di mantenerla supina o in posizione antishock: farla sedere o alzare in piedi può provocare una ulteriore sincope (Bolognin :4322). Ed è esattamente quello che succede.',
        },
        {
          id: 'spinale',
          perche: 'È scivolata giù piano e non ha battuto la testa: l\'impiegata l\'ha visto. Tre minuti buttati e una ragazza spaventata.',
        },
      ],
    },

    chiave: 'Prodromi tipici — caldo, nausea, vista che si chiude — fattore scatenante evidente, ripresa completa in meno di un minuto: è una sincope vasovagale. Il vago fa l\'opposto dell\'adrenalina: bradicardia, ipotensione, nausea. E la glicemia si misura comunque.',
    trappola: 'Sincope vuol dire perdita di coscienza transitoria con risoluzione spontanea completa: se all\'arrivo il paziente è ancora alterato NON è una sincope, è un\'altra cosa e va cercata. L\'altra trappola è la fretta di rimetterla in piedi perché «sta bene»: il tono vascolare non è ancora tornato, e la fai svenire una seconda volta davanti a tutti.',
    ragguaglio: 'Donna di 24 anni, nessuna patologia nota, nessuna terapia, a digiuno. Sincope in ambiente caldo e affollato dopo venti minuti in piedi, con prodromi tipici e ripresa spontanea completa in meno di un minuto, testimoniata. Nessun trauma cranico. Nega dolore toracico, dispnea e dolore addominale. All\'arrivo vigile e orientata, PA 95/60, FC 52, glicemia 84. Mantenuta supina con arti inferiori sollevati.',
    ragguaglioVoci: [
      { t: 'Donna di 24 anni, nessuna patologia e nessuna terapia', da: 'domanda:patologie' },
      { t: 'A digiuno da ieri sera', da: 'sapere:digiuno' },
      { t: 'Prodromi tipici e venti minuti in piedi al caldo', da: 'sapere:prodromi' },
      { t: 'Ripresa spontanea completa in meno di un minuto, testimoniata', da: 'sapere:durata-breve' },
      { t: 'Nessun trauma cranico', da: 'sapere:nessun-trauma' },
      { t: 'Nega dolore toracico, dispnea e dolore addominale', da: 'sapere:nessun-segno-grave' },
      { t: 'PA 95/60', da: 'lettura:pa' },
      { t: 'Glicemia 84', da: 'lettura:glicemia' },
      { t: 'Mantenuta supina con arti inferiori sollevati', da: 'azione:antishock' },
    ],
  },
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test tests/*.test.mjs`
Expected: PASS, tutti.

Se `facendo le azioni necessarie il paziente non peggiora` fallisce
perché `domanda:disturbi` viene rifiutata, controllare che il test
generico chiami `i.chiedi('disturbi')` senza essersi girato altrove: la
risposta della paziente è scritta e vale.

- [ ] **Step 5: Commit**

```bash
git add assets/js/data/casi.js tests/casi.test.mjs
git commit -m "feat(casi): la sincope in coda alle poste, e la seconda che arriva se la tiri su"
```

---

## Task 7: `ictus-v3`

**Files:**
- Modify: `assets/js/data/casi.js`
- Test: `tests/casi.test.mjs`

- [ ] **Step 1: Write the failing test**

Append to `tests/casi.test.mjs`:

```js
/* ==================== ictus-v3 ====================================== */

const ict = () => CASI.find((c) => c.id === 'ictus-v3');

test('ictus-v3 ha i parametri quasi normali, e non peggiora', () => {
  const caso = ict();
  assert.ok(caso, 'manca ictus-v3');
  const i = avvia(caso);
  assert.equal(i.stato.pas, 178, 'l\'ipertensione in fase acuta è attesa');
  assert.equal(i.stato.fc, 88);
  assert.equal(i.stato.glicemia, 118, 'la glicemia va nelle riserve');
  assert.equal(i.stato.spo2, 96, 'e la saturazione pure');
  assert.equal(i.stato.coscienza, 'A');

  lasciaPassare(i, 20);
  assert.equal(i.stato.pas, 178, 'venti minuti dopo è tutto uguale: il danno corre in ospedale');
  assert.equal(i.stato.coscienza, 'A');
});

test('è afasica, non confusa: capisce e risponde giusto', () => {
  const caso = ict();
  const i = avvia(caso);
  const r = i.chiedi('disturbi');
  assert.equal(r.ok, true);
  assert.equal(r.risposta.ripiego, null, 'la coscienza è A: niente ripiego da confuso');
  assert.equal(r.risposta.qualita, 'buona', 'fatica a dirlo, ma quello che dice è giusto');
});

test('l\'ora la sa il marito, lei no', () => {
  const caso = ict();
  assert.ok(caso.anamnesi.interlocutori.some((x) => x.id === 'marito'));
  const i = avvia(caso);

  i.chiedi('evento');
  assert.deepEqual(i.saputo, {}, 'lei non è in grado di dirti l\'ora');

  i.rivolgitiA('marito');
  i.chiedi('evento');
  assert.ok(i.saputo['esordio-9-40'], 'lui l\'ha vista bene alle 9:40');
});

test('l\'esame neurologico trova i tre segni', () => {
  const caso = ict();
  assert.ok(caso.diarioAzioni?.['esame-neurologico'], 'il caso deve dire cosa trovi');
  const i = avvia(caso);
  i.esegui('esame-neurologico', 'tu');
  assert.ok(i.diario.some((r) => /braccio|sorrid|parola/i.test(r.testo)));
});

test('il conto del tempo parte da trentacinque minuti', () => {
  const i = avvia(ict());
  i.avanza(300);
  const p = i.chiudi();
  assert.equal(p.esordio.primaDiVoi, 2100);
  assert.equal(p.esordio.allaPartenza, 2100 + p.esordio.vostro);
});

test('senza chiedere l\'ora il ragguaglio non è tuo', () => {
  const i = avvia(ict());
  const p = i.chiudi();
  const ora = p.ragguaglio.voci.find((v) => /9:40|vista bene/i.test(v.t));
  assert.ok(ora, 'l\'ora deve essere una voce del ragguaglio');
  assert.equal(ora.tuo, false);
});

test('chiedendola al marito, quella voce diventa tua', () => {
  const i = avvia(ict());
  i.rivolgitiA('marito');
  i.chiedi('evento');
  const p = i.chiudi();
  const ora = p.ragguaglio.voci.find((v) => /9:40|vista bene/i.test(v.t));
  assert.equal(ora.tuo, true);
});

test('dare zucchero per bocca a un\'afasica è un errore', () => {
  const caso = ict();
  assert.ok(caso.azioni.dannose.some((d) => d.id === 'zucchero-os'));
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test tests/casi.test.mjs`
Expected: FAIL — `manca ictus-v3`

- [ ] **Step 3: Write the implementation**

In `assets/js/data/casi.js`, **prima** della riga `];` che chiude l'elenco
`CASI`, aggiungere:

```js
  /* ================================================================= */
  {
    id: 'ictus-v3',
    ecg: { pattern: 'normale' },
    titolo: 'Non parla bene e non muove il braccio',
    tipo: 'medico',
    difficolta: 1,
    motore: 3,
    capitoli: ['cap-22', 'cap-25'],

    dispatch: {
      codice: 'ROSSO',
      testo: 'Donna di 71 anni, "non parla bene e non muove il braccio destro".',
      luogo: 'Abitazione, cucina',
    },
    scena: {
      testo: 'Cucina ordinata, il marito vi apre e racconta con precisione. Nessun rischio.',
      sicura: true,
    },
    colpoOcchio: {
      testo: 'Seduta al tavolo, vigile, bocca asimmetrica, non solleva il braccio destro. Ti segue con gli occhi e capisce quello che le dici, ma fatica a rispondere.',
      vitale: true,
    },

    /* Trentacinque minuti dall'ultimo momento in cui è stata vista bene:
       le 9:40 riferite dal marito, e sono le 10:15. */
    esordio: 35,

    fisiologia: {
      /* La pressione a 178/95 è la sua di adesso, in fase acuta, e sul
         territorio non si abbassa: sta nella base perché è quello che
         ha, non qualcosa che sta peggiorando. */
      base: { fc: 88, pas: 178, pad: 95, spo2: 96, fr: 16, glicemia: 118, temp: 36.6 },
      /* Glicemia e ossigenazione stanno nelle riserve: è da lì che
         escono i numeri che si vedono, non dalla base. */
      riserve: { volemia: 5000, ossigenazione: 0.96, glicemia: 118 },
      /* Nessuna offesa, e non è una dimenticanza: il danno cerebrale
         non si consuma sul mezzo e la paziente non peggiora mentre
         siete lì. Quello che si consuma è la finestra del trattamento,
         e quella si vede nel conto del tempo. */
      offese: [],
      modificatori: { eta: 71, terapia: [] },
    },

    /* I tre segni del Bolognin :4112-4125, addosso a lei. */
    diarioAzioni: {
      'esame-neurologico': 'Il lato destro della bocca non si solleva quando le chiedi di sorridere. Chiude gli occhi e il braccio destro le cade dopo due secondi. Prova a ripetere la frase, non le viene la parola, e ti guarda scuotendo la testa. Tre segni su tre.',
    },

    anamnesi: {
      interlocutori: [{ id: 'marito', label: 'il marito' }],
      risposte: {
        /* Afasia produttiva: capisce e sa la risposta, ma le parole non
           escono. Le risposte sono BUONE — quello che dice è giusto —
           solo brevi e faticate. Chi la scambia per confusa sbaglia
           paziente, ed è la trappola dichiarata del caso. */
        disturbi: {
          paziente: { t: '«Il braccio… non va. E la… la bocca.»', qualita: 'buona', rivela: ['deficit-riferito'] },
          marito: { t: '«Non riesce a parlare bene e il braccio destro non lo alza. È cominciato tutto insieme.»', qualita: 'buona' },
        },
        allergie: {
          paziente: { t: '«No.»', qualita: 'buona' },
          marito: { t: '«Nessuna allergia.»', qualita: 'buona' },
        },
        terapia: {
          paziente: { t: '«La… quella per la… non mi viene.»', qualita: 'vaga' },
          marito: { t: '«Amlodipina, una la mattina. Solo quella.»', qualita: 'buona', rivela: ['amlodipina'] },
        },
        patologie: {
          paziente: { t: '«La pressione.»', qualita: 'buona' },
          marito: { t: '«Ha la pressione alta da anni, tenuta bene. Nient\'altro.»', qualita: 'buona', rivela: ['ipertensione'] },
        },
        'ultimo-pasto': {
          paziente: { t: '«Il caffè… stamattina.»', qualita: 'buona' },
          marito: { t: '«Ha fatto colazione alle otto.»', qualita: 'buona' },
        },
        /* Il dato che decide il trattamento, e non ce l'ha lei. */
        evento: {
          paziente: { t: 'Ti guarda, apre la bocca e non le esce la frase. Scuote la testa.', qualita: 'vaga' },
          marito: {
            t: '«L\'ho lasciata che stava benissimo alle nove e quaranta, sono sceso a prendere il pane. Sono tornato alle dieci e un quarto e l\'ho trovata così.»',
            qualita: 'buona',
            rivela: ['esordio-9-40'],
          },
        },
      },
    },

    eventi: [
      {
        id: 'parlano-di-lei', t: 180,
        testo: 'Il marito, a voce alta davanti a lei: «Ma capisce quello che diciamo? Secondo me non capisce più niente».',
        decisione: {
          domanda: 'Cosa fai?',
          opzioni: [
            {
              t: 'Mi rivolgo a lei e le spiego cosa stiamo facendo, poi rispondo a lui',
              ok: true,
              w: 'Afasia produttiva: capisce e sente tutto, non riesce a rispondere. Parlare di lei come se non ci fosse è una crudeltà, e le fa perdere fiducia proprio adesso.',
            },
            {
              t: 'Rispondo a lui e continuo a lavorare',
              ok: false,
              w: 'Lei ha sentito. L\'udito e la comprensione sono intatti: è il linguaggio in uscita che è rotto.',
            },
          ],
        },
      },
      {
        id: 'niente-cambia', t: 480,
        testo: 'Il quadro è identico a dieci minuti fa: la bocca storta, il braccio fermo. Non peggiora e non migliora — quello che si consuma non si vede da qui.',
      },
    ],

    arresto: { finestraRcp: 60 },

    soglie: [
      { id: 's-pressione', se: (p) => p.pas > 170, testo: 'La pressione resta alta: in fase acuta è attesa e sul territorio non si tocca.' },
    ],

    azioni: {
      necessarie: [
        { id: 'valuta-scena', entro: 60, peso: 1 },
        { id: 'avpu', entro: 120, peso: 1 },
        { id: 'esame-neurologico', entro: 180, peso: 4 },
        { id: 'misura-glicemia', entro: 240, peso: 3 },
        { id: 'domanda:evento', entro: 300, peso: 4 },
        { id: 'misura-pa', entro: 300, peso: 2 },
        { id: 'allerta-co', entro: 360, peso: 3 },
        { id: 'carica', entro: 480, peso: 3 },
      ],
      utili: ['dpi', 'rassicura', 'monitor', 'conta-fr', 'pupille', 'domanda:terapia', 'domanda:patologie', 'riferisci-infermiere'],
      dannose: [
        {
          id: 'zucchero-os', penalita: 3,
          perche: 'La glicemia è 118 e non c\'è niente da correggere. E a una paziente con un deficit neurologico acuto non si dà niente per bocca: la deglutizione può essere compromessa senza che si veda.',
        },
        {
          id: 'spinale',
          perche: 'Nessun trauma e nessuna caduta: il marito l\'ha trovata seduta al tavolo. Tre minuti di finestra bruciati.',
        },
      ],
    },

    chiave: 'L\'ora esatta dell\'ultimo momento in cui è stata vista bene è il dato che decide il trattamento in ospedale, e non ce l\'ha lei: ce l\'ha chi c\'era. Qui sono trentacinque minuti, la finestra è aperta, e ogni minuto che passi sulla scena è finestra che si chiude.',
    trappola: 'Afasia produttiva: capisce tutto e non riesce a rispondere. Non trattarla da confusa e non parlare di lei come se non ci fosse — l\'udito e la comprensione sono intatti. E misura la glicemia: l\'ipoglicemia imita l\'ictus in tutto, e la sola cosa che le distingue è quel numero.',
    ragguaglio: 'Donna di 71 anni, ipertesa in terapia con amlodipina. Ultimo momento in cui è stata vista bene: ore 9:40, riferito dal marito. Afasia produttiva ed emiparesi destra, tre segni su tre all\'esame neurologico. PA 178/95, FC 88, SpO₂ 96%, glicemia 118. Vigile e orientata. Trasportata con preallerta per sospetto ictus in finestra temporale.',
    ragguaglioVoci: [
      { t: 'Donna di 71 anni, ipertesa in terapia', da: 'sapere:ipertensione' },
      { t: 'In terapia con amlodipina', da: 'sapere:amlodipina' },
      { t: 'Vista bene l\'ultima volta alle 9:40, riferito dal marito', da: 'sapere:esordio-9-40' },
      { t: 'Afasia produttiva ed emiparesi destra, tre segni su tre', da: 'azione:esame-neurologico' },
      { t: 'PA 178/95', da: 'lettura:pa' },
      { t: 'Glicemia 118: non è un\'ipoglicemia', da: 'lettura:glicemia' },
      { t: 'Vigile e orientata', da: 'azione:avpu' },
      { t: 'Preallertata la centrale per sospetto ictus', da: 'azione:allerta-co' },
    ],
  },
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test tests/*.test.mjs`
Expected: PASS, tutti

- [ ] **Step 5: Commit**

```bash
git add assets/js/data/casi.js tests/casi.test.mjs
git commit -m "feat(casi): l'ictus, dove l'ora vale piu' di tutti i parametri"
```

---

## Task 8: I due riquadri nel debriefing

Da qui si lavora nel browser: i test coprono la logica, non i tocchi.

**Files:**
- Modify: `assets/js/modules/intervento.js` (dentro `mostraDebriefing`)
- Modify: `assets/css/intervento.css`

- [ ] **Step 1: Il conto del tempo**

In `assets/js/modules/intervento.js`, dentro `mostraDebriefing()`,
**subito dopo** il `el('div.dbox', …)` che contiene
`el('div.t', { text: 'come è andato il paziente' })` e il grafico,
inserire:

```js
    p.esordio ? el('div.dbox', {}, [
      el('div.t', { text: 'il tempo dall\'esordio' }),
      el('div.tempi', {}, [
        el('div', {}, [
          el('b', { text: formatSeconds(p.esordio.primaDiVoi) }),
          el('span', { text: 'già passati quando siete arrivati' }),
        ]),
        el('div', {}, [
          el('b', { text: formatSeconds(p.esordio.vostro) }),
          el('span', { text: 'spesi da voi sulla scena' }),
        ]),
        el('div.forte', {}, [
          el('b', { text: formatSeconds(p.esordio.allaPartenza) }),
          el('span', { text: 'dall\'esordio quando siete partiti' }),
        ]),
      ]),
    ]) : null,
```

- [ ] **Step 2: Il confronto del ragguaglio**

Sempre in `mostraDebriefing()`, **sostituire per intero** il blocco

```js
    el('div.dbox', {}, [
      el('div.t', { text: 'il ragguaglio, come lo diresti' }),
      el('p.handover', { style: { margin: '0' }, text: caso.ragguaglio }),
    ]),
```

con

```js
    el('div.dbox', {}, [
      el('div.t', { text: 'il ragguaglio, come lo diresti' }),
      el('p.handover', { style: { margin: '0' }, text: caso.ragguaglio }),

      /* Il modello dice come si parla; il confronto dice quanto di quel
         testo sei davvero in grado di sostenere. Le voci che non hai
         non sono un rimprovero sul testo: sono cose che in ospedale
         nessuno potrà più recuperare. */
      p.ragguaglio.totale ? el('div.rag-conf', {}, [
        el('div.lbl', {
          text: `di ${p.ragguaglio.totale} cose che il ragguaglio dice, ${p.ragguaglio.tue} le hai davvero`,
        }),
        ...p.ragguaglio.voci.map((v) => el(`div.rag-voce${v.tuo ? '.tua' : ''}`, {}, [
          el('span.m'),
          el('span', { text: v.t }),
        ])),
      ]) : null,
    ]),
```

- [ ] **Step 3: Lo stile**

In `assets/css/intervento.css`, in fondo, aggiungere:

```css
/* --- il conto del tempo dall'esordio --- */
.tempi { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1px; background: var(--line); }
.tempi > div { background: var(--surface-2); padding: 12px 10px; text-align: center; }
.tempi b { display: block; font-size: 22px; font-family: var(--mono); color: var(--ink-2); }
.tempi span { display: block; margin-top: 4px; font-size: 12px; line-height: 1.3; color: var(--ink-3); }
.tempi .forte b { color: var(--amber); }

/* --- il ragguaglio a confronto --- */
.rag-conf { margin-top: 16px; border-top: 1px solid var(--line); padding-top: 12px; }
.rag-conf .lbl {
  font-size: 12px; letter-spacing: .08em; text-transform: uppercase;
  color: var(--ink-3); margin-bottom: 10px;
}
.rag-voce { display: flex; align-items: flex-start; gap: 10px; padding: 5px 0; color: var(--ink-3); }
.rag-voce .m {
  flex: 0 0 auto; width: 8px; height: 8px; margin-top: 6px;
  border-radius: 50%; background: var(--amber);
}
.rag-voce.tua { color: var(--ink-2); }
.rag-voce.tua .m { background: var(--phos); }

@media (max-width: 700px) {
  .tempi { grid-template-columns: 1fr; }
  .tempi > div { display: flex; align-items: baseline; gap: 10px; text-align: left; }
  .tempi b { font-size: 18px; }
}
```

- [ ] **Step 4: Provare nel browser**

```bash
python3 -m http.server 8925
```

Aprire `http://localhost:8925/index.html#/intervento/ictus-v3` **a
larghezza telefono** (400 px) e verificare che:

- l'esame neurologico scriva nel diario i tre segni;
- chiedendo l'esordio **alla paziente** non si sappia l'ora, e chiedendolo
  al marito sì;
- consegnando senza aver chiesto l'ora, il riquadro «il ragguaglio, come
  lo diresti» mostri sotto la riga in ambra «Vista bene l'ultima volta
  alle 9:40…»;
- il conto del tempo mostri tre numeri e sul telefono si impili;
- non ci siano errori in console.

Poi `#/intervento/sincope-v3`: toccare «Posizione seduta o semiseduta» e
verificare che la coscienza passi a V e compaia la riga del diario «è
svenuta un'altra volta».

- [ ] **Step 5: Commit**

```bash
git add assets/js/modules/intervento.js assets/css/intervento.css
git commit -m "feat(intervento): il conto del tempo e il ragguaglio a confronto nel debriefing"
```

---

## Task 9: Via i doppioni dal motore vecchio

**Files:**
- Modify: `assets/js/data/scenari.js`
- Modify: `assets/js/data/scenari-arrivo.js`

- [ ] **Step 1: Togliere i due scenari**

In `assets/js/data/scenari.js`, cancellare per intero i due oggetti che
cominciano con `id: 'ictus',` e `id: 'sincope',` (dalla graffa aperta che
li precede fino alla riga `},` che li chiude).

In `assets/js/data/scenari-arrivo.js`, cancellare per intero le due voci
`ictus: { … },` e `sincope: { … },`, con il commento separatore
`/* ---- */` che le precede.

- [ ] **Step 2: Verificare gli elenchi**

Run:

```bash
node --input-type=module -e "
import { SCENARI } from './assets/js/data/scenari.js';
import { CASI } from './assets/js/data/casi.js';
console.log('a domande:', SCENARI.length, SCENARI.map(s=>s.id).join(', '));
console.log('in tempo :', CASI.length, CASI.map(c=>c.id).join(', '));
"
```

Expected:

```
a domande: 6 bpco, arresto, anticoagulante, anafilassi, cocaina, schiacciamento
in tempo : 6 shock-v3, toracico-v3, ipoglicemia-v3, incidente-v3, sincope-v3, ictus-v3
```

- [ ] **Step 3: Run the tests**

Run: `node --test tests/*.test.mjs`
Expected: PASS, tutti

- [ ] **Step 4: Provare la lista nel browser**

Aprire `http://localhost:8925/index.html#/simulazioni` e verificare che
in cima ci siano sei interventi in tempo simulato e che nessuno di loro
compaia anche nell'elenco «Scenari a domande» qui sotto.

- [ ] **Step 5: Commit**

```bash
git add assets/js/data/scenari.js assets/js/data/scenari-arrivo.js
git commit -m "chore(scenari): via ictus e sincope dal motore a domande, ora sono convertiti"
```

---

## Task 10: Prova completa e rilascio

**Files:**
- Modify: `assets/js/versione.js`
- Modify: `sw.js:11`

- [ ] **Step 1: Provare i due casi per intero**

Con `python3 -m http.server 8925`, a larghezza telefono (400 px):

- **`ictus-v3`**: farlo bene — scena, AVPU, esame neurologico, glicemia,
  la domanda dell'esordio **al marito**, pressione, preallerta, carica — e
  verificare che il confronto del ragguaglio esca tutto verde;
- rifarlo saltando l'esame neurologico e la domanda al marito, e
  verificare che quelle due righe escano in ambra;
- **`sincope-v3`**: farlo bene con l'antishock, e poi rifarlo toccando la
  posizione seduta per vedere la seconda sincope;
- le righe del confronto non sbordano sulle larghezze strette;
- la console è pulita.

- [ ] **Step 2: Verificare che i test siano tutti verdi**

Run: `node --test tests/*.test.mjs`
Expected: PASS, nessun fallimento

- [ ] **Step 3: Alzare il numero di versione**

In `assets/js/versione.js`:

```js
export const VERSIONE = '1.10.0';
export const DATA_VERSIONE = '<la data di oggi>';
```

e come prima riga di `NOVITA`:

```js
  { v: '1.10.0', t: 'Ictus e sincope passano al motore a tempo, e sono i primi due casi in cui i parametri stanno bene. Nella sincope il prezzo è fisico: la tiri su prima del tempo e sviene una seconda volta. Nell\'ictus è il tempo e l\'informazione — il debriefing conta i minuti dall\'esordio e ti dice quante delle cose che il ragguaglio dice sei davvero in grado di sostenere. E lei è afasica, non confusa: capisce tutto.' },
```

In `sw.js` riga 11:

```js
const CACHE = 'consoletssa-1.10.0';
```

- [ ] **Step 4: Commit e pubblicazione**

```bash
git add -A
git commit -m "feat: ictus e sincope, i due casi in cui i numeri stanno bene"
git push origin HEAD
```

- [ ] **Step 5: Verificare la pubblicazione**

```bash
curl -s "https://g3ggy.github.io/consoletssa/assets/js/versione.js?x=$RANDOM" | grep VERSIONE
curl -s "https://g3ggy.github.io/consoletssa/sw.js?x=$RANDOM" | grep CACHE
```

Expected: `1.10.0` in tutti e due. GitHub Pages ci mette un minuto o due.
Se i due file non si allineano si finisce con versioni mescolate in cache.

---

## Cosa questo piano NON fa, di proposito

- **Il ragguaglio generato in prosa.** Si confronta voce per voce. Le
  voci ci sono già, se un giorno servirà comporlo.
- **Una tessera per il reperto neurologico.** Il deficit sta nel diario.
  Ricontrollarlo in viaggio con un valore che invecchia è una decisione
  a sé.
- **La finestra terapeutica che si chiude.** Nessun intervento su questo
  banco dura quattro ore: insegnerebbe «tanto c'è tempo».
- **Il tono autonomo** come modificatore delle riserve. Serve alla
  bradicardia vagale di questo caso e alla tachicardia dell'ipoglicemico
  e del cocainomane: si progetta col gruppo A, dove serve a tre casi
  invece che a uno.
- **`ragguaglioVoci` sui quattro casi già scritti.** Chi non le dichiara
  non vede il riquadro, e va bene così: si aggiungono quando si tocca
  quel caso per altri motivi.

## Dopo questo piano

Restano sei scenari legacy, in due gruppi che hanno ognuno la propria
specifica da scrivere:

1. **Gruppo A** — cocaina, anafilassi, anticoagulante. Tre offese nuove
   sullo stampo di quelle che ci sono, più il tono autonomo.
2. **Gruppo B** — bpco, schiacciamento, arresto. Tre meccanismi che il
   motore non ha: un provvedimento che fa danno, un danno che arriva
   quando risolvi, un paziente che parte in arresto.

## Le assunzioni nostre, marcate nel codice

- **la frequenza a 58 della sincope**: la bradicardia vagale non è
  modellabile, il motore muove la frequenza col compenso e col dolore e
  mai verso il basso. Si dichiara come frequenza di base con un commento
  che dice perché, e si corregge quando arriverà il tono autonomo;
- **il tono vascolare a 0,80** della sincope: dà i 90/56 supina e i 72/45
  seduta che servono a far scattare la seconda sincope. Nessun manuale dà
  un numero per il tono vagale residuo.
