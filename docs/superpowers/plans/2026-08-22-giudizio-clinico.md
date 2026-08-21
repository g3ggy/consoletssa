# Il giudizio clinico — piano di realizzazione

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Far costare i gesti che non servono, e chiedere al soccorritore
cosa pensa di avere davanti — così che la simulazione diventi una cosa in
cui si sceglie invece che una lista da spuntare.

**Architecture:** Un catalogo nuovo `data/indicazioni.js` dice quando un
gesto è indicato, con la fonte del manuale accanto. Una funzione pura in
`core/giudizio.js` confronta il predicato con un **contesto di
conoscibile** — solo quello che il soccorritore sa in quel momento, mai lo
stato nascosto del paziente. Il motore giudica **nell'istante in cui parte
l'azione** e porta il verdetto fino al diario e alla pagella. In parallelo,
il sospetto diagnostico si dichiara sulle diciassette classi della scheda
ARES 118.

**Tech Stack:** JavaScript, moduli ES nativi, nessuna dipendenza, nessun
passo di build. Test con `node --test`.

**Specifica:** `docs/superpowers/specs/2026-08-22-giudizio-clinico-design.md`

---

## Prima di cominciare

Leggere `CLAUDE.md` alla radice. In sintesi:

- **Niente build.** Moduli ES nativi. Se serve compilare, è la strada sbagliata.
- **Tutto in italiano**: nomi, commenti, testi. I commenti dicono *perché*.
- **Immutabilità**: oggetti nuovi, non mutazione in-place.
- **File piccoli**: 200-400 righe tipiche, 800 il massimo.
- **Il contenuto clinico viene dai manuali**, non dalla memoria.

```bash
node --test tests/*.test.mjs      # i test
python3 -m http.server 8925       # il server locale, per provare nel browser
```

## Lo stato di partenza, misurato

Preso prima di toccare niente. Serve da riferimento: dove i numeri devono
scendere e dove non devono muoversi.

```
test           261 verdi
sim-engine.js  737 righe
intervento.js  852 righe   ← già sopra il massimo di 800
azioni.js      524 righe
casi.js        ha 7 casi di motore 3
```

Il conto dei test si rilegge con:

```bash
node --test tests/*.test.mjs 2>&1 | grep -E "^ℹ (tests|pass|fail)"
```

## Le fonti cliniche: dove cercarle

Le indicazioni del Task 4 portano la fonte nel commento, e **la fonte va
trovata, non ricordata**. Il testo estratto sta in `tmp/testi/` (fuori da
git). Se la cartella è vuota si riestrae col comando in cima a
`tmp/testi/FONTI.md`.

Due agganci già verificati, da cui partire:

- **saturazione e ossigeno** — Bolognin `:2786-2800`. Dice tre cose che
  servono tutte: la centrale operativa decide «dosaggio (quanti litri al
  minuto) e presidio da utilizzare (maschera O2 o occhialini)»;
  nell'intossicazione da monossido il saturimetro legge valori alti
  falsi; e «il saturimetro non deve sostituire la nostra osservazione e
  valutazione», che è esattamente il motivo per cui l'indicazione
  dell'ossigeno deve accettare anche il paziente visibilmente dispnoico
  senza saturazione misurata;
- **collare cervicale nel trauma** — Bolognin `:5564-5570`.

Le altre si cercano così, e **quello che si trova va aggiunto a
`tmp/testi/FONTI.md`** nella tabella del Bolognin, che è la mappa del
progetto:

```bash
cd tmp/testi
grep -n -i "glicemia\|glucosio\|ipoglicemia" CAPITOLO_12-PRIMO-SOCCORSO_15.04.2026.txt | head
grep -n -i "emorragia\|laccio\|tourniquet" Manuale-TSSA-2022_cW6HYJE.txt | head
grep -n -i "aspiraz\|secrezioni" Manuale-TSSA-2022_cW6HYJE.txt | head
```

Se per un'indicazione **non si trova una fonte**, non si inventa: si
scrive `fonte: 'ASSUNZIONE NOSTRA'` con la ragione nel commento, come già
si fa in `fisiologia.js`.

## Cinque trappole, scritte per non ripagarle

**1 · Il giudizio va dato all'avvio, non al completamento.** In
`sim-engine.js` un'azione entra in `pendenti` quando parte (`esegui`, riga
477) e finisce in `fatte` quando si completa (`completa`, riga 377). È
comodo giudicare dentro `completa`, dove `fatte` si popola — ed è
**sbagliato**: la tavola spinale dura 180 secondi, e in tre minuti può
arrivare un'informazione che rende sensato un gesto che quando l'hai
deciso non lo era. Si valuta in `esegui` e il verdetto viaggia dentro
`pendenti`.

**2 · `richiede` e `indicazione` non sono la stessa cosa.** `richiede`
esiste già e **blocca** l'azione (`zucchero-os` vuole coscienza A: a un
incosciente non lo dai e basta). L'indicazione **non blocca mai**: ti lascia
fare e ti dice che non serviva. Confonderle significa impedire gesti che
il soccorritore ha il diritto di fare sbagliando.

**3 · `letture.pa` è la stringa `'128/78'`, non un numero.** Un predicato
che scrive `c.letture.pa < 90` confronta una stringa con un numero e non
fallisce: restituisce `false` sempre, in silenzio. Il contesto espone
anche `pas` come numero, ed è quello che i predicati usano.

**4 · `rispondiDecisione` scrive in `fatte` senza passare da `completa`.**
Quelle voci non hanno giudizio e non devono averlo: una decisione non è un
gesto. Ogni codice che legge `f.giudizio` deve reggere l'assenza.

**5 · Il diario del debriefing è lo stesso del vivo.** Le righe nuove di
tipo `giudizio` compaiono in tutti e due, e in modalità esame vanno
nascoste **nel vivo** ma mostrate **alla fine**. Il filtro sta nella UI,
non nel motore: il motore le scrive sempre.

## Struttura dei file

| File | Responsabilità |
|---|---|
| `assets/js/modules/debriefing.js` | **nuovo.** Il grafico e la schermata di fine intervento, estratti da `intervento.js`. |
| `assets/js/data/classi-patologia.js` | **nuovo.** Le diciassette classi ARES, raggruppate. |
| `assets/js/core/giudizio.js` | **nuovo.** Logica pura: un gesto era indicato, e quanto tempo è stato buttato. |
| `assets/js/data/indicazioni.js` | **nuovo.** Quando si fa cosa, con la fonte. |
| `assets/js/core/sim-engine.js` | **modificato.** Contesto del giudizio, verdetto all'avvio, sospetto, pagella. |
| `assets/js/modules/intervento.js` | **modificato.** Ambra nel diario, prima impressione, riquadro del sospetto. |
| `assets/js/data/casi.js` | **modificato.** `classe`, `classeAnche`, `sospettiPlausibili` sui sette casi. |
| `tests/giudizio.test.mjs` | **nuovo.** |
| `tests/casi.test.mjs`, `tests/sim-engine.test.mjs` | **modificati.** |

---

## Task 1: Il debriefing esce da `intervento.js`

Va fatto **per primo**: il file è già a 852 righe contro il massimo di 800,
e i task seguenti gli aggiungono roba. Nessun comportamento cambia, quindi
i test restano verdi senza toccarli.

**Files:**
- Create: `assets/js/modules/debriefing.js`
- Modify: `assets/js/modules/intervento.js`

- [ ] **Step 1: Guardare cosa si sposta**

```bash
sed -n '436,446p' assets/js/modules/intervento.js
grep -n "^const SERIE\|^function grafico\|^function mostraDebriefing\|^export function render" assets/js/modules/intervento.js
```

Expected: `SERIE` intorno a riga 440, `grafico` a 446, `mostraDebriefing` a
565, `render` a 720. Il blocco da spostare è **da `const SERIE` fino alla
riga prima di `export function render`**: circa 280 righe.

Se i numeri non corrispondono, usare quelli che escono: il file è stato
toccato di recente.

- [ ] **Step 2: Guardare da cosa dipende il blocco**

```bash
sed -n '1,24p' assets/js/modules/intervento.js
awk 'NR>=436 && NR<719' assets/js/modules/intervento.js | grep -o "\bel(\|\$(\|mount(\|saveRun(\|setRibbonRhythm(\|sim\.\|n\?\?\.\|n\.mon\|CASI_INDICE\|DOMANDE\|AZIONI" | sort -u
```

Serve per sapere quali import copiare nel file nuovo e cosa va passato
come parametro invece che letto da una variabile di modulo. Le due
variabili di modulo che il blocco usa sono **`sim`** (l'intervento in
corso) e **`n`** (i nodi): diventano parametri.

- [ ] **Step 3: Creare il file nuovo**

Creare `assets/js/modules/debriefing.js` con questa intestazione, e sotto
il blocco spostato **così com'è**, cambiando soltanto:

- `function grafico(` → `export function grafico(`
- `function mostraDebriefing()` → `export function mostraDebriefing(sim, n)`
- dentro `mostraDebriefing`, ogni uso di `sim` e di `n` adesso viene dai
  parametri: non serve toccarli uno per uno, ci pensa lo scope.

```js
/* =====================================================================
   debriefing.js — la schermata di fine intervento.

   Stava dentro `intervento.js`, che era arrivato a 852 righe contro le
   800 che il progetto si è dato come massimo. Si stacca bene perché è
   una vista sola: si disegna una volta a partita finita, non condivide
   stato con la simulazione in corso e legge soltanto l'oggetto che
   `sim.chiudi()` restituisce.
   ===================================================================== */

import { el, mount } from '../core/dom.js';
import { saveRun } from '../core/store.js';
import { setRibbonRhythm } from '../core/ribbon.js';
```

**Attenzione:** gli import qui sopra sono quelli che il blocco usa
*probabilmente*. Vanno verificati con l'elenco dello Step 2 e con le
prime venti righe di `intervento.js`: si copiano quelli veri, con i
percorsi corretti (`../core/...` invece di `./core/...` non è detto —
guardare come li scrive `intervento.js`, che sta nella stessa cartella).

- [ ] **Step 4: Togliere il blocco da `intervento.js` e importarlo**

Cancellare da `const SERIE = [` fino alla riga prima di
`export function render(params) {`.

In cima a `intervento.js`, accanto agli altri import:

```js
import { mostraDebriefing as disegnaDebriefing } from './debriefing.js';
```

E dove prima si chiamava `mostraDebriefing()`, adesso:

```js
disegnaDebriefing(sim, n);
```

Trovare tutte le chiamate:

