# La dotazione — piano di implementazione

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Portare nel banco i presidi veri dello zaino e dell'ambulanza con le loro misure — Guedel 0-5, sondini CH, agocannule, i cinque presidi dell'ossigeno — e far pesare il flusso attraverso la bombola che si consuma.

**Architecture:** Ogni misura è un'azione vera con il suo id, generata da una famiglia in `data/presidi.js` e sparsa nel catalogo di `azioni.js`. Il motore non impara niente di nuovo: un presidio sbagliato è un'azione non indicata, e `giudizio.js` la tratta come tratta tutto il resto. La palette raggruppa per famiglia e apre le misure in linea. La bombola è un modulo puro a parte, `core/bombola.js`, così `sim-engine.js` resta sotto le 800 righe.

**Tech Stack:** JavaScript ES modules nativi, nessun bundler, nessuna dipendenza. Test con `node --test`, solo logica pura.

**Specifica:** `docs/superpowers/specs/2026-08-22-dotazione-presidi-design.md`

---

## Come si lavora qui

```bash
# server locale (i moduli ES non partono da file://)
python3 -m http.server 8925

# tutti i test
node --test tests/*.test.mjs

# un file solo
node --test tests/presidi.test.mjs
```

Regole del progetto che valgono per ogni task:

- **tutto in italiano** — id, nomi, commenti, testi. I commenti dicono *perché*, non *cosa*: chi legge è un volontario che studia.
- **niente mutazioni**: si creano oggetti nuovi.
- **file piccoli**: 200-400 righe tipiche, 800 il massimo.
- **il contenuto clinico viene dai manuali.** Le righe `Bolognin :N` sono del testo estratto in `tmp/testi/Manuale-TSSA-2022_cW6HYJE.txt`, fuori da git. Dove la fonte non dice, si scrive `ASSUNZIONE NOSTRA` nel commento e nella `fonte`.

## I file

| file | cosa fa | task |
|---|---|---|
| `assets/js/data/presidi.js` | **nuovo** — le quattro famiglie e il generatore delle voci | 1 |
| `tests/presidi.test.mjs` | **nuovo** — che il generatore generi quello che deve | 1 |
| `assets/js/data/azioni.js` | toglie `cannula`, `aspira`, `accesso-prepara` e i tre `o2-*`; sparge le voci generate | 2 |
| `tests/azioni.test.mjs` | i tag attesi dell'ossigeno diventano cinque | 2 |
| `assets/js/data/casi.js` | i tre punti che nominavano `accesso-prepara` | 3 |
| `assets/js/data/indicazioni.js` | la regola di ogni misura, con la fonte | 4 |
| `assets/js/core/sim-engine.js` | `corporatura` nel contesto del giudizio; la bombola cablata | 4, 7 |
| `tests/giudizio.test.mjs` | che nessuna misura resti senza regola | 4 |
| `assets/js/modules/intervento.js` | la palette a famiglie | 5 |
| `assets/css/intervento.css` | le misure in linea | 5 |
| `assets/js/core/bombola.js` | **nuovo** — il conto dei litri, puro | 6 |
| `tests/bombola.test.mjs` | **nuovo** — contro l'esempio del manuale | 6 |
| `assets/js/core/pagella.js` | il riepilogo della bombola nella pagella | 7 |
| `assets/js/modules/debriefing.js` | il riquadro della bombola | 8 |
| `assets/js/versione.js`, `sw.js`, `CLAUDE.md`, `tmp/testi/FONTI.md` | la pubblicazione | 9 |

---

## Task 1: `data/presidi.js` — le famiglie

**Files:**
- Create: `assets/js/data/presidi.js`
- Test: `tests/presidi.test.mjs`

- [ ] **Step 1: Scrivi il test che fallisce**

Crea `tests/presidi.test.mjs`:

```js
/* Il generatore delle famiglie: se sbaglia qui, sbagliano tutte e
   ventidue le voci insieme. */

import test from 'node:test';
import assert from 'node:assert/strict';

import { VOCI_PRESIDI, FAMIGLIE_META, IDS } from '../assets/js/data/presidi.js';

test('ogni famiglia genera gli id che il resto del progetto nomina', () => {
  assert.deepEqual(IDS.guedel,
    ['cannula-0', 'cannula-1', 'cannula-2', 'cannula-3', 'cannula-4', 'cannula-5']);
  assert.deepEqual(IDS.sondino,
    ['sondino-6', 'sondino-10', 'sondino-16', 'sondino-18']);
  assert.deepEqual(IDS.ago,
    ['ago-14', 'ago-16', 'ago-18', 'ago-20']);
  assert.deepEqual(IDS.ossigeno,
    ['o2-occhialini', 'o2-maschera', 'o2-venturi', 'o2-reservoir', 'o2-nebulizzatore']);
});

test('le voci portano quello che il motore e la palette si aspettano', () => {
  assert.equal(VOCI_PRESIDI.length, 19);
  const ids = VOCI_PRESIDI.map((v) => v.id);
  assert.equal(new Set(ids).size, ids.length, 'ci sono id ripetuti');

  VOCI_PRESIDI.forEach((v) => {
    assert.ok(v.label, `${v.id}: manca l'etichetta`);
    assert.ok(v.cat, `${v.id}: manca la categoria`);
    assert.ok(FAMIGLIE_META[v.famiglia], `${v.id}: famiglia "${v.famiglia}" sconosciuta`);
    assert.ok(v.durata > 0, `${v.id}: durata non valida`);
    assert.ok(Array.isArray(v.chi) && v.chi.length, `${v.id}: nessun esecutore`);
    assert.ok(v.spiega && v.spiega.length > 20, `${v.id}: spiegazione troppo corta`);
    assert.ok(v.etichettaMisura, `${v.id}: la palette non ha niente da scrivere sul bottone`);
  });
});

test('ogni famiglia dice come si misura, e da dove viene', () => {
  Object.values(FAMIGLIE_META).forEach((f) => {
    assert.ok(f.label, 'famiglia senza etichetta');
    assert.ok(f.comeSiMisura && f.comeSiMisura.length > 20, `${f.id}: manca il come si misura`);
    assert.ok(f.fonteMisura, `${f.id}: il promemoria non porta la fonte`);
    assert.ok(f.ids.length >= 4, `${f.id}: famiglia troppo corta per essere una famiglia`);
  });
});

test('le Guedel portano il colore della check-list', () => {
  const attesi = ['nera', 'bianca', 'verde', 'gialla', 'rossa', 'arancione'];
  IDS.guedel.forEach((id, i) => {
    const v = VOCI_PRESIDI.find((x) => x.id === id);
    assert.match(v.etichettaMisura, new RegExp(attesi[i]), `${id}: colore sbagliato`);
    assert.ok(v.colore, `${id}: manca il colore da mettere sul bottone`);
  });
});

test('solo l\'ossigeno dichiara un flusso: è quello che consuma la bombola', () => {
  const conFlusso = VOCI_PRESIDI.filter((v) => v.flusso).map((v) => v.id);
  assert.deepEqual(conFlusso, IDS.ossigeno);
  VOCI_PRESIDI.filter((v) => v.flusso).forEach((v) => {
    assert.ok(v.flusso >= 2 && v.flusso <= 15, `${v.id}: flusso fuori scala`);
  });
});

test('una cannula sola: messa quella, le altre cinque non si possono più mettere', () => {
  const v = VOCI_PRESIDI.find((x) => x.id === 'cannula-3');
  const incosciente = { coscienza: 'U', tag: [] };
  assert.equal(v.richiede(incosciente, {}), true);
  assert.equal(v.richiede({ coscienza: 'U', tag: ['cannula'] }, {}), false);
  assert.equal(v.richiede({ coscienza: 'A', tag: [] }, {}), false);
});
```

- [ ] **Step 2: Esegui il test e verifica che fallisca**

Run: `node --test tests/presidi.test.mjs`
Expected: FAIL — `Cannot find module .../assets/js/data/presidi.js`

- [ ] **Step 3: Scrivi `assets/js/data/presidi.js`**

```js
/* =====================================================================
   presidi.js — i pezzi veri, con le loro misure.

   `azioni.js` dice cosa fai. Qui sta quale pezzo prendi in mano. Sul
   mezzo non esiste «la cannula orofaringea»: esistono sei cannule, ognuna
   con un numero e un colore, e infilare la 5 arancione a una donna minuta
   le spinge la lingua in gola invece di toglierla.

   Ogni misura diventa un'azione vera, con il suo id. Il motore non
   impara niente: un presidio sbagliato è un'azione non indicata, e paga
   il prezzo del superfluo — i suoi secondi — come tutto il resto.

   I nomi, i numeri e i colori vengono dalla check-list ARES 118 —
   allegato 1 «Zaino di soccorso ASI» e allegato 2 «Ambulanza
   infermieristica», IO.42 Rev.1 — che sta in `tmp/check-list
   ambulanza.pdf`, fuori da git. È una scansione: `pdftotext` non ne
   cava niente, si legge a schermo.
   ===================================================================== */

