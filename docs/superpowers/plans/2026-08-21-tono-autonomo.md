# Il tono autonomo — piano di realizzazione

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fare dell'allarme adrenergico un asse del motore — un solo numero
da cui escono frequenza, pressione, cute, pupille e respiro — e scriverci
sopra `cocaina-v3`, il caso che senza non esisterebbe.

**Architecture:** Una funzione pura nuova in `core/fisiologia.js`,
`allarme()`, che somma quanto sangue, ossigeno e zucchero mancano, quanto
fa male, e un termine `tonoAutonomo` che il caso dichiara per quello che
viene da fuori. `circolo()` e `parametriVisibili()` smettono di leggere la
perdita e il dolore separatamente e leggono l'asse. Un'offesa nuova
(`simpaticomimetico`) tiene alto il tono e l'ambiente calmo lo abbassa. Le
risposte dell'anamnesi possono avere varianti condizionate dai tag, che è
come si modella la domanda fatta in disparte.

**Tech Stack:** JavaScript, moduli ES nativi, nessuna dipendenza, nessun
passo di build. Test con `node --test`.

**Specifica:** `docs/superpowers/specs/2026-08-21-tono-autonomo-design.md`

---

## Prima di cominciare

Leggere `CLAUDE.md` alla radice. In sintesi:

- **Niente build.** Moduli ES nativi. Se serve compilare, è la strada sbagliata.
- **Tutto in italiano**: nomi, commenti, testi. I commenti dicono *perché*.
- **Immutabilità**: oggetti nuovi, non mutazione in-place.
- **File piccoli**: 200-400 righe tipiche, 800 il massimo.
- **I parametri si calibrano, non si copiano.** Si chiama `parametriVisibili`
  da uno script e si guardano i numeri.

```bash
node --test tests/*.test.mjs      # i test
python3 -m http.server 8925       # il server locale, per provare nel browser
```

## Lo stato di partenza, misurato

Questi sono i numeri di **adesso**, presi con lo script prima di toccare
niente. Servono da riferimento per tutto il piano: dove il valore nuovo
deve coincidere, e dove deve muoversi.

```
--- ARRIVO (t=0) ---
shock-v3         FC  72  PA   84/58  FR 24  SpO2  98  gli  90  dol 0  cute pallida-fredda-sudata  refill 2.9  perd 0.204
toracico-v3      FC  95  PA  150/91  FR 16  SpO2  95  gli  90  dol 7  cute normale                refill 1.4  perd 0.000
ipoglicemia-v3   FC  72  PA  128/78  FR 16  SpO2  98  gli  55  dol 0  cute normale                refill 1.4  perd 0.000
incidente-v3     FC 106  PA  128/91  FR 24  SpO2  96  gli  90  dol 4  cute pallida                refill 2.4  perd 0.160
sincope-v3       FC  58  PA   90/56  FR 14  SpO2  99  gli  84  dol 0  cute normale                refill 1.4  perd 0.000
ictus-v3         FC  88  PA  178/95  FR 16  SpO2  96  gli 118  dol 0  cute normale                refill 1.4  perd 0.000
```

Lo script che li produce, da riusare a ogni calibrazione:

```bash
node --input-type=module -e "
import { CASI } from './assets/js/data/casi.js';
import { creaIntervento } from './assets/js/core/sim-engine.js';
import { AZIONI } from './assets/js/data/azioni.js';
for (const c of CASI.filter(x=>x.motore===3)) {
  const s = creaIntervento(c,{azioni:AZIONI}).stato;
  console.log(c.id.padEnd(15), 'FC '+String(s.fc).padStart(3), 'PA '+(s.pas+'/'+s.pad).padStart(7),
    'FR '+String(s.fr).padStart(2), 'SpO2 '+String(s.spo2).padStart(3), 'gli '+String(s.glicemia).padStart(3),
    'dol '+s.dolore, 'cute '+String(s.cute).padEnd(22), 'pup '+s.pupille, 'refill '+s.refill);
}
"
```

## Tre trappole, scritte per non ripagarle

**1 · Le soglie vanno scritte come frazioni, non come decimali.** La cute
oggi cambia a perdita ≥ 0,10 e ≥ 0,20; sull'asse diventano `1/3` e `2/3`.
Scrivere `0.33` e `0.67` sposta la soglia di mezzo punto percentuale di
perdita e fa fallire il test di non-regressione di `shock-v3`, che arriva a
0,204 → 0,680. Usare `1 / 3` e `2 / 3`.

**2 · Il dolore non va sommato due volte.** Oggi `circolo()` calcola una
frequenza senza dolore e `parametriVisibili()` ci aggiunge
`dolore × 3.5`. Quando il dolore entra nell'asse, quella somma in
`parametriVisibili` **va tolta**, se no il dolore conta doppio.

**3 · `applicaEffetto` ha un elenco di riserve scritto a mano.** In
`sim-engine.js` c'è `const RISERVE = ['volemia', ...]` che decide se un
delta va nelle riserve o nei parametri visibili. Se `tonoAutonomo` non ci
entra, un evento che lo tocca scrive un campo inutile sullo stato e non
cambia niente.

## Struttura dei file

| File | Responsabilità |
|---|---|
| `assets/js/core/fisiologia.js` | **modificato.** L'asse `allarme`, la riserva `tonoAutonomo`, i parametri che ne escono. |
| `assets/js/data/offese.js` | **modificato.** L'offesa `simpaticomimetico`. |
| `assets/js/core/anamnesi.js` | **modificato.** Le risposte a varianti. |
| `assets/js/core/sim-engine.js` | **modificato.** I tag passati a `rispostaA`, e `tonoAutonomo` fra le riserve. |
| `assets/js/data/azioni.js` | **modificato.** `parla-in-disparte`, e il diario delle pupille. |
| `assets/js/modules/intervento.js` | **modificato.** La tessera delle pupille. |
| `assets/js/data/casi.js` | **modificato.** `cocaina-v3`, e il ritocco di `sincope-v3`. |
| `assets/js/data/scenari.js`, `scenari-arrivo.js` | **modificati.** Via il doppione. |
| `tests/fisiologia.test.mjs`, `tests/casi.test.mjs`, `tests/anamnesi.test.mjs`, `tests/azioni.test.mjs` | **modificati.** |

---

## Task 1: Il test che fissa quello che non deve muoversi

Va scritto **per primo** e deve essere verde subito. È la rete: se l'asse
sposta un caso che non doveva muoversi, questo test lo dice.

**Files:**
- Modify: `tests/casi.test.mjs`

- [ ] **Step 1: Scrivere il test di non-regressione**

Aggiungere in fondo a `tests/casi.test.mjs`:

```js
/* ============ quello che l'asse dell'allarme non deve muovere ========
   `shock-v3` ha il compenso bloccato dal betabloccante e nessun dolore;
   `ictus-v3` non ha niente che allarmi. Sono i due casi che devono
   restare identici al mmHg quando la frequenza passa sull'asse: se si
   muovono, l'asse ha un peso sbagliato e non è una scelta, è un errore. */

test('shock-v3 e ictus-v3 restano identici al mmHg', () => {
  const atteso = {
    'shock-v3': { fc: 72, pas: 84, pad: 58, fr: 24, spo2: 98, cute: 'pallida-fredda-sudata', refill: 2.9 },
    'ictus-v3': { fc: 88, pas: 178, pad: 95, fr: 16, spo2: 96, cute: 'normale', refill: 1.4 },
  };
  Object.entries(atteso).forEach(([id, v]) => {
    const s = avvia(CASI.find((c) => c.id === id)).stato;
    Object.entries(v).forEach(([k, valore]) => {
      assert.equal(s[k], valore, `${id}: ${k} è ${s[k]}, era ${valore}`);
    });
  });
});

test('shock-v3 non si muove nemmeno dopo cinque minuti', () => {
  const i = avvia(CASI.find((c) => c.id === 'shock-v3'));
  lasciaPassare(i, 5);
  assert.equal(i.stato.fc, 72, 'il betabloccante gli tiene ferma la frequenza');
  assert.equal(i.stato.pas, 69);
  assert.equal(i.stato.cute, 'pallida-fredda-sudata');
});
```

- [ ] **Step 2: Verificare che sia verde adesso**

Run: `node --test tests/casi.test.mjs`
Expected: PASS. Se fallisce, i numeri qui sopra non corrispondono allo
stato del repo: rileggerli con lo script della sezione «lo stato di
partenza» e correggere il test **prima** di andare avanti.

- [ ] **Step 3: Commit**

```bash
git add tests/casi.test.mjs
git commit -m "test(casi): fissa i parametri che l'asse dell'allarme non deve muovere"
```

---

## Task 2: L'asse `allarme`

Solo la funzione pura. Non è ancora collegata a niente.

**Files:**
- Modify: `assets/js/core/fisiologia.js`
- Test: `tests/fisiologia.test.mjs`

- [ ] **Step 1: Scrivere i test che falliscono**

Aggiungere in fondo a `tests/fisiologia.test.mjs`. L'import a metà file
non è una svista: è lo stile di questo file, che ne ha già otto, uno per
sezione.