```bash
grep -n "mostraDebriefing" assets/js/modules/intervento.js
```

- [ ] **Step 5: Verificare le righe e i test**

```bash
wc -l assets/js/modules/intervento.js assets/js/modules/debriefing.js
node --test tests/*.test.mjs 2>&1 | grep -E "^ℹ (tests|pass|fail)"
```

Expected: `intervento.js` sotto 600 righe, `debriefing.js` intorno a 300,
e **261 test verdi** — nessun test tocca il DOM, quindi il conto non deve
muoversi di uno.

- [ ] **Step 6: Provarlo nel browser**

```bash
python3 -m http.server 8925
```

Aprire `http://localhost:8925/index.html#/intervento/sincope-v3`, fare due
azioni qualsiasi, premere **Consegna e chiudi**. Il debriefing deve
comparire identico a prima, col grafico e tutte le sezioni. La console
deve essere pulita: un `does not provide an export named` qui significa
che un import è rimasto indietro.

- [ ] **Step 7: Commit**

```bash
git add assets/js/modules/debriefing.js assets/js/modules/intervento.js
git commit -m "refactor(intervento): il debriefing in un file suo, prima di aggiungerci sopra"
```

---

## Task 2: Le diciassette classi di patologia

Solo dati. Nessuna logica.

**Files:**
- Create: `assets/js/data/classi-patologia.js`
- Test: `tests/giudizio.test.mjs`

- [ ] **Step 1: Scrivere il test che fallisce**

Creare `tests/giudizio.test.mjs`:

```js
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
```

- [ ] **Step 2: Eseguire il test per vederlo fallire**

Run: `node --test tests/giudizio.test.mjs`
Expected: FAIL — `Cannot find module '.../assets/js/data/classi-patologia.js'`

- [ ] **Step 3: Scrivere l'implementazione**

Creare `assets/js/data/classi-patologia.js`:

```js
/* =====================================================================
   classi-patologia.js — le classi di patologia della scheda ARES 118.

   Sono quelle stampate sul modulo di rilevazione dati, riquadro «Classe
   di patologia». Sono diciassette e non venti: il modulo salta C16, C17
   e C18, e li saltiamo anche noi. La scheda che ti trovi in mano è
   quella, e va imparata com'è.

   Servono in due posti: il sospetto che dichiari durante l'intervento, e
   — quando arriverà — la casella da barrare sulla scheda.
   ===================================================================== */

export const CLASSI = {
  C01: { codice: 'C01', label: 'Traumatica' },
  C02: { codice: 'C02', label: 'Cardiocircolatoria' },
  C03: { codice: 'C03', label: 'Respiratoria' },
  C04: { codice: 'C04', label: 'Neurologica' },
  C05: { codice: 'C05', label: 'Psichiatrica' },
  C06: { codice: 'C06', label: 'Neoplastica' },
  C07: { codice: 'C07', label: 'Tossicologica' },
  C08: { codice: 'C08', label: 'Metabolica' },
  C09: { codice: 'C09', label: 'Gastroenterologica' },
  C10: { codice: 'C10', label: 'Urologica' },
  C11: { codice: 'C11', label: 'Oculistica' },
  C12: { codice: 'C12', label: 'Otorinolaringoiatrica' },
  C13: { codice: 'C13', label: 'Dermatologica' },
  C14: { codice: 'C14', label: 'Ostetrico-ginecologica' },
  C15: { codice: 'C15', label: 'Infettiva' },
  C19: { codice: 'C19', label: 'Altra patologia' },
  C20: { codice: 'C20', label: 'Patologia non identificata' },
};

/* Diciassette voci di fila non si leggono su un telefono. Il
   raggruppamento è per apparato, e l'ultimo gruppo tiene le classi che
   non stanno da nessun'altra parte — «non identificata» compresa, che è
   una risposta legittima e non un ripiego. */
export const GRUPPI_CLASSI = [
  { label: 'Trauma', codici: ['C01'] },
  { label: 'Cuore e respiro', codici: ['C02', 'C03'] },
  { label: 'Cervello e psiche', codici: ['C04', 'C05'] },
  { label: 'Metabolismo e sostanze', codici: ['C07', 'C08'] },
  { label: 'Addome e apparati', codici: ['C09', 'C10', 'C14'] },
  { label: 'Occhi, orecchie, pelle', codici: ['C11', 'C12', 'C13'] },
  { label: 'Altro', codici: ['C06', 'C15', 'C19', 'C20'] },
];

/** Il nome per esteso, come si dice a voce: «C08 metabolica». */
export const nomeClasse = (codice) => (CLASSI[codice]
  ? `${CLASSI[codice].codice} ${CLASSI[codice].label.toLowerCase()}`
  : codice);
```

- [ ] **Step 4: Eseguire i test**

Run: `node --test tests/*.test.mjs`
Expected: PASS, tutti. Il conto sale da 261 a 264.

- [ ] **Step 5: Commit**

```bash
git add assets/js/data/classi-patologia.js tests/giudizio.test.mjs
git commit -m "feat(dati): le diciassette classi di patologia della scheda ARES"
```

---

## Task 3: La funzione che giudica

Logica pura, senza ancora nessuna indicazione vera scritta.

**Files:**
- Create: `assets/js/core/giudizio.js`
- Test: `tests/giudizio.test.mjs`

- [ ] **Step 1: Scrivere i test che falliscono**

Aggiungere in fondo a `tests/giudizio.test.mjs`:

```js
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
```

- [ ] **Step 2: Eseguire i test per vederli fallire**

Run: `node --test tests/giudizio.test.mjs`
Expected: FAIL — `Cannot find module '.../assets/js/core/giudizio.js'`

- [ ] **Step 3: Scrivere l'implementazione**

Creare `assets/js/core/giudizio.js`:

```js
/* =====================================================================
   giudizio.js — il gesto ci stava, o no.

   Logica pura: nessun DOM, nessuna dipendenza, nessun orologio.

   Il motore sapeva dire due cose di un'azione: che era necessaria o che
   era dannosa. Tutto il resto era gratis, e quindi conveniva fare tutto.
   Qui si dice la terza: che si poteva fare ma non serviva a niente, e
   che quei secondi sono usciti dalla tasca del paziente.

   La regola sta in `data/indicazioni.js` e riceve solo quello che il
   soccorritore SA in quel momento — mai lo stato nascosto. Il perché sta
   scritto lì.
   ===================================================================== */

import { INDICAZIONI } from '../data/indicazioni.js';

/** Il gesto era indicato, con quello che sapevi quando l'hai deciso.

    Le indicazioni si passano come parametro solo per poterle sostituire
    nei test: nell'uso vero sono quelle del catalogo. */
export function indicata(idAzione, contesto, indicazioni = INDICAZIONI) {
  const regola = indicazioni[idAzione];

  /* Nessuna regola scritta vuol dire nessuna regola da rispettare. Si
     scrive un'indicazione solo dove il manuale ne ha una, e tutto il
     resto resta lecito: è quello che permette di coprire venti azioni
     adesso e le altre quando ci si arriva. */
  if (!regola) return { ok: true, perche: null, fonte: null };

  let passa;
  try {
    passa = Boolean(regola.quando(contesto));
  } catch (errore) {
    /* Un'indicazione scritta male è un bug nostro, e non deve pagarlo un
       volontario a metà scenario: nel dubbio il gesto passa. */
    return { ok: true, perche: null, fonte: null };
  }

  return passa
    ? { ok: true, perche: null, fonte: null }
    : { ok: false, perche: regola.perche, fonte: regola.fonte || null };
}

/** Quanti secondi sono andati in gesti che non servivano, e quali.

    Il costo del superfluo è il tempo e basta: non si tolgono punti,
    perché in servizio nessuno te ne toglie. Perdi minuti, e i minuti si
    vedono nelle finestre che manchi. */
export function tempoButtato(fatte = [], catalogo = {}) {
  const voci = fatte
    /* Le voci senza giudizio sono le decisioni degli eventi, che non
       sono gesti e non si giudicano così. */
    .filter((f) => f.giudizio && f.giudizio.ok === false)
    .map((f) => ({
      id: f.id,
      label: catalogo[f.id]?.label || f.id,
      secondi: catalogo[f.id]?.durata || 0,
      perche: f.giudizio.perche,
      fonte: f.giudizio.fonte,
      t: f.t,
      chi: f.chi,
    }));

  return { secondi: voci.reduce((somma, v) => somma + v.secondi, 0), voci };
}
```

- [ ] **Step 4: Creare il catalogo vuoto perché l'import regga**

`giudizio.js` importa `INDICAZIONI`, che ancora non esiste. Creare
`assets/js/data/indicazioni.js` con il solo scheletro — si riempie nel
Task 4:

```js
/* =====================================================================
   indicazioni.js — quando si fa cosa.

   `azioni.js` dice COME si fa un gesto: quanto dura, chi lo può fare,
   cosa scrive nel diario. Qui sta l'altra metà, che è materiale clinico
   e porta la fonte accanto: QUANDO quel gesto ha senso.

   Un'azione che non compare qui è sempre lecita. Si scrive
   un'indicazione solo dove il manuale ha una regola vera e dove
   sbagliare si vede sul mezzo.

   IL VINCOLO, che vale per ogni predicato qui dentro: `quando` riceve
   soltanto quello che il soccorritore PUÒ SAPERE in quell'istante —
   la coscienza, i parametri che ha già misurato, quello che l'anamnesi
   gli ha dato, cosa ha già fatto, che tipo di caso è. Mai lo stato vero
   del paziente. Se `misura-glicemia` fosse «indicata quando la glicemia
   sta sotto 70», leggerebbe il numero che si ottiene facendo proprio
   quel gesto: il banco ti direbbe che dovevi misurarla solo dopo che
   l'hai misurata.
   ===================================================================== */

export const INDICAZIONI = {
};
```

- [ ] **Step 5: Eseguire i test**

Run: `node --test tests/*.test.mjs`
Expected: PASS, tutti. Il conto sale da 264 a 272.

- [ ] **Step 6: Commit**

```bash
git add assets/js/core/giudizio.js assets/js/data/indicazioni.js tests/giudizio.test.mjs
git commit -m "feat(giudizio): la funzione che dice se un gesto ci stava, e quanto tempo e' costato"
```

---

## Task 4: Le indicazioni vere

Il task più lento e il più prezioso: qui dentro va conoscenza clinica, non
codice. **Ogni voce porta la fonte**, cercata come dice la sezione «Le
fonti cliniche» in cima.

