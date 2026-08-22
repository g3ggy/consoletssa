# Chi fa cosa, e come si valuta — piano di implementazione

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rendere vero il modello della squadra — manovre che chiedono due mani, DPI di tutti, l'infermiere che non si comanda, l'equipaggio che può non averlo — e togliere il voto sul cronometro, sostituendolo con quello che insegna: cosa andava usato al posto di quello che hai usato.

**Architecture:** Il motore impara una cosa sola (`servono`: quante persone occupa un'azione) e ne dimentica una (il dimezzamento dei punti per ritardo). Tutto il resto è dati, testo e due moduli puri nuovi: `core/sequenza.js` per le inversioni di metodo, e l'alternativa che `core/giudizio.js` deduce dalle famiglie di presidi già esistenti.

**Tech Stack:** JavaScript ES modules nativi, nessun bundler, nessuna dipendenza. Test con `node --test`, solo logica pura.

**Specifica:** `docs/superpowers/specs/2026-08-22-squadra-e-valutazione-design.md`

---

## Come si lavora qui

```bash
python3 -m http.server 8925          # i moduli ES non partono da file://
node --test tests/*.test.mjs         # tutta la suite
node --test tests/sequenza.test.mjs  # un file solo
```

Regole del progetto valide per ogni task:

- **tutto in italiano** — id, nomi, commenti, testi. I commenti dicono *perché*: chi legge è un volontario che studia.
- **niente mutazioni**: si creano oggetti nuovi. Vale soprattutto per lo stato del motore.
- **file piccoli**: 200-400 righe tipiche, **800 il massimo**.
- **il contenuto clinico viene dai manuali**, e dove non c'è si scrive `ASSUNZIONE NOSTRA` nel commento.
- **si prova sul telefono**, non solo su desktop.

## Da leggere prima di cominciare

`CLAUDE.md`, sezione «Trappole già pagate». Quelle che mordono qui:

- **`modules/intervento.js` è a 796 righe su 800**: il Task 1 esiste per questo.
- **Chrome congela `requestAnimationFrame` nelle schede non visibili**: il timer del Task 5 va su `setInterval`, non su rAF.
- **`.az-testo span` è `display: block`** e va scavalcato per specificità.
- **`rispondiDecisione` scrive in `fatte` senza `giudizio`**: chi legge `f.giudizio` deve reggere l'assenza.

## I file

| file | cosa fa | task |
|---|---|---|
| `assets/js/modules/intervento-palette.js` | **nuovo** — la palette estratta | 1 |
| `assets/js/data/azioni.js` | `servono` sulle manovre, i due tag di scena | 2, 4 |
| `assets/js/core/sim-engine.js` | occupa più membri, niente voto sul tempo, l'automedica | 2, 10 |
| `assets/js/modules/intervento.js` | la scelta di chi sparisce, il timer, l'equipaggio | 3, 5, 10 |
| `assets/js/core/pagella.js` | punti pieni, le inversioni nel verdetto | 6, 7 |
| `assets/js/core/sequenza.js` | **nuovo** — le inversioni di metodo | 7 |
| `assets/js/core/giudizio.js` | l'alternativa dedotta dalla famiglia | 8 |
| `assets/js/modules/debriefing.js` | l'alternativa e le inversioni a schermo | 9 |
| `assets/js/modules/simulazioni.js` | la scelta dell'equipaggio prima di partire | 10 |
| `assets/js/versione.js`, `sw.js`, `CLAUDE.md` | il rilascio | 12 |

---

## Task 1: estrarre la palette da `intervento.js`

Prerequisito di tutto: il file è a 796 righe su 800 e nei task seguenti ci entra altro codice.

**Files:**
- Create: `assets/js/modules/intervento-palette.js`
- Modify: `assets/js/modules/intervento.js`

- [ ] **Step 1: Guarda cosa si sposta**

```bash
grep -n "^function rigaAzione\|^function rigaFamiglia\|^function righeDellaCategoria\|^function risultatiRicerca\|^function pannelloAnamnesi\|^function rigaDomanda\|^function aggiornaPalette" assets/js/modules/intervento.js
wc -l assets/js/modules/intervento.js
```

Sono sei funzioni più `aggiornaPalette`. Parlano col motore solo attraverso `sim`, e con la vista attraverso `n` — per questo si staccano bene.

- [ ] **Step 2: Crea il file nuovo**

`assets/js/modules/intervento-palette.js` riceve dall'esterno quello che gli serve, invece di leggere lo stato del modulo:

```js
/* =====================================================================
   intervento-palette.js — la palette delle azioni.

   Sta fuori da `intervento.js` per una ragione pratica: quel file era
   arrivato a 796 righe contro le 800 che il progetto si è dato come
   massimo, e la palette è il pezzo che si stacca meglio — parla col
   motore solo attraverso `sim` e non sa niente del monitor, del diario
   né del debriefing.

   Non tiene stato suo: riceve tutto in `ctx` e restituisce nodi.
   ===================================================================== */

import { el } from '../core/dom.js';
import { AZIONI, CATEGORIE, azioniDi } from '../data/azioni.js';
import { FAMIGLIE_META } from '../data/presidi.js';

/* `ctx` è quello che la palette ha bisogno di sapere dal modulo:
   { sim, esegui, chiedi, rivolgitiA, categoriaAperta, famigliaAperta,
     membroFamiglia, ricercaTesto, apriFamiglia, apriCategoria, NOMI_MEMBRO } */
```

Sposta dentro, **senza cambiarne la logica**, le funzioni `rigaAzione`, `rigaFamiglia`, `righeDellaCategoria`, `risultatiRicerca`, `rigaDomanda`, `pannelloAnamnesi`, e la parte di `aggiornaPalette` che costruisce i nodi. Ognuna prende `ctx` come primo parametro al posto delle variabili di modulo che leggeva.

Esporta:

```js
export function costruisciTabs(ctx) { /* i bottoni delle categorie */ }
export function costruisciLista(ctx) { /* le righe, o i risultati della ricerca */ }
```

- [ ] **Step 3: In `intervento.js` resta il richiamo**

`aggiornaPalette()` diventa il posto dove si mette insieme il contesto e si montano i nodi:

```js
function contestoPalette() {
  return {
    sim, esegui, NOMI_MEMBRO,
    chiedi: (id) => { const e = sim.chiedi(id); if (!e.ok) toast('Non ora', e.motivo, 'warn'); else aggiornaTutto(); },
    rivolgitiA: (id) => { const e = sim.rivolgitiA(id); if (!e.ok) toast('Non ora', e.motivo, 'warn'); else aggiornaTutto(); },
    categoriaAperta, famigliaAperta, membroFamiglia, ricercaTesto,
    apriCategoria: (id) => { categoriaAperta = id; ricercaTesto = ''; if (n.ricercaInput) n.ricercaInput.value = ''; aggiornaPalette(); },
    apriFamiglia: (idFam, chi) => { famigliaAperta = idFam; membroFamiglia = chi; aggiornaPalette(); },
  };
}

function aggiornaPalette() {
  const ctx = contestoPalette();
  mount(n.paletteTabs, ...costruisciTabs(ctx));
  mount(n.paletteLista, ...costruisciLista(ctx));
}
```

- [ ] **Step 4: Verifica che non sia cambiato niente**

```bash
node --test tests/*.test.mjs        # atteso: 318 pass, 0 fail
wc -l assets/js/modules/intervento.js assets/js/modules/intervento-palette.js
```

Entrambi devono stare sotto le 800 righe, e `intervento.js` sotto le 600.

Poi nel browser, a 390px: la palette si apre, le categorie cambiano, la ricerca filtra, una famiglia si apre e una misura parte, l'anamnesi si gira verso un'altra persona. **È un refactor: se qualcosa si comporta diversamente, è un difetto tuo.**

- [ ] **Step 5: Commit**

```bash
git add assets/js/modules/intervento-palette.js assets/js/modules/intervento.js
git commit -m "refactor(intervento): la palette esce in un file suo"
```

---

## Task 2: `servono` — le manovre che chiedono due mani

**Files:**
- Modify: `assets/js/data/azioni.js`
- Modify: `assets/js/core/sim-engine.js`
- Test: `tests/sim-engine.test.mjs`

- [ ] **Step 1: Scrivi i test che falliscono**

In fondo a `tests/sim-engine.test.mjs`:

```js
/* ===================== le manovre a due mani ======================== */

test('una manovra a due mani occupa due persone', () => {
  const i = creaIntervento(casoProva(), { azioni: AZIONI });
  const esito = i.esegui('spinale', 'tu');
  assert.ok(esito.ok, `rifiutata: ${esito.motivo}`);
  /* La spinale dura tre minuti: mentre è in corso non deve restare
     nessuno libero, perché la stanno facendo in due. */
  const occupati = Object.values(i.squadra).filter((m) => m.liberoA > 0).length;
  assert.equal(occupati, 2, 'la spinale ha occupato una persona sola');
});

test('senza due persone libere la manovra non parte', () => {
  const i = creaIntervento(casoProva(), { azioni: AZIONI, membri: ['tu'] });
  const esito = i.esegui('spinale', 'tu');
  assert.equal(esito.ok, false);
  assert.match(esito.motivo, /due/i, `motivo poco chiaro: ${esito.motivo}`);
});

test('finita la manovra tornano liberi tutti e due', () => {
  const i = creaIntervento(casoProva(), { azioni: AZIONI });
  i.esegui('spinale', 'tu');
  i.avanza(200);
  const liberi = Object.values(i.squadra).filter((m) => m.liberoA <= i.t).length;
  assert.equal(liberi, 3, 'qualcuno è rimasto occupato dopo la fine');
});
```

- [ ] **Step 2: Esegui e verifica che falliscano**

Run: `node --test tests/sim-engine.test.mjs`
Expected: FAIL — «la spinale ha occupato una persona sola».

- [ ] **Step 3: Dichiara le mani nel catalogo**

In `assets/js/data/azioni.js`, aggiungi `servono: 2` a queste sei azioni — e **solo** a queste:

```js
/* Le manovre che non esistono da soli. Il campo dice quante persone
   occupa il gesto: senza, vale una. Fino a oggi `chi: ['tu','autista']`
   significava «la può fare uno dei due», e la tavola spinale nel banco
   la metteva una persona sola. */
```

- `spinale` → `servono: 2`
- `ked` → `servono: 2`
- `cucchiaio` → `servono: 2`
- `materassino` → `servono: 2`
- `telo` → `servono: 2`
- `pallone` → `servono: 2`, e `chi: ['tu', 'autista']` (oggi è `chi: ['tu']`, ma se ne servono due l'autista deve poter essere il secondo)

- [ ] **Step 4: Il motore occupa quante persone servono**

In `assets/js/core/sim-engine.js`, dentro `azioniDisponibili()`, il filtro diventa:

```js
  function azioniDisponibili() {
    const s = proietta();
    const ctx = contesto();
    return Object.values(catalogo).filter((az) => {
      if (az.unaVolta && fatte.some((f) => f.id === az.id)) return false;
      /* Una manovra a due mani non compare se non c'è chi la faccia in
         due: mostrarla e poi rifiutarla sarebbe peggio. */
      if (membriLiberi(az).length < (az.servono || 1)) return false;
      if (az.richiede && !az.richiede(s, ctx)) return false;
      return true;
    });
  }
```

In `esegui(id, chi)`, dopo il controllo su `az.richiede`, sostituisci l'occupazione del solo `chi`:

```js
    const servono = az.servono || 1;
    const liberi = membriLiberi(az);
    if (liberi.length < servono) {
      return { ok: false, motivo: `Serve un'altra persona: questa manovra si fa in ${servono}.` };
    }
    /* Chi hai scelto tiene il posto, gli altri si prendono fra i liberi.
       È il motivo per cui `pendenti` porta l'elenco intero: alla fine
       vanno liberati tutti, non solo il primo. */
    const impegnati = [chi, ...liberi.filter((m) => m !== chi)].slice(0, servono);

    const fineA = t + az.durata;
    squadra = { ...squadra };
    impegnati.forEach((m) => { squadra[m] = { liberoA: fineA, azione: az.id }; });

    const giudizio = indicata(id, contestoGiudizio(), indicazioni);
    pendenti = [...pendenti, { fineA, id, chi, impegnati, giudizio }];
```

E in `completa({ id, chi, impegnati, giudizio })` si liberano tutti:

```js
  function completa({ id, chi, impegnati, giudizio }) {
    const az = catalogo[id];
    if (!az) return;
    squadra = { ...squadra };
    (impegnati || [chi]).forEach((m) => {
      if (squadra[m]) squadra[m] = { ...squadra[m], azione: null };
    });
    fatte = [...fatte, { id, chi, t, giudizio }];
```

Il resto di `completa` non cambia.

- [ ] **Step 5: Esegui i test**

Run: `node --test tests/*.test.mjs`
Expected: PASS.

Se `tests/casi.test.mjs` fallisce su un caso che chiede `spinale` o `cucchiaio`, guarda il motivo: con `membri` completi ci sono sempre due liberi, quindi il problema sarebbe altrove.

- [ ] **Step 6: Commit**

```bash
git add assets/js/data/azioni.js assets/js/core/sim-engine.js tests/sim-engine.test.mjs
git commit -m "feat(squadra): le manovre che si fanno in due occupano due persone"
```

---

## Task 3: i DPI di tutti, e la scelta di chi che sparisce

**Files:**
- Modify: `assets/js/data/azioni.js`
- Modify: `assets/js/core/sim-engine.js`
- Modify: `assets/js/modules/intervento-palette.js`

- [ ] **Step 1: I DPI diventano un gesto della squadra**

In `azioni.js`, l'azione `dpi`:

```js
  {
    /* Non è una scelta: i DPI li mette tutto l'equipaggio, sempre. Finché
       il banco chiedeva CHI li indossa, insegnava che qualcuno può non
       metterli. */
    id: 'dpi', cat: 'scena', label: 'Indossa i DPI', durata: 20,
    chi: ['tu', 'autista', 'infermiere'], tuttaLaSquadra: true,
    unaVolta: true, applica: () => ({ tag: 'dpi' }),
    diario: 'Guanti e occhiali indossati da tutto l\'equipaggio.',
    spiega: 'Prima di toccare chiunque. Il rischio infettivo non si vede.',
  },
```

- [ ] **Step 2: Il motore li occupa tutti**

In `esegui`, il calcolo di `servono` tiene conto del caso «tutti»:

```js
    const servono = az.tuttaLaSquadra ? membriLiberi(az).length : (az.servono || 1);
```

Metti questa riga **prima** del controllo `if (liberi.length < servono)` scritto nel Task 2, e usa `Math.max(1, servono)` perché un equipaggio con tutti occupati non deve dare zero.

- [ ] **Step 3: Nella palette la scelta sparisce dove non è una scelta**

In `intervento-palette.js`, dentro `rigaAzione`, i bottoni diventano:

```js
  const bottoni = el('div.az-btn');
  const servono = az.tuttaLaSquadra ? liberi.length : (az.servono || 1);
  if (!principale) {
    bottoni.append(el('span.badge.b-no', { text: 'occupati' }));
  } else if (servono > 1 || az.tuttaLaSquadra) {
    /* Quando la manovra prende più di una persona non c'è niente da
       scegliere: si fa in due, o la fa la squadra. Il bottone dice
       quello che succede. */
    bottoni.append(el('button.btn.sm.pri', {
      type: 'button',
      onclick: () => agisci(az.id, principale),
    }, [az.tuttaLaSquadra ? 'Tutta la squadra' : 'Fatelo in due']));
  } else if (az.chi.length === 1 || liberi.length === 1) {
    /* Un solo candidato libero: nessuna scelta da fare. */
    bottoni.append(el('button.btn.sm.pri', {
      type: 'button',
      onclick: () => agisci(az.id, principale),
    }, [principale === 'tu' ? 'Fallo tu' : `Chiedi a ${NOMI_MEMBRO[principale].toLowerCase()}`]));
  } else {
    /* Qui la scelta è vera: puoi farlo tu, o chiederlo mentre fai altro. */
    bottoni.append(el('button.btn.sm.pri', {
      type: 'button', onclick: () => agisci(az.id, principale),
    }, [principale === 'tu' ? 'Fallo tu' : `Chiedi a ${NOMI_MEMBRO[principale].toLowerCase()}`]));
    liberi.filter((m) => m !== principale).forEach((m) => {
      bottoni.append(el('button.btn.sm', { type: 'button', onclick: () => agisci(az.id, m) }, [NOMI_MEMBRO[m]]));
    });
  }
```

- [ ] **Step 4: Prova e commit**

```bash
node --test tests/*.test.mjs
```

Nel browser: la riga dei DPI ha un bottone solo, «Tutta la squadra»; la spinale ne ha uno solo, «Fatelo in due»; «Misura la pressione» ne ha ancora due, perché lì la scelta c'è.

```bash
git add assets/js/data/azioni.js assets/js/core/sim-engine.js assets/js/modules/intervento-palette.js
git commit -m "feat(squadra): i DPI li mette l'equipaggio, e dove non si sceglie non si chiede"
```

---

## Task 4: le due azioni di scena che si ripetevano

**Files:**
- Modify: `assets/js/data/azioni.js`

- [ ] **Step 1: Il tag diventa il guardiano**

`allontana-curiosi` e `gestisci-familiari` sono le uniche due azioni di scena senza `unaVolta`, e si possono rifare all'infinito. Usa lo stesso meccanismo delle famiglie di presidi — il tag che l'azione stessa lascia:

```js
  {
    id: 'allontana-curiosi', cat: 'scena', label: 'Allontana i curiosi', durata: 45,
    chi: ['tu', 'autista'],
    /* Una volta liberato lo spazio è liberato: rifarlo non aggiunge
       niente e occupa una persona per quarantacinque secondi. Il
       guardiano è il tag che lascia, come per i presidi. */
    richiede: (p) => !p.tag.includes('scena-libera'),
    motivoBloccato: 'Lo spazio attorno al paziente è già libero.',
    applica: () => ({ tag: 'scena-libera' }),
    diario: 'Curiosi allontanati, spazio liberato attorno al paziente.',
    spiega: 'Servono spazio per lavorare e riservatezza per il paziente.',
  },