```js
/* ==================== l'asse dell'allarme =========================== */

import { allarme, allarmeEsogeno } from '../assets/js/core/fisiologia.js';

const sano = () => riserveIniziali({});

test('un adulto sano non è in allarme', () => {
  assert.equal(allarme(sano()), 0);
});

test('il sangue che manca alza l\'allarme, e a un terzo di perdita vale uno', () => {
  /* 0,30 è la soglia in cui il compenso cede: è lì che l'asse vale 1. */
  const r = { ...riserveIniziali({ volemia: 5000 }), volemia: 3500 };
  assert.ok(Math.abs(allarme(r) - 1) < 0.001, `vale ${allarme(r)}`);
});

test('l\'ossigeno che manca allarma', () => {
  assert.ok(allarme(riserveIniziali({ ossigenazione: 0.85 })) > 0.3);
  assert.equal(allarme(riserveIniziali({ ossigenazione: 0.98 })), 0, 'sopra 0,95 non allarma nessuno');
});

test('lo zucchero che manca allarma sotto i settanta', () => {
  assert.equal(allarme(riserveIniziali({ glicemia: 90 })), 0);
  assert.ok(Math.abs(allarme(riserveIniziali({ glicemia: 50 })) - 0.5) < 0.001);
  assert.ok(Math.abs(allarme(riserveIniziali({ glicemia: 30 })) - 1) < 0.001);
});

test('il dolore allarma, e a dieci vale uno', () => {
  assert.ok(Math.abs(allarme(riserveIniziali({ dolore: 10 })) - 1) < 0.001);
});

test('il tono autonomo è l\'unico termine che il caso dichiara', () => {
  assert.equal(allarme(riserveIniziali({ tonoAutonomo: 1.4 })), 1.4);
  assert.equal(allarme(riserveIniziali({ tonoAutonomo: -0.4 })), -0.4);
});

test('l\'asse ha un tetto e un pavimento', () => {
  assert.equal(allarme(riserveIniziali({ tonoAutonomo: 9 })), 2);
  assert.equal(allarme(riserveIniziali({ tonoAutonomo: -9 })), -1);
});

test('l\'esogeno è quello che il compenso da ipovolemia non copre già', () => {
  /* La vasocostrizione da ipovolemia sostiene già la pressione dentro
     `tenuta`: la spinta pressoria dell'asse deve prendere solo il resto. */
  const r = { ...riserveIniziali({ volemia: 5000, dolore: 5 }), volemia: 4000 };
  assert.ok(Math.abs(allarmeEsogeno(r) - 0.5) < 0.001, `vale ${allarmeEsogeno(r)}`);
  assert.ok(allarme(r) > allarmeEsogeno(r), 'il totale comprende anche la perdita');
});

test('si può chiamare su riserve incomplete senza esplodere', () => {
  assert.doesNotThrow(() => allarme({ volemia: 5000, volemiaIniziale: 5000 }));
});
```

- [ ] **Step 2: Eseguire i test per vederli fallire**

Run: `node --test tests/fisiologia.test.mjs`
Expected: FAIL — `The requested module '../assets/js/core/fisiologia.js' does not provide an export named 'allarme'`

- [ ] **Step 3: Scrivere l'implementazione**

In `assets/js/core/fisiologia.js`, dentro `RISERVE_ADULTO`, aggiungere
**dopo** la riga `dolore: 0,`:

```js
  /* Quello che viene da FUORI: una sostanza simpaticomimetica lo alza,
     il tono vagale lo abbassa. È l'unico termine dell'allarme che un
     caso dichiara: gli altri si calcolano da quello che manca. */
  tonoAutonomo: 0,
```

Poi, **subito dopo** la funzione `faseCompenso`, aggiungere:

```js
/* =====================================================================
   L'allarme.

   «Quando l'organismo percepisce un problema — QUALUNQUE problema —
   attiva la risposta di allarme e rilascia adrenalina. I segni
   d'allarme sono aspecifici: dicono che c'è un problema, NON quale.»
   È il capitolo 27 degli appunti, ed è la parte di lezione che l'autore
   segnala come la più preziosa.

   Il motore prima conosceva un solo innesco — il sangue che manca — e
   da lì calcolava la frequenza. Qui gli inneschi sono quattro, più
   quello che arriva da fuori, e sommano su un asse solo: positivo verso
   l'adrenalina, negativo verso il vago.

   Le quattro normalizzazioni sono ASSUNZIONE NOSTRA. Il manuale dice
   che questi fatti allarmano il corpo, non quanto ciascuno pesi
   rispetto agli altri. La sola ancorata è la glicemia: i 70 mg/dl sono
   la soglia di ipoglicemia delle ERC 2025 cap. 12 :1125.
   ===================================================================== */

/* Sotto questa saturazione il corpo comincia a preoccuparsi. */
const OSSIGENAZIONE_TRANQUILLA = 0.95;
const PESO_IPOSSIA = 4;              // ossigenazione 0,70 → un allarme pieno
const SOGLIA_IPOGLICEMIA = 70;       // ERC 2025 cap. 12 :1125
const AMPIEZZA_IPOGLICEMIA = 40;     // glicemia 30 → un allarme pieno

/** L'allarme che NON viene dal sangue che manca.

    Serve separato perché la vasocostrizione da ipovolemia sostiene già
    la pressione dentro `tenutaPressoria`: contarla una seconda volta
    come spinta pressoria sarebbe un doppione. */
export function allarmeEsogeno(riserve = {}) {
  const ossigenazione = riserve.ossigenazione ?? RISERVE_ADULTO.ossigenazione;
  const glicemia = riserve.glicemia ?? RISERVE_ADULTO.glicemia;
  return Math.max(0, OSSIGENAZIONE_TRANQUILLA - ossigenazione) * PESO_IPOSSIA
    + Math.max(0, (SOGLIA_IPOGLICEMIA - glicemia) / AMPIEZZA_IPOGLICEMIA)
    + fra(riserve.dolore || 0, 0, 10) / 10
    + (riserve.tonoAutonomo || 0);
}

/** Quanto il corpo è in allarme, da −1 (vago pieno) a +2.

    Il tetto non è arbitrario: 1 è il compenso che sta per cedere, e una
    scarica simpaticomimetica piena sta più in alto — è il motivo per cui
    un trentenne che ha tirato ha una frequenza più alta di un uomo che
    ha perso un litro e mezzo di sangue. */
export function allarme(riserve = {}) {
  const daPerdita = perditaVolemica(riserve) / SOGLIE_PERDITA.scompenso;
  return fra(daPerdita + allarmeEsogeno(riserve), -1, 2);
}
```

**Attenzione all'ordine nel file:** `allarmeEsogeno` usa `fra`, che è
dichiarato con `const fra = ...` più in basso. Le `const` non sono
sollevate: spostare la riga `const fra = (v, min, max) => ...` **sopra**
`RISERVE_ADULTO`, in cima al file. È una riga sola e non cambia niente
per gli altri chiamanti.

- [ ] **Step 4: Eseguire i test per vederli passare**

Run: `node --test tests/*.test.mjs`
Expected: PASS, tutti. L'asse non è ancora collegato, quindi nessun caso
si muove e il test del Task 1 resta verde.

- [ ] **Step 5: Commit**

```bash
git add assets/js/core/fisiologia.js tests/fisiologia.test.mjs
git commit -m "feat(fisiologia): l'allarme adrenergico come asse, dai quattro inneschi del manuale"
```

---

## Task 3: La frequenza e la pressione escono dall'asse

**Files:**
- Modify: `assets/js/core/fisiologia.js`
- Test: `tests/fisiologia.test.mjs`

- [ ] **Step 1: Scrivere i test che falliscono**

Aggiungere in fondo a `tests/fisiologia.test.mjs`:

**Attenzione:** il file dichiara già `const BASE = { fc: 72, pas: 135,
pad: 82, spo2: 98, fr: 14 }` alla riga 72, a livello di modulo.
**Non ridichiararla** — sarebbe un `SyntaxError` — e usare quella. I
valori attesi qui sotto sono calcolati su quella base.

```js
/* ============ la frequenza e la pressione dall'asse ================== */

test('la cocaina fa correre il cuore senza che manchi niente', () => {
  const p = parametriVisibili(riserveIniziali({ tonoAutonomo: 1.4 }), BASE, {});
  assert.ok(p.fc > 130, `un normovolemico iperadrenergico deve correre: invece è ${p.fc}`);
  assert.equal(p.perdita, 0, 'e non ha perso una goccia di sangue');
});

test('il tono vagale rallenta il cuore, che prima non sapeva scendere', () => {
  const p = parametriVisibili(riserveIniziali({ tonoAutonomo: -0.4 }), BASE, {});
  assert.ok(p.fc < BASE.fc, `deve scendere sotto la sua base: invece è ${p.fc}`);
});

test('il compenso bloccato ferma la tachicardia ma non la bradicardia', () => {
  const su = parametriVisibili(riserveIniziali({ tonoAutonomo: 1.4 }), BASE, { compensoBloccato: true });
  assert.equal(su.fc, BASE.fc, 'il betabloccante non lo fa accelerare');
  const giu = parametriVisibili(riserveIniziali({ tonoAutonomo: -0.4 }), BASE, { compensoBloccato: true });
  assert.ok(giu.fc < BASE.fc, 'ma un betabloccato può benissimo essere bradicardico');
});

test('la spinta pressoria prende solo l\'allarme esogeno', () => {
  /* Il sostegno della vasocostrizione da ipovolemia è già dentro la
     tenuta: se lo contassimo anche qui, un emorragico avrebbe una
     pressione più alta di quella che ha. 4400 su 5000 è il 12% di
     perdita, sotto la soglia in cui la tenuta comincia a cedere. */
  const soloPerdita = { ...riserveIniziali({ volemia: 5000 }), volemia: 4400 };
  const p = parametriVisibili(soloPerdita, BASE, {});
  assert.equal(p.pas, BASE.pas, 'finché il compenso tiene, la sistolica è la sua');
});

test('il dolore alza la pressione come prima, non il doppio', () => {
  const p = parametriVisibili(riserveIniziali({ dolore: 10 }), BASE, {});
  assert.equal(p.pas, BASE.pas + 25, 'venticinque mmHg a dolore dieci, come prima');
});
```

- [ ] **Step 2: Eseguire i test per vederli fallire**

Run: `node --test tests/fisiologia.test.mjs`
Expected: FAIL — «un normovolemico iperadrenergico deve correre: invece è 70»

- [ ] **Step 3: Scrivere l'implementazione**

In `assets/js/core/fisiologia.js`, **sostituire** il blocco di commento e
la costante:

```js
/* Quanto sale la frequenza a fronte della perdita. Tarato perché a
   metà del compenso (30%) un paziente da 72 arrivi intorno a 120, che
   è quello che si vede sul mezzo. ASSUNZIONE NOSTRA. */
const GUADAGNO_TACHICARDIA = 160;
```

con:

```js
/* Quanto sale la frequenza per ogni punto di allarme.

   48 non è scelto a occhio: è il numero per cui
   `48 × (perdita / 0.30) ≡ 160 × perdita`, cioè esattamente il guadagno
   che il motore aveva prima quando l'unico innesco era il sangue che
   mancava. Passare all'asse non muove di un battito i casi che hanno
   solo un'emorragia, e c'è un test che lo fissa. ASSUNZIONE NOSTRA,
   ereditata. */
const GUADAGNO_ALLARME = 48;

/* Quanto l'allarme spinge la sistolica, per punto. Scelto allo stesso
   modo: 25 × (dolore/10) ≡ 2,5 × dolore, il guadagno di prima. */
const SPINTA_ALLARME_PAS = 25;
```

Poi, dentro `circolo()`, **sostituire**:

```js
  const fc = bloccato
    ? base.fc
    : Math.round(base.fc + GUADAGNO_TACHICARDIA * perdita * riserve.contrattilita);
```

con:

```js
  /* La frequenza segue l'allarme, non più la sola perdita: un
     iperadrenergico corre senza aver perso niente, e un vagale scende
     sotto la sua base — cosa che prima il motore non sapeva fare.

     Il compenso bloccato blocca SOLO il lato positivo: un betabloccato
     non diventa tachicardico, ma bradicardico sì, eccome. */
  const a = allarme(riserve);
  const fc = bloccato
    ? Math.round(base.fc + GUADAGNO_ALLARME * Math.min(0, a))
    : Math.round(base.fc + GUADAGNO_ALLARME * a * riserve.contrattilita);
```

Poi, dentro `parametriVisibili()`, **sostituire**:

```js
  /* Il dolore tira su frequenza e pressione per via adrenergica: è
     compenso anche quello, e maschera l'ipovolemia. La scala arriva a
     dieci: oltre, il paziente non ha modo di dirtelo. */
  const dolore = fra(riserve.dolore, 0, 10);
  const fc = Math.round(c.fc + dolore * SPINTA_DOLORE_FC);
  const pas = Math.round(c.pas + dolore * SPINTA_DOLORE_PAS);
```

con:

```js
  /* La scala del dolore arriva a dieci: oltre, il paziente non ha modo
     di dirtelo. */
  const dolore = fra(riserve.dolore, 0, 10);

  /* La frequenza esce già dall'asse dentro `circolo`, e il dolore è uno
     dei termini dell'asse: sommarlo di nuovo qui lo conterebbe due
     volte. */
  const fc = c.fc;

  /* La pressione la spinge solo l'allarme che NON viene dal sangue
     mancante: quello lì la sostiene già attraverso la tenuta, e
     contarlo due volte darebbe a un emorragico una pressione che non
     ha. */
  const pas = Math.round(c.pas + SPINTA_ALLARME_PAS * Math.max(0, allarmeEsogeno(riserve)));
```

Infine **cancellare** le due costanti rimaste senza chiamanti:

```js
const SPINTA_DOLORE_FC = 3.5;
const SPINTA_DOLORE_PAS = 2.5;
```

col commento che le precede.

- [ ] **Step 4: Eseguire tutti i test**

Run: `node --test tests/*.test.mjs`
Expected: i test nuovi passano; **il Task 1 resta verde**; falliscono
alcuni test di `toracico-v3`, `incidente-v3` e i test vecchi sul dolore
in `tests/fisiologia.test.mjs`. È previsto: li sistema il Task 5. Se
fallisse il test del Task 1, l'asse ha un peso sbagliato — non toccare il
test, rileggere i guadagni.

- [ ] **Step 5: Commit**

```bash
git add assets/js/core/fisiologia.js tests/fisiologia.test.mjs
git commit -m "feat(fisiologia): frequenza e pressione escono dall'asse dell'allarme"
```

---

## Task 4: La cute, il respiro e le pupille

**Files:**
- Modify: `assets/js/core/fisiologia.js`
- Test: `tests/fisiologia.test.mjs`

- [ ] **Step 1: Scrivere i test che falliscono**

Aggiungere in fondo a `tests/fisiologia.test.mjs`:

```js
/* ============ i segni dell'allarme ================================== */

test('l\'ipoglicemico è sudato, e prima non lo era', () => {
  /* «La cute appare umida e sudata… può essere ostile e aggressivo,
     tanto da essere scambiato per un intossicato da alcolici»
     — Bolognin :4287. */
  const p = parametriVisibili(riserveIniziali({ glicemia: 45 }), BASE, {});
  assert.notEqual(p.cute, 'normale', `a 45 di glicemia non è normale: è ${p.cute}`);
  assert.ok(p.fc > BASE.fc, 'ed è tachicardico');
});

test('anche il vago dà pallore e sudore: i prodromi sono gli stessi', () => {
  const p = parametriVisibili(riserveIniziali({ tonoAutonomo: -0.4 }), BASE, {});
  assert.notEqual(p.cute, 'normale', 'il capitolo 28 mette pallore e sudorazione fra i prodromi vagali');
});

test('la midriasi sta oltre il compenso pieno, se no non è un indizio', () => {
  assert.equal(parametriVisibili(riserveIniziali({ dolore: 9 }), BASE, {}).pupille, 'normali',
    'un dolore forte non deve bastare, o la midriasi non distingue più niente');
  assert.equal(parametriVisibili(riserveIniziali({ tonoAutonomo: 1.4 }), BASE, {}).pupille, 'midriatiche');
});

test('il vago non dà mai midriasi', () => {
  assert.equal(parametriVisibili(riserveIniziali({ tonoAutonomo: -1 }), BASE, {}).pupille, 'normali');
});

test('si respira più in fretta anche per allarmi che non sono il sangue', () => {
  const p = parametriVisibili(riserveIniziali({ tonoAutonomo: 1.4 }), BASE, {});
  assert.ok(p.fr >= BASE.fr + 10, `deve essere tachipnoico: invece è ${p.fr}`);
});

test('refill e sete restano attaccati al sangue, non all\'allarme', () => {
  /* Misurano il volume: un normovolemico vasocostretto riempie
     comunque in fretta, e la sete di Bolognin :6481 è sete da
     ipovolemia, non bocca secca da adrenalina. */
  const p = parametriVisibili(riserveIniziali({ tonoAutonomo: 1.4 }), BASE, {});
  assert.ok(p.refill < 2, `il refill non deve allungarsi: invece è ${p.refill}`);
  assert.equal(p.sete, false);
});
```

- [ ] **Step 2: Eseguire i test per vederli fallire**

Run: `node --test tests/fisiologia.test.mjs`
Expected: FAIL — «a 45 di glicemia non è normale: è normale»

- [ ] **Step 3: Scrivere l'implementazione**

In `assets/js/core/fisiologia.js`, dentro `segni()`, **sostituire**:

```js
  let cute = 'normale';
  if (perdita >= 0.20) cute = 'pallida-fredda-sudata';
  else if (perdita >= 0.10) cute = 'pallida';
```

con:

```js
  /* La cute segue l'allarme in VALORE ASSOLUTO: il capitolo 28 mette
     «sudorazione, pallore, offuscamento visivo» fra i prodromi vagali,
     quindi le due forze opposte danno la stessa cute. Quello che le
     distingue è la frequenza, non il colorito.

     Le soglie sono scritte come frazioni e non come decimali di
     proposito: 1/3 e 2/3 dell'asse sono esattamente il 10% e il 20% di
     perdita di prima, e arrotondarle sposterebbe la soglia. */
  const forza = Math.abs(a);
  let cute = 'normale';
  if (forza >= 2 / 3) cute = 'pallida-fredda-sudata';
  else if (forza >= 1 / 3) cute = 'pallida';
```

Sempre dentro `segni()`, **sostituire** il blocco `return`:

```js
  return {
    cute,
    refill,
    sete: perdita >= 0.20,
    coscienza,
    tachipnea: perdita >= SOGLIE_PERDITA.compenso,
    fase,
  };
```

con:

```js
  return {
    cute,
    refill,
    /* Sete e refill restano attaccati al sangue: misurano il volume,
       non l'allarme. */
    sete: perdita >= 0.20,
    coscienza,
    /* Si respira più in fretta per qualunque allarme, non solo perché
       manca sangue: il capitolo 27 mette il respiro «più profondo e
       frequente» in elenco con la tachicardia. La soglia 0,5 è quella
       di prima: 15% di perdita diviso 0,30. */
    tachipnea: a >= 0.5,
    /* La midriasi sta OLTRE il compenso pieno. Se comparisse a ogni
       dolore forte smetterebbe di essere un indizio, e il suo lavoro
       qui è distinguere una scarica esogena da un compenso.
       ASSUNZIONE NOSTRA. */
    pupille: a >= SOGLIA_MIDRIASI ? 'midriatiche' : 'normali',
    fase,
  };
```

All'inizio di `segni()`, **subito dopo** `const fase = faseCompenso(perdita);`, aggiungere:

```js
  const a = allarme(riserve);
```

Accanto alle altre costanti, aggiungere:

```js
/* Oltre il compenso pieno: vedi il commento su `pupille` in `segni`. */
const SOGLIA_MIDRIASI = 1.2;
```

Infine, in `parametriVisibili()`, dentro l'oggetto restituito, **subito
dopo** la riga `sete: s.sete,`, aggiungere:

```js
    /* Un parametro che si vede solo se lo cerchi: c'è l'azione che
       guarda le pupille, e finché nessuno la fa la tessera resta vuota. */
    pupille: s.pupille,
```

- [ ] **Step 4: Eseguire tutti i test**

Run: `node --test tests/*.test.mjs`
Expected: i test nuovi passano; **il Task 1 resta verde**; restano rossi
alcuni test di `toracico-v3` e `incidente-v3`, che il Task 5 sistema.