**Files:**
- Modify: `assets/js/data/indicazioni.js`
- Modify: `tmp/testi/FONTI.md` (fuori da git, ma è la mappa: si aggiorna)
- Test: `tests/giudizio.test.mjs`

- [ ] **Step 1: Scrivere il test di forma che fallisce**

Aggiungere in fondo a `tests/giudizio.test.mjs`:

```js
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
```

- [ ] **Step 2: Eseguire i test per vederli fallire**

Run: `node --test tests/giudizio.test.mjs`
Expected: FAIL — «sono 0»

- [ ] **Step 3: Scrivere il catalogo**

Sostituire `export const INDICAZIONI = {\n};` in
`assets/js/data/indicazioni.js` con il blocco qui sotto.

**Le fonti marcate `CERCARE` vanno trovate prima di scrivere la voce**, coi
comandi della sezione in cima, e sostituite col riferimento vero. Se non si
trova, si scrive `ASSUNZIONE NOSTRA` e si spiega nel commento perché la
soglia è quella. Non si lascia la parola `CERCARE` nel codice.

```js
export const INDICAZIONI = {

  /* ---------------------------- A: vie aeree ---------------------- */

  aspira: {
    quando: (c) => c.coscienza !== 'A'
      || c.saputo.vomito || c.saputo.secrezioni || c.tag.includes('vomito'),
    perche: 'Si aspira quando c\'è qualcosa da togliere: vomito, sangue, '
      + 'secrezioni. Su vie aeree pulite l\'aspirazione non serve e '
      + 'stimola il riflesso faringeo.',
    fonte: 'CERCARE — Bolognin, modulo manovre salvavita',
  },

  collare: {
    quando: (c) => c.caso.tipo === 'trauma',
    perche: 'Il collare serve dove c\'è un trauma o una dinamica che possa '
      + 'aver coinvolto il rachide. Su un paziente medico, seduto dove '
      + 'l\'hai trovato, è un minuto perso e un collo bloccato per niente.',
    fonte: 'Bolognin :5564-5570',
  },

  /* ---------------------------- B: respiro ------------------------- */

  /* I tre presidi dell'ossigeno hanno la stessa indicazione di fondo —
     serve ossigeno — ma flussi diversi, e il presidio giusto dipende da
     quanto ne serve. Il Bolognin :2786-2800 è esplicito su una cosa che
     conta più delle soglie: «il saturimetro non deve sostituire la
     nostra osservazione e valutazione». Per questo ogni predicato
     accetta anche il paziente che si VEDE respirare male, senza numero:
     aspettare il saturimetro per dare ossigeno a un dispnoico grave
     sarebbe la lezione sbagliata. */

  'o2-occhialini': {
    quando: (c) => (c.letture.spo2 !== undefined && c.letture.spo2 < 94 && c.letture.spo2 >= 90)
      || (c.letture.spo2 === undefined && c.saputo.dispnea),
    perche: 'Gli occhialini danno pochi litri: vanno bene per una '
      + 'desaturazione lieve. Se la saturazione è sotto 90 non bastano, e '
      + 'se sta sopra 94 non serviva niente.',
    fonte: 'Bolognin :2786-2800',
  },

  'o2-maschera': {
    quando: (c) => (c.letture.spo2 !== undefined && c.letture.spo2 < 94)
      || (c.letture.spo2 === undefined && c.saputo.dispnea),
    perche: 'La maschera si mette a chi ha la saturazione sotto 94, o a chi '
      + 'lo vedi respirare male prima ancora di misurarla. Su un paziente '
      + 'che parla a frasi complete con 98 di saturazione non cambia niente.',
    fonte: 'Bolognin :2786-2800',
  },

  'o2-reservoir': {
    quando: (c) => (c.letture.spo2 !== undefined && c.letture.spo2 < 90)
      || c.coscienza !== 'A'
      || (c.letture.spo2 === undefined && c.saputo.dispnea),
    perche: 'Il reservoir è l\'alto flusso: si tiene per chi è davvero '
      + 'ipossico, sotto 90, o per chi non è vigile. Metterlo a chi ha una '
      + 'desaturazione lieve consuma la bombola e non aggiunge nulla.',
    fonte: 'Bolognin :2786-2800',
  },

  /* ---------------------------- C: circolo -------------------------- */

  laccio: {
    quando: (c) => Boolean(c.saputo['emorragia-esterna']) || c.caso.tipo === 'trauma',
    perche: 'Il laccio emostatico è per un\'emorragia esterna di un arto che '
      + 'non si ferma con la compressione. Senza sangue che esce non c\'è '
      + 'niente da stringere.',
    fonte: 'CERCARE — Bolognin, emorragie',
  },

  compressione: {
    quando: (c) => Boolean(c.saputo['emorragia-esterna']) || c.caso.tipo === 'trauma',
    perche: 'La compressione diretta si fa dove esce il sangue. Su un '
      + 'paziente che non sanguina all\'esterno non c\'è punto da comprimere.',
    fonte: 'CERCARE — Bolognin, emorragie',
  },

  'ecg-elettrodi': {
    quando: (c) => Boolean(c.saputo['oppressione-toracica'] || c.saputo['dolore-toracico']
      || c.saputo.cardiopalmo || c.saputo.sincope)
      || (c.letture.fc !== undefined && (c.letture.fc > 120 || c.letture.fc < 50)),
    perche: 'Le dodici derivazioni si fanno per un sospetto cardiologico: '
      + 'dolore toracico, cardiopalmo, sincope, un\'aritmia sul monitor. '
      + 'Sono due minuti buoni, e su un caso che non c\'entra col cuore '
      + 'sono due minuti tolti a quello che serve.',
    fonte: 'CERCARE — Bolognin, ECG',
  },

  'ecg-esegui': {
    quando: (c) => c.tag.includes('ecg'),
    perche: 'Il tracciato si acquisisce dopo aver messo gli elettrodi: senza '
      + 'quelli non c\'è niente da registrare.',
    fonte: 'conseguenza tecnica, non clinica',
  },

  antishock: {
    quando: (c) => (c.letture.pas !== undefined && c.letture.pas < 100)
      || Boolean(c.saputo.sincope) || c.tag.includes('shock'),
    perche: 'La posizione antishock serve a chi ha la pressione bassa o è '
      + 'appena svenuto. A un normoteso non fa niente, e a un dispnoico o a '
      + 'un dolore toracico si sta togliendo la posizione che lo aiuta.',
    fonte: 'CERCARE — Bolognin, shock',
  },

  'dae-piastre': {
    quando: (c) => c.coscienza === 'U' || c.tag.includes('arresto'),
    perche: 'Le piastre si attaccano a chi non risponde e non respira. Su un '
      + 'paziente cosciente non c\'è niente da analizzare.',
    fonte: 'ERC 2025 cap. 4 — algoritmo BLS-D',
  },

  /* ------------------------- valutazione ---------------------------- */

  'misura-temp': {
    quando: (c) => Boolean(c.saputo.febbre || c.saputo.infezione)
      || c.tag.includes('freddo') || c.caso.tipo === 'trauma',
    perche: 'La temperatura si misura se sospetti un\'infezione, se il '
      + 'paziente è stato al freddo, o in un trauma dove l\'ipotermia è una '
      + 'delle cose che uccidono. Fuori da lì è un numero che non usi.',
    fonte: 'CERCARE — Bolognin, parametri vitali',
  },

  refill: {
    quando: (c) => (c.letture.pas !== undefined && c.letture.pas < 110)
      || c.letture.cute === 'pallida' || c.letture.cute === 'pallida, fredda, sudata'
      || c.caso.tipo === 'trauma' || Boolean(c.saputo['emorragia-esterna']),
    perche: 'Il refill è un segno di compenso: si cerca dove sospetti che '
      + 'manchi volume. Su chi ha pressione e colorito normali dice sempre '
      + '«sotto i due secondi», e non ti ha insegnato niente.',
    fonte: 'Bolognin :6489 e :6470-6490',
  },

  'chiedi-sete': {
    quando: (c) => (c.letture.pas !== undefined && c.letture.pas < 110)
      || c.letture.cute === 'pallida' || c.letture.cute === 'pallida, fredda, sudata'
      || c.caso.tipo === 'trauma' || Boolean(c.saputo['emorragia-esterna']),
    perche: 'La sete è uno dei segni dell\'ipovolemia, e come gli altri si '
      + 'cerca quando hai un motivo per sospettarla.',
    fonte: 'Bolognin :6470-6490',
  },

  /* ---------------------------- D: coscienza ------------------------ */

  'misura-glicemia': {
    quando: (c) => c.coscienza !== 'A'
      || Boolean(c.saputo.diabetico || c.saputo.insulina || c.saputo.deficit),
    perche: 'La glicemia si misura a chi ha la coscienza alterata, a un '
      + 'diabetico noto, o davanti a un deficit neurologico — perché '
      + 'un\'ipoglicemia imita l\'ictus e va esclusa. A un paziente vigile e '
      + 'orientato, senza niente che punti da quella parte, il numero non '
      + 'cambia quello che fai.',
    fonte: 'ERC 2025 cap. 12 :1125',
  },

  'esame-neurologico': {
    quando: (c) => c.coscienza !== 'A'
      || Boolean(c.saputo.deficit || c.saputo.afasia || c.saputo['esordio-improvviso']),
    perche: 'I tre segni di Cincinnati si cercano davanti a un sospetto '
      + 'neurologico: un deficit riferito, un eloquio strano, un esordio '
      + 'improvviso. Su un dolore toracico non aggiungono niente.',
    fonte: 'Bolognin :4112-4125',
  },

  'zucchero-os': {
    quando: (c) => c.letture.glicemia !== undefined && c.letture.glicemia < 70,
    perche: 'Lo zucchero per bocca si dà a un\'ipoglicemia MISURATA. Darlo a '
      + 'naso, senza il numero, vuol dire non sapere se stai trattando la '
      + 'cosa giusta — e a chi non deglutisce bene è pericoloso.',
    fonte: 'ERC 2025 cap. 12 :1125',
  },

  autoiniettore: {
    quando: (c) => Boolean(c.saputo.anafilassi || c.saputo.puntura
      || c.saputo['allergia-nota'] || c.saputo.orticaria),
    perche: 'L\'autoiniettore di adrenalina è per una reazione anafilattica: '
      + 'esposizione a un allergene più segni sistemici. Fuori da quel '
      + 'quadro non è il presidio giusto.',
    fonte: 'ERC 2021 cap. 6 — anafilassi',
  },

  /* --------------------------- E: esposizione ----------------------- */

  esposizione: {
    quando: (c) => c.caso.tipo === 'trauma' || c.coscienza !== 'A',
    perche: 'Si scopre un paziente per vedere quello che addosso non si '
      + 'vede: ferite, ematomi, il segno della cintura. Su un medico '
      + 'vigile che ti racconta tutto è un minuto perso e una persona '
      + 'esposta al freddo e agli sguardi.',
    fonte: 'CERCARE — Bolognin, valutazione secondaria',
  },

  /* --------------------------- immobilizzo -------------------------- */

  spinale: {
    quando: (c) => c.caso.tipo === 'trauma',
    perche: 'La tavola spinale è per il trauma. Tre minuti su un paziente '
      + 'medico sono tre minuti tolti a quello che gli serve davvero, e un '
      + 'paziente immobilizzato senza motivo sta peggio, non meglio.',
    fonte: 'Bolognin :5564-5570',
  },

  ked: {
    quando: (c) => c.caso.tipo === 'trauma',
    perche: 'Il KED serve a estrarre da un veicolo un traumatizzato stabile. '
      + 'Fuori da quella situazione sono quattro minuti buttati.',
    fonte: 'CERCARE — Bolognin, modulo tecniche di immobilizzazione',
  },

  materassino: {
    quando: (c) => c.caso.tipo === 'trauma',
    perche: 'Il materassino a depressione immobilizza un traumatizzato per il '
      + 'trasporto. Su un paziente medico non c\'è niente da immobilizzare.',
    fonte: 'CERCARE — Bolognin, modulo tecniche di immobilizzazione',
  },

  steccobenda: {
    quando: (c) => c.caso.tipo === 'trauma' || Boolean(c.saputo.frattura),
    perche: 'La steccobenda immobilizza un arto che si sospetta fratturato. '
      + 'Senza un arto da immobilizzare non serve.',
    fonte: 'CERCARE — Bolognin, modulo tecniche di immobilizzazione',
  },
};
```