```

Stessa cosa per `gestisci-familiari` con il tag `familiari-gestiti` e il motivo «I familiari sono già stati presi da parte.».

- [ ] **Step 2: Test e commit**

```bash
node --test tests/*.test.mjs
git add assets/js/data/azioni.js
git commit -m "fix(scena): allontanare i curiosi non si rifà all'infinito"
```

---

## Task 5: il timer della squadra che scorre

**Files:**
- Modify: `assets/js/modules/intervento.js`

- [ ] **Step 1: Capisci perché sta fermo**

`aggiornaSquadra()` mostra già `${m.liberoA - sim.t}s`, che è il numero giusto. Ma la vista si ridisegna solo quando il motore notifica, e mentre aspetti che l'autista finisca non succede niente: il numero resta fermo su «60s» e sembra rotto.

- [ ] **Step 2: Un battito al secondo, solo mentre serve**

In `intervento.js`, accanto alle altre variabili di modulo:

```js
/* Il conto alla rovescia di chi è occupato. Va su `setInterval` e non su
   requestAnimationFrame: Chrome congela rAF nelle schede non visibili, e
   questo deve continuare a scorrere anche se guardi altro. */
let battitoSquadra = null;
```

In fondo a `aggiornaSquadra()`:

```js
  const qualcunoOccupato = Object.values(sim.squadra).some((m) => m.liberoA > sim.t);
  if (qualcunoOccupato && !battitoSquadra) {
    battitoSquadra = setInterval(() => aggiornaSquadra(), 1000);
  } else if (!qualcunoOccupato && battitoSquadra) {
    clearInterval(battitoSquadra);
    battitoSquadra = null;
  }