- [ ] **Step 5: Commit**

```bash
git add assets/js/core/fisiologia.js tests/fisiologia.test.mjs
git commit -m "feat(fisiologia): cute, respiro e pupille seguono l'allarme"
```

---

## Task 5: I tre casi che si spostano di proposito

`toracico-v3`, `incidente-v3` e `ipoglicemia-v3` cambiano. Ogni valore
nuovo si **guarda con lo script prima** di scriverlo in un test: mai
adattare il test al numero che esce senza averlo capito.

**Files:**
- Modify: `tests/casi.test.mjs`
- Modify: `tests/fisiologia.test.mjs`
- Modify: `assets/js/data/casi.js` (solo le prose che citano numeri)

- [ ] **Step 1: Guardare i numeri nuovi**

Eseguire lo script della sezione «lo stato di partenza». Attesi, da
confermare:

| Caso | Prima | Dopo, atteso |
|---|---|---|
| `toracico-v3` | FC 95, FR 16, cute normale | FC ~104, FR ~26, **cute pallida-fredda-sudata** |
| `incidente-v3` | FC 106, cute pallida | FC ~111, **cute pallida-fredda-sudata** |
| `ipoglicemia-v3` | FC 72, PA 128/78, cute normale | FC ~90, PA ~137/…, **cute pallida** |
| `shock-v3`, `ictus-v3`, `sincope-v3` | — | **identici** |

Se un numero è lontano da questi, fermarsi e capire perché prima di
proseguire.

- [ ] **Step 2: Aggiornare i test dei tre casi**

In `tests/casi.test.mjs`, nel test `toracico-v3 ha dolore e miocardio che
soffre`, **sostituire**:

```js
  assert.ok(i.stato.pas > 130, 'e con la pressione alta: è la scarica adrenergica');
```

con:

```js
  assert.ok(i.stato.pas > 130, 'e con la pressione alta: è la scarica adrenergica');
  /* Con l'asse dell'allarme la scarica adrenergica si vede anche
     addosso, e non solo sul monitor: il quadro classico dell'infarto è
     pallido e sudato (Bolognin :6481). Prima aveva cute normale. */
  assert.equal(i.stato.cute, 'pallida-fredda-sudata');
  assert.ok(i.stato.fr > 20, 'e respira corto');
```

Nel test `ipoglicemia-v3 arriva sotto la soglia ERC ma ancora vigile`,
aggiungere in fondo:

```js
  /* Bolognin :4287: «la cute appare umida e sudata». Prima nel motore
     era un ipoglicemico con cute normale e frequenza da riposo. */
  assert.notEqual(i.stato.cute, 'normale', `deve essere sudato: è ${i.stato.cute}`);
  assert.ok(i.stato.fc > caso.fisiologia.base.fc, 'e tachicardico');
```

In `tests/fisiologia.test.mjs`, il test `il dolore alza la pressione senza
slargare il differenziale` continua a valere; se il test
`il dolore non supera il dieci della scala` controlla la frequenza,
aggiornarne il valore atteso dopo averlo guardato. **Non cambiare
l'intento di nessun test: solo i numeri.**

- [ ] **Step 3: Allineare le prose che citano numeri**

Tre testi citano numeri che adesso escono diversi. Rileggerli col
risultato dello script accanto e correggerli — è la regola pagata in
1.10.0 con la sincope: quando la prosa e la fisiologia divergono, ha
ragione la fisiologia.

- `toracico-v3` → `ragguaglio`: cita FC e frequenza respiratoria, e dice
  come si presenta la cute. Adesso è pallido, sudato e respira 26;
- `ipoglicemia-v3` → `ragguaglio`: cita la frequenza, che era da riposo
  e adesso è tachicardica, e la cute;
- `ipoglicemia-v3` → `colpoOcchio` e `trappola`: controllare che non
  dicano «cute normale» o equivalenti, adesso che è sudato. Se già lo
  descrivevano sudato, la prosa e il motore finalmente coincidono e non
  c'è niente da toccare.

- [ ] **Step 4: Eseguire tutti i test**

Run: `node --test tests/*.test.mjs`
Expected: PASS, tutti.

- [ ] **Step 5: Commit**

```bash
git add tests/ assets/js/data/casi.js
git commit -m "test(casi): i tre casi che l'asse dell'allarme sposta, e perche'"
```

---

## Task 6: `tonoAutonomo` fra le riserve del motore

Una riga, ma senza di lei un evento che tocca il tono scrive un campo
inutile sullo stato.

**Files:**
- Modify: `assets/js/core/sim-engine.js`
- Test: `tests/sim-engine.test.mjs`

- [ ] **Step 1: Scrivere il test che fallisce**

Aggiungere in fondo a `tests/sim-engine.test.mjs`:

```js
test('un effetto sul tono autonomo va nelle riserve, non sui parametri', () => {
  const i = avvia({
    ...casoConAnamnesi(),
    eventi: [{ id: 'scarica', t: 30, effetto: { tonoAutonomo: 1.4 } }],
  });
  const prima = i.stato.fc;
  i.avanza(60);
  assert.ok(i.stato.fc > prima + 40, `la frequenza deve seguire il tono: era ${prima}, è ${i.stato.fc}`);
});
```

- [ ] **Step 2: Eseguire il test per vederlo fallire**

Run: `node --test tests/sim-engine.test.mjs`
Expected: FAIL — la frequenza non si muove.

- [ ] **Step 3: Scrivere l'implementazione**

In `assets/js/core/sim-engine.js`, **sostituire**:

```js
  const RISERVE = ['volemia', 'ossigenazione', 'glicemia', 'contrattilita', 'tonoVascolare', 'dolore'];
```

con:

```js
  const RISERVE = ['volemia', 'ossigenazione', 'glicemia', 'contrattilita', 'tonoVascolare', 'dolore', 'tonoAutonomo'];
```

- [ ] **Step 4: Eseguire tutti i test**

Run: `node --test tests/*.test.mjs`
Expected: PASS, tutti.

- [ ] **Step 5: Commit**

```bash
git add assets/js/core/sim-engine.js tests/sim-engine.test.mjs
git commit -m "feat(sim): il tono autonomo e' una riserva, e gli effetti lo trovano"
```

---

## Task 7: L'offesa `simpaticomimetico`

**Files:**
- Modify: `assets/js/data/offese.js`
- Test: `tests/offese.test.mjs`

- [ ] **Step 1: Scrivere i test che falliscono**

Aggiungere in fondo a `tests/offese.test.mjs`:

```js
test('il simpaticomimetico tiene il tono al picco, non lo fa esplodere', () => {
  const offesa = { tipo: 'simpaticomimetico', picco: 1.4, calmo: 0.8, costante: 180 };
  let r = { tonoAutonomo: 1.4 };
  for (let giro = 0; giro < 20; giro += 1) r = applicaOffese(r, [offesa], 60, []);
  assert.ok(Math.abs(r.tonoAutonomo - 1.4) < 0.01, `venti minuti dopo è ancora al picco: ${r.tonoAutonomo}`);
});

test('l\'ambiente calmo abbassa la scarica, ed è tutto il trattamento che c\'è', () => {
  const offesa = { tipo: 'simpaticomimetico', picco: 1.4, calmo: 0.8, costante: 180 };
  let r = { tonoAutonomo: 1.4 };
  for (let giro = 0; giro < 5; giro += 1) r = applicaOffese(r, [offesa], 60, ['rassicurato']);
  assert.ok(r.tonoAutonomo < 1.2, `cinque minuti di voce bassa devono vedersi: ${r.tonoAutonomo}`);
  assert.ok(r.tonoAutonomo > 0.75, 'ma non scende sotto il valore calmo');
});

test('chi arriva sotto il picco ci sale', () => {
  const offesa = { tipo: 'simpaticomimetico', picco: 1.4, calmo: 0.8, costante: 180 };
  const r = applicaOffese({ tonoAutonomo: 0.2 }, [offesa], 60, []);
  assert.ok(r.tonoAutonomo > 0.2);
});
```

`applicaOffese` è già importato alla riga 7 del file: non serve
aggiungere niente.

- [ ] **Step 2: Eseguire i test per vederli fallire**

Run: `node --test tests/offese.test.mjs`
Expected: FAIL — il tono resta a 0,2, perché `OFFESE.simpaticomimetico`
non esiste e il reducer salta le offese che non conosce.

- [ ] **Step 3: Scrivere l'implementazione**

In `assets/js/data/offese.js`, dentro `OFFESE`, **subito dopo** il blocco
`vasodilatazione`, aggiungere:

```js
  simpaticomimetico: {
    id: 'simpaticomimetico',
    fonte: 'ERC 2021 cap. 6 :3625 — emergenze ipertensive da cocaina e anfetamine',
    /* Questa non consuma: TENDE A UN BERSAGLIO. È il modo in cui si
       comporta una sostanza in circolo, ed è anche l'unico modo per cui
       il tono non scappa verso l'infinito sommando un delta al secondo.

       Il freno è l'ambiente calmo, e non è un ripiego: sull'abuso di
       cocaina non ci sono antidoti da somministrare. Si monitora, si
       tiene bassa la voce, si trasporta. Quello che le linee guida
       aggiungono — benzodiazepine, alfa-antagonisti puri — sul mezzo
       non c'è e comunque non è del volontario. */
    applica: (offesa, riserve, dt, tag) => {
      const bersaglio = tag.includes('rassicurato') ? offesa.calmo : offesa.picco;
      const passo = (bersaglio - (riserve.tonoAutonomo || 0)) * (dt / offesa.costante);
      return { tonoAutonomo: passo };
    },
  },
```

- [ ] **Step 4: Eseguire tutti i test**

Run: `node --test tests/*.test.mjs`
Expected: PASS, tutti.

- [ ] **Step 5: Commit**

