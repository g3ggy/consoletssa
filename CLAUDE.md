# Console TSSA — guida per chi ci lavora

Banco di addestramento per il corso TSSA / soccorritore volontario CRI (Lazio).
Pubblicato su GitHub Pages: <https://g3ggy.github.io/consoletssa/> — repo `g3ggy/consoletssa`.

Chi la usa sono i colleghi dell'associazione, **quasi tutti dal telefono**. Ogni cosa
che si costruisce va provata prima lì.

---

## Regole del progetto

**Niente build.** Moduli ES nativi, import map in `index.html`, nessun bundler, nessun
framework, nessuna dipendenza npm. Si apre un server statico e funziona. Se una
soluzione richiede un passo di build, non è la soluzione giusta per questo progetto.

**Tutto in italiano**: nomi di funzioni, variabili, commenti, testi. I commenti
spiegano *perché*, non *cosa*: il lettore è un volontario che studia, non un
programmatore.

**Il contenuto clinico viene dai manuali**, non dalla memoria. Le fonti stanno in
`content/manuale.md` (appunti dell'autore) e nei PDF in `tmp/` (manuale Bolognin
TSSA 2022, manuale LIFEPAK 15). `tmp/` è fuori da git.

**Immutabilità**: si creano oggetti nuovi, non si muta in-place (vale soprattutto per
`store.js` e per lo stato del motore di simulazione).

**File piccoli e a fuoco**: 200-400 righe tipiche, 800 il massimo.

---

## Come è fatta

```
index.html            import map + guscio; la barra dei moduli e il rail
sw.js                 service worker: network-first, cache col numero di versione
assets/js/
  main.js             registra le rotte e avvia il router
  versione.js         VERSIONE + NOVITA — l'unico posto dove sta il numero
  core/               pezzi riusabili, senza stato di modulo
    router.js         routing su hash; ogni modulo espone { render, destroy? }
    store.js          localStorage, aggiornamenti immutabili, Leitner
    dom.js  ui.js     el() / $() e i mattoncini dell'interfaccia
    waveform.js       canvas che scorrono (ECG, pleth, respiro) + createCanvasHost
    lifepak.js        schermo del LIFEPAK 15: 5 riquadri, tracciati, allarmi
    suoni.js          sintesi Web Audio dei toni del monitor (IEC 60601-1-8)
    ecg12.js          12 derivazioni su carta millimetrata, stampabile
    cartellino.js     replica del cartellino di CO118
    sim-engine.js     motore v2 a turni, logica pura, testato
    manual.js markdown.js ribbon.js
  data/               solo dati, nessun DOM
    casi.js           casi per il motore v2
    scenari.js        i 12 scenari a domande (motore vecchio)
    scenari-arrivo.js arrivo/situazione/azioniSbagliate/deriva per ogni scenario
    azioni.js         catalogo azioni della palette
    carte.js  carte-autoverifica.js  cartellini.js  anatomy.js
  modules/            una vista ciascuno
    studio corpo monitor simulazioni intervento ripasso progressi
tests/                node --test, solo logica pura (niente DOM)
vendor/               three.js r160 + GLTFLoader, copiati dentro
content/manuale.md    il manuale che il modulo Studio legge
```

Due motori di simulazione convivono:

- **`modules/simulazioni.js`** — il vecchio, a 8 passi con domande. Dodici scenari.
- **`modules/intervento.js` + `core/sim-engine.js`** — il nuovo, a tempo, con
  squadra di tre, palette di azioni, diario e debriefing. Due casi.

La conversione degli altri dieci scenari sul motore v2 è lavoro ancora da fare.

---

## Lavorare qui

```bash
# server locale (i moduli ES non partono da file://)
python3 -m http.server 8925

# test
node --test tests/*.test.mjs
```

I test coprono solo logica pura. Il resto si prova nel browser, e **si prova davvero**:
larghezza telefono, non solo desktop.

### Attenzione a Chrome in secondo piano

Chrome congela `requestAnimationFrame` e strozza i timer nelle schede non visibili.
Ha già prodotto tre falsi allarmi. Due conseguenze pratiche:

1. Nel codice, ogni cosa che deve concludersi comunque va su `setTimeout`, non solo
   su rAF (vedi la rilevazione dei parametri in `simulazioni.js`).
2. In fase di verifica, se un valore sembra "fermo" controlla prima
   `document.visibilityState`.

### Pubblicare

Ogni rilascio tocca **tre** punti, sempre insieme:

1. `assets/js/versione.js` → `VERSIONE`, `DATA_VERSIONE`, una riga in `NOVITA`
2. `sw.js` → `const CACHE = 'consoletssa-<versione>'`
3. commit + `git push origin HEAD`, poi verifica:
   `curl -s "https://g3ggy.github.io/consoletssa/assets/js/versione.js?x=$RANDOM" | grep VERSIONE`

Il numero si legge in fondo al rail: serve ai colleghi per capire se hanno la copia
aggiornata. Se non si allinea la cache del service worker si finisce con **versioni
mescolate** — moduli vecchi e nuovi insieme — che si manifestano come
`does not provide an export named ...`. Il router intercetta quell'errore e offre un
ricarica-e-svuota-cache, ma la cura è bumpare sempre tutti e tre i punti.

---

## Trappole già pagate

- `Box3.setFromObject` su una mesh skinnata dà misure sbagliate se prima non si chiama
  `model.updateMatrixWorld(true)`. È il motivo per cui il modello 3D usciva 2,6 volte
  troppo grande.
- Il modello Xbot guarda verso **+Z**: non serve ruotarlo di π.
- I canvas dimensionati mentre il contenitore è `hidden` restano a zero. Passare
  sempre da `createCanvasHost` (ResizeObserver + IntersectionObserver).
- `replaceChildren(..., null)` stampa la stringa "null": filtrare con `.filter(Boolean)`.
- I nomi di classe generici collidono fra moduli (`.azione`, `.squadra`). Prefissare.
- `window.confirm` blocca l'automazione del browser: conferme a due tocchi inline.
- Le tessere dei parametri si rompono con valori lunghi ("non rilevabile", "gasping"):
  c'è l'attributo `data-lungo` con gli scalini di font-size, va usato.

---

## Cosa resta da fare

- **BLS-D, triage, manovre**: moduli non ancora scritti. Fonte: manuale Bolognin
  (in `tmp/`, testo estratto in `/tmp/bolognin.txt` — BLSD ~6357, P-BLSD ~6646,
  ostruzione ~6760, PLS ~6807, triage ~9436, immobilizzazioni ~9677).
- **Anamnesi a domande**: raccogliere informazioni facendo *la domanda giusta*,
  con risposte che possono essere incomplete o false. Disegnato, mai costruito.
- **Arresto durante lo scenario** nel motore vecchio (nel v2 c'è già).
- **Dieci scenari legacy** da portare sul motore v2.

Fuori perimetro per scelta dell'autore: account, sincronizzazione, export dei progressi.