```

E in `destroy()` (riga ~790), fermalo:

```js
  if (battitoSquadra) { clearInterval(battitoSquadra); battitoSquadra = null; }
```

- [ ] **Step 3: Prova e commit**

Nel browser: chiedi all'autista un'azione lunga e guarda il numero scendere di secondo in secondo. Poi cambia pagina e torna: non devono restare intervalli appesi.

```bash
git add assets/js/modules/intervento.js
git commit -m "fix(squadra): il tempo di chi è occupato scorre davvero"
```

---

## Task 6: via il voto sul tempo

**Files:**
- Modify: `assets/js/core/pagella.js`
- Test: `tests/sim-engine.test.mjs`

- [ ] **Step 1: Scrivi il test che fallisce**

```js
test('il punteggio non guarda l\'orologio', () => {
  /* Lo stesso identico giro di azioni, fatto subito e fatto tardi, deve
     valere lo stesso: quello che cambia è come sta il paziente, e quello
     si vede altrove. Il cronometro non è un voto. */
  const caso = casoProva({
    azioni: { necessarie: [{ id: 'antishock', entro: 60, peso: 3 }], utili: [], dannose: [] },
  });

  const svelto = creaIntervento(caso, { azioni: AZIONI });
  svelto.esegui('antishock', 'tu');
  const pSvelto = svelto.chiudi();

  const tardo = creaIntervento(caso, { azioni: AZIONI });
  tardo.avanza(600);
  tardo.esegui('antishock', 'tu');
  const pTardo = tardo.chiudi();

  assert.equal(pTardo.punti, pSvelto.punti, 'chi ha fatto la stessa cosa più tardi ha preso meno punti');
  assert.equal(pTardo.punti, 3, 'la voce necessaria non vale il suo peso pieno');
  /* Il ritardo resta scritto, perché raccontarlo serve: è punirlo che non serve. */
  assert.equal(pTardo.necessarie[0].ritardo, true);
});
```

- [ ] **Step 2: Esegui e verifica che fallisca**

Run: `node --test tests/sim-engine.test.mjs`
Expected: FAIL — il tardivo prende 1.5 invece di 3.

- [ ] **Step 3: Punti pieni**

In `assets/js/core/pagella.js`, dentro il `map` delle `necessarie`:

```js
      peso,
      /* Fatto o non fatto. Il `entro` resta e si racconta — «l'hai fatto
         al minuto 7» — ma non dimezza più niente: nel soccorso
         territoriale, salvo i casi in cui il tempo È la terapia, non si
         corre, si stabilizza e si trasporta. Il tempo continua a costare
         dove costa davvero: mentre temporeggi le riserve si consumano, le
         finestre si chiudono da sole e il paziente lo consegni peggio. */
      punti: fatto ? peso : 0,
      ritardo: Boolean(fatto && !inTempo),