```bash
git add assets/js/data/offese.js tests/offese.test.mjs
git commit -m "feat(offese): il simpaticomimetico, che tende a un picco e lo molla se lo calmi"
```

---

## Task 8: Le risposte a varianti

La stessa persona risponde diversamente a seconda di chi sta ascoltando.

**Files:**
- Modify: `assets/js/core/anamnesi.js`
- Test: `tests/anamnesi.test.mjs`

- [ ] **Step 1: Scrivere i test che falliscono**

Aggiungere in fondo a `tests/anamnesi.test.mjs`:

```js
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
```

`rispostaA` è già importato alla riga 44 e `revisioneAnamnesi` alla 177:
non serve aggiungere niente.

- [ ] **Step 2: Eseguire i test per vederli fallire**

Run: `node --test tests/anamnesi.test.mjs`
Expected: FAIL — `r.testo` è `undefined`, perché `scritta` è un array e
`scritta.t` non esiste.

- [ ] **Step 3: Scrivere l'implementazione**

In `assets/js/core/anamnesi.js`, **subito prima** di `export function
rispostaA`, aggiungere:

```js
/* Una risposta può essere scritta in più varianti, e vince la prima il
   cui `se(tag)` combacia. Serve a una cosa sola, ma importante: la
   stessa persona risponde diversamente a seconda di CHI STA
   ASCOLTANDO. Il capitolo 33 degli appunti è esplicito — la domanda
   sulle sostanze va fatta in disparte, senza amici o familiari
   presenti, e allora arriva una verità «che il paziente non aveva detto
   a nessun altro».

   Chi scrive un oggetto solo, come hanno fatto tutti i casi finora,
   continua a funzionare senza saperne niente. */
function variante(scritta, tag) {
  if (!Array.isArray(scritta)) return scritta;
  return scritta.find((v) => !v.se || v.se(tag)) || null;
}
```

Poi, dentro `rispostaA`, **sostituire** la firma e la prima riga:

```js
export function rispostaA({ domanda, anamnesi, interlocutore, coscienza }) {
  const scritta = anamnesi?.risposte?.[domanda.id]?.[interlocutore];
```

con:

```js
export function rispostaA({ domanda, anamnesi, interlocutore, coscienza, tag = [] }) {
  const scritta = variante(anamnesi?.risposte?.[domanda.id]?.[interlocutore], tag);
```

Infine, dentro `revisioneAnamnesi`, **sostituire**:

```js
      const chiSapeva = Object.keys(risposte)
        .filter((id) => risposte[id]?.qualita === 'buona')
```

con:

```js
      /* Una risposta a varianti vale per la MIGLIORE che dichiara: se
         una delle sue vie porta a una risposta buona, quella persona
         «avrebbe risposto meglio». */
      const dichiaraBuona = (r) => (Array.isArray(r)
        ? r.some((v) => v?.qualita === 'buona')
        : r?.qualita === 'buona');
      const chiSapeva = Object.keys(risposte)
        .filter((id) => dichiaraBuona(risposte[id]))
```

- [ ] **Step 4: Eseguire tutti i test**

Run: `node --test tests/*.test.mjs`
Expected: PASS, tutti.

- [ ] **Step 5: Commit**

```bash
git add assets/js/core/anamnesi.js tests/anamnesi.test.mjs
git commit -m "feat(anamnesi): una risposta puo' avere varianti, e la domanda in disparte rende di piu'"
```

---

## Task 9: L'azione «parla in disparte»

**Files:**
- Modify: `assets/js/data/azioni.js`
- Modify: `assets/js/core/sim-engine.js`
- Test: `tests/azioni.test.mjs`, `tests/sim-engine.test.mjs`

- [ ] **Step 1: Scrivere i test che falliscono**

Aggiungere in fondo a `tests/azioni.test.mjs`:

```js
test('c\'è come parlare al paziente in disparte', () => {
  const az = AZIONI['parla-in-disparte'];
  assert.ok(az, 'manca l\'azione parla-in-disparte');
  assert.equal(az.cat, 'comunicazione');
  assert.ok(az.chi.includes('tu'));
  assert.ok(az.unaVolta, 'una volta che sei in disparte ci resti');
  assert.match(az.spiega, /guardia|giudizio|disparte/i);
});

test('il diario delle pupille dice cosa hai visto', () => {
  const az = AZIONI.pupille;
  assert.equal(typeof az.diario, 'function', 'deve raccontare quello che trova, non una frase fissa');
  assert.match(az.diario({ pupille: 'midriatiche' }), /larghe|midriasi/i);
  assert.match(az.diario({ pupille: 'normali' }), /normoreagenti|normali/i);
});
```

E in fondo a `tests/sim-engine.test.mjs`:

```js
test('i tag arrivano fino alla risposta: in disparte si racconta di più', () => {
  const caso = {
    ...casoConAnamnesi(),
    anamnesi: {
      interlocutori: [{ id: 'amico', label: 'l\'amico' }],
      risposte: {
        evento: {
          paziente: [
            { se: (tag) => tag.includes('in-disparte'), t: '«Ho tirato.»', qualita: 'buona', rivela: ['cocaina'] },
            { t: '«Eravamo a una festa.»', qualita: 'vaga' },
          ],
        },
      },
    },
  };
  const azioni = {
    ...AZIONI_PROVA,
    'parla-in-disparte': {
      id: 'parla-in-disparte', cat: 'comunicazione', label: 'In disparte',
      durata: 40, chi: ['tu'], unaVolta: true,
      applica: () => ({ tag: 'in-disparte' }), spiega: 'prova',
    },
  };

  const davanti = avvia(caso, azioni);
  davanti.chiedi('evento');
  assert.deepEqual(davanti.saputo, {}, 'davanti all\'amico non lo dice');

  const soli = avvia(caso, azioni);
  soli.esegui('parla-in-disparte', 'tu');
  soli.chiedi('evento');
  assert.ok(soli.saputo.cocaina, 'in disparte sì');
});
```

- [ ] **Step 2: Eseguire i test per vederli fallire**

Run: `node --test tests/azioni.test.mjs tests/sim-engine.test.mjs`
Expected: FAIL — «manca l'azione parla-in-disparte», e nel motore
`soli.saputo.cocaina` è `undefined` perché i tag non arrivano.

- [ ] **Step 3: Scrivere l'implementazione**

In `assets/js/data/azioni.js`, dentro la sezione COMUNICAZIONE, **subito
prima** della voce `allerta-co` (cercare `id: 'allerta-co'`), inserire:

```js
  {
    /* Il capitolo 33 non dice cosa chiedere: dice COME, e la differenza
       è tutta lì. «Ascolta, perdonami la domanda. Non sono una guardia,
       a me non interessa. Ma per il tuo bene: hai fatto uso di
       qualcosa?» — e va fatta in disparte, senza amici o familiari
       presenti. A quel punto spesso arriva una verità che il paziente
       non aveva detto a nessun altro. */
    id: 'parla-in-disparte', cat: 'comunicazione',
    label: 'Parla col paziente in disparte', durata: 40, chi: ['tu'],
    unaVolta: true,
    richiede: (p) => p.coscienza === 'A',
    motivoBloccato: 'Non è abbastanza presente per una conversazione riservata.',
    applica: () => ({ tag: 'in-disparte' }),
    diario: 'Ti allontani di qualche passo con lui, fuori dalla portata degli altri.',
    spiega: 'Non siete forze dell\'ordine, e va detto esplicitamente. Serve a curarlo, non a incastrarlo: in ospedale le analisi lo direbbero comunque, chiederlo adesso guadagna tempo clinico.',
  },
```

Sempre in `azioni.js`, nella voce `pupille`, **sostituire**:

```js
    diario: 'Pupille controllate: dimensione, simmetria e reattività alla luce.',
```

con:

```js
    diario: (p) => (p.pupille === 'midriatiche'
      ? 'Le pupille sono larghe tutte e due e reagiscono poco alla luce: midriasi bilaterale.'
      : 'Pupille isocoriche e normoreagenti alla luce.'),
```

In `assets/js/core/sim-engine.js`, dentro `chiedi()`, **sostituire**:

```js
    const r = rispostaA({
      domanda: d,
      anamnesi: caso.anamnesi,
      interlocutore,
      coscienza: proietta().coscienza,
    });
```

con:

```js
    const r = rispostaA({
      domanda: d,
      anamnesi: caso.anamnesi,
      interlocutore,
      coscienza: proietta().coscienza,
      /* I tag servono alle risposte a varianti: la stessa domanda rende
         diversamente se l'hai preso da parte. */
      tag: proietta().tag,
    });
```

- [ ] **Step 4: Eseguire tutti i test**

Run: `node --test tests/*.test.mjs`
Expected: PASS, tutti.

- [ ] **Step 5: Commit**

```bash
git add assets/js/data/azioni.js assets/js/core/sim-engine.js tests/
git commit -m "feat(azioni): parlare in disparte, e le pupille che dicono cosa hai visto"
```

---

## Task 10: La tessera delle pupille

Da qui si lavora anche nel browser.

**Files:**
- Modify: `assets/js/modules/intervento.js`

- [ ] **Step 1: Togliere la collisione di nome**

`intervento.js` ha una funzione privata `allarme(k, valore, stato)` che
non c'entra niente con l'allarme adrenergico: decide di che colore va
una tessera. Adesso che nel motore c'è un `allarme` vero, il nome
confonde chi legge. Rinominarla, due sole occorrenze (righe 46 e 156):

```bash
sed -i '' 's/function allarme(k, valore, stato)/function gravitaTessera(k, valore, stato)/; s/const stato = allarme(p\.k, val, s);/const stato = gravitaTessera(p.k, val, s);/' assets/js/modules/intervento.js
grep -n "allarme\|gravitaTessera" assets/js/modules/intervento.js
```

Expected: due righe, tutte e due `gravitaTessera`, nessuna `allarme`.

- [ ] **Step 2: Aggiungere la tessera**