- [ ] **Step 4: Sostituire ogni `CERCARE` con la fonte vera**

```bash
grep -n "CERCARE" assets/js/data/indicazioni.js
```

Per ognuna, cercare con i comandi della sezione «Le fonti cliniche» e
mettere il riferimento `file :riga`. Dove non si trova, scrivere
`ASSUNZIONE NOSTRA` e aggiungere una riga di commento sopra la voce che
dice perché la soglia è quella.

Poi aggiungere gli agganci nuovi alla tabella del Bolognin in
`tmp/testi/FONTI.md`, che è la mappa del progetto e serve al prossimo che
passa.

Verifica: `grep -c CERCARE assets/js/data/indicazioni.js` deve dare `0`.

- [ ] **Step 5: Eseguire i test**

Run: `node --test tests/*.test.mjs`
Expected: i quattro test nuovi passano. **Alcuni test dei casi possono
fallire adesso**: non sistemarli qui, li affronta il Task 8 con lo script
diagnostico. Se falliscono, annotare quali e andare avanti.

- [ ] **Step 6: Commit**

```bash
git add assets/js/data/indicazioni.js tests/giudizio.test.mjs
git commit -m "feat(indicazioni): quando si fa cosa, ventitre' regole con la fonte accanto"
```

---

## Task 5: Il motore giudica, nell'istante giusto

**Files:**
- Modify: `assets/js/core/sim-engine.js`
- Test: `tests/sim-engine.test.mjs`

- [ ] **Step 1: Scrivere i test che falliscono**

Aggiungere in fondo a `tests/sim-engine.test.mjs`:

```js
/* ==================== il giudizio dei gesti ========================= */

test('un gesto senza indicazione non porta nessun verdetto', () => {
  /* `monitor` non compare in `indicazioni.js`: collegare il monitor non
     ha una controindicazione, e non c'è niente da insegnare. */
  const i = avvia(casoConAnamnesi());
  i.esegui('monitor', 'tu');
  const f = i.fatte.find((x) => x.id === 'monitor');
  assert.ok(f, 'l\'azione di prova deve essere stata fatta');
  assert.equal(f.giudizio.ok, true);
});

test('il verdetto si dà quando l\'azione PARTE, non quando finisce', () => {
  /* È la ragione per cui il giudizio non sta dentro `completa`: se una
     manovra dura tre minuti e nel frattempo scopri qualcosa, il gesto
     che hai deciso resta quello che hai deciso. */
  const catalogo = {
    lunga: {
      id: 'lunga', cat: 'C', label: 'Manovra lunga', durata: 180, chi: ['tu'],
      diario: 'lunga', spiega: 'prova',
    },
  };
  const indicazioni = {
    lunga: { quando: (c) => c.t >= 100, perche: 'serve solo dopo i cento secondi di prova', fonte: 'p' },
  };
  const i = creaIntervento(casoConAnamnesi(), { azioni: catalogo, indicazioni });
  i.esegui('lunga', 'tu');
  const f = i.fatte.find((x) => x.id === 'lunga');
  assert.equal(f.giudizio.ok, false,
    'partita a t=0 il verdetto è no, anche se finisce a 180');
});

test('il giudizio guarda solo quello che hai misurato davvero', () => {
  const catalogo = {
    ...AZIONI_PROVA,
    prova: {
      id: 'prova', cat: 'C', label: 'Prova', durata: 10, chi: ['tu'],
      diario: 'prova', spiega: 'prova',
    },
  };
  const indicazioni = {
    prova: { quando: (c) => c.letture.pas !== undefined, perche: 'serve la pressione presa', fonte: 'p' },
  };
  const i = creaIntervento(casoConAnamnesi(), { azioni: catalogo, indicazioni });
  i.esegui('prova', 'tu');
  assert.equal(i.fatte.find((x) => x.id === 'prova').giudizio.ok, false,
    'senza aver misurato la pressione il contesto non ce l\'ha');
});

test('il diario scrive una riga di tipo giudizio, che la UI potrà nascondere', () => {
  const catalogo = {
    prova: { id: 'prova', cat: 'C', label: 'Prova', durata: 10, chi: ['tu'], diario: 'prova', spiega: 'p' },
  };
  const indicazioni = { prova: { quando: () => false, perche: 'non serviva proprio', fonte: 'p' } };
  const i = creaIntervento(casoConAnamnesi(), { azioni: catalogo, indicazioni });
  i.esegui('prova', 'tu');
  const riga = i.diario.find((r) => r.tipo === 'giudizio');
  assert.ok(riga, 'manca la riga del giudizio');
  assert.match(riga.testo, /non serviva proprio/);
});

test('la pagella conta i secondi buttati', () => {
  const catalogo = {
    prova: { id: 'prova', cat: 'C', label: 'Prova', durata: 40, chi: ['tu'], diario: 'prova', spiega: 'p' },
  };
  const indicazioni = { prova: { quando: () => false, perche: 'non serviva proprio', fonte: 'p' } };
  const i = creaIntervento(casoConAnamnesi(), { azioni: catalogo, indicazioni });
  i.esegui('prova', 'tu');
  const p = i.chiudi();
  assert.equal(p.tempoButtato.secondi, 40);
  assert.equal(p.tempoButtato.voci[0].label, 'Prova');
});
```

**Attenzione:** questi test usano `casoConAnamnesi()` e `AZIONI_PROVA`, che
esistono già nel file (righe 13 e 492), e `creaIntervento`, già importato.
`AZIONI_PROVA` contiene `misura-pa`, `misura-glicemia`, `monitor`,
`antishock`, `seduta` e `rcp`: non inventarne altri. Attenzione a
`misura-glicemia`, che nel catalogo vero **ha** un'indicazione: non va usata
per provare il caso «nessuna regola scritta».

- [ ] **Step 2: Eseguire i test per vederli fallire**

Run: `node --test tests/sim-engine.test.mjs`
Expected: FAIL — `f.giudizio` è `undefined`

- [ ] **Step 3: Aggiungere il contesto del giudizio**

In `assets/js/core/sim-engine.js`, in cima, accanto agli altri import:

```js
import { indicata, tempoButtato } from './giudizio.js';
```

Dentro `creaIntervento`, subito dopo la riga
`const COSTO_DELEGA = opzioni.costoDelega ?? 5;`, aggiungere:

```js
  /* Le indicazioni si possono sostituire dall'esterno per i test, come il
     catalogo delle azioni. Nell'uso vero sono quelle di `indicazioni.js`,
     che `giudizio.js` importa da sé. */
  const indicazioni = opzioni.indicazioni;
```

Poi, **subito dopo** la funzione `contesto()` (riga 453 circa, quella che
restituisce `{ t, letture, fatte, haFatto, haLettura }`), aggiungere:

```js
  /* Le grandezze che un soccorritore può avere in mano. Non è lo stato
     del paziente: è quello che ha misurato, e per i parametri continui
     quello che il monitor gli mostra adesso. */
  const CHIAVI_CONOSCIBILI = ['fc', 'spo2', 'pa', 'ritmo', 'glicemia', 'temp',
    'refill', 'cute', 'sete', 'polso', 'fr'];

  /** Quello che il soccorritore SA in questo istante.

      È il contesto che le indicazioni ricevono, e il motivo per cui il
      meccanismo non è un imbroglio: un'indicazione non può guardare un
      numero che si ottiene facendo il gesto che sta giudicando. */
  function contestoGiudizio() {
    const s = proietta();

    const lette = {};
    CHIAVI_CONOSCIBILI.forEach((k) => {
      const v = valore(k);
      if (v !== undefined && v !== null) lette[k] = v;
    });
    /* `pa` è la stringa '128/78': un predicato che ci scrive sopra un
       confronto numerico otterrebbe `false` in silenzio per sempre.
       La sistolica si espone a parte, come numero. */
    if (typeof lette.pa === 'string') {
      const sistolica = parseInt(lette.pa.split('/')[0], 10);
      if (Number.isFinite(sistolica)) lette.pas = sistolica;
    }

    return {
      t,
      /* La coscienza si vede senza strumenti: è l'unica cosa dello stato
         che sta nel contesto senza essere stata misurata. */
      coscienza: s.coscienza,
      letture: lette,
      /* `saputo` è `{ chiave: { da, t } }`: ai predicati serve solo sapere
         se la chiave c'è. */
      saputo: Object.fromEntries(Object.keys(saputo).map((k) => [k, true])),
      tag: s.tag,
      caso: { tipo: caso.tipo },
    };
  }
```

- [ ] **Step 4: Giudicare all'avvio e portare il verdetto fino in fondo**