```

- [ ] **Step 4: Esegui tutta la suite**

Run: `node --test tests/*.test.mjs`
Expected: PASS. Il test «facendo le azioni necessarie il punteggio è pieno» continua a valere — anzi, adesso è più facile.

- [ ] **Step 5: Commit**

```bash
git add assets/js/core/pagella.js tests/sim-engine.test.mjs
git commit -m "feat(pagella): le azioni necessarie valgono intere, il cronometro non vota"
```

---

## Task 7: `core/sequenza.js` — le inversioni di metodo

**Files:**
- Create: `assets/js/core/sequenza.js`
- Create: `tests/sequenza.test.mjs`
- Modify: `assets/js/core/pagella.js`

- [ ] **Step 1: Scrivi il test che fallisce**

`tests/sequenza.test.mjs`:

```js
/* Le due inversioni che contano. Non sono cronometro: sono metodo. */

import test from 'node:test';
import assert from 'node:assert/strict';

import { inversioni } from '../assets/js/core/sequenza.js';

const fatto = (id, t) => ({ id, t, chi: 'tu' });

test('toccare il paziente senza aver valutato la scena si vede', () => {
  const r = inversioni([fatto('misura-pa', 30), fatto('valuta-scena', 90)]);
  assert.equal(r.length, 1);
  assert.match(r[0].perche, /scena/i);
  assert.equal(r[0].primoContatto, 'misura-pa');
});

test('chi valuta la scena e poi tocca non ha invertito niente', () => {
  const r = inversioni([fatto('valuta-scena', 20), fatto('dpi', 40), fatto('misura-pa', 80)]);
  assert.deepEqual(r, []);
});

test('toccare senza DPI si vede', () => {
  const r = inversioni([fatto('valuta-scena', 20), fatto('refill', 40)]);
  assert.equal(r.length, 1);
  assert.match(r[0].perche, /DPI/);
});

test('le domande e le azioni di scena non contano come contatto', () => {
  /* Chiedere non è toccare, e allontanare i curiosi nemmeno. */
  const r = inversioni([fatto('domanda:disturbi', 10), fatto('allontana-curiosi', 30),
    fatto('valuta-scena', 60), fatto('dpi', 80), fatto('misura-pa', 100)]);
  assert.deepEqual(r, []);
});