In `assets/js/modules/intervento.js`, in `AZIONE_PER_PARAMETRO`, **dopo**
la riga `sete: 'chiedi-sete',` aggiungere:

```js
  pupille: 'pupille',
```

In `MANUALI`, **dopo** la riga della Sete, aggiungere:

```js
  { k: 'pupille', label: 'Pupille', unita: '', rif: 'isocoriche, reattive' },
```

In `gravitaTessera`, **dopo** la riga `if (k === 'sete') ...`, aggiungere:

```js
  if (k === 'pupille') return String(valore) === 'normali' ? '' : 'warn';
```

- [ ] **Step 3: Provare nel browser**

```bash
python3 -m http.server 8925
```

Aprire `http://localhost:8925/index.html#/intervento/toracico-v3` a
**larghezza telefono (400 px)** e verificare che:

- la tessera Pupille c'è e dice «isocoriche, reattive» finché non
  la misuri;
- l'azione «Controlla le pupille» adesso riempie la tessera e scrive nel
  diario la frase giusta;
- la griglia delle rilevazioni con sette tessere non sborda in
  larghezza;
- la console è pulita.

> Se la finestra di Chrome non si lascia ridimensionare a 400 px, si può
> usare un iframe di prova: `tmp/` è fuori da git.
> ```html
> <!doctype html><meta charset="utf-8">
> <style>html,body{margin:0;display:flex;justify-content:center}iframe{width:400px;height:860px;border:0}</style>
> <iframe src="/index.html#/intervento/toracico-v3"></iframe>
> ```

- [ ] **Step 4: Eseguire tutti i test**

Run: `node --test tests/*.test.mjs`
Expected: PASS, tutti.

- [ ] **Step 5: Commit**

```bash
git add assets/js/modules/intervento.js
git commit -m "feat(intervento): la tessera delle pupille, che prima era un rilievo morto"
```

---

## Task 11: Il ritocco di `sincope-v3`

Muore la frequenza 58 scritta a mano, e con lei un'assunzione nostra.

**Files:**
- Modify: `assets/js/data/casi.js`
- Test: `tests/casi.test.mjs`

- [ ] **Step 1: Scrivere il test che fallisce**

Aggiungere in fondo a `tests/casi.test.mjs`:

```js
test('la bradicardia della sincope viene dal vago, non da una base finta', () => {
  const caso = sinc();
  assert.ok(caso.fisiologia.riserve.tonoAutonomo < 0, 'il tono vagale va dichiarato nelle riserve');
  assert.ok(caso.fisiologia.base.fc > 65, 'e la base torna a essere la sua frequenza da riposo vera');
  const i = avvia(caso);
  assert.ok(i.stato.fc < 62, `arriva bradicardica: invece è ${i.stato.fc}`);
  /* Il colpo d'occhio dice «pallida e sudata»: adesso lo dice anche la
     tessera. Prima leggeva «normale», ed era il buco lasciato aperto
     da 1.10.0. */
  assert.notEqual(i.stato.cute, 'normale', `deve essere pallida: è ${i.stato.cute}`);
});
```

- [ ] **Step 2: Eseguire il test per vederlo fallire**

Run: `node --test tests/casi.test.mjs`
Expected: FAIL — «il tono vagale va dichiarato nelle riserve»

- [ ] **Step 3: Scrivere l'implementazione**

In `assets/js/data/casi.js`, dentro `sincope-v3`, **sostituire** il blocco
`base` col suo commento:

```js
      /* Il suo normale: ventiquattro anni, sportiva, nessuna patologia.
         La frequenza a 58 è ASSUNZIONE NOSTRA e copre una lacuna: il
         motore muove la frequenza col compenso e col dolore, mai verso
         il basso, quindi la bradicardia vagale del manuale non è
         modellabile e si dichiara come se fosse la sua di base. */
      base: { fc: 58, pas: 112, pad: 70, spo2: 99, fr: 14, glicemia: 84, temp: 36.3 },
```

con:

```js
      /* Il suo normale: ventiquattro anni, nessuna patologia. La
         frequenza qui è quella che ha da sana, e non c'è più niente di
         finto: la bradicardia esce dal tono vagale qui sotto. */
      base: { fc: 77, pas: 112, pad: 70, spo2: 99, fr: 14, glicemia: 84, temp: 36.3 },
```

E **sostituire** il blocco `riserve` col suo commento:

```js
      /* Il vago ha ancora la mano sul freno: il letto vascolare è
         allargato e la pressione sta bassa. Il sangue c'è tutto.
         Glicemia e ossigenazione stanno QUI e non nella base: è dalle
         riserve che escono i numeri che si vedono. */
      riserve: { volemia: 5000, tonoVascolare: 0.80, ossigenazione: 0.99, glicemia: 84 },
```

con:

```js
      /* Il vago ha ancora la mano sul freno, e la tiene su due cose
         diverse: rallenta il cuore (`tonoAutonomo`, negativo) e allarga
         il letto vascolare (`tonoVascolare`, sotto 1). Non è un
         doppione: sono due grandezze, e il vago le muove tutte e due.

         Dal tono autonomo escono anche il pallore e la sudorazione che
         il colpo d'occhio promette — il capitolo 28 li mette fra i
         prodromi. Il sangue c'è tutto.

         Glicemia e ossigenazione stanno QUI e non nella base: è dalle
         riserve che escono i numeri che si vedono. */
      riserve: {
        volemia: 5000, tonoVascolare: 0.80, tonoAutonomo: -0.40,
        ossigenazione: 0.99, glicemia: 84,
      },
```

- [ ] **Step 4: Calibrare e allineare la prosa**

Eseguire lo script della sezione «lo stato di partenza». Atteso per
`sincope-v3`: **FC ~58, PA 90/56, cute pallida**. Se la frequenza non
cade intorno a 58, aggiustare `base.fc` — non il tono, che è tarato per
superare la soglia della cute.

Poi verificare che `ragguaglio` e `chiave` del caso citino la frequenza
giusta, e correggerli se serve.

- [ ] **Step 5: Eseguire tutti i test**

Run: `node --test tests/*.test.mjs`
Expected: PASS, tutti. In particolare `se la tiri su risviene` deve
restare verde: la seconda sincope è ritorno venoso e l'asse non la tocca.

- [ ] **Step 6: Commit**

```bash
git add assets/js/data/casi.js tests/casi.test.mjs
git commit -m "feat(casi): la bradicardia della sincope esce dal vago, non da una base finta"
```

---

## Task 12: `cocaina-v3`

**Files:**
- Modify: `assets/js/data/casi.js`
- Test: `tests/casi.test.mjs`

- [ ] **Step 1: Scrivere i test che falliscono**

Aggiungere in fondo a `tests/casi.test.mjs`:

```js
/* ==================== cocaina-v3 ==================================== */

const coca = () => CASI.find((c) => c.id === 'cocaina-v3');

test('cocaina-v3 arriva iperadrenergico senza che gli manchi niente', () => {
  const caso = coca();
  assert.ok(caso, 'manca cocaina-v3');
  const i = avvia(caso);
  assert.ok(i.stato.fc > 140, `deve correre: invece è ${i.stato.fc}`);
  assert.ok(i.stato.pas > 140, `e avere la pressione alta: invece è ${i.stato.pas}`);
  assert.equal(i.stato.perdita, 0, 'e non ha perso una goccia di sangue');
  assert.equal(i.stato.pupille, 'midriatiche');
  assert.equal(i.stato.cute, 'pallida-fredda-sudata');
  assert.equal(i.stato.coscienza, 'A', 'agitato non vuol dire alterato');
});

test('la saturazione è buona, ed è il punto della trappola', () => {
  /* «Un paziente agitato va considerato IPOSSICO fino a prova
     contraria» — capitolo 33. Qui la prova contraria c'è, ma bisogna
     andarla a prendere col saturimetro. */
  const i = avvia(coca());
  assert.ok(i.stato.spo2 >= 97, `non è ipossico: ${i.stato.spo2}`);
  const monitor = coca().azioni.necessarie.find((n) => [].concat(n.id).includes('monitor'));
  assert.ok(monitor, 'il monitor deve essere fra le necessarie');
  assert.ok(monitor.entro <= 240, 'e presto: è la prova contraria');
});

test('l\'ambiente calmo è il trattamento, e si vede', () => {
  const i = avvia(coca());
  const prima = i.stato.fc;
  i.esegui('rassicura', 'tu');
  lasciaPassare(i, 6);
  assert.ok(i.stato.fc < prima - 10, `sei minuti di voce bassa devono vedersi: da ${prima} a ${i.stato.fc}`);
});

test('davanti all\'amico non lo dice, in disparte sì', () => {
  const caso = coca();
  assert.ok(caso.anamnesi.interlocutori.some((x) => x.id === 'amico'));

  const davanti = avvia(caso);
  davanti.chiedi('evento');
  assert.deepEqual(davanti.saputo, {}, 'con l\'amico lì non ammette niente');

  const soli = avvia(caso);
  soli.esegui('parla-in-disparte', 'tu');
  soli.chiedi('evento');
  assert.ok(soli.saputo.cocaina, 'preso da parte, la verità arriva');
});

test('chiamare le forze dell\'ordine è l\'errore del caso', () => {
  const caso = coca();
  const d = caso.azioni.dannose.find((x) => x.id === 'chiedi-ffoo');
  assert.ok(d, 'la denuncia deve contare come errore');
  assert.match(d.perche, /guardia|curarlo|rapporto|denunc/i);
});

test('la scena dice quello che c\'è sul tavolo', () => {
  const caso = coca();
  assert.ok(caso.diarioAzioni?.['valuta-scena'], 'guardarsi intorno deve rendere');
  const i = avvia(caso);
  i.esegui('valuta-scena', 'tu');
  assert.ok(i.diario.some((r) => /banconota|piattino|specchio/i.test(r.testo)));
});

test('il ragguaglio dice sospetto, mai un\'affermazione', () => {
  assert.match(coca().ragguaglio, /sospett/i);
});
```