Sempre in `sim-engine.js`, dentro `esegui`, **sostituire**:

```js
    const fineA = t + az.durata;
    squadra = { ...squadra, [chi]: { liberoA: fineA, azione: az.id } };
    pendenti = [...pendenti, { fineA, id, chi }];
```

con:

```js
    const fineA = t + az.durata;
    squadra = { ...squadra, [chi]: { liberoA: fineA, azione: az.id } };
    /* Il verdetto si dà ADESSO, con quello che sai adesso: se la manovra
       dura tre minuti e nel frattempo scopri qualcosa, il gesto che hai
       deciso resta quello che hai deciso. Viaggia dentro `pendenti` fino
       al completamento. */
    const giudizio = indicata(id, contestoGiudizio(), indicazioni);
    pendenti = [...pendenti, { fineA, id, chi, giudizio }];
```

Dentro `completa`, **sostituire** la firma e la riga di `fatte`:

```js
  function completa({ id, chi }) {
    const az = catalogo[id];
    if (!az) return;
    squadra = { ...squadra, [chi]: { ...squadra[chi], azione: null } };
    fatte = [...fatte, { id, chi, t }];
```

con:

```js
  function completa({ id, chi, giudizio }) {
    const az = catalogo[id];
    if (!az) return;
    squadra = { ...squadra, [chi]: { ...squadra[chi], azione: null } };
    fatte = [...fatte, { id, chi, t, giudizio }];
```

Infine, **alla fine** di `completa`, subito dopo la riga che comincia con
`scrivi(chi === 'tu' ? 'azione' : 'squadra',`, aggiungere:

```js
    /* La riga del giudizio va nel diario sempre: è la UI che la nasconde
       in modalità esame, perché è una scelta di presentazione e non del
       motore. */
    if (giudizio && giudizio.ok === false) {
      scrivi('giudizio', `Non era indicata: ${giudizio.perche}`, id);
    }
```

- [ ] **Step 5: Metterlo in pagella**

Dentro `pagella()`, **subito prima** della riga `const gIniziale = gravita(statoIniziale);`, aggiungere:

```js
    /* Il superfluo non toglie punti: costa i secondi che ha preso, e
       quei secondi si vedono nelle finestre mancate. */
    const buttato = tempoButtato(fatte, catalogo);
```

E nell'oggetto che `pagella()` restituisce, accanto a `esitoPaziente`,
aggiungere:

```js
      tempoButtato: buttato,
```

- [ ] **Step 6: Eseguire tutti i test**

Run: `node --test tests/*.test.mjs`
Expected: i cinque test nuovi passano. I test dei casi che il Task 4 aveva
fatto diventare rossi restano rossi: li chiude il Task 8.

- [ ] **Step 7: Commit**

```bash
git add assets/js/core/sim-engine.js tests/sim-engine.test.mjs
git commit -m "feat(sim): il motore giudica il gesto nell'istante in cui parte"
```

---

## Task 6: Il sospetto nel motore

**Files:**
- Modify: `assets/js/core/sim-engine.js`
- Test: `tests/sim-engine.test.mjs`

- [ ] **Step 1: Scrivere i test che falliscono**

Aggiungere in fondo a `tests/sim-engine.test.mjs`:

```js
/* ==================== il sospetto =================================== */

const casoConClasse = (extra = {}) => ({
  ...casoConAnamnesi(),
  classe: 'C08',
  sospettiPlausibili: ['C02', 'C07', 'C08'],
  ...extra,
});

test('all\'inizio il banco aspetta la prima impressione', () => {
  const i = avvia(casoConClasse());
  assert.ok(i.primaImpressione, 'deve essere in attesa');
  assert.deepEqual(i.primaImpressione.opzioni, ['C02', 'C07', 'C08', 'C20'],
    '«non lo so» sta sempre in fondo ed è una risposta legittima');
});

test('finché non la dai, non puoi fare niente', () => {
  const i = avvia(casoConClasse());
  const r = i.esegui('monitor', 'tu');
  assert.equal(r.ok, false);
  assert.match(r.motivo, /cosa pensi/i);
});

test('un caso che non dichiara i plausibili non ferma nessuno', () => {
  const i = avvia(casoConAnamnesi());
  assert.equal(i.primaImpressione, null);
  assert.equal(i.esegui('monitor', 'tu').ok, true);
});

test('dichiarare il sospetto non costa tempo: è un pensiero, non un gesto', () => {
  const i = avvia(casoConClasse());
  const prima = i.t;
  i.dichiaraSospetto('C02');
  assert.equal(i.sospetto.codice, 'C02');
  assert.equal(i.t, prima, 'il tempo qui scorre solo con le azioni');
});

test('si può cambiare idea, e resta scritto quando', () => {
  const i = avvia(casoConClasse());
  i.dichiaraSospetto('C02');
  i.avanza(120);
  i.dichiaraSospetto('C08');
  const p = i.chiudi();
  assert.equal(p.sospetto.prima.codice, 'C02');
  assert.equal(p.sospetto.finale.codice, 'C08');
  assert.equal(p.sospetto.cambi, 1);
  assert.equal(p.sospetto.giusto, true);
  assert.equal(p.sospetto.azzeccatoA, 120, 'il minuto in cui ci sei arrivato');
});

test('ridichiarare lo stesso sospetto non conta come un cambio', () => {
  const i = avvia(casoConClasse());
  i.dichiaraSospetto('C08');
  i.dichiaraSospetto('C08');
  assert.equal(i.chiudi().sospetto.cambi, 0);
});

test('una classe che non esiste viene rifiutata', () => {
  const i = avvia(casoConClasse());
  assert.equal(i.dichiaraSospetto('C21').ok, false);
});

test('la classe difendibile conta giusta', () => {
  /* La sincope regge sia come cardiocircolatoria sia come neurologica:
     bocciarne una insegnerebbe una cosa falsa. */
  const i = avvia(casoConClasse({ classe: 'C02', classeAnche: ['C04'] }));
  i.dichiaraSospetto('C04');
  assert.equal(i.chiudi().sospetto.giusto, true);
});

test('chi non dichiara mai niente non ha sospetto, e non esplode', () => {
  const i = avvia(casoConAnamnesi());
  const p = i.chiudi();
  assert.equal(p.sospetto, null, 'senza classe dichiarata non c\'è niente da valutare');
});
```

- [ ] **Step 2: Eseguire i test per vederli fallire**

Run: `node --test tests/sim-engine.test.mjs`
Expected: FAIL — `i.primaImpressione` è `undefined`

- [ ] **Step 3: Scrivere l'implementazione**

In `assets/js/core/sim-engine.js`, in cima accanto agli altri import:

```js
import { CLASSI, nomeClasse } from '../data/classi-patologia.js';
```

Dentro `creaIntervento`, accanto alle altre variabili di stato (dove stanno
`let letture` e `let fatte`, righe 122-136), aggiungere:

```js
  /* Cosa pensi di avere davanti, e da che minuto. Ogni cambio resta:
     alla fine conta da dove sei partito, dove sei arrivato e QUANDO ci
     sei arrivato. */
  let sospetti = [];                // { codice, t }

  /* Il banco chiede la prima impressione una volta sola, subito dopo il
     colpo d'occhio, e aspetta. Solo se il caso dichiara delle plausibili:
     nessun caso è obbligato a partecipare. */
  let primaImpressionePendente = caso.sospettiPlausibili?.length
    ? { opzioni: [...caso.sospettiPlausibili, 'C20'] }
    : null;
```

**Attenzione all'ordine:** queste `let` vanno dichiarate **prima** di
qualunque funzione che le usa venga *chiamata*, non prima che sia scritta.
Metterle insieme alle altre variabili di stato le mette al posto giusto.

Poi, **subito prima** della funzione `pagella()`, aggiungere:

```js
  /* --------------------------- il sospetto ------------------------- */

  /** Dichiara cosa pensi di avere davanti. Non costa tempo: è un
      pensiero, non un gesto, e il tempo qui scorre solo con le azioni. */
  function dichiaraSospetto(codice) {
    if (!CLASSI[codice]) return { ok: false, motivo: 'Classe di patologia sconosciuta.' };

    primaImpressionePendente = null;

    /* Ridichiarare quello che hai già in mente non è un ripensamento. */
    if (sospetti[sospetti.length - 1]?.codice === codice) return { ok: true };

    sospetti = [...sospetti, { codice, t }];
    scrivi('sospetto', `Pensi a un quadro di tipo ${nomeClasse(codice)}.`);
    notifica();
    return { ok: true };
  }

  /** Com'è andata col riconoscimento. `null` se il caso non dichiara una
      classe: senza risposta giusta non c'è niente da valutare. */
  function revisioneSospetto() {
    if (!caso.classe) return null;
    const giusta = (c) => c === caso.classe || (caso.classeAnche || []).includes(c);
    const azzeccato = sospetti.find((s) => giusta(s.codice));
    return {
      storico: sospetti,
      prima: sospetti[0] || null,
      finale: sospetti[sospetti.length - 1] || null,
      giusto: Boolean(sospetti.length && giusta(sospetti[sospetti.length - 1].codice)),
      azzeccatoA: azzeccato ? azzeccato.t : null,
      cambi: Math.max(0, sospetti.length - 1),
      attesa: caso.classe,
      attesaLabel: nomeClasse(caso.classe),
    };
  }
```

Dentro `esegui`, **subito dopo** la riga
`if (decisionePendente) return { ok: false, motivo: 'Prima rispondi a quello che sta succedendo.' };`
aggiungere:

```js
    if (primaImpressionePendente) {
      return { ok: false, motivo: 'Prima dì cosa pensi di avere davanti.' };
    }
```

Nell'oggetto che `pagella()` restituisce, accanto a `tempoButtato`,
aggiungere:

```js
      sospetto: revisioneSospetto(),
```

E nell'oggetto restituito da `creaIntervento` (dove stanno
`get stato()`, `get diario()`…), aggiungere:

```js
    dichiaraSospetto,
    get sospetto() { return sospetti[sospetti.length - 1] || null; },
    get sospetti() { return sospetti; },
    get primaImpressione() { return primaImpressionePendente; },
```

- [ ] **Step 4: Eseguire tutti i test**

Run: `node --test tests/*.test.mjs`
Expected: i nove test nuovi passano.

- [ ] **Step 5: Commit**

```bash
git add assets/js/core/sim-engine.js tests/sim-engine.test.mjs
git commit -m "feat(sim): il sospetto si dichiara, si cambia, e resta scritto quando"
```