test('senza niente di fatto non si inventa nessuna inversione', () => {
  assert.deepEqual(inversioni([]), []);
});
```

- [ ] **Step 2: Esegui e verifica che fallisca**

Run: `node --test tests/sequenza.test.mjs`
Expected: FAIL — `Cannot find module`.

- [ ] **Step 3: Scrivi il modulo**

```js
/* =====================================================================
   sequenza.js — quello che va fatto prima.

   Logica pura: riceve l'elenco di quello che hai fatto e restituisce le
   inversioni. Non toglie punti: si raccontano, come il tempo buttato.

   Sono due, e sono poche apposta. Ogni segnalazione in più è rumore che
   copre quelle che contano, e queste due contano perché riguardano la
   sicurezza di chi soccorre prima ancora che quella del paziente:
   valutare la scena e mettersi i DPI vengono prima di toccare chiunque.
   È il passo zero del Bolognin :2653 e il primo del soccorso al
   traumatizzato.
   ===================================================================== */

/* Cosa NON conta come «toccare il paziente»: le azioni che riguardano la
   scena e le persone intorno, e le domande — chiedere non è toccare. */
const NON_E_CONTATTO = new Set([
  'valuta-scena', 'dpi', 'allontana-curiosi', 'gestisci-familiari',
  'chiedi-ffoo', 'chiedi-vvf', 'cerca-documenti', 'allerta-co',
  'richiedi-automedica', 'parla-in-disparte',
]);

const eContatto = (f) => !String(f.id).startsWith('domanda:')
  && !String(f.id).startsWith('decisione:')
  && !NON_E_CONTATTO.has(f.id);

/** Le inversioni di metodo in quello che hai fatto.
    @param {Array} fatte  `{ id, t }` in ordine di esecuzione */
export function inversioni(fatte = []) {
  const primo = fatte.filter(eContatto).sort((a, b) => a.t - b.t)[0];
  if (!primo) return [];

  const primaDi = (id) => fatte.some((f) => f.id === id && f.t <= primo.t);
  const trovate = [];

  if (!primaDi('valuta-scena')) {
    trovate.push({
      id: 'scena-prima',
      primoContatto: primo.id,
      t: primo.t,
      perche: 'Hai toccato il paziente prima di valutare la scena. È il passo zero: '
        + 'un soccorritore non deve mai finire per essere soccorso, e quello che non '
        + 'hai guardato addosso non smette di esserci.',
      fonte: 'Bolognin :2653',
    });
  }

  if (!primaDi('dpi')) {
    trovate.push({
      id: 'dpi-prima',
      primoContatto: primo.id,
      t: primo.t,
      perche: 'Hai toccato il paziente senza aver indossato i DPI. Il rischio '
        + 'infettivo non si vede, e i guanti si mettono prima, non quando ti accorgi '
        + 'che c\'è sangue.',
      fonte: 'Bolognin :2653',
    });
  }

  return trovate;
}
```

- [ ] **Step 4: Mettile nella pagella**

In `assets/js/core/pagella.js`, l'import e una chiave nuova nel verdetto:

```js
import { inversioni } from './sequenza.js';
```

```js
    tempoButtato: buttato,
    /* Non tolgono punti: si raccontano. Sono metodo, non cronometro. */
    inversioni: inversioni(fatte),
```

- [ ] **Step 5: Esegui e commit**

```bash
node --test tests/*.test.mjs
git add assets/js/core/sequenza.js tests/sequenza.test.mjs assets/js/core/pagella.js
git commit -m "feat(sequenza): il banco segnala la scena e i DPI saltati"
```

---

## Task 8: l'alternativa dedotta dalla famiglia

**Files:**
- Modify: `assets/js/core/giudizio.js`
- Test: `tests/giudizio.test.mjs`

- [ ] **Step 1: Scrivi il test che fallisce**

```js
test('quando bocci un presidio, il banco dice quale andava usato', () => {
  /* Dolore toracico noto, saturazione 95: il reservoir è alto flusso per
     niente, ma l'ossigeno ci vuole — e la maschera semplice è indicata.
     L'alternativa esce dalle stesse regole che hanno bocciato il gesto,
     quindi non può contraddirle. */
  const c = {
    coscienza: 'A', letture: { spo2: 95 }, saputo: { 'dolore-toracico': true },
    tag: [], caso: { tipo: 'medico' },
  };
  const v = indicata('o2-reservoir', c);
  assert.equal(v.ok, false);
  assert.ok(v.invece, 'nessuna alternativa proposta');
  assert.equal(v.invece.id, 'o2-maschera');
  assert.ok(v.invece.perche && v.invece.fonte, 'l\'alternativa non porta perché e fonte');
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
```

- [ ] **Step 2: Esegui e verifica che fallisca**

Run: `node --test tests/giudizio.test.mjs`
Expected: FAIL — «nessuna alternativa proposta».

- [ ] **Step 3: Scrivi l'alternativa**

In `assets/js/core/giudizio.js`, aggiungi l'import delle famiglie:

```js
import { INDICAZIONI } from '../data/indicazioni.js';
import { VOCI_PRESIDI } from '../data/presidi.js';
```

E riscrivi `indicata` così:

```js
/** Il gesto era indicato, con quello che sapevi quando l'hai deciso.

    `cercaAlternativa` esiste per fermare la ricorsione: quando proviamo
    le sorelle di una famiglia le interroghiamo senza chiedere a loro
    un'altra alternativa, se no si rimbalzerebbero all'infinito. */
export function indicata(idAzione, contesto, indicazioni = INDICAZIONI, cercaAlternativa = true) {
  const regola = indicazioni[idAzione];
  if (!regola) return { ok: true, perche: null, fonte: null, invece: null };

  let passa;
  try {
    passa = Boolean(regola.quando(contesto));
  } catch (errore) {
    return { ok: true, perche: null, fonte: null, invece: null };
  }

  if (passa) return { ok: true, perche: null, fonte: null, invece: null };

  return {
    ok: false,
    perche: regola.perche,
    fonte: regola.fonte || null,
    invece: cercaAlternativa ? alternativaNellaFamiglia(idAzione, contesto, indicazioni) : null,
  };
}

/* Il presidio sbagliato ha delle sorelle, e ognuna ha già la sua regola:
   si prova a interrogarle con lo stesso contesto e si nomina la prima che
   in quell'istante era indicata. Non c'è contenuto nuovo da scrivere e
   non c'è niente da tenere allineato — l'alternativa esce dalle stesse
   regole che hanno bocciato il gesto, quindi non può contraddirle.

   `null` quando la famiglia non c'è, o quando nessuna sorella era
   indicata: e quel «non serviva nessun presidio di questa famiglia» è
   un'informazione utile quanto l'altra. */