/* Le voci si generano dalla famiglia: le sei Guedel si scrivono una
   volta sola, non sei. Una misura può soprascrivere la durata — i
   presidi dell'ossigeno non si montano tutti nello stesso tempo. */
function vociDi(f) {
  return f.misure.map((m) => ({
    id: m.id,
    cat: f.cat,
    famiglia: f.id,
    misura: m.misura,
    etichettaMisura: m.etichetta,
    colore: m.colore || null,
    label: `${f.label} — ${m.etichetta}`,
    durata: m.durata ?? f.durata,
    chi: [...f.chi],
    diario: f.diario(m),
    spiega: m.spiega,
    ...(f.unaVolta ? { unaVolta: true } : {}),
    ...(f.richiede ? { richiede: f.richiede } : {}),
    ...(f.motivoBloccato ? { motivoBloccato: f.motivoBloccato } : {}),
    ...(f.applica ? { applica: f.applica } : {}),
    ...(m.flusso ? { flusso: m.flusso } : {}),
  }));
}

const FAMIGLIE = [
  /* ---------------------- A: la cannula di Guedel ------------------- */
  {
    id: 'guedel',
    cat: 'A',
    label: 'Cannula orofaringea',
    durata: 25,
    chi: ['tu'],
    /* Niente `unaVolta`: le voci sono sei e `unaVolta` vale per una sola
       di loro. Quello che serve è che dopo la prima non se ne metta
       un'altra, e lo dice il tag che la prima ha lasciato. */
    richiede: (p) => (p.coscienza === 'P' || p.coscienza === 'U') && !p.tag.includes('cannula'),
    motivoBloccato: (p) => (p.tag.includes('cannula')
      ? 'Una cannula è già in sede.'
      : 'Il paziente ha ancora il riflesso faringeo: la vomiterebbe.'),
    applica: () => ({ viePervie: true, tag: 'cannula' }),
    comeSiMisura: 'Dagli incisivi all\'angolo della mandibola, oppure dal lobo '
      + 'dell\'orecchio all\'angolo della bocca.',
    fonteMisura: 'Bolognin :5428 e :5938',
    diario: (m) => `Cannula orofaringea ${m.etichetta} inserita con la concavità in alto e ruotata di 180°.`,
    misure: [
      {
        id: 'cannula-0', misura: 0, etichetta: 'mis. 0 nera', colore: '#1b1b1b',
        spiega: 'La più corta: neonato e lattante. In un adulto non arriva nemmeno alla base della lingua.',
      },
      {
        id: 'cannula-1', misura: 1, etichetta: 'mis. 1 bianca', colore: '#e8e8e8',
        spiega: 'Bambino piccolo. Su un adulto resta corta: spinge la lingua invece di scavalcarla.',
      },
      {
        id: 'cannula-2', misura: 2, etichetta: 'mis. 2 verde', colore: '#2f9e44',
        spiega: 'L\'adulto minuto: donna di corporatura piccola, anziano magro, mandibola corta.',
      },
      {
        id: 'cannula-3', misura: 3, etichetta: 'mis. 3 gialla', colore: '#f0c000',
        spiega: 'La misura dell\'adulto medio, quella da cui si parte quando non hai modo di misurare.',
      },
      {
        id: 'cannula-4', misura: 4, etichetta: 'mis. 4 rossa', colore: '#d64545',
        spiega: 'L\'adulto robusto: collo grosso, mandibola grande, corporatura importante.',
      },
      {
        id: 'cannula-5', misura: 5, etichetta: 'mis. 5 arancione', colore: '#ef8b3a',
        spiega: 'La più lunga. Su un adulto medio supera la base della lingua e la spinge in gola.',
      },
    ],
  },

  /* ------------------- A: il sondino di aspirazione ----------------- */
  {
    id: 'sondino',
    cat: 'A',
    label: 'Aspira le secrezioni',
    durata: 40,
    chi: ['tu'],
    richiede: (p) => p.tag.includes('aspiratore-pronto'),
    motivoBloccato: 'L\'aspiratore non è ancora pronto.',
    applica: () => ({ viePervie: true, spo2: +2 }),
    comeSiMisura: 'Il calibro si sceglie sulle secrezioni e sulla corporatura; la '
      + 'lunghezza utile non supera la distanza fra il lobo dell\'orecchio e l\'angolo '
      + 'della mandibola. Mai più di dieci secondi di seguito.',
    fonteMisura: 'Bolognin :2852-2862',
    diario: (m) => `Cavo orale aspirato col sondino ${m.etichetta}, in uscita e a movimenti circolari.`,
    misure: [
      {
        id: 'sondino-6', misura: 6, etichetta: 'CH 6',
        spiega: 'Il più sottile, per il lattante. In un adulto si intasa al primo grumo.',
      },
      {
        id: 'sondino-10', misura: 10, etichetta: 'CH 10',
        spiega: 'Pediatrico. Sull\'adulto passa, ma le secrezioni dense non ci salgono.',
      },
      {
        id: 'sondino-16', misura: 16, etichetta: 'CH 16',
        spiega: 'Il calibro dell\'adulto: passa il vomito senza traumatizzare le mucose.',
      },
      {
        id: 'sondino-18', misura: 18, etichetta: 'CH 18',
        spiega: 'Adulto con secrezioni abbondanti o dense. Più grosso aspira di più e irrita di più.',
      },
    ],
  },

  /* ---------------------- B: i presidi dell'ossigeno ---------------- */
  {
    id: 'ossigeno',
    cat: 'B',
    label: 'Ossigeno',
    durata: 30,
    chi: ['tu', 'autista'],
    /* Qui `unaVolta` ci sta: ogni presidio si mette una volta, ma
       cambiarlo strada facendo è lecito — ed è anzi quello che si fa
       quando il paziente migliora o peggiora. */
    unaVolta: true,
    applica: () => ({ tag: 'o2' }),
    comeSiMisura: 'Il presidio si sceglie su quanto ossigeno serve, e ognuno ha il suo '
      + 'flusso: sotto i 4 l/min la maschera semplice fa rirespirare anidride carbonica, '
      + 'sopra i 12 il reservoir eroga il 100%.',
    fonteMisura: 'Bolognin :3251-3270',
    diario: (m) => `Ossigeno: ${m.etichetta}.`,
    misure: [
      {
        id: 'o2-occhialini', misura: 4, etichetta: 'occhialini, 2-4 l/min', flusso: 4,
        spiega: 'Massimo 4 l/min o si secca il naso: danno il 36%, e vanno a chi respira bene.',
      },
      {
        id: 'o2-maschera', misura: 8, etichetta: 'maschera semplice, 6-8 l/min', flusso: 8,
        spiega: 'Dal 35 al 60%. Mai sotto i 4 l/min: senza ricambio si accumula anidride carbonica.',
      },
      {
        id: 'o2-venturi', misura: 8, etichetta: 'maschera Venturi', flusso: 8, durata: 35,
        spiega: 'L\'ugello miscela aria e ossigeno a percentuale nota: è il presidio del BPCO, che con alte concentrazioni ipoventila.',
      },
      {
        id: 'o2-reservoir', misura: 15, etichetta: 'reservoir (BLB), 12-15 l/min', flusso: 15, durata: 40,
        spiega: 'Sopra i 12 l/min eroga il 100%. Il pallone va gonfio prima di mettere la maschera.',
      },
      {
        id: 'o2-nebulizzatore', misura: 8, etichetta: 'con nebulizzatore, 6-8 l/min', flusso: 8, durata: 40,
        spiega: 'La maschera che vaporizza il farmaco: la monti tu, la fiala la mette l\'infermiere.',
      },
    ],
  },

  /* ------------------ C: l'agocannula per l'infermiere -------------- */
  {
    id: 'ago',
    cat: 'C',
    label: 'Prepara il materiale per l\'accesso venoso',
    durata: 45,
    chi: ['tu', 'autista'],
    richiede: (p) => !p.tag.includes('ev-pronto'),
    motivoBloccato: 'Il materiale è già pronto sul telo.',
    applica: () => ({ tag: 'ev-pronto' }),
    comeSiMisura: 'Numero e colore sono universali. Dal calibro più grosso, che lascia '
      + 'passare più liquido al minuto, al più sottile.',
    fonteMisura: 'Bolognin :10448',
    diario: (m) => `Laccio, agocannula ${m.etichetta}, garza, cerotti e deflussore pronti sul telo.`,
    misure: [
      {
        id: 'ago-14', misura: 14, etichetta: '14 G arancione', colore: '#ef8b3a',
        spiega: 'Il più grosso: massimo flusso al minuto. Dove serve riempire in fretta.',
      },
      {
        id: 'ago-16', misura: 16, etichetta: '16 G grigio', colore: '#9aa0a6',
        spiega: 'Grosso e più facile da far entrare del 14: lo standard quando serve volume.',
      },
      {
        id: 'ago-18', misura: 18, etichetta: '18 G verde', colore: '#2f9e44',
        spiega: 'La via di mezzo: il paziente medico stabile a cui serve una via, non un travaso.',
      },
      {
        id: 'ago-20', misura: 20, etichetta: '20 G rosa', colore: '#ef9bbd',
        spiega: 'Sottile: vene fragili dell\'anziano, quando basta avere una via aperta.',
      },
    ],
  },
];