---

## Task 7: Le classi sui sette casi

**Files:**
- Modify: `assets/js/data/casi.js`
- Test: `tests/casi.test.mjs`

- [ ] **Step 1: Scrivere i test che falliscono**

Aggiungere in fondo a `tests/casi.test.mjs`:

```js
/* ==================== le classi di patologia ======================== */

import { CLASSI } from '../assets/js/data/classi-patologia.js';

test('ogni caso a tempo dichiara una classe che esiste sulla scheda', () => {
  CASI.filter((c) => c.motore === 3).forEach((c) => {
    assert.ok(c.classe, `${c.id}: manca la classe di patologia`);
    assert.ok(CLASSI[c.classe], `${c.id}: ${c.classe} non è una classe ARES`);
    (c.classeAnche || []).forEach((x) => {
      assert.ok(CLASSI[x], `${c.id}: ${x} non è una classe ARES`);
      assert.notEqual(x, c.classe, `${c.id}: ${x} è già la classe principale`);
    });
  });
});

test('chi chiede la prima impressione ha una risposta giusta da dare', () => {
  CASI.filter((c) => c.sospettiPlausibili?.length).forEach((c) => {
    assert.ok(c.classe, `${c.id}: chiede il sospetto ma non dice quale sia giusto`);
    assert.ok(c.sospettiPlausibili.includes(c.classe),
      `${c.id}: la classe giusta non è fra quelle proposte`);
    c.sospettiPlausibili.forEach((x) => {
      assert.ok(CLASSI[x], `${c.id}: ${x} non è una classe ARES`);
    });
    assert.ok(!c.sospettiPlausibili.includes('C20'),
      `${c.id}: «non lo so» lo aggiunge il motore, non va dichiarato`);
    assert.ok(c.sospettiPlausibili.length >= 3 && c.sospettiPlausibili.length <= 6,
      `${c.id}: ne propone ${c.sospettiPlausibili.length}, ne servono da tre a sei`);
  });
});
```

- [ ] **Step 2: Eseguire i test per vederli fallire**

Run: `node --test tests/casi.test.mjs`
Expected: FAIL — «shock-v3: manca la classe di patologia»

- [ ] **Step 3: Scrivere le classi**

In `assets/js/data/casi.js`, aggiungere a ciascun caso di motore 3, subito
dopo la riga `capitoli: [...]`, il blocco corrispondente.

**`shock-v3`** — il suo ragguaglio dice «sospetto sanguinamento
gastroenterico in atto», ma il quadro con cui si presenta è uno shock:

```js
    /* Il sanguinamento è gastroenterico, ma chi legge un quadro di shock
       e dichiara C02 non ha detto una sciocchezza: sta descrivendo quello
       che vede. Tutte e due contano. */
    classe: 'C09',
    classeAnche: ['C02'],
    sospettiPlausibili: ['C02', 'C04', 'C08', 'C09'],
```

**`toracico-v3`**:

```js
    classe: 'C02',
    sospettiPlausibili: ['C02', 'C03', 'C09'],
```

**`ipoglicemia-v3`** — la trappola del caso è proprio scambiarlo per
un'intossicazione alcolica:

```js
    classe: 'C08',
    sospettiPlausibili: ['C04', 'C05', 'C07', 'C08'],
```

**`incidente-v3`**:

```js
    classe: 'C01',
    sospettiPlausibili: ['C01', 'C02', 'C04'],
```

**`sincope-v3`** — regge davvero in due modi:

```js
    classe: 'C02',
    classeAnche: ['C04'],
    sospettiPlausibili: ['C02', 'C04', 'C08'],
```

**`ictus-v3`**:

```js
    classe: 'C04',
    sospettiPlausibili: ['C02', 'C04', 'C08'],
```

**`cocaina-v3`**:

```js
    classe: 'C07',
    classeAnche: ['C02'],
    sospettiPlausibili: ['C02', 'C05', 'C07', 'C08'],
```

- [ ] **Step 4: Eseguire tutti i test**

Run: `node --test tests/*.test.mjs`
Expected: i due test nuovi passano.

**Molti test dei casi falliranno adesso**, perché ogni partita automatica
si blocca sulla prima impressione in attesa. È previsto e lo chiude lo
Step 5.

- [ ] **Step 5: Insegnare ai test automatici a rispondere**

Le partite automatiche di `tests/casi.test.mjs` eseguono azioni senza
sapere del sospetto. Serve che lo dichiarino prima di cominciare.

In `tests/casi.test.mjs`, **sostituire**:

```js
const avvia = (caso) => creaIntervento(caso, { azioni: AZIONI });
```

con:

```js
/** Avvia un intervento e toglie di mezzo la prima impressione, che
    altrimenti blocca ogni partita automatica. I test che vogliono
    provare il sospetto lo dichiarano loro, dopo. */
const avvia = (caso) => {
  const i = creaIntervento(caso, { azioni: AZIONI });
  if (i.primaImpressione) i.dichiaraSospetto('C20');
  return i;
};
```

`C20` è «non lo so»: neutra, non falsa nessun test sul riconoscimento.

Stessa cosa in `tests/sim-engine.test.mjs`, se lì `avvia` viene usata su
casi che dichiarano `sospettiPlausibili` — i test del Task 6 usano
`casoConClasse()` e vogliono la prima impressione attiva, quindi **non**
si tocca `avvia` in quel file.

- [ ] **Step 6: Eseguire tutti i test**

Run: `node --test tests/*.test.mjs`
Expected: PASS tranne quelli che il Task 4 ha reso rossi. Se ne restano,
sono incoerenze fra indicazioni e casi: le chiude il Task 8.

- [ ] **Step 7: Commit**

```bash
git add assets/js/data/casi.js tests/casi.test.mjs
git commit -m "feat(casi): ogni caso dichiara la sua classe di patologia e i sospetti plausibili"
```

---

## Task 8: La coerenza fra quello che il caso chiede e quello che il giudizio pensa

Il task che ripaga tutto: se un caso pretende un gesto che il giudizio
considera superfluo, uno dei due è sbagliato.

**Files:**
- Modify: `assets/js/data/indicazioni.js` o `assets/js/data/casi.js`, secondo cosa esce
- Test: `tests/casi.test.mjs`

- [ ] **Step 1: Guardare le incoerenze prima di scrivere il test**

Questo script gioca ogni caso facendo tutte le sue azioni necessarie in
ordine, e stampa quelle che il giudizio boccia:

```bash
node --input-type=module -e "
import { CASI } from './assets/js/data/casi.js';
import { AZIONI } from './assets/js/data/azioni.js';
import { creaIntervento } from './assets/js/core/sim-engine.js';

for (const c of CASI.filter((x) => x.motore === 3)) {
  const i = creaIntervento(c, { azioni: AZIONI });
  if (i.primaImpressione) i.dichiaraSospetto(c.classe);
  for (const n of c.azioni.necessarie) {
    const id = [].concat(n.id)[0];
    if (String(id).startsWith('domanda:')) { i.chiedi(String(id).slice(8)); continue; }
    i.esegui(id, (AZIONI[id]?.chi || ['tu'])[0]);
    while (i.decisionePendente) i.rispondiDecisione(0);
  }
  const male = i.fatte.filter((f) => f.giudizio && f.giudizio.ok === false);
  if (male.length) {
    console.log('### ' + c.id);
    male.forEach((f) => console.log('   ' + f.id.padEnd(20) + f.giudizio.perche.slice(0, 90)));
  }
}
console.log('--- fine ---');
"
```

- [ ] **Step 2: Sistemare ogni incoerenza, una per una**

Per ognuna, decidere **quale delle due parti ha ragione**. Tre esiti
possibili, e solo tre:

1. **Ha ragione il caso** — il gesto lì serve davvero, e l'indicazione è
   scritta troppo stretta. Si allarga il predicato in `indicazioni.js`,
   e il commento dice perché quel caso rientra.
2. **Ha ragione l'indicazione** — quel gesto lì non serviva, ed era il
   caso a chiederlo per abitudine. Si toglie da `azioni.necessarie` e si
   sposta in `azioni.utili`, dove non toglie punti a chi non lo fa.
3. **Manca un'informazione al contesto** — il gesto serve ma solo dopo
   aver saputo qualcosa, e il caso non lo fa sapere. Si aggiunge la
   chiave a `rivela` della domanda giusta nell'anamnesi del caso.

Il terzo esito è il più frequente e il più interessante: è il motore che
dice «hai messo questo gesto fra i necessari, ma il soccorritore non ha
nessun modo di sapere che serviva».

**Non si allarga un'indicazione a `() => true` per far passare un test.**
Se un'indicazione diventa sempre vera, si cancella: vuol dire che quella
regola non c'era.

- [ ] **Step 3: Scrivere il test che la fissa**

Aggiungere in fondo a `tests/casi.test.mjs`:

```js
test('quello che un caso chiede, il giudizio lo approva', () => {
  /* Se un caso pretende un gesto che il giudizio considera superfluo,
     uno dei due è sbagliato — e il volontario che si fida della pagella
     imparerebbe la cosa storta. Meglio scoprirlo qui. */
  CASI.filter((c) => c.motore === 3).forEach((c) => {
    const i = avvia(c);
    if (c.classe) i.dichiaraSospetto(c.classe);
    c.azioni.necessarie.forEach((n) => {
      const id = [].concat(n.id)[0];
      if (String(id).startsWith('domanda:')) { i.chiedi(String(id).slice(8)); return; }
      i.esegui(id, (AZIONI[id]?.chi || ['tu'])[0]);
      rispondiSeServe(i);
    });
    i.fatte.filter((f) => f.giudizio && f.giudizio.ok === false).forEach((f) => {
      assert.fail(`${c.id}: chiede «${f.id}» ma il giudizio dice che non serviva — ${f.giudizio.perche}`);
    });
  });
});
```

- [ ] **Step 4: Eseguire tutti i test**

Run: `node --test tests/*.test.mjs`
Expected: PASS, tutti. Se il test nuovo fallisce, tornare allo Step 2:
c'è ancora un'incoerenza vera da decidere.

- [ ] **Step 5: Commit**

```bash
git add assets/js/data/indicazioni.js assets/js/data/casi.js tests/casi.test.mjs
git commit -m "test(casi): quello che un caso chiede deve stare in piedi col giudizio"
```

---

## Task 9: L'ambra nel diario

Da qui si lavora anche nel browser.

**Files:**
- Modify: `assets/js/modules/intervento.js`

- [ ] **Step 1: Dare un simbolo al tipo nuovo**