function alternativaNellaFamiglia(idAzione, contesto, indicazioni) {
  const voce = VOCI_PRESIDI.find((v) => v.id === idAzione);
  if (!voce) return null;

  const sorelle = VOCI_PRESIDI.filter((v) => v.famiglia === voce.famiglia && v.id !== idAzione);
  for (const s of sorelle) {
    const v = indicata(s.id, contesto, indicazioni, false);
    if (v.ok && indicazioni[s.id]) {
      return {
        id: s.id,
        label: s.label,
        perche: indicazioni[s.id].perche,
        fonte: indicazioni[s.id].fonte || null,
      };
    }
  }
  return null;
}
```

Nota sul `&& indicazioni[s.id]`: una sorella **senza** regola scritta risulterebbe «indicata» per il principio che senza regola tutto è lecito, e proporla come alternativa sarebbe un consiglio senza fondamento. Si propone solo chi ha una regola che dice di sì.

- [ ] **Step 4: Esegui e commit**

```bash
node --test tests/*.test.mjs
git add assets/js/core/giudizio.js tests/giudizio.test.mjs
git commit -m "feat(giudizio): quando un presidio è sbagliato, il banco dice quale andava usato"
```

---

## Task 9: farlo vedere nel debriefing e nel diario

**Files:**
- Modify: `assets/js/core/giudizio.js` (`tempoButtato` porta l'alternativa)
- Modify: `assets/js/core/sim-engine.js` (la riga del diario)
- Modify: `assets/js/modules/debriefing.js`

- [ ] **Step 1: L'alternativa arriva fino alla pagella**

In `giudizio.js`, dentro `tempoButtato`, aggiungi il campo al `map`:

```js
      perche: f.giudizio.perche,
      fonte: f.giudizio.fonte,
      invece: f.giudizio.invece || null,
```

- [ ] **Step 2: E anche nel diario, sul momento**

In `sim-engine.js`, dentro `completa`, la riga del giudizio diventa:

```js
    if (giudizio && giudizio.ok === false) {
      const alternativa = giudizio.invece ? ` Andava ${giudizio.invece.label}.` : '';
      scrivi('giudizio', `Non era indicata: ${giudizio.perche}${alternativa}`, id);
    }
```

- [ ] **Step 3: Nel debriefing**

In `assets/js/modules/debriefing.js`, dentro `sezioneTempoButtato`, la voce dell'elenco diventa:

```js
    el('ul.deb-elenco', {}, b.voci.map((v) => el('li', {}, [
      el('b', { text: `${v.label} — ${v.secondi}s` }),
      el('span', { text: v.perche }),
      v.invece ? el('span.deb-invece', {}, [
        el('b', { text: `Andava ${v.invece.label}. ` }),
        v.invece.perche,
      ]) : null,
      v.fonte ? el('small.deb-fonte', { text: v.fonte }) : null,
    ].filter(Boolean)))),
```

E una sezione nuova per le inversioni, subito dopo `sezioneTempoButtato`:

```js
/* Le inversioni di metodo. Non tolgono punti — non sono un voto — ma
   vanno dette, perché riguardano la sicurezza di chi soccorre. */
function sezioneInversioni(p) {
  if (!p.inversioni || !p.inversioni.length) return null;
  return el('section.dbox.deb-sez', {}, [
    el('div.t', { text: 'quello che va fatto prima' }),
    el('h3', { text: p.inversioni.length === 1 ? 'Un passo saltato' : `${p.inversioni.length} passi saltati` }),
    el('ul.deb-elenco', {}, p.inversioni.map((x) => el('li', {}, [
      el('span', { text: x.perche }),
      el('small.deb-fonte', { text: x.fonte }),
    ]))),
  ]);
}
```

Montala accanto alle altre (riga ~304):

```js
    ...[sezioneSospetto(p), sezioneInversioni(p), sezioneTempoButtato(p), sezioneBombola(p)].filter(Boolean),
```

- [ ] **Step 4: Lo stile di `.deb-invece`**

In fondo a `assets/css/intervento.css`:

```css
/* L'alternativa dentro il tempo buttato: è la riga che insegna, quindi
   si stacca dal perché invece di confondersi con lui. */
.deb-invece {
  display: block; margin-top: 4px; padding-left: 8px;
  border-left: 2px solid var(--phos); color: var(--ink-2);
}
.deb-invece b { color: var(--phos); }
```

- [ ] **Step 5: Prova e commit**

Nel browser: fai `toracico-v3`, metti il reservoir, chiudi. Nel tempo buttato deve comparire «Andava Ossigeno — maschera semplice, 6-8 l/min». Poi fanne uno toccando il paziente senza DPI e guarda il riquadro nuovo.

```bash
git add assets/js/core/giudizio.js assets/js/core/sim-engine.js assets/js/modules/debriefing.js assets/css/intervento.css
git commit -m "feat(debriefing): cosa andava usato al posto suo, e i passi saltati"
```

---

## Task 10: l'equipaggio senza infermiere, e l'automedica

**Files:**
- Modify: `assets/js/core/sim-engine.js`
- Modify: `assets/js/modules/intervento.js`
- Modify: `assets/js/modules/simulazioni.js`
- Test: `tests/sim-engine.test.mjs`

- [ ] **Step 1: Scrivi i test che falliscono**

```js
test('senza infermiere le azioni sanitarie non si possono fare', () => {
  const i = creaIntervento(casoProva(), { azioni: AZIONI, membri: ['tu', 'autista'] });
  assert.equal(i.azioniDisponibili().some((a) => a.cat === 'infermiere'), false,
    'compaiono azioni che a bordo non può fare nessuno');
});

test('l\'automedica arriva, e da lì le azioni sanitarie ci sono', () => {
  const i = creaIntervento(casoProva(), { azioni: AZIONI, membri: ['tu', 'autista'] });
  i.esegui('richiedi-automedica', 'tu');
  i.avanza(60);
  assert.equal(i.squadra.medico, undefined, 'il medico è arrivato troppo presto');
  i.avanza(480);
  assert.ok(i.squadra.medico, 'l\'automedica non è mai arrivata');
  assert.ok(i.diario.some((r) => /automedica|medico/i.test(r.testo)), 'il diario non dice che è arrivata');
  assert.ok(i.azioniDisponibili().some((a) => a.cat === 'infermiere'),
    'con il medico sul posto le azioni sanitarie devono esserci');
});