- [ ] **Step 2: Eseguire i test per vederli fallire**

Run: `node --test tests/casi.test.mjs`
Expected: FAIL — «manca cocaina-v3»

- [ ] **Step 3: Scrivere il caso**

In `assets/js/data/casi.js`, **prima** della riga `];` che chiude
l'elenco `CASI` (quella subito sopra `export const CASI_INDICE`),
aggiungere:

```js
  /* ================================================================= */
  {
    id: 'cocaina-v3',
    ecg: { pattern: 'normale' },
    titolo: 'Cardiopalmo dopo una festa',
    tipo: 'medico',
    difficolta: 2,
    motore: 3,
    capitoli: ['cap-33', 'cap-27'],

    dispatch: {
      codice: 'GIALLO',
      testo: 'Uomo di 30 anni, "sta male", frequenza cardiaca alta. Chiama un amico.',
      luogo: 'Appartamento privato',
    },
    scena: {
      testo: 'Appartamento privato, luci basse, musica ancora accesa. Un amico presente, che risponde a monosillabi.',
      sicura: true,
    },
    colpoOcchio: {
      testo: 'Seduto sul divano, vigile e orientato, sudato. Si alza e si risiede, parla in fretta. «Mi sento il cuore in gola.»',
      vitale: true,
    },

    fisiologia: {
      /* Il suo normale: trent'anni, nessuna patologia. La pressione da
         sano è 110/70 — è la scarica che la porta a 150. */
      base: { fc: 70, pas: 110, pad: 70, spo2: 98, fr: 16, glicemia: 108, temp: 37.2 },
      /* Il tono autonomo è alto perché è alta la sostanza in circolo,
         non perché al paziente manchi qualcosa: la volemia è intatta,
         l'ossigeno pure. È il primo caso del banco in cui l'allarme non
         è un compenso ma un veleno. */
      riserve: {
        volemia: 5000, ossigenazione: 0.98, glicemia: 108,
        tonoAutonomo: 1.4, dolore: 3,
      },
      offese: [
        /* Tende al picco e ci resta, finché qualcuno non abbassa la
           voce. Non c'è altro da dare. */
        { tipo: 'simpaticomimetico', picco: 1.4, calmo: 0.8, costante: 180 },
        /* «Il dolore toracico in questi casi è ischemico fino a prova
           contraria»: la cocaina stringe le coronarie. Intensità bassa,
           ma il tempo che passa sulla scena si paga. */
        { tipo: 'ischemia-miocardica', intensita: 0.010 },
      ],
      modificatori: { eta: 30, terapia: [] },
    },

    /* Gli «elementi obiettivi che possono orientare» del capitolo 33:
       residui, materiale nell'ambiente, comportamento. Guardarsi
       intorno rende quanto una domanda, e costa meno. */
    diarioAzioni: {
      'valuta-scena': 'Niente rischi: appartamento, porta aperta, nessuno agitato oltre a lui. Sul tavolino un piattino, uno specchietto e una banconota arrotolata.',
    },

    anamnesi: {
      interlocutori: [{ id: 'amico', label: 'l\'amico' }],
      risposte: {
        disturbi: {
          paziente: { t: '«Il cuore mi va a mille e ho il petto stretto. E non riesco a stare fermo.»', qualita: 'buona', rivela: ['cardiopalmo', 'oppressione-toracica'] },
          amico: { t: '«Ha cominciato un\'ora fa. Diceva che gli batteva forte.»', qualita: 'buona' },
        },
        allergie: {
          paziente: { t: '«No, niente.»', qualita: 'buona' },
        },
        terapia: {
          paziente: { t: '«Non prendo niente, sto bene di solito.»', qualita: 'buona' },
        },
        patologie: {
          paziente: { t: '«Nessuna. Non sono mai stato in ospedale.»', qualita: 'buona', rivela: ['nessuna-patologia'] },
          amico: { t: '«Che io sappia niente, sta sempre bene.»', qualita: 'buona' },
        },
        'ultimo-pasto': {
          paziente: { t: '«Non mi ricordo. Abbiamo bevuto, questo sì.»', qualita: 'buona', rivela: ['alcol'] },
          amico: { t: '«Abbiamo bevuto parecchio, sì.»', qualita: 'buona', rivela: ['alcol'] },
        },
        /* Il perno del caso. Davanti all'amico non ammette niente;
           preso da parte, «spesso arriva la verità — magari una verità
           che il paziente non aveva detto a nessun altro, nemmeno
           all'amico presente» (capitolo 33). */
        evento: {
          paziente: [
            {
              se: (tag) => tag.includes('in-disparte'),
              t: '«…va bene. Ho tirato, un paio di righe. E avevo bevuto. Non lo dica in giro, la prego.»',
              qualita: 'buona',
              rivela: ['cocaina', 'alcol'],
            },
            {
              t: '«Eravamo a una festa. Non lo so, mi è partito il cuore così.»',
              qualita: 'vaga',
            },
          ],
          amico: { t: 'Guarda per terra. «Boh. Stavamo bevendo, tutto qui.»', qualita: 'vaga' },
        },
        'qualita-dolore': {
          paziente: { t: '«Come una morsa. Non fitte, proprio stretto.»', qualita: 'buona' },
        },
        irradiazione: {
          paziente: { t: '«No, sta qui in mezzo.»', qualita: 'buona' },
        },
        intensita: {
          paziente: { t: '«Tre, quattro. Più che altro mi spaventa il cuore.»', qualita: 'buona' },
        },
      },
    },

    eventi: [
      {
        id: 'non-sta-fermo', t: 90,
        testo: 'Si rialza in piedi, fa due passi, si risiede. «Scusate, non ci riesco a stare fermo.»',
      },
      {
        id: 'rifiuta-trasporto', t: 300,
        testo: 'Comincia a stare meglio e ci ripensa: «Sto meglio adesso, davvero. Non voglio andare in ospedale». L\'amico annuisce.',
        decisione: {
          domanda: 'Cosa fai?',
          opzioni: [
            {
              t: 'Gli spiego perché deve venire comunque, senza alzare la voce, e insisto',
              ok: true,
              w: 'Trasporto sempre, anche se «sembra star bene»: il rischio cardiovascolare acuto è reale, e il quadro può ripartire quando siete già andati via.',
            },
            {
              t: 'Se rifiuta è un suo diritto: firma il rifiuto e ce ne andiamo',
              ok: false,
              w: 'Cocaina e alcol insieme fanno cocaetilene nel fegato, più tossico e a emivita più lunga della cocaina da sola. Il caso citato a lezione è arrivato in terapia intensiva con frequenza 160 e pressione non rilevabile — cioè in shock — con un tracciato slargato che sembrava una tachicardia ventricolare.',
            },
          ],
        },
      },
    ],

    arresto: { finestraRcp: 60 },

    soglie: [
      { id: 's-tachi', se: (p) => p.fc > 145, testo: 'Il monitor tiene una frequenza sopra i 145 e non accenna a scendere.' },
      { id: 's-calmo', se: (p) => p.tag.includes('rassicurato') && p.fc < 130, testo: 'Da quando gli parli piano il respiro si allunga, e la frequenza è scesa sotto i 130.' },
    ],

    azioni: {
      necessarie: [
        { id: 'valuta-scena', entro: 60, peso: 2 },
        { id: 'avpu', entro: 120, peso: 1 },
        /* La prova contraria all'ipossia. Presto, perché è la domanda
           che viene prima di «sarà la droga». */
        { id: 'monitor', entro: 200, peso: 4 },
        { id: 'misura-pa', entro: 260, peso: 2 },
        { id: 'rassicura', entro: 320, peso: 3 },
        { id: 'pupille', entro: 360, peso: 2 },
        { id: 'parla-in-disparte', entro: 440, peso: 3 },
        { id: 'domanda:evento', entro: 500, peso: 4 },
        { id: 'carica', entro: 660, peso: 3 },
      ],
      utili: ['dpi', 'conta-fr', 'colorito', 'misura-glicemia', 'ecg-elettrodi', 'ecg-esegui', 'domanda:disturbi', 'domanda:patologie', 'domanda:ultimo-pasto', 'riferisci-infermiere'],
      dannose: [
        {
          id: 'chiedi-ffoo', penalita: 3,
          perche: 'Non siete forze dell\'ordine, e va detto esplicitamente: la domanda serve a curarlo, non a incastrarlo. Chiamarle distrugge il rapporto e la verità non la senti più — e in ospedale le analisi la direbbero comunque.',
        },
        {
          id: 'spinale',
          perche: 'Non c\'è nessun trauma: è seduto sul divano di casa sua. Tre minuti buttati e un agitato immobilizzato, che è la cosa peggiore che gli puoi fare adesso.',
        },
      ],
    },

    chiave: 'Quadro iperadrenergico in un trentenne sano — tachicardia, ipertensione, sudorazione, agitazione, midriasi — senza febbre e senza che gli manchi niente: pensa alle sostanze. Il quadro OPPOSTO — bradipnea, miosi, coscienza depressa, cute fredda — orienterebbe agli oppiacei. E con la cocaina dipende dalla dose e dal taglio: non sempre è agitazione, a volte è depressione.',
    trappola: 'Prima di dire «è la droga», misura la saturazione: un paziente agitato va considerato ipossico fino a prova contraria, e la prova contraria è un numero, non un\'impressione. Poi la domanda sulle sostanze: si fa in disparte e senza tono da guardia, o non ottieni niente. E non c\'è antidoto da somministrare — si monitora, si tiene calmo, si trasporta comunque.',
    ragguaglio: 'Uomo di 30 anni, nessuna patologia nota, nessuna terapia. Riferita assunzione di cocaina e alcol nella notte. Cardiopalmo e oppressione toracica da circa un\'ora, agitazione psicomotoria. All\'arrivo vigile e orientato, FC 152, PA 152/97, FR 26, SpO₂ 98%, glicemia 108, midriasi bilaterale, cute sudata. Monitorizzato, ambiente calmo, trasportato. Sospetto quadro da sostanze simpaticomimetiche.',
    ragguaglioVoci: [
      { t: 'Uomo di 30 anni, nessuna patologia nota e nessuna terapia', da: 'domanda:patologie' },
      { t: 'Riferita assunzione di cocaina e alcol nella notte', da: 'sapere:cocaina' },
      { t: 'Cardiopalmo e oppressione toracica da circa un\'ora', da: 'sapere:cardiopalmo' },
      { t: 'FC 152 e SpO₂ 98%: non è ipossico', da: 'azione:monitor' },
      { t: 'PA 152/97', da: 'lettura:pa' },
      { t: 'Midriasi bilaterale', da: 'lettura:pupille' },
      { t: 'Vigile e orientato', da: 'azione:avpu' },
      { t: 'Tenuto in ambiente calmo', da: 'azione:rassicura' },
      { t: 'Trasportato: sospetto quadro da sostanze simpaticomimetiche' },
    ],
  },
```