/** Le voci pronte da spargere nel catalogo delle azioni. */
export const VOCI_PRESIDI = FAMIGLIE.flatMap(vociDi);

/** Gli id di una famiglia, nell'ordine: i casi li usano invece di
    riscriverli a mano, e la palette ci si appoggia per l'ordine. */
export const IDS = Object.fromEntries(
  FAMIGLIE.map((f) => [f.id, f.misure.map((m) => m.id)]),
);

/** Quello che serve alla palette per disegnare la carta delle misure. */
export const FAMIGLIE_META = Object.fromEntries(FAMIGLIE.map((f) => [f.id, {
  id: f.id,
  cat: f.cat,
  label: f.label,
  comeSiMisura: f.comeSiMisura,
  fonteMisura: f.fonteMisura,
  ids: f.misure.map((m) => m.id),
}]));

/** Le voci di una famiglia, per id. */
export const vociDellaFamiglia = (idFamiglia) => VOCI_PRESIDI
  .filter((v) => v.famiglia === idFamiglia);
```

- [ ] **Step 4: Esegui il test e verifica che passi**

Run: `node --test tests/presidi.test.mjs`
Expected: PASS, 6 test

- [ ] **Step 5: Commit**

```bash
git add assets/js/data/presidi.js tests/presidi.test.mjs
git commit -m "feat(presidi): le quattro famiglie e il generatore delle misure"
```

---

## Task 2: innestare le voci nel catalogo

**Files:**
- Modify: `assets/js/data/azioni.js` (righe 100-107, 114-121, 136-157, 269-275)
- Modify: `tests/azioni.test.mjs` (la mappa `TAG_ATTESI`, riga 62)

- [ ] **Step 1: Scrivi il test che fallisce**

In fondo a `tests/azioni.test.mjs`, aggiungi:

```js
test('i presidi con la misura sono nel catalogo, quelli generici non più', () => {
  ['cannula', 'aspira', 'accesso-prepara'].forEach((id) => {
    assert.equal(AZIONI[id], undefined, `${id} doveva sparire: adesso ha le misure`);
  });
  ['cannula-3', 'sondino-16', 'ago-16', 'o2-venturi', 'o2-nebulizzatore'].forEach((id) => {
    assert.ok(AZIONI[id], `manca ${id}`);
    assert.ok(AZIONI[id].famiglia, `${id}: la palette non sa in che famiglia metterlo`);
  });
});
```

E cambia la mappa `TAG_ATTESI` (riga 62 e seguenti) perché l'ossigeno adesso ha cinque presidi:

```js
const TAG_ATTESI = {
  compressione: 'compressione',
  laccio: 'laccio',
  'o2-reservoir': 'o2',
  'o2-maschera': 'o2',
  'o2-occhialini': 'o2',
  'o2-venturi': 'o2',
  'o2-nebulizzatore': 'o2',
  pallone: 'pallone',
  'inf-liquidi': 'liquidi',
  'zucchero-os': 'zucchero',
  'inf-glucosata': 'glucosata',
  'inf-adrenalina': 'adrenalina',
};
```

- [ ] **Step 2: Esegui il test e verifica che fallisca**

Run: `node --test tests/azioni.test.mjs`
Expected: FAIL — «manca o2-venturi» e «cannula doveva sparire».

- [ ] **Step 3: Innesta le voci in `azioni.js`**

In cima al file, dopo il commento di testata, aggiungi l'import:

```js
import { VOCI_PRESIDI } from './presidi.js';
```

**Togli** questi quattro blocchi dall'`ELENCO`, che adesso li genera `presidi.js`:

- `id: 'cannula'` (righe 100-107)
- `id: 'aspira'` (righe 114-121)
- `id: 'o2-occhialini'`, `id: 'o2-maschera'`, `id: 'o2-reservoir'` (righe 136-157)
- `id: 'accesso-prepara'` (righe 269-275)

Al loro posto metti un rimando, così chi legge il catalogo sa dove sono finiti. Dopo `sublussazione`, in categoria A:

```js
  /* Le sei Guedel e i quattro sondini stanno in `presidi.js`: sono
     generati, perché scrivere sei volte la stessa azione con un numero
     diverso è il modo migliore per farne divergere cinque. */
```

E in fondo al file, prima della riga `];` che chiude l'`ELENCO`, aggiungi le voci generate:

```js
  /* I presidi con la misura: Guedel, sondini, ossigeno, agocannule.
     Sono azioni come tutte le altre — hanno solo un `famiglia` in più,
     che serve alla palette per raggrupparle. */
  ...VOCI_PRESIDI,
];
```

- [ ] **Step 4: Esegui i test**

Run: `node --test tests/azioni.test.mjs`
Expected: PASS

Run: `node --test tests/*.test.mjs`
Expected: FAIL su `tests/casi.test.mjs` — «shock-v3: azione necessaria sconosciuta accesso-prepara». È il raccordo del Task 3.

- [ ] **Step 5: Commit**

```bash
git add assets/js/data/azioni.js tests/azioni.test.mjs
git commit -m "feat(azioni): il catalogo prende le voci con la misura"
```

---

## Task 3: i raccordi — chi nominava gli id spariti

**Files:**
- Modify: `assets/js/data/azioni.js` (`inf-accesso`, riga ~474)
- Modify: `assets/js/data/casi.js` (righe 176, 370, 698)

- [ ] **Step 1: Slega `inf-accesso` dall'id sparito**

In `azioni.js`, dentro `inf-accesso`, sostituisci il prerequisito:

```js
    richiede: (p, ctx) => ctx.haFatto('accesso-prepara'),
```

con quello che guarda il tag, che tutte e quattro le agocannule lasciano:

```js
    /* Non conta quale calibro hai preparato: conta che il materiale sia
       sul telo. Il calibro sbagliato lo dice l'indicazione, non un
       blocco — `richiede` impedisce, e qui non c'è niente da impedire. */
    richiede: (p) => p.tag.includes('ev-pronto'),