test('chi non la chiama non se la vede arrivare', () => {
  const i = creaIntervento(casoProva(), { azioni: AZIONI, membri: ['tu', 'autista'] });
  i.avanza(900);
  assert.equal(i.squadra.medico, undefined);
});
```

- [ ] **Step 2: Esegui e verifica che falliscano**

Run: `node --test tests/sim-engine.test.mjs`
Expected: FAIL — «compaiono azioni che a bordo non può fare nessuno».

- [ ] **Step 3: Il motore**

In `sim-engine.js`, accanto alle altre costanti in cima a `creaIntervento`:

```js
  /* Quanto ci mette l'automedica ad arrivare. ASSUNZIONE NOSTRA: dipende
     da dove sei, e un caso può dichiarare il suo tempo. Otto minuti è la
     via di mezzo fra una città e una statale di provincia. */
  const ATTESA_ALS = caso.attesaAls ?? 480;
  let alsChiamataA = null;
```

Il filtro in `azioniDisponibili` scarta quello che non può fare nessuno:

```js
      /* Un'azione che nessuno a bordo può eseguire non si mostra: senza
         infermiere i farmaci non ci sono, e finché non arriva
         l'automedica non c'è niente da chiedere. */
      if (!(az.chi || []).some((m) => squadra[m])) return false;
```

Dentro `completa`, quando parte la chiamata:

```js
    if (id === 'richiedi-automedica' && alsChiamataA === null) alsChiamataA = t;
```

E una funzione che la fa arrivare, chiamata dentro `avanza` accanto a `consumaOssigeno()`:

```js
  /* L'automedica arriva quando arriva: la chiami e aspetti. Chi la chiama
     al minuto dieci se la vede al diciotto, e intanto il paziente
     peggiora — la lezione non ha bisogno di essere votata. */
  function verificaAls() {
    if (alsChiamataA === null || squadra.medico) return;
    if (t < alsChiamataA + ATTESA_ALS) return;
    squadra = { ...squadra, medico: { liberoA: t, azione: null } };
    scrivi('osservazione', 'L\'automedica è sul posto: il medico prende in carico la parte sanitaria.');
  }
```

Le azioni sanitarie sono dichiarate `chi: ['infermiere']`: perché il medico possa eseguirle, in `esegui` e in `membriLiberi` il medico vale come sanitario. La via più piccola è normalizzare i candidati:

```js
  /* Il medico dell'automedica fa quello che a bordo farebbe l'infermiere:
     il catalogo dichiara un solo ruolo sanitario e chi lo incarna dipende
     da chi c'è. */
  const candidati = (az) => (az.chi || []).flatMap((m) => (m === 'infermiere' ? ['infermiere', 'medico'] : [m]));
```

e usa `candidati(az)` al posto di `az.chi` dentro `membriLiberi`, nel controllo di `esegui` (`if (!candidati(az).includes(chi))`) e nel filtro qui sopra.

`etichettaMembro` impara il nome nuovo:

```js
  const etichettaMembro = (chi) => ({ tu: 'Tu', autista: 'Autista', infermiere: 'Infermiere', medico: 'Medico' }[chi] || chi);
