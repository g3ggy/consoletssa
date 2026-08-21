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
`content/manuale.md` (appunti dell'autore) e nei PDF dentro `tmp/`, che è fuori da git:
manuale Bolognin TSSA 2022, linee guida ERC in traduzione IRC (dieci capitoli in
`tmp/lineeguicaerc/`: otto sono **ERC 2025**, il 6 e il 7 sono ancora 2021),
manuale LIFEPAK 15.

Il testo estratto sta in `tmp/testi/`, e **`tmp/testi/FONTI.md` è la mappa**: dice quale
capitolo tratta cosa e a che riga, e raccoglie i numeri che finiscono nel motore con
il rimando alla fonte. Si parte sempre da lì. Se `tmp/testi/` è vuoto si riestrae con
`pdftotext -layout`, il comando è in cima a FONTI.md.

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
    sim-engine.js     motore a turni, logica pura, testato
    fisiologia.js     riserve → compenso → parametri visibili. Logica pura
    anamnesi.js       chi risponde, cosa dice, cosa rivela. Logica pura
    manual.js markdown.js ribbon.js
  data/               solo dati, nessun DOM
    casi.js           casi per il motore a tempo (formato 3: offese, non derive)
    offese.js         catalogo delle offese: che cosa fa male al paziente
    domande.js        le dodici domande dell'anamnesi: sei SAMPLE, sei OPQRST
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
- **`modules/intervento.js` + `core/sim-engine.js` + `core/fisiologia.js`** — il
  nuovo, a tempo, con squadra di tre, palette di azioni, diario e debriefing.
  Due casi, `shock-v3` e `toracico-v3`.

Nel motore nuovo il caso **non dichiara più di quanto peggiora**: dichiara la
causa (`fisiologia.offese`) e le riserve nascoste — volemia, ossigenazione,
glicemia, contrattilità, tono vascolare, dolore. I parametri che si vedono non
sono memorizzati da nessuna parte: si calcolano a ogni lettura. Il compenso
tiene la pressione mentre il sangue se ne va, e quando cede il paziente arriva
all'arresto — col ritmo che dipende dalla causa: FV nell'ischemia (il DAE
scarica), PEA nell'emorragia e nell'ipossia (non scarica).

I segni del compenso — refill, colorito, sete — **non compaiono nel diario da
soli**: ci sono le azioni che li cercano. Chi guarda solo il monitor non vede
niente finché non è tardi, ed è la lezione del banco.

L'**anamnesi** funziona allo stesso modo: le domande stanno nel catalogo, le
risposte nei casi. Ci si gira verso una persona e da lì tutte le domande vanno a
lei; la stessa domanda a due persone dà due risposte, e **nessuna etichetta dice
quale vale**. A coscienza V il paziente risponde in modo confuso senza che niente
lo segnali; da P in giù la domanda è rifiutata. Le voci `domanda:<id>` si mettono
in `azioni.necessarie` come le azioni, e la pagella le pesa allo stesso modo.

Le costanti cliniche portano la fonte nel commento. Due sono **assunzione
nostra** e vanno riviste se arriva il manuale: le soglie 15/30/40% della perdita
(il Bolognin dà solo il 25% pediatrico, :7636 — servirebbe il PTC Base completo)
e di quanto la RCP appiattisce la curva di sopravvivenza.

La conversione degli altri dieci scenari sul motore nuovo è lavoro ancora da fare.

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
- `.az-testo span` è `display: block`: uno `span` inline dentro una riga della
  palette va scavalcato per specificità, altrimenti va a capo da solo.
- In italiano la preposizione si fonde con l'articolo: gli interlocutori si
  dichiarano con l'articolo davanti ("la moglie") e i testi passano da `aChi()` /
  `daChi()` in `anamnesi.js`, se no si legge "chiedi a il paziente".

---

## Cosa resta da fare

**Fatto in 1.7.0.** Il motore fisiologico a offese. Specifica e piano restano
come storia della decisione:

- `docs/superpowers/specs/2026-08-21-motore-fisiologico-offese-design.md`
- `docs/superpowers/plans/2026-08-21-motore-fisiologico-offese.md`

**Fatto in 1.8.0.** L'anamnesi a domande: il betabloccante di `shock-v3` si
scopre chiedendo la terapia **alla moglie**, che dal paziente esce solo una
risposta vaga. Specifica e piano restano come storia della decisione:

- `docs/superpowers/specs/2026-08-21-anamnesi-a-domande-design.md`
- `docs/superpowers/plans/2026-08-21-anamnesi-a-domande.md`

- **BLS-D, triage, manovre**: moduli non ancora scritti. Le fonti ci sono tutte e gli
  agganci stanno in `tmp/testi/FONTI.md`: il BLS-D si scrive sul capitolo 4 delle ERC
  2025, il triage START sul Bolognin (:8630-8660, le quattro domande per esteso).
- **Arresto durante lo scenario** nel motore vecchio (nel v2 c'è già).
- **Dieci scenari legacy** da portare sul motore v2.

Fuori perimetro per scelta dell'autore: account, sincronizzazione, export dei progressi.