```

- [ ] **Step 2: Aggiorna i tre punti di `casi.js`**

`casi.js` oggi non importa niente: il primo import va fra il commento di
testata e la riga `export const CASI = [` (riga 28).

```js
import { IDS } from './presidi.js';
```

Riga 176, in `shock-v3`, fra le necessarie — lì il calibro grosso non è una preferenza:

```js
        { id: [...IDS.ago], entro: 420, peso: 1, label: 'Materiale per l\'accesso venoso' },
```

Riga 370, fra le utili di `toracico-v3`: sostituisci `'accesso-prepara'` con `...IDS.ago`:

```js
      utili: ['o2-maschera', 'o2-reservoir', 'rassicura', ...IDS.ago, 'allerta-co', 'conta-fr', 'misura-glicemia'],
```

Riga 698, fra le utili di `incidente-v3`: stessa sostituzione.

```js
      utili: ['allontana-curiosi', 'refill', 'colorito', 'polso-radiale', 'conta-fr', 'monitor', 'rassicura', 'copri', ...IDS.ago, 'inf-accesso', 'domanda:durata-dolore'],
```

- [ ] **Step 3: Esegui tutti i test**

Run: `node --test tests/*.test.mjs`
Expected: PASS — tutti.

Se `casi.test.mjs` fallisce su «facendo le azioni necessarie il punteggio è pieno», guarda quale caso: il test esegue `[].concat(n.id)[0]`, cioè il **primo** id dell'elenco. Per lo shock è `ago-14`, e deve essere eseguibile in quel momento.

- [ ] **Step 4: Commit**

```bash
git add assets/js/data/azioni.js assets/js/data/casi.js
git commit -m "refactor: chi nominava accesso-prepara adesso nomina la famiglia"
```

---

## Task 4: le indicazioni delle misure

**Files:**
- Modify: `assets/js/core/sim-engine.js` (`contestoGiudizio`, riga ~519)
- Modify: `assets/js/data/indicazioni.js`
- Modify: `tests/giudizio.test.mjs`

- [ ] **Step 1: Scrivi il test che fallisce**

In fondo a `tests/giudizio.test.mjs`:

```js
import { VOCI_PRESIDI, IDS } from '../assets/js/data/presidi.js';
import { INDICAZIONI } from '../assets/js/data/indicazioni.js';

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
```

Controlla che in cima al file ci sia già `import { indicata } from '../assets/js/core/giudizio.js';` — se manca, aggiungilo.

- [ ] **Step 2: Esegui il test e verifica che fallisca**

Run: `node --test tests/giudizio.test.mjs`
Expected: FAIL — «cannula-0: nessuna indicazione scritta».

- [ ] **Step 3: Porta la corporatura nel contesto del giudizio**

In `assets/js/core/sim-engine.js`, dentro `contestoGiudizio()`, l'ultima riga dell'oggetto restituito:

```js
      caso: { tipo: caso.tipo },
```

diventa:

```js
      /* La corporatura si vede: è nel contesto per lo stesso motivo per
         cui c'è la coscienza. Serve a scegliere la misura di un presidio,
         e sceglierla è quello che fai guardando il paziente. */
      caso: { tipo: caso.tipo, corporatura: caso.corporatura || 'media' },
```

- [ ] **Step 4: Scrivi le regole in `indicazioni.js`**

In cima al file, dopo gli altri import (il file oggi non ne ha: aggiungilo sotto la testata):

```js
import { IDS } from './presidi.js';
```

Poi, nella sezione `A: vie aeree`, **sostituisci** la voce `aspira` — che non esiste più — con i quattro sondini, e aggiungi le sei cannule:

```js
  /* --------------------- A: la cannula di Guedel ------------------- */

  /* Il manuale dà la MISURAZIONE — incisivi/angolo della mandibola
     (:5428), lobo/angolo della bocca (:5938) — e non dà la tabella che
     lega il numero al paziente. La mappa qui sotto è nostra, ed è il
     genere di cosa che va rivista se arriva una fonte migliore. */
  const GUEDEL_PER_CORPORATURA = { minuta: 2, media: 3, robusta: 4 };

  const guedel = (n) => ({
    quando: (c) => GUEDEL_PER_CORPORATURA[c.caso.corporatura || 'media'] === n,
    perche: 'Non è la misura di questo paziente. La cannula si sceglie sulla '
      + 'corporatura e si controlla misurandola: corta non scavalca la lingua, '
      + 'lunga la spinge in gola — e una cannula che spinge la lingua fa il '
      + 'contrario di quello per cui l\'hai messa.',
    fonte: 'Bolognin :5428 e :5938 per la misurazione — la mappa corporatura → numero è ASSUNZIONE NOSTRA',
  });
```

Attenzione: `INDICAZIONI` è un oggetto letterale, quindi `const` non ci sta dentro. Metti `GUEDEL_PER_CORPORATURA` e `guedel` **sopra** `export const INDICAZIONI = {`, insieme a `sondino` e `ago` qui sotto, e dentro l'oggetto lascia solo le voci.

Sopra `export const INDICAZIONI = {`:

```js
/* ------------------------- i presidi con la misura ------------------ */

/* Il manuale dà la MISURAZIONE della cannula — incisivi/angolo della
   mandibola (:5428), lobo/angolo della bocca (:5938) — e non dà la
   tabella che lega il numero al paziente. La mappa qui sotto è nostra. */
const GUEDEL_PER_CORPORATURA = { minuta: 2, media: 3, robusta: 4 };

const guedel = (n) => ({
  quando: (c) => GUEDEL_PER_CORPORATURA[c.caso.corporatura || 'media'] === n,
  perche: 'Non è la misura di questo paziente. La cannula si sceglie sulla '
    + 'corporatura e si controlla misurandola: corta non scavalca la lingua, '
    + 'lunga la spinge in gola — e una cannula che spinge la lingua fa il '
    + 'contrario di quello per cui l\'hai messa.',
  fonte: 'Bolognin :5428 e :5938 per la misurazione — la mappa corporatura → numero è ASSUNZIONE NOSTRA',
});

/* Si aspira quando c'è qualcosa da togliere: è la regola che valeva per
   l'unica `aspira` di prima, e vale identica per tutti e quattro i
   calibri. Sopra ci sta il calibro. */
const cEQualcosaDaAspirare = (c) => c.coscienza !== 'A'
  || c.saputo.vomito || c.saputo.secrezioni || c.tag.includes('vomito');

const sondino = (ch) => ({
  quando: (c) => cEQualcosaDaAspirare(c) && (ch === 16 || ch === 18),
  perche: (ch === 16 || ch === 18)
    ? 'Su vie aeree pulite l\'aspirazione non serve, e stimola il riflesso faringeo.'
    : 'Il calibro si sceglie sulle secrezioni e sulla corporatura: il 6 e il 10 sono '
      + 'per il bambino. In un adulto si intasano al primo grumo, e mentre li lavi il '
      + 'paziente continua ad avere roba in bocca.',
  fonte: 'Bolognin :2852-2862',
});

/* «Dal calibro più grosso, che lascia passare cioè un flusso maggiore di
   liquido al minuto, al più piccolo» (:10448). Da lì la regola: dove il
   problema è il volume si prepara grosso. Quali quadri siano «di volume»
   è nostro, e sta tutto in questa riga. */
const serveVolume = (c) => c.caso.tipo === 'trauma'
  || Boolean(c.saputo['emorragia-esterna'])
  || (c.letture.pas !== undefined && c.letture.pas < 100)
  || c.tag.includes('antishock') || c.tag.includes('laccio') || c.tag.includes('compressione');

const ago = (g) => ({
  quando: (c) => (serveVolume(c) ? (g === 14 || g === 16) : (g === 18 || g === 20)),
  perche: (g === 14 || g === 16)
    ? 'Il calibro grosso si prepara dove serve riempire in fretta: trauma, '
      + 'emorragia, pressione bassa. Su un paziente stabile a cui basta una via '
      + 'è più difficile da far entrare, e non serve a niente di più.'
    : 'Qui il problema è il volume, e il calibro decide quanti millilitri al '
      + 'minuto passano. Un 18 o un 20 in un paziente da riempire è una via '
      + 'aperta che non travasa: prepara il 14 o il 16.',
  fonte: 'Bolognin :10448 — quali quadri chiedano volume è ASSUNZIONE NOSTRA',
});
```

Dentro `INDICAZIONI`, nella sezione A, al posto della vecchia voce `aspira`:

```js
  'cannula-0': guedel(0),
  'cannula-1': guedel(1),
  'cannula-2': guedel(2),
  'cannula-3': guedel(3),
  'cannula-4': guedel(4),
  'cannula-5': guedel(5),

  'sondino-6': sondino(6),
  'sondino-10': sondino(10),
  'sondino-16': sondino(16),
  'sondino-18': sondino(18),
```

E nella sezione C, al posto di niente (l'agocannula non aveva regola):

```js
  'ago-14': ago(14),
  'ago-16': ago(16),
  'ago-18': ago(18),
  'ago-20': ago(20),
```

Le tre voci dell'ossigeno che già esistono — `o2-occhialini`, `o2-maschera`, `o2-reservoir` — **restano come sono**. Aggiungi le due nuove, sotto `o2-reservoir`:

```js
  /* Il Venturi non è un presidio «più preciso» degli altri: è il
     presidio di un problema, l'ipercapnia. Il Bolognin :3264-3270 lo dà
     «indispensabile per l'erogazione a lungo termine dei pazienti con
     BPCO, i quali possono andare incontro ad ipoventilazione nel caso
     venga somministrato ossigeno ad alte concentrazioni». */
  'o2-venturi': {
    quando: (c) => Boolean(c.saputo.bpco || c.saputo['broncopneumopatia'] || c.saputo.ossigenoDomicilio),
    perche: 'Il Venturi serve dove l\'alta concentrazione è pericolosa: il '
      + 'bronchitico cronico che ipoventila se gli dai troppo ossigeno. Su '
      + 'chiunque altro è un presidio più lento da montare che non aggiunge '
      + 'niente al reservoir.',
    fonte: 'Bolognin :3264-3270',
  },

  'o2-nebulizzatore': {
    quando: (c) => Boolean(c.saputo.sibili || c.saputo.broncospasmo || c.saputo.bpco || c.saputo.asma),
    perche: 'La maschera col nebulizzatore serve a vaporizzare un farmaco: '
      + 'senza broncospasmo da trattare è una maschera semplice montata più '
      + 'lentamente.',
    fonte: 'Bolognin :3264 (i presidi) — l\'indicazione al farmaco inalato è del broncospasmo',
  },
```

- [ ] **Step 5: Esegui i test**

Run: `node --test tests/giudizio.test.mjs`
Expected: PASS

Run: `node --test tests/*.test.mjs`
Expected: PASS. Se «quello che un caso chiede, il giudizio lo approva» fallisce su `shock-v3` e `ago-14`, vuol dire che al momento in cui il test prepara l'accesso non risulta ancora nessun segno di volume: controlla che `antishock` (entro 300) stia **prima** dell'agocannula nell'elenco delle necessarie, perché è quel tag che regge la regola quando la pressione misurata è scaduta.

- [ ] **Step 6: Commit**

```bash
git add assets/js/data/indicazioni.js assets/js/core/sim-engine.js tests/giudizio.test.mjs
git commit -m "feat(indicazioni): la regola di ogni misura, con la fonte accanto"
```

---

## Task 5: la palette a famiglie

**Files:**
- Modify: `assets/js/modules/intervento.js` (`aggiornaPalette`, righe 382-444)
- Modify: `assets/css/intervento.css` (in fondo)

- [ ] **Step 1: Aggiungi lo stato del modulo**

In cima a `intervento.js`, accanto a `let paletteAperta = false;` (riga 26):

```js
/* Quale famiglia di presidi è aperta, e per chi. Si apre toccando «Fallo
   tu»: prima si sceglie chi lo fa, poi quale pezzo prende in mano. */
let famigliaAperta = null;
let membroFamiglia = 'tu';
```

E nell'import delle azioni (riga 15) aggiungi il meta delle famiglie:

```js
import { AZIONI, CATEGORIE, azioniDi } from '../data/azioni.js';
import { FAMIGLIE_META } from '../data/presidi.js';
```

- [ ] **Step 2: Spezza `aggiornaPalette` in tre pezzi**

Sostituisci il blocco `mount(n.paletteLista, ...inCategoria.map((az) => { … }));` (righe 411-443) con le tre funzioni qui sotto, e lascia intatto tutto quello che c'è prima.

```js
/* La riga di un'azione singola: è quella che c'è sempre stata. */
function rigaAzione(az, onScegli) {
  const liberi = sim.membriLiberi(az);
  const principale = liberi.includes('tu') ? 'tu' : liberi[0];
  const riga = el('div.pal-riga', {}, [
    el('div.az-testo', {}, [
      el('b', { text: az.label }),
      el('span', { text: az.spiega }),
    ]),
    el('div.az-meta', {}, [
      el('span.durata', { text: `${az.durata}s` }),
    ]),
  ]);

  const bottoni = el('div.az-btn');
  if (!principale) {
    bottoni.append(el('span.badge.b-no', { text: 'occupati' }));
  } else {
    const agisci = onScegli || ((id, chi) => esegui(id, chi));
    bottoni.append(el('button.btn.sm.pri', {
      type: 'button',
      onclick: () => agisci(az.id, principale),
    }, [principale === 'tu' ? 'Fallo tu' : `Chiedi a ${NOMI_MEMBRO[principale].toLowerCase()}`]));

    liberi.filter((m) => m !== principale).forEach((m) => {
      bottoni.append(el('button.btn.sm', {
        type: 'button',
        onclick: () => agisci(az.id, m),
      }, [NOMI_MEMBRO[m]]));
    });
  }
  riga.append(bottoni);
  return riga;
}

/* La riga di una famiglia: un capofamiglia solo, e sotto — quando la
   apri — le misure vere. Sul telefono è la differenza fra sei righe e
   quindici. Aprirla non costa tempo: è un pensiero, non un gesto. */
function rigaFamiglia(idFamiglia, voci) {
  const meta = FAMIGLIE_META[idFamiglia];
  const prima = voci[0];
  const aperta = famigliaAperta === idFamiglia;

  /* Il capofamiglia si comporta come un'azione qualunque — stessi
     bottoni, stessa scelta di chi lo fa — solo che invece di partire
     apre le misure. */
  const finto = { ...prima, label: meta.label, spiega: prima.spiega, durata: prima.durata };
  const riga = rigaAzione(finto, (_id, chi) => {
    famigliaAperta = aperta ? null : idFamiglia;
    membroFamiglia = chi;
    aggiornaPalette();
  });
  riga.classList.add('pal-fam');
  riga.querySelector('.az-meta').append(el('span.pal-quante', { text: `${voci.length} misure` }));

  if (!aperta) return riga;

  const misure = el('div.pal-misure', {}, [
    el('p.pal-come', {}, [
      meta.comeSiMisura,
      el('small', { text: meta.fonteMisura }),
    ]),
    el('div.pal-scelte', {}, voci.map((v) => {
      const b = el('button.pal-mis', {
        type: 'button',
        onclick: () => { famigliaAperta = null; esegui(v.id, membroFamiglia); },
      }, [
        v.colore ? el('i.pal-colore', { style: { background: v.colore } }) : null,
        el('b', { text: v.etichettaMisura }),
        el('span', { text: `${v.durata}s` }),
      ].filter(Boolean));
      return b;
    })),
  ]);
  riga.append(misure);
  return riga;
}

/* Le azioni della categoria, con le famiglie compattate in una riga
   sola. L'ordine è quello del catalogo: la prima voce di una famiglia
   tiene il posto di tutte. */
function righeDellaCategoria(inCategoria) {
  const viste = new Set();
  return inCategoria.map((az) => {
    if (!az.famiglia) return rigaAzione(az);
    if (viste.has(az.famiglia)) return null;
    viste.add(az.famiglia);
    return rigaFamiglia(az.famiglia, inCategoria.filter((x) => x.famiglia === az.famiglia));
  }).filter(Boolean);
}
```

E al posto del vecchio `mount(...)` finale di `aggiornaPalette`:

```js
  mount(n.paletteLista, ...righeDellaCategoria(inCategoria));
```

- [ ] **Step 3: Chiudi la famiglia quando la partita si muove**

Dentro `esegui(id, chi)` (riga ~334), prima di `aggiornaTutto()`:

```js
function esegui(id, chi) {
  const esito = sim.esegui(id, chi);
  if (!esito.ok) { toast('Non ora', esito.motivo, 'warn'); return; }
  /* Fatto il gesto, la carta delle misure si chiude: se resta aperta la
     riga successiva la trova aperta su una famiglia che non c'entra. */
  famigliaAperta = null;
  aggiornaTutto();
}
```

E in `render(params)`, alla riga 624, dove il modulo riparte da capo con
`categoriaAperta = 'scena';`, aggiungi sotto:

```js
  famigliaAperta = null;
  membroFamiglia = 'tu';
```

- [ ] **Step 4: Lo stile, in fondo a `assets/css/intervento.css`**

```css
/* ---------------------- i presidi con la misura ---------------------
   `.az-testo span` è a blocchi: quello che sta nella riga della palette
   va scavalcato per specificità, o va a capo da solo. */
.pal-fam .az-meta { display: flex; gap: 8px; align-items: baseline; }
.pal-quante { color: var(--ink-3); }

.pal-misure {
  grid-column: 1 / -1;
  margin-top: var(--sp-2);
  padding-top: var(--sp-2);
  border-top: 1px dashed var(--linea);
}

.pal-come {
  margin: 0 0 var(--sp-2);
  color: var(--ink-3);
  font-size: var(--fs-sm);
  line-height: 1.4;
}
.pal-come small { display: block; margin-top: 2px; font-family: var(--mono); font-size: var(--fs-xs); opacity: .8; }

.pal-scelte { display: flex; flex-wrap: wrap; gap: 6px; }

.pal-mis {
  display: flex; align-items: center; gap: 6px;
  padding: 8px 10px;
  border: 1px solid var(--linea); border-radius: var(--r-2);
  background: var(--sfondo-2); color: inherit;
  font: inherit; cursor: pointer;
}
.pal-mis b { font-weight: 600; font-size: var(--fs-sm); }
.pal-mis span { font-family: var(--mono); font-size: var(--fs-xs); color: var(--ink-3); }
.pal-mis:active { transform: scale(.98); }

.pal-colore {
  width: 12px; height: 12px; border-radius: 50%;
  border: 1px solid rgba(0, 0, 0, .35);
  flex: 0 0 auto;
}
```

Se un token (`--linea`, `--sfondo-2`, `--r-2`) non esiste, apri `assets/css/tokens.css` e usa quello che c'è: non inventarne di nuovi.

- [ ] **Step 5: Prova a mano, a larghezza telefono**

```bash
python3 -m http.server 8925
```

Apri `http://localhost:8925/#/intervento/shock-v3` con la finestra stretta (390px, il DevTools in modalità telefono va bene).

Verifica:
1. categoria **A**: una riga «Cannula orofaringea» con «6 misure», non sei righe;
2. tocchi «Fallo tu» e si aprono i sei bottoni col pallino colorato, più il promemoria di come si misura con la fonte sotto;
3. tocchi «mis. 3 gialla» e parte il gesto — nel diario c'è scritto per esteso;
4. categoria **B**: una riga «Ossigeno» con cinque presidi;
5. categoria **C**: «Prepara il materiale per l'accesso venoso» con quattro calibri;
6. i bottoni non vanno a capo dentro sé stessi, e le etichette lunghe («reservoir (BLB), 12-15 l/min») non sfondano la riga.

- [ ] **Step 6: Commit**

```bash
git add assets/js/modules/intervento.js assets/css/intervento.css
git commit -m "feat(intervento): la palette raggruppa i presidi e apre le misure"
```

---

## Task 6: `core/bombola.js` — il conto dei litri

**Files:**
- Create: `assets/js/core/bombola.js`
- Test: `tests/bombola.test.mjs`

- [ ] **Step 1: Scrivi il test che fallisce**

Crea `tests/bombola.test.mjs`:

```js
/* Il conto della bombola, contro l'esempio che il manuale fa per esteso. */

import test from 'node:test';
import assert from 'node:assert/strict';

import { creaBombola, conFlusso, consuma, residui, autonomia, riepilogo } from '../assets/js/core/bombola.js';

test('una portatile da 2 litri a 200 bar contiene 400 litri', () => {
  /* «Il contenuto in O2 di ogni bombola è pari al volume moltiplicato
     per le Atmosfere» — Bolognin :3372. */
  const b = creaBombola();
  assert.equal(b.contenuto, 400);
  assert.equal(residui(b), 400);
});

test('l\'autonomia è il contenuto diviso il flusso', () => {
  /* «Basta dividere la quantità dell'ossigeno disponibile per il flusso
     che vado ad erogare» — Bolognin :3377. 400 / 15 = 26,67 minuti. */
  const b = conFlusso(creaBombola(), 15);
  assert.ok(Math.abs(autonomia(b) - 26.67) < 0.01);
  assert.equal(autonomia(creaBombola()), Infinity, 'senza flusso non si consuma niente');
});

test('il consumo non muta la bombola che riceve', () => {
  const prima = conFlusso(creaBombola(), 15);
  const dopo = consuma(prima, 60, 60);
  assert.equal(prima.erogati, 0, 'la bombola di partenza è stata mutata');
  assert.equal(dopo.erogati, 15, 'un minuto a 15 l/min sono 15 litri');
});

test('quando finisce si ferma, e dice a che secondo', () => {
  const b = conFlusso(creaBombola({ litri: 2, bar: 50 }), 15);
  assert.equal(b.contenuto, 100);
  const dopo = consuma(b, 600, 600);
  assert.equal(residui(dopo), 0);
  assert.equal(dopo.flusso, 0, 'finita la bombola non eroga più');
  assert.equal(dopo.finitaA, 600);
  /* Finita una volta, resta finita: non riparte al secondo dopo. */
  assert.equal(consuma(dopo, 60, 660).finitaA, 600);
});

test('senza ossigeno erogato non c\'è niente da raccontare', () => {
  assert.equal(riepilogo(creaBombola()), null);
  const r = riepilogo(consuma(conFlusso(creaBombola(), 15), 120, 120));
  assert.equal(r.erogati, 30);
  assert.equal(r.residui, 370);
  assert.equal(r.minutiResidui, 24);   // 370 / 15 = 24 minuti pieni
});
```

- [ ] **Step 2: Esegui il test e verifica che fallisca**

Run: `node --test tests/bombola.test.mjs`
Expected: FAIL — `Cannot find module .../assets/js/core/bombola.js`

- [ ] **Step 3: Scrivi `assets/js/core/bombola.js`**

```js
/* =====================================================================
   bombola.js — quanto ossigeno ti resta.

   Logica pura: nessun DOM, nessuna dipendenza, nessun orologio. Riceve
   una bombola e ne restituisce un'altra: non muta niente.

   Il flusso, finché non c'era niente che lo pagasse, era un numero
   scritto nell'etichetta di un'azione. Qui diventa una scelta: gli alti
   flussi svuotano la bombola, e la bombola dura quanto dura.

   Il conto è quello del manuale:
   · contenuto = volume della bombola × atmosfere del manometro
     («tutte le bombole vengono caricate a 200 atmosfere», Bolognin :3372);
   · autonomia in minuti = litri disponibili ÷ flusso erogato (:3377).

   ASSUNZIONE NOSTRA: che la bombola predefinita sia una portatile da 2
   litri. La check-list ARES dice quante bombole ci sono a bordo, non che
   capacità hanno.
   ===================================================================== */

const LITRI_PREDEFINITI = 2;
const BAR_PREDEFINITI = 200;

/** Una bombola all'inizio dell'intervento. `conf` è quello che il caso
    dichiara: `{ litri, bar }`. Un caso che non dice niente ha la sua
    portatile piena. */
export function creaBombola(conf = {}) {
  const litri = conf.litri ?? LITRI_PREDEFINITI;
  const bar = conf.bar ?? BAR_PREDEFINITI;
  return { litri, bar, contenuto: litri * bar, erogati: 0, flusso: 0, finitaA: null };
}

/** Quanti litri restano. */
export const residui = (b) => Math.max(0, b.contenuto - b.erogati);

/** Per quanti minuti basta, al flusso che sta erogando adesso. */
export function autonomia(b, flusso = b.flusso) {
  if (!flusso) return Infinity;
  return residui(b) / flusso;
}

/** Il presidio nuovo sostituisce quello di prima: i flussi non si
    sommano, perché la maschera è una sola. */
export const conFlusso = (b, flusso) => ({ ...b, flusso });

/** Fa passare `secondi` di erogazione. Restituisce una bombola nuova. */
export function consuma(b, secondi, t) {
  if (!b.flusso || b.finitaA !== null) return b;
  const erogati = Math.min(b.contenuto, b.erogati + (b.flusso * secondi) / 60);
  const finita = erogati >= b.contenuto;
  return {
    ...b,
    erogati,
    flusso: finita ? 0 : b.flusso,
    finitaA: finita ? t : null,
  };
}

/** Quello che il debriefing racconta. `null` se l'ossigeno non è mai
    partito: senza erogazione non c'è niente da dire. */
export function riepilogo(b) {
  if (!b || b.erogati <= 0) return null;
  const resta = residui(b);
  return {
    contenuto: b.contenuto,
    litri: b.litri,
    bar: b.bar,
    erogati: Math.round(b.erogati),
    residui: Math.round(resta),
    flusso: b.flusso,
    /* A che flusso stava andando quando è finita la partita: serve a
       dire per quanti minuti sarebbe bastata durante il trasporto. */
    minutiResidui: b.flusso ? Math.floor(resta / b.flusso) : null,
    finitaA: b.finitaA,
  };
}
```

- [ ] **Step 4: Esegui il test e verifica che passi**

Run: `node --test tests/bombola.test.mjs`
Expected: PASS, 5 test

- [ ] **Step 5: Commit**

```bash
git add assets/js/core/bombola.js tests/bombola.test.mjs
git commit -m "feat(bombola): il conto dei litri, con la formula del manuale"
```

---

## Task 7: la bombola dentro il motore

**Files:**
- Modify: `assets/js/core/sim-engine.js` (import, stato, `avanza`, `completa`, `pagella`, API)
- Modify: `assets/js/core/pagella.js` (una chiave nel verdetto)
- Test: `tests/sim-engine.test.mjs`

- [ ] **Step 1: Scrivi il test che fallisce**

In fondo a `tests/sim-engine.test.mjs`:

```js
test('il reservoir consuma la bombola, e il debriefing lo dice', () => {
  const i = creaIntervento(casoProva(), { azioni: AZIONI });
  i.esegui('o2-reservoir', 'tu');       // 40s di montaggio, poi eroga 15 l/min
  i.avanza(600);
  const p = i.chiudi();
  assert.ok(p.bombola, 'la pagella non racconta la bombola');
  assert.ok(p.bombola.erogati >= 150, `attesi almeno 150 litri, erogati ${p.bombola.erogati}`);
  assert.ok(p.bombola.residui < 400);
});

test('una bombola quasi vuota finisce, e l\'ossigeno se ne va con lei', () => {
  // 2 litri a 20 bar sono 40 litri: meno di tre minuti a 15 l/min
  const i = creaIntervento(casoProva({ bombola: { litri: 2, bar: 20 } }), { azioni: AZIONI });
  i.esegui('o2-reservoir', 'tu');
  i.avanza(600);
  assert.equal(i.stato.tag.includes('o2'), false, 'la maschera eroga ancora da una bombola vuota');
  assert.ok(i.diario.some((r) => /bombola/i.test(r.testo)), 'il diario non avvisa che è finita');
});
```

`casoProva(extra)` è l'aiuto già in cima al file (riga 56): costruisce un caso di
formato 2 con `azioni` vuote, e `extra` si fonde in coda — è così che si
attacca `bombola` senza toccarlo.

Il catalogo serve: controlla che in cima al file ci sia
`import { AZIONI } from '../assets/js/data/azioni.js';` e, se manca, aggiungilo.

- [ ] **Step 2: Esegui il test e verifica che fallisca**

Run: `node --test tests/sim-engine.test.mjs`
Expected: FAIL — «la pagella non racconta la bombola» (`p.bombola` è `undefined`).

- [ ] **Step 3: Cabla la bombola nel motore**

In `assets/js/core/sim-engine.js`, accanto agli altri import in cima:

```js
import { creaBombola, conFlusso, consuma } from './bombola.js';
```

Nella sezione `------ stato ------`, accanto a `let storico = [];`:

```js
  /* Quanto ossigeno c'è, e quanto ne sta uscendo. Il caso può dichiarare
     una bombola già scarica: è la trappola del controllo mezzo non
     fatto, e allora finisce davvero durante l'intervento. */
  let bombola = creaBombola(caso.bombola);
```

Dentro `avanza(dt)`, nel ciclo che scorre un secondo per volta, subito dopo `t += 1; restanti -= 1;`:

```js
      consumaOssigeno();
```

E subito sotto la funzione `avanza`, la funzione che fa il lavoro:

```js
  /* L'ossigeno esce mentre il tempo passa. Quando la bombola finisce non
     c'è un allarme che lo dice: il pallone del reservoir si affloscia, e
     te ne accorgi guardando. */
  function consumaOssigeno() {
    const prima = bombola;
    bombola = consuma(bombola, 1, t);
    if (bombola.finitaA !== null && prima.finitaA === null) {
      applicaEffetto({ togliTag: 'o2' });
      scrivi('osservazione', 'La bombola è finita: il pallone del reservoir si affloscia e il flusso si ferma.');
    }
  }
```

Dentro `completa({ id, chi, giudizio })`, dopo `if (az.applica) applicaEffetto(...)`:

```js
    /* Il presidio che hai messo decide quanto ossigeno esce. La maschera
       è una sola: il flusso nuovo sostituisce il vecchio. */
    if (az.flusso) bombola = conFlusso(bombola, az.flusso);
```

Nella funzione `pagella()`, fra le chiavi che si passano a `compilaPagella`:

```js
    bombola,
```

E nell'API, accanto a `get storico()`:

```js
    get bombola() { return bombola; },
```

- [ ] **Step 4: Fai arrivare il riepilogo nella pagella**

In `assets/js/core/pagella.js`, fra gli import:

```js
import { riepilogo as riepilogoBombola } from './bombola.js';
```

Nella firma di `compilaPagella`, aggiungi `bombola` fra i campi destrutturati di `dati`:

```js
  const {
    s, statoIniziale, catalogo = {}, fatte = [], raccolte = [],
    saputo = {}, letture = {}, storico = [], sospetti = [], t = 0,
    bombola = null,
  } = dati;
```

E fra le chiavi restituite, accanto a `tempoButtato`:

```js
    /* Quanto ossigeno è uscito, e per quanto sarebbe bastato ancora.
       `null` se non ne hai dato: senza erogazione non c'è niente da
       raccontare. */
    bombola: riepilogoBombola(bombola),
```

- [ ] **Step 5: Esegui i test**

Run: `node --test tests/sim-engine.test.mjs`
Expected: PASS

Run: `node --test tests/*.test.mjs`
Expected: PASS — tutti.

- [ ] **Step 6: Controlla che `sim-engine.js` sia rimasto sotto le 800 righe**

Run: `wc -l assets/js/core/sim-engine.js`
Expected: meno di 800. Se le supera, il pezzo da staccare **non** è la bombola (è già fuori): guarda cosa nel motore legge e basta, come ha fatto `pagella.js`.

- [ ] **Step 7: Commit**

```bash
git add assets/js/core/sim-engine.js assets/js/core/pagella.js tests/sim-engine.test.mjs
git commit -m "feat(sim): la bombola si consuma, e quando finisce l'ossigeno si ferma"
```

---

## Task 8: il riquadro della bombola nel debriefing

**Files:**
- Modify: `assets/js/modules/debriefing.js` (accanto a `sezioneTempoButtato`, riga 170)

- [ ] **Step 1: Scrivi la sezione**

In `assets/js/modules/debriefing.js`, subito dopo `sezioneTempoButtato`:

```js
/* L'ossigeno che è uscito. Non è un voto: è il numero che sul mezzo
   nessuno guarda finché non serve, e che decide se la maschera arriva
   fino al pronto soccorso o si ferma per strada. */
function sezioneBombola(p) {
  const b = p.bombola;
  if (!b) return null;

  const titolo = b.finitaA !== null
    ? `La bombola è finita al minuto ${Math.floor(b.finitaA / 60)}`
    : `${b.erogati} litri erogati, ${b.residui} ne restano`;

  const nota = b.finitaA !== null
    ? 'Da lì in poi la maschera era addosso al paziente senza erogare niente. '
      + 'Il livello si controlla a inizio turno, non quando serve.'
    : (b.minutiResidui !== null
      ? `Allo stesso flusso basterebbero altri ${b.minutiResidui} minuti: `
        + 'quanto dura il trasporto lo sai tu.'
      : 'Il flusso era già chiuso quando avete consegnato.');

  return el('section.dbox.deb-sez', {}, [
    el('div.t', { text: 'l\'ossigeno che hai dato' }),
    el('h3', { text: titolo }),
    el('p.deb-nota', { text: nota }),
    el('p.deb-nota', {
      text: `Bombola da ${b.litri} litri a ${b.bar} bar: ${b.contenuto} litri. `
        + 'Il conto è volume per atmosfere, e l\'autonomia è i litri diviso il flusso.',
    }),
    el('small.deb-fonte', { text: 'Bolognin :3372-3395' }),
  ]);
}
```

- [ ] **Step 2: Mettila in pagina**

Alla riga ~273, dove le sezioni si compongono:

```js
    ...[sezioneSospetto(p), sezioneTempoButtato(p), sezioneBombola(p)].filter(Boolean),
```

- [ ] **Step 3: Prova a mano**

```bash
python3 -m http.server 8925
```

Apri `http://localhost:8925/#/intervento/toracico-v3`, metti il reservoir, lascia scorrere qualche minuto e chiudi l'intervento. Nel debriefing deve comparire il riquadro con i litri erogati e i minuti che restano.

Poi verifica il caso opposto: un intervento senza ossigeno **non** deve mostrare il riquadro.

- [ ] **Step 4: Commit**

```bash
git add assets/js/modules/debriefing.js
git commit -m "feat(debriefing): quanto ossigeno è uscito, e per quanto basta ancora"
```

---

## Task 9: pubblicare la 1.13.0

**Files:**
- Modify: `assets/js/versione.js`
- Modify: `sw.js`
- Modify: `CLAUDE.md`
- Modify: `tmp/testi/FONTI.md` (fuori da git: si aggiorna e basta, non si committa)

- [ ] **Step 1: Il numero di versione**

In `assets/js/versione.js`:

```js
export const VERSIONE = '1.13.0';
export const DATA_VERSIONE = '22 agosto 2026';
```

E in cima a `NOVITA`:

```js
  { v: '1.13.0', t: 'I presidi diventano quelli veri dello zaino. La cannula orofaringea non è più una: sono sei, dalla nera alla arancione, e la misura si prende dagli incisivi all\'angolo della mandibola — quella sbagliata non tiene la lingua, la spinge. Stessa cosa per il sondino di aspirazione, per l\'agocannula che prepari all\'infermiere — 14 arancione, 16 grigio, 18 verde, 20 rosa — e per l\'ossigeno, che adesso ha anche il Venturi del bronchitico e la maschera col nebulizzatore. E il flusso finalmente pesa: la bombola si svuota davvero, il conto è quello del manuale, e alla fine il banco ti dice quanti litri hai dato e per quanti minuti di trasporto ne restano.' },
```

- [ ] **Step 2: La cache del service worker**

In `sw.js`, riga 11:

```js
const CACHE = 'consoletssa-1.13.0';
```

E nel `PRECACHE`, accanto agli altri file di `data/` e `core/`:

```js
  './assets/js/data/presidi.js',
  './assets/js/core/bombola.js',
```

- [ ] **Step 3: Aggiorna `CLAUDE.md`**

Tre punti:

1. Nell'albero dei file, sotto `core/`, dopo `pagella.js`:

```
    bombola.js      quanto ossigeno resta, e per quanto. Pura
```

e sotto `data/`, dopo `indicazioni.js`:

```
    presidi.js      le famiglie dei presidi: Guedel, sondini, ossigeno, aghi
```

2. Nella sezione «Trappole già pagate», aggiungi:

```markdown
- **Una famiglia di presidi non usa `unaVolta`.** `unaVolta` vale per un
  id solo: con sei Guedel distinte le metteresti tutte e sei. Quello che
  serve è il tag che la prima lascia (`cannula`, `ev-pronto`), letto da
  `richiede`. L'ossigeno è l'eccezione e tiene `unaVolta`: cambiare
  presidio strada facendo è lecito, ed è quello che si fa.
```

3. In «Cosa resta da fare», sostituisci il paragrafo «Il prossimo pezzo è A2» con il fatto compiuto, sulla falsariga degli altri:

```markdown
**Fatto in 1.13.0.** **A2, la dotazione**: i presidi veri con le loro
misure — Guedel 0-5, sondini CH, agocannule, i cinque presidi
dell'ossigeno — generati da `data/presidi.js` e giudicati dalle
indicazioni come qualsiasi altra azione. E la bombola che si consuma:
il flusso, che era un numero nell'etichetta, adesso costa litri.
Specifica e piano restano come storia della decisione:

- `docs/superpowers/specs/2026-08-22-dotazione-presidi-design.md`
- `docs/superpowers/plans/2026-08-22-dotazione-presidi.md`

**Il prossimo pezzo** è la **scheda ARES compilabile** — le diciassette
classi nascono in 1.12.0 e servono lì — insieme all'**inventario
sfogliabile** dello zaino e dell'ambulanza, che pesca dalla stessa
check-list. Poi le **carte di ripasso** rifatte.
```

- [ ] **Step 4: Aggiungi la check-list a `tmp/testi/FONTI.md`**

`tmp/` è fuori da git, ma la mappa delle fonti è il posto da cui si riparte, e questa fonte adesso è nel motore. Sotto le altre fonti:

```markdown
## Check-list ARES 118 — zaino e ambulanza

`tmp/check-list ambulanza.pdf` — tre pagine, allegati 1 e 2 di `IO.42 Rev.1`:

| pagina | cosa c'è |
|---|---|
| 1 | **Zaino di soccorso ASI**: comparto principale, busta termica, kit infusioni, ribalta (kit pediatrico, farmaci, ipoglicemia), le quattro tasche |
| 2 | **Ambulanza infermieristica**: ossigenazione, accessi venosi, medicazioni, varie, sicurezza, cateterismo, disinfettanti |
| 3 | box termico farmaci, mobilizzazione, aspiratore, monitor defibrillatore, bombole, comunicazioni, dotazioni aggiuntive |

**Attenzione: è una scansione da telefono.** `pdftotext` restituisce tre
byte, e `tmp/testi/checklist-ambulanza.txt` è vuoto per questo. Si legge
a schermo.

Da qui vengono i numeri e i colori dei presidi in `assets/js/data/presidi.js`:
Guedel 0-5 (nero, bianco, verde, giallo, rosso, arancione), sondini di
aspirazione CH 6/10/16/18, agocannule 14-24 G, maschere BLB / Venturi /
con nebulizzatore.
```

- [ ] **Step 5: Ultimo giro di test, e la prova sul telefono**

Run: `node --test tests/*.test.mjs`
Expected: PASS — tutti.

Poi, a larghezza telefono, un intervento intero su `shock-v3`: la palette a famiglie, l'agocannula 16, il debriefing con la bombola. E uno su `ipoglicemia-v3` per vedere che i casi che non toccano niente di tutto questo funzionino come prima.

- [ ] **Step 6: Commit e pubblicazione**

```bash
git add assets/js/versione.js sw.js CLAUDE.md docs/superpowers/plans/2026-08-22-dotazione-presidi.md
git commit -m "feat: 1.13.0 — i presidi veri, le loro misure e la bombola che si svuota"
git push origin HEAD
```

- [ ] **Step 7: Verifica che sia uscita davvero**

```bash
curl -s "https://g3ggy.github.io/consoletssa/assets/js/versione.js?x=$RANDOM" | grep VERSIONE
```

Expected: `export const VERSIONE = '1.13.0';`

Se dice ancora 1.12.1, aspetta il deploy di Pages e ripeti. Se dice 1.13.0 ma il telefono mostra il vecchio, è la cache del service worker: controlla di aver cambiato **tutti e tre** i punti — `VERSIONE`, `CACHE` in `sw.js`, e il push.