In `assets/js/modules/intervento.js`, trovare la riga dei simboli:

```bash
grep -n "osservazione: '👁'" assets/js/modules/intervento.js
```

**Sostituire**:

```js
  osservazione: '👁', azione: '›', squadra: '»', evento: '!', allarme: '⚠', esito: '■',
```

con:

```js
  osservazione: '👁', azione: '›', squadra: '»', evento: '!', allarme: '⚠', esito: '■',
  giudizio: '⚠', sospetto: '?',
```

- [ ] **Step 2: Nascondere le righe di giudizio in modalità esame**

`aggiornaDiario()` sta a riga 221 e costruisce ogni riga come
`div.riga.${r.tipo}`: la classe CSS arriva da sola, non serve toccarla.
Va toccata solo la sorgente. **Sostituire**:

```js
function aggiornaDiario() {
  mount(n.diario, ...sim.diario.map((r) => el(`div.riga.${r.tipo}`, {}, [
```

con:

```js
function aggiornaDiario() {
  /* In modalità esame nessuno ti corregge mentre lavori. Le righe del
     giudizio il motore le scrive comunque: si vedono tutte alla fine,
     nel debriefing, che il diario lo mostra per intero. */
  const righe = sim.diario.filter((r) => !(modalitaEsame && r.tipo === 'giudizio'));
  mount(n.diario, ...righe.map((r) => el(`div.riga.${r.tipo}`, {}, [
```

- [ ] **Step 3: Dare il colore ambra**

In `assets/css/intervento.css`, **subito dopo** le due righe di
`.riga.allarme` (intorno a riga 78), aggiungere:

```css
/* Il gesto che non serviva: ambra come gli eventi, perché non è un
   errore che fa male al paziente — è tempo che se ne va. Il rosso resta
   per le cose che gli fanno danno. */
.riga.giudizio .txt { color: var(--amber); }
.riga.giudizio .seg { color: var(--amber); }
.riga.sospetto .txt { color: var(--ink-3); font-style: italic; }
```

`--amber` esiste già in `tokens.css` ed è quello usato dagli eventi:
niente colore nuovo da inventare.

- [ ] **Step 4: Provare nel browser**

```bash
python3 -m http.server 8925
```

**Questo passo si fa dopo il Task 11.** Da quando il Task 7 ha dato i
`sospettiPlausibili` ai casi, il motore blocca ogni azione finché non
arriva la prima impressione, e il pannello che la chiede non esiste
ancora. Lasciare la casella vuota, tirare dritto fino al Task 11 e
tornare qui.

Quando si potrà giocare: su `toracico-v3` misurare la glicemia e
verificare che sotto la riga dell'azione compaia quella ambra con la
ragione, e che il diario non sbordi in larghezza a 400 px.

- [ ] **Step 5: Eseguire tutti i test**

Run: `node --test tests/*.test.mjs`
Expected: PASS, tutti — nessun test tocca il DOM.

- [ ] **Step 6: Commit**

```bash
git add assets/js/modules/intervento.js assets/css/
git commit -m "feat(intervento): la riga ambra quando un gesto non era indicato"
```

---

## Task 10: Il riquadro del sospetto

**Files:**
- Modify: `assets/js/modules/intervento.js`

- [ ] **Step 1: Costruire il riquadro**

Un `<select>` nativo con `<optgroup>`: su un telefono apre il selettore di
sistema, che è il modo più leggibile di scegliere fra diciassette voci, e
non costa una riga di CSS.

In `assets/js/modules/intervento.js`, in cima accanto agli altri import:

```js
import { CLASSI, GRUPPI_CLASSI, nomeClasse } from '../data/classi-patologia.js';
```

Aggiungere questa funzione accanto a `aggiornaSquadra()`:

```js
/* Cosa pensi di avere davanti. Un `select` nativo e non una griglia di
   bottoni: diciassette voci su un telefono le sa mostrare solo il
   selettore di sistema, e per giunta gratis. */
function costruisciSospetto() {
  const sel = el('select.sospetto-sel', { 'aria-label': 'Cosa sospetti' });
  sel.append(el('option', { value: '', text: '— cosa sospetti? —' }));
  GRUPPI_CLASSI.forEach((g) => {
    const gruppo = el('optgroup', { label: g.label });
    g.codici.forEach((c) => {
      gruppo.append(el('option', { value: c, text: nomeClasse(c) }));
    });
    sel.append(gruppo);
  });
  sel.addEventListener('change', () => {
    if (!sel.value) return;
    sim.dichiaraSospetto(sel.value);
    aggiornaTutto();
  });
  return sel;
}

function aggiornaSospetto() {
  if (!n.sospetto) return;
  /* Senza una classe giusta dichiarata dal caso non c'è niente da
     correggere, e un campo che non viene mai valutato è peggio che
     assente. */
  const attivo = Boolean(sim.caso.classe);
  n.sospetto.box.hidden = !attivo;
  if (!attivo) return;
  const s = sim.sospetto;
  n.sospetto.sel.value = s?.codice || '';
  n.sospetto.quando.textContent = s ? `dalle ${Math.floor(s.t / 60)}:${String(s.t % 60).padStart(2, '0')}` : '';
}
```

- [ ] **Step 2: Innestarlo nella pagina**

Dentro `render()`, dove si costruiscono i nodi (cercare dove si crea il
pannello della squadra):

```bash
grep -n "squadra" assets/js/modules/intervento.js | head -12
```

Creare il nodo accanto a quello della squadra:

```js
  const selSospetto = costruisciSospetto();
  const quandoSospetto = el('span.sospetto-quando');
  const boxSospetto = el('div.sospetto-box', { hidden: true }, [
    el('span.sospetto-eti', { text: 'Sospetti' }), selSospetto, quandoSospetto,
  ]);
```

Aggiungerlo al DOM subito dopo il pannello della squadra, e registrarlo
fra i nodi:

```js
    sospetto: { box: boxSospetto, sel: selSospetto, quando: quandoSospetto },
```

Infine, dentro `aggiornaTutto()`, aggiungere la chiamata:

```js
  aggiornaSospetto();
```

- [ ] **Step 3: Il CSS, poche righe**

In `assets/css/` — nel file dove stanno gli stili dell'intervento, che si
trova con `grep -ln "az-testo" assets/css/*.css` — aggiungere:

```css
/* Il sospetto: una riga sola, che su un telefono è tutto lo spazio che
   c'è. Il prefisso `sospetto-` perché i nomi generici collidono fra
   moduli, e questa lezione è già stata pagata. */
.sospetto-box { display: flex; align-items: center; gap: .5rem; flex-wrap: wrap; }
.sospetto-eti { font-size: .8rem; opacity: .7; text-transform: uppercase; letter-spacing: .04em; }
.sospetto-sel { flex: 1 1 12rem; min-width: 0; }
.sospetto-quando { font-size: .8rem; opacity: .6; }
```

- [ ] **Step 4: Provare nel browser**

Aprire un caso a 400 px e verificare che il riquadro ci sia, che il
selettore si apra, che scegliendo una classe compaia l'orario e che il
diario riporti la riga «Pensi a un quadro di tipo…».

- [ ] **Step 5: Eseguire tutti i test**

Run: `node --test tests/*.test.mjs`
Expected: PASS, tutti.

- [ ] **Step 6: Commit**

```bash
git add assets/js/modules/intervento.js assets/css/
git commit -m "feat(intervento): il riquadro del sospetto, con le classi della scheda ARES"
```

---

## Task 11: La prima impressione

**Files:**
- Modify: `assets/js/modules/intervento.js`

- [ ] **Step 1: Costruire il pannello**

Ricalca quello delle decisioni, che sta a riga 231 circa
(`aggiornaDecisione`). Guardarlo prima:

```bash
sed -n '231,266p' assets/js/modules/intervento.js
```

Aggiungere accanto:

```js
/* La prima impressione, una volta sola dopo il colpo d'occhio. Non tutte
   e diciassette le classi: le quattro o cinque che il caso dichiara
   plausibili, più «non lo so» che è sempre in fondo e non è un ripiego —
   davanti a certi pazienti è la sola risposta onesta. */
function aggiornaPrimaImpressione() {
  const p = sim.primaImpressione;
  if (!p) { n.impressione.hidden = true; mount(n.impressione); return; }

  n.impressione.hidden = false;
  const opzioni = el('div.opts', {}, p.opzioni.map((codice) => {
    const b = el('button.opt', { type: 'button' }, [nomeClasse(codice)]);
    b.addEventListener('click', () => {
      sim.dichiaraSospetto(codice);
      aggiornaTutto();
    });
    return b;
  }));

  mount(n.impressione,
    el('p.step-num', { style: { margin: '0' }, text: 'prima di toccarlo' }),
    el('h3', { text: 'Cosa pensi che sia?' }),
    el('p.impressione-nota', { text: 'Si cambia quando vuoi, mentre raccogli.' }),
    opzioni);
  n.impressione.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}
```

- [ ] **Step 2: Innestarlo**

Dentro `render()`, accanto al nodo della decisione (cercare
`const decisione = el('div.decisione.step'`), creare:

```js
  const impressione = el('div.impressione.decisione.step', {
    hidden: true, role: 'alertdialog', 'aria-live': 'assertive',
  });
```

Riusa le classi `decisione.step`, così eredita lo stile che c'è già senza
scriverne di nuovo.

Aggiungerlo al DOM **sopra** il pannello della decisione, registrarlo fra i
nodi come `impressione,` e chiamare `aggiornaPrimaImpressione();` dentro
`aggiornaTutto()`, **prima** di `aggiornaDecisione()`.

- [ ] **Step 3: Provare nel browser tutti e sette i casi**

Con `python3 -m http.server 8925`, a 400 px, aprire ognuno dei sette e
verificare che:

- il pannello compaia subito, con le classi plausibili e «non lo so» in fondo;
- finché non rispondi, le azioni della palette rifiutino con
  «Prima dì cosa pensi di avere davanti»;
- dopo aver risposto, il riquadro del sospetto mostri la classe scelta;
- la console sia pulita.

```
http://localhost:8925/index.html#/intervento/shock-v3
http://localhost:8925/index.html#/intervento/toracico-v3
http://localhost:8925/index.html#/intervento/ipoglicemia-v3
http://localhost:8925/index.html#/intervento/incidente-v3
http://localhost:8925/index.html#/intervento/sincope-v3
http://localhost:8925/index.html#/intervento/ictus-v3
http://localhost:8925/index.html#/intervento/cocaina-v3
```