```

- [ ] **Step 4: L'equipaggio si sceglie nell'indirizzo**

In `intervento.js`, dentro `render(params)`:

```js
export function render(params) {
  const idCaso = params?.[0];
  /* `#/intervento/shock-v3/msb` parte senza infermiere: fuori dal Lazio
     l'ambulanza è di soli soccorritori, e quando serve una vena o un
     farmaco si chiama l'automedica. */
  const senzaInfermiere = params?.[1] === 'msb';
  const membri = senzaInfermiere ? ['tu', 'autista'] : ['tu', 'autista', 'infermiere'];
```

e passalo a `creaIntervento(caso, { azioni: AZIONI, membri })` — cerca la chiamata esistente e aggiungi la chiave.

In `intervento.js`, `NOMI_MEMBRO` impara il medico:

```js
const NOMI_MEMBRO = { tu: 'Tu', autista: 'Autista', infermiere: 'Infermiere', medico: 'Medico' };
```

- [ ] **Step 5: La scelta nella pagina Simulazioni**

In `assets/js/modules/simulazioni.js`, riga ~853, accanto al bottone che avvia:

```js
      el('button.btn.pri', { type: 'button', onclick: () => navigate('intervento', c.id) }, ['Con infermiere']),
      el('button.btn', {
        type: 'button',
        title: 'Equipaggio di soli soccorritori, come fuori dal Lazio',
        onclick: () => navigate('intervento', c.id, 'msb'),
      }, ['Senza infermiere']),
```

Adatta le etichette a come sono fatti gli altri bottoni della scheda: guarda il contesto prima di incollare.

- [ ] **Step 6: Esegui, prova e commit**

```bash
node --test tests/*.test.mjs
```

Nel browser: avvia `shock-v3` senza infermiere, verifica che la categoria Infermiere sia vuota, chiedi l'automedica, lascia passare il tempo e guarda comparire il medico nella squadra.

```bash
git add assets/js/core/sim-engine.js assets/js/modules/intervento.js assets/js/modules/simulazioni.js tests/sim-engine.test.mjs
git commit -m "feat(equipaggio): si parte anche senza infermiere, e l'automedica arriva quando arriva"
```

---

## Task 11: l'infermiere non si comanda

**Files:**
- Modify: `assets/js/data/azioni.js`
- Modify: `assets/js/modules/intervento-palette.js`

- [ ] **Step 1: Cambia il verbo, non il meccanismo**

Le cinque azioni `cat: 'infermiere'` hanno etichette che suonano come ordini. Riscrivile per quello che sono — conseguenze del quadro che hai riferito:

| id | oggi | domani |
|---|---|---|
| `inf-accesso` | Accesso venoso | Fa reperire un accesso venoso |
| `inf-liquidi` | Infusione di liquidi | Avvia l'infusione di liquidi |
| `inf-adrenalina` | Adrenalina intramuscolo | Somministra adrenalina intramuscolo |
| `inf-naloxone` | Naloxone | Somministra naloxone |
| `inf-glucosata` | Glucosata endovena | Somministra glucosata endovena |

E la descrizione della categoria in `CATEGORIE`:

```js
  { id: 'infermiere', label: 'Sanitario', desc: 'Decide lui, sulla base del quadro che gli riferisci' },
```

- [ ] **Step 2: Il bottone smette di dire «chiedi»**

In `intervento-palette.js`, dentro `rigaAzione`, il testo del bottone per le azioni sanitarie:

```js
    /* Un sanitario non lo comandi: gli riferisci un quadro e decide lui.
       Il vincolo tecnico è lo stesso di prima — `richiede` pretende il
       ragguaglio — ma chiamarlo «chiedi a» insegnava che dai ordini a un
       infermiere, che è la cosa sbagliata. */
    const etichettaPrincipale = az.cat === 'infermiere'
      ? 'Riferisci e assisti'
      : (principale === 'tu' ? 'Fallo tu' : `Chiedi a ${NOMI_MEMBRO[principale].toLowerCase()}`);
```

Poi **usala** nei due rami che il Task 3 ha lasciato col testo scritto in
linea — quello del candidato unico e quello della scelta vera — al posto
di `[principale === 'tu' ? 'Fallo tu' : ...]`. I rami «Tutta la squadra» e
«Fatelo in due» restano come sono: lì non c'entra chi decide.

- [ ] **Step 3: Prova e commit**

```bash
node --test tests/*.test.mjs
```

Nel browser: la categoria si chiama Sanitario, e le sue righe dicono cosa fa lui, non cosa gli ordini.

```bash
git add assets/js/data/azioni.js assets/js/modules/intervento-palette.js
git commit -m "feat(sanitario): all'infermiere si riferisce un quadro, non si danno ordini"
```

---

## Task 12: pubblicare la 1.15.0

**Files:**
- Modify: `assets/js/versione.js`, `sw.js`, `CLAUDE.md`

- [ ] **Step 1: Versione e cache**

`assets/js/versione.js`:

```js
export const VERSIONE = '1.15.0';
```

E in cima a `NOVITA`:

```js
  { v: '1.15.0', t: 'La squadra diventa vera. Le manovre che non si fanno da soli — spinale, KED, cucchiaio, materassino, telo, pallone-maschera — occupano due persone davvero, e i DPI se li mette tutto l\'equipaggio senza che nessuno ti chieda chi. All\'infermiere non si danno ordini: gli riferisci un quadro e decide lui. E si può partire senza: fuori dal Lazio l\'ambulanza è di soli soccorritori, quindi chiami l\'automedica e la aspetti — chi la chiama tardi se la vede arrivare tardi. La pagella smette di togliere punti per il tempo: le azioni valgono intere, il tempo continua a costare dove costa davvero, cioè sul paziente. E quando sbagli presidio il banco non dice più solo che non serviva: dice quale andava usato, col perché e la fonte del manuale.' },
```

`sw.js`:

```js
const CACHE = 'consoletssa-1.15.0';
```

E nel `PRECACHE`, accanto agli altri file:

```js
  './assets/js/core/sequenza.js',
  './assets/js/modules/intervento-palette.js',
```

- [ ] **Step 2: `CLAUDE.md`**

Nell'albero dei file, sotto `core/`:

```
    sequenza.js     quello che va fatto prima: scena e DPI. Pura
```

e sotto `modules/`, accanto a `intervento`:

```
    intervento-palette.js  la palette delle azioni, staccata da intervento.js
```

Nelle «Trappole già pagate», sostituisci la voce sulle 796 righe (non è più vera) con:

```markdown
- **`chi` su un'azione sono i candidati, non i partecipanti.** Quante
  persone occupa il gesto lo dice `servono` (e `tuttaLaSquadra` per i DPI).
  Prima che esistesse, la tavola spinale nel banco la metteva una persona
  sola.
- **Il ruolo sanitario nel catalogo è uno solo**, `chi: ['infermiere']`, e
  chi lo incarna dipende da chi c'è: l'infermiere di bordo, o il medico
  dell'automedica quando arriva. La normalizzazione sta in `candidati()`
  dentro `sim-engine.js`.
```

In «Cosa resta da fare», prima del «prossimo pezzo», aggiungi:

```markdown
**Fatto in 1.15.0.** La squadra vera e la valutazione che insegna. Un'azione
dichiara `servono` — quante persone occupa — e le sei manovre che non si
fanno da soli ne prendono due; i DPI li mette l'equipaggio. Al sanitario si
riferisce un quadro, non si danno ordini, e si può partire senza infermiere:
lì `richiedi-automedica` è una mossa vera e il medico arriva quando arriva.
La pagella non toglie più punti per il tempo — lo paga la fisiologia, che
c'è già — e quando un presidio è sbagliato il banco dice quale andava usato,
dedotto dalle regole delle famiglie invece che scritto a mano. Specifica e
piano restano come storia della decisione:

- `docs/superpowers/specs/2026-08-22-squadra-e-valutazione-design.md`
- `docs/superpowers/plans/2026-08-22-squadra-e-valutazione.md`
```

- [ ] **Step 3: Ultimo giro**

```bash
node --test tests/*.test.mjs
wc -l assets/js/modules/intervento.js assets/js/core/sim-engine.js
```

Tutti verdi, e nessun file sopra le 800 righe.

Poi a mano, sul telefono: un intervento intero con infermiere e uno senza, la spinale che occupa due persone, il timer che scorre, il debriefing con l'alternativa e le inversioni.

- [ ] **Step 4: Commit e pubblicazione**

```bash
git add assets/js/versione.js sw.js CLAUDE.md docs/superpowers/plans/2026-08-22-squadra-e-valutazione.md
git commit -m "feat: 1.15.0 — la squadra vera, e la valutazione che insegna invece di cronometrare"
git push origin HEAD
```

- [ ] **Step 5: Verifica che sia uscita**

```bash
curl -s "https://g3ggy.github.io/consoletssa/assets/js/versione.js?x=$RANDOM" | grep VERSIONE
```

Expected: `export const VERSIONE = '1.15.0';`

Se dice ancora 1.14.1, aspetta il deploy di Pages e ripeti.

---

## Una cosa da dire all'autore, dopo il rilascio

I punteggi non sono più confrontabili con quelli di prima: senza il
dimezzamento per ritardo salgono, e nei Progressi comparirà uno scalino il
giorno del rilascio. È previsto e sta nella specifica — ma va detto, perché
chi guarda il grafico deve sapere che non è migliorato di colpo.