- [ ] **Step 4: Calibrare**

Eseguire lo script della sezione «lo stato di partenza». Atteso per
`cocaina-v3`: **FC ~152, PA ~152/97, FR 26, SpO₂ 98, pupille
midriatiche, cute pallida-fredda-sudata**.

Se la frequenza è lontana da 150, aggiustare `base.fc` e il `picco`
insieme, e **riscrivere i numeri nel `ragguaglio`** perché combacino: è
la regola pagata in 1.10.0, la prosa segue la fisiologia.

Controllare anche il margine sotto il tetto dell'asse: dopo dieci minuti
il dolore dell'ischemia sale, e `1.4 + dolore/10` non deve schiacciarsi
contro il 2. Verificarlo:

```bash
node --input-type=module -e "
import { creaIntervento } from './assets/js/core/sim-engine.js';
import { AZIONI } from './assets/js/data/azioni.js';
import { CASI_INDICE } from './assets/js/data/casi.js';
const i = creaIntervento(CASI_INDICE['cocaina-v3'], { azioni: AZIONI });
for (let m = 0; m <= 15; m += 5) {
  console.log(m+' min: FC '+i.stato.fc+' PA '+i.stato.pas+'/'+i.stato.pad+' dol '+i.stato.dolore+' pup '+i.stato.pupille);
  for (let k=0;k<5;k++){ i.avanza(60); while(i.decisionePendente) i.rispondiDecisione(0); }
}
"
```

Se la frequenza smette di rispondere, **abbassare il picco** invece di
alzare il tetto: un asse che sfonda ovunque non distingue più niente.

- [ ] **Step 5: Eseguire tutti i test**

Run: `node --test tests/*.test.mjs`
Expected: PASS, tutti.

- [ ] **Step 6: Commit**

```bash
git add assets/js/data/casi.js tests/casi.test.mjs
git commit -m "feat(casi): il cardiopalmo dopo la festa, e la domanda che si fa in disparte"
```

---

## Task 13: Via il doppione dal motore vecchio

**Files:**
- Modify: `assets/js/data/scenari.js`
- Modify: `assets/js/data/scenari-arrivo.js`

- [ ] **Step 1: Togliere lo scenario**

In `assets/js/data/scenari.js`, cancellare per intero l'oggetto che
comincia con `id: 'cocaina',` — dalla graffa aperta che lo precede fino
alla riga `},` che lo chiude.

In `assets/js/data/scenari-arrivo.js`, cancellare per intero la voce
`cocaina: { … },` con il commento separatore `/* ---- */` che la precede.

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
a domande: 5 bpco, arresto, anticoagulante, anafilassi, schiacciamento
in tempo : 7 shock-v3, toracico-v3, ipoglicemia-v3, incidente-v3, sincope-v3, ictus-v3, cocaina-v3
```

- [ ] **Step 3: Eseguire tutti i test**

Run: `node --test tests/*.test.mjs`
Expected: PASS, tutti.

- [ ] **Step 4: Provare la lista nel browser**

Aprire `http://localhost:8925/index.html#/simulazioni` e verificare che
«Cardiopalmo dopo una festa» compaia **una volta sola**.

- [ ] **Step 5: Commit**

```bash
git add assets/js/data/scenari.js assets/js/data/scenari-arrivo.js
git commit -m "chore(scenari): via cocaina dal motore a domande, ora e' convertita"
```

---

## Task 14: Prova completa e rilascio

**Files:**
- Modify: `assets/js/versione.js`
- Modify: `sw.js:11`
- Modify: `CLAUDE.md`

- [ ] **Step 1: Provare i casi nel browser**

Con `python3 -m http.server 8925`, a larghezza telefono (400 px):

- **`cocaina-v3` fatto bene**: scena (deve comparire il piattino sul
  tavolino), AVPU, monitor, pressione, rassicura — e la frequenza deve
  **scendere a vista** — pupille, poi «Parla col paziente in disparte» e
  la domanda sull'evento. Il confronto del ragguaglio esce tutto verde;
- **rifatto saltando il «in disparte»**: la stessa domanda dà «eravamo a
  una festa», e nel debriefing la riga della cocaina è in ambra;
- **rifiutando il trasporto** all'evento dei cinque minuti: la
  spiegazione del cocaetilene compare nel debriefing;
- **`sincope-v3`**: la tessera Cute adesso dice «pallida», che è quello
  che il colpo d'occhio prometteva dal 1.10.0;
- **`toracico-v3`**: cute pallida e sudata, respiro 26 — l'infartuato
  adesso ha il quadro adrenergico addosso;
- la griglia a sette tessere non sborda; la console è pulita.

- [ ] **Step 2: Verificare che i test siano tutti verdi**

Run: `node --test tests/*.test.mjs`
Expected: PASS, nessun fallimento.

- [ ] **Step 3: Alzare il numero di versione**

In `assets/js/versione.js`:

```js
export const VERSIONE = '1.11.0';
export const DATA_VERSIONE = '<la data di oggi>';
```

e come prima riga di `NOVITA`:

```js
  { v: '1.11.0', t: 'L\'allarme adrenergico diventa un asse del motore: frequenza, pressione, cute, respiro e pupille escono tutti dallo stesso numero, e quel numero lo alzano il sangue che manca, l\'ossigeno che manca, lo zucchero che manca, il dolore — e quello che viene da fuori. È il capitolo 27 messo nel motore: gli stessi segni per cause diverse. Da qui l\'ipoglicemico è finalmente tachicardico e sudato, l\'infartuato pallido, la sincope non ha più una frequenza finta, e le pupille sono un parametro vero invece di un\'azione che non rilevava niente. Con l\'asse arriva il cardiopalmo dopo la festa: nessun antidoto da dare, l\'ambiente calmo che funziona davvero, e la domanda sulle sostanze che rende solo se la fai in disparte.' },
```

In `sw.js` riga 11:

```js
const CACHE = 'consoletssa-1.11.0';
```

- [ ] **Step 4: Aggiornare `CLAUDE.md`**

Il repo ha la convenzione del commit `docs:` a fine ciclo. Aggiornare:

- la mappa dei file: `fisiologia.js` adesso porta anche l'asse dell'allarme;
- il conto dei casi del motore nuovo: da sei a **sette**;
- la sezione «Cosa resta da fare»: il gruppo A è **a metà** — restano
  `anafilassi-v3` e `anticoagulante-v3`, che hanno la loro specifica da
  scrivere, più il gruppo B;
- le assunzioni nostre: **togliere** la frequenza 58 della sincope, che
  non esiste più, e **aggiungere** i pesi dell'asse;
- le trappole: aggiungere che `fc`, `cute`, `fr` e `pupille` adesso
  escono dall'asse e non dalla sola perdita.

- [ ] **Step 5: Commit e pubblicazione**

```bash
git add -A
git commit -m "feat: l'allarme adrenergico come asse del motore, e il cardiopalmo dopo la festa"
git push origin HEAD
```

- [ ] **Step 6: Verificare la pubblicazione**

```bash
curl -s "https://g3ggy.github.io/consoletssa/assets/js/versione.js?x=$RANDOM" | grep VERSIONE
curl -s "https://g3ggy.github.io/consoletssa/sw.js?x=$RANDOM" | grep CACHE
```

Expected: `1.11.0` in tutti e due. GitHub Pages ci mette un minuto o due.
Se i due file non si allineano si finisce con versioni mescolate in cache.

---

## Cosa questo piano NON fa, di proposito

- **La farmacocinetica del cocaetilene.** Sta nella spiegazione del
  debriefing, non nel motore: su venti minuti di scena non si vede.
- **La miosi e gli oppiacei.** Il campo `pupille` nasce con due valori.
  Il quadro opposto è un altro caso — e `inf-naloxone` è già in catalogo
  ad aspettarlo.
- **Due riserve separate**, simpatico e vagale.
- **La bocca secca** come tessera a sé, sovrapposta alla sete.
- **`anafilassi-v3` e `anticoagulante-v3`**, che sono la seconda metà del
  gruppo A e avranno la loro specifica.

## Le assunzioni nostre, marcate nel codice

- **i quattro pesi dell'allarme esogeno**: ipossia ×4 sotto 0,95;
  ipoglicemia su 40 mg/dl sotto i 70; dolore su 10; tono autonomo diretto;
- **i guadagni 48 e 25**, scelti per riprodurre esattamente i numeri di
  prima, non trovati in una fonte;
- **le soglie 1/3 e 2/3 della cute e 0,5 della tachipnea**, che sono le
  soglie di perdita di prima tradotte sull'asse;
- **la soglia 1,2 della midriasi**, messa oltre il compenso pieno perché
  resti un indizio e non un contorno;
- **il tetto a 2 e il pavimento a −1** dell'asse;
- **`picco`, `calmo` e `costante`** del simpaticomimetico: nessuna fonte
  dà una curva della cocaina in circolo.