- [ ] **Step 4: Eseguire tutti i test**

Run: `node --test tests/*.test.mjs`
Expected: PASS, tutti.

- [ ] **Step 5: Commit**

```bash
git add assets/js/modules/intervento.js
git commit -m "feat(intervento): la prima impressione, chiesta una volta dopo il colpo d'occhio"
```

---

## Task 12: Le due sezioni nuove del debriefing

**Files:**
- Modify: `assets/js/modules/debriefing.js`

- [ ] **Step 1: La sezione del tempo buttato**

In `assets/js/modules/debriefing.js`, in cima accanto agli altri import:

```js
import { nomeClasse } from '../data/classi-patologia.js';
```

Aggiungere questa funzione prima di `mostraDebriefing`:

```js
const mmss = (s) => `${Math.floor(s / 60)}:${String(Math.round(s) % 60).padStart(2, '0')}`;

/* Quello che non serviva. Non toglie punti — in servizio nessuno te ne
   toglie — ma i secondi si vedono, e si vedono accanto alle finestre che
   hai mancato: è lì che il conto diventa concreto. */
function sezioneTempoButtato(p) {
  const b = p.tempoButtato;
  if (!b || !b.voci.length) return null;

  const tardi = p.necessarie.filter((n) => n.ritardo || !n.fatta);
  const nota = tardi.length
    ? `Nel frattempo: ${tardi.map((n) => n.label.toLowerCase()).join(', ')}.`
    : 'Stavolta sei rimasto dentro i tempi lo stesso.';

  return el('section.deb-sez', {}, [
    el('h3', { text: `${mmss(b.secondi)} su gesti che non servivano` }),
    el('p.deb-nota', { text: nota }),
    el('ul.deb-elenco', {}, b.voci.map((v) => el('li', {}, [
      el('b', { text: `${v.label} — ${v.secondi}s` }),
      el('span', { text: v.perche }),
      v.fonte ? el('small.deb-fonte', { text: v.fonte }) : null,
    ].filter(Boolean)))),
  ]);
}
```

- [ ] **Step 2: La sezione del sospetto**

Sotto la precedente:

```js
/* Il riconoscimento. Nessun punteggio: quello che conta è QUANDO ci sei
   arrivato, e se ci sei arrivato cambiando idea o restando fermo su
   quello che avevi pensato dalla porta. */
function sezioneSospetto(p) {
  const s = p.sospetto;
  if (!s) return null;

  if (!s.finale) {
    return el('section.deb-sez', {}, [
      el('h3', { text: 'Non hai mai detto cosa pensavi' }),
      el('p', { text: `Era un quadro di tipo ${s.attesaLabel}.` }),
    ]);
  }

  const righe = [];
  righe.push(`Sei partito da ${nomeClasse(s.prima.codice)}.`);
  if (s.cambi === 0) {
    righe.push(s.giusto
      ? 'Non hai avuto bisogno di cambiare idea.'
      : 'Non hai mai cambiato idea, e questa volta era la strada sbagliata.');
  } else {
    righe.push(`Hai cambiato idea ${s.cambi === 1 ? 'una volta' : `${s.cambi} volte`}, `
      + `e sei arrivato a ${nomeClasse(s.finale.codice)}.`);
  }
  if (s.azzeccatoA !== null) {
    righe.push(`Ci sei arrivato a ${mmss(s.azzeccatoA)}.`);
  } else {
    righe.push(`Era ${s.attesaLabel}.`);
  }

  return el('section.deb-sez', {}, [
    el('h3', { text: s.giusto ? 'L\'hai inquadrato' : 'Il quadro era un altro' }),
    el('p', { text: righe.join(' ') }),
  ]);
}
```

- [ ] **Step 3: Innestarle**

Dentro `mostraDebriefing`, trovare dove si montano le sezioni:

```bash
grep -n "mount(\|append(" assets/js/modules/debriefing.js | head -20
```

Aggiungere le due sezioni **subito dopo la pagella e prima del grafico**,
filtrando i nulli come vuole la trappola già pagata nel progetto
(`replaceChildren(..., null)` stampa la stringa «null»):

```js
    ...[sezioneSospetto(p), sezioneTempoButtato(p)].filter(Boolean),
```

- [ ] **Step 4: Provare nel browser**

Giocare `toracico-v3` facendo di proposito due gesti inutili — la glicemia
e il collare — poi consegnare. Verificare che compaiano le due sezioni,
che i secondi tornino (30 + 60 = 1:30) e che il testo del sospetto dica il
vero.

- [ ] **Step 5: Eseguire tutti i test**

Run: `node --test tests/*.test.mjs`
Expected: PASS, tutti.

- [ ] **Step 6: Commit**

```bash
git add assets/js/modules/debriefing.js
git commit -m "feat(debriefing): il tempo buttato e la storia del sospetto"
```

---

## Task 13: Prova completa e rilascio

**Files:**
- Modify: `assets/js/versione.js`
- Modify: `sw.js:11`
- Modify: `CLAUDE.md`

- [ ] **Step 1: Provare a fondo, a larghezza telefono**

Con `python3 -m http.server 8925`, a 400 px:

- **`toracico-v3` fatto bene**: prima impressione C02, tutte le necessarie,
  nessun gesto inutile. Il debriefing non deve mostrare la sezione del
  tempo buttato, e il sospetto deve dire «l'hai inquadrato» senza cambi;
- **`ipoglicemia-v3` fatto male di proposito**: dichiarare C07
  tossicologica (è la trappola del caso: sembra un ubriaco), fare il
  collare e l'ECG, poi misurare la glicemia e correggere a C08. Il
  debriefing deve dire da dove sei partito, che hai cambiato una volta e
  a che minuto ci sei arrivato, e sommare i secondi di collare ed ECG;
- **`incidente-v3`**: collare, spinale e KED **non** devono comparire come
  superflui — è un trauma;
- **modalità esame** su un caso qualsiasi: nessuna riga ambra nel diario
  durante, tutte visibili nel debriefing;
- la console pulita e nessuna larghezza che sborda.

- [ ] **Step 2: Verificare che i test siano tutti verdi**

Run: `node --test tests/*.test.mjs`
Expected: PASS, nessun fallimento. Il conto deve stare intorno ai 295.

- [ ] **Step 3: Alzare il numero di versione**

In `assets/js/versione.js`:

```js
export const VERSIONE = '1.12.0';
export const DATA_VERSIONE = '<la data di oggi>';
```

e come prima riga di `NOVITA`:

```js
  { v: '1.12.0', t: 'Le simulazioni smettono di essere una lista da spuntare. Ogni gesto adesso ha un momento in cui ha senso: la glicemia si misura a chi ha la coscienza alterata o a un diabetico, il collare a chi ha un trauma, il reservoir a chi è davvero ipossico — e chi lo fa fuori da lì se lo sente dire, con la fonte del manuale, e si vede quanti secondi gli sono costati e quale finestra ha mancato per colpa loro. La regola guarda solo quello che sai in quel momento, mai quello che scoprirai dopo. E il banco ti chiede cosa pensi di avere davanti, con le diciassette classi della scheda ARES: appena visto il paziente e poi tutte le volte che vuoi, così alla fine sa dirti non solo se l\'hai capito, ma a che minuto.' },
```

In `sw.js` riga 11:

```js
const CACHE = 'consoletssa-1.12.0';
```

- [ ] **Step 4: Aggiornare `CLAUDE.md`**

Il repo ha la convenzione del commit `docs:` a fine ciclo. Aggiornare:

- la mappa dei file: `core/giudizio.js`, `data/indicazioni.js`,
  `data/classi-patologia.js` e `modules/debriefing.js` sono nuovi;
- la sezione del motore nuovo: dire che un'azione può dichiarare quando è
  indicata, che il giudizio si dà **all'avvio** dell'azione, e che il
  contesto contiene solo il conoscibile;
- le trappole: aggiungere che `richiede` blocca mentre `indicazione`
  giudica e non blocca, e che `letture.pa` è una stringa mentre `pas` è il
  numero;
- «Cosa resta da fare»: il pezzo A è a metà — resta **A2, la dotazione**
  (presidi dello zaino e dell'ambulanza come azioni, misure dove contano,
  inventario sfogliabile), poi la **scheda ARES** e le **carte di ripasso**
  rifatte.

- [ ] **Step 5: Commit e pubblicazione**

```bash
git add -A
git commit -m "feat: il giudizio clinico — quando un gesto serve, quanto costa quello che non serve, e cosa pensi di avere davanti"
git push origin HEAD
```

- [ ] **Step 6: Verificare la pubblicazione**

```bash
curl -s "https://g3ggy.github.io/consoletssa/assets/js/versione.js?x=$RANDOM" | grep VERSIONE
curl -s "https://g3ggy.github.io/consoletssa/sw.js?x=$RANDOM" | grep CACHE
```

Expected: `1.12.0` in tutti e due. GitHub Pages ci mette un minuto o due.
Se i due file non si allineano si finisce con versioni mescolate in cache.

---

## Cosa questo piano NON fa, di proposito

- **I presidi veri dello zaino e dell'ambulanza**, e le loro misure. Sono
  A2, la specifica va scritta: un presidio sbagliato è un caso
  particolare di azione non indicata, quindi eredita da qui il
  meccanismo senza aggiungerci niente.
- **La scheda ARES compilabile.** Terzo pezzo. Le diciassette classi
  nascono qui e serviranno lì.
- **Le carte di ripasso** senza il gira-la-carta.
- **Un'indicazione per tutte e sessantacinque le azioni.** Se ne scrivono
  ventitré, dove la regola esiste. Le altre restano lecite.
- **Il sospetto che influenza il giudizio delle azioni.** Sarebbe
  barabile: basterebbe dichiarare il falso per giustificare ogni gesto.
- **Togliere punti per il superfluo.** Costa il tempo, e basta.

## Le assunzioni nostre, marcate nel codice

- **quali ventitré azioni** meritano un'indicazione e quali restano sempre
  lecite;
- **le soglie dentro i predicati** dove il manuale dà un'indicazione
  qualitativa e non un numero — in particolare i 94 e i 90 di saturazione
  che separano i tre presidi dell'ossigeno, e i 110 di sistolica sotto i
  quali si cercano i segni del compenso;
- **il fatto che il tempo buttato non tolga punti**: è una scelta
  didattica, non una regola clinica;
- **il raggruppamento delle diciassette classi per apparato**: la scheda
  ARES le stampa in un elenco solo, i gruppi sono nostri e servono a
  farle stare in un telefono.
