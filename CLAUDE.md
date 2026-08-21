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
    lifepak.js        schermo del LIFEPAK 15: 3 riquadri, tracciati, allarmi
    suoni.js          sintesi Web Audio dei toni del monitor (IEC 60601-1-8)
    ecg12.js          12 derivazioni su carta millimetrata, stampabile
    cartellino.js     replica del cartellino di CO118
    sim-engine.js     motore a turni, logica pura, testato
    fisiologia.js     riserve → allarme → compenso → parametri visibili. Pura
    anamnesi.js       chi risponde, cosa dice, cosa rivela. Logica pura
    ragguaglio.js     quanto del ragguaglio modello sai davvero sostenere
    giudizio.js       il gesto ci stava, e quanto tempo e' costato quello che no. Pura
    manual.js markdown.js ribbon.js
  data/               solo dati, nessun DOM
    casi.js           casi per il motore a tempo (formato 3: offese, non derive)
    offese.js         catalogo delle offese: che cosa fa male al paziente
    domande.js        le dodici domande dell'anamnesi: sei SAMPLE, sei OPQRST
    indicazioni.js    quando un gesto e' indicato, con la fonte del manuale accanto
    classi-patologia.js  le diciassette classi della scheda ARES 118
    scenari.js        i 12 scenari a domande (motore vecchio)
    scenari-arrivo.js arrivo/situazione/azioniSbagliate/deriva per ogni scenario
    azioni.js         catalogo azioni della palette
    carte.js  carte-autoverifica.js  cartellini.js  anatomy.js
  modules/            una vista ciascuno
    studio corpo monitor simulazioni intervento debriefing ripasso progressi
tests/                node --test, solo logica pura (niente DOM)
vendor/               three.js r160 + GLTFLoader, copiati dentro
content/manuale.md    il manuale che il modulo Studio legge
```

Due motori di simulazione convivono:

- **`modules/simulazioni.js`** — il vecchio, a 8 passi con domande. Ne restano
  sei: bpco, arresto, anticoagulante, anafilassi, cocaina, schiacciamento.
- **`modules/intervento.js` + `core/sim-engine.js` + `core/fisiologia.js`** — il
  nuovo, a tempo, con squadra di tre, palette di azioni, diario e debriefing.
  Sette casi: `shock-v3`, `toracico-v3`, `ipoglicemia-v3`, `incidente-v3`,
  `sincope-v3`, `ictus-v3`, `cocaina-v3`.

**Convertire uno scenario significa toglierlo dal vecchio**, da `scenari.js` e
da `scenari-arrivo.js`: se resta di là compare due volte nella pagina
Simulazioni. E `progressi.js` conta gli «scenari mai affrontati» su tutti e due
gli elenchi, per lo stesso motivo.

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

Dal 1.12.0 un'azione può dichiarare **quando è indicata**. La regola sta in
`data/indicazioni.js` — ventitré voci, una per ogni gesto dove il manuale ha
davvero qualcosa da dire, ognuna con la fonte accanto — e `core/giudizio.js` la
applica. Tre cose contano:

- il verdetto si dà **nell'istante in cui l'azione parte**, non quando finisce:
  la spinale dura tre minuti, e in tre minuti puoi scoprire qualcosa che rende
  sensato un gesto che quando l'hai deciso non lo era;
- il predicato riceve **solo il conoscibile** — la coscienza, i parametri che
  hai già misurato, quello che l'anamnesi ti ha dato, cosa hai già fatto, che
  tipo di caso è, e le chiavi che il caso mette in `notoAllArrivo` perché si
  vedono dal colpo d'occhio. Mai lo stato vero del paziente: se no il banco ti
  direbbe che la glicemia andava misurata solo dopo che l'hai misurata;
- il superfluo **non toglie punti**: costa i secondi che ha preso, e quei
  secondi si vedono accanto alle finestre che hai mancato.

Insieme al giudizio, il banco chiede **cosa pensi di avere davanti**: le
diciassette classi della scheda ARES, una prima impressione obbligatoria dopo
il colpo d'occhio e poi tutti i ripensamenti che vuoi. Dichiarare non costa
tempo — è un pensiero, non un gesto — e il debriefing dice da dove sei partito,
quante volte hai cambiato idea e **a che minuto** ci sei arrivato. Il sospetto
non influenza mai il giudizio delle azioni: sarebbe barabile.

L'**anamnesi** funziona allo stesso modo: le domande stanno nel catalogo, le
risposte nei casi. Ci si gira verso una persona e da lì tutte le domande vanno a
lei; la stessa domanda a due persone dà due risposte, e **nessuna etichetta dice
quale vale**. A coscienza V il paziente risponde in modo confuso senza che niente
lo segnali; da P in giù la domanda è rifiutata. Le voci `domanda:<id>` si mettono
in `azioni.necessarie` come le azioni, e la pagella le pesa allo stesso modo.

Dal 1.11.0 il motore ha un **asse dell'allarme**: `allarme()` somma quanto
sangue, ossigeno e zucchero mancano, quanto fa male, e un `tonoAutonomo` che il
caso dichiara per quello che viene da fuori — una sostanza lo alza, il vago lo
abbassa. Da quell'unico numero escono **frequenza, spinta pressoria, cute,
respiro e pupille**. È il capitolo 27: gli stessi segni per cause diverse.

Le costanti cliniche portano la fonte nel commento. Sono **assunzione nostra** e
vanno riviste se arriva il manuale: le soglie 15/30/40% della perdita (il
Bolognin dà solo il 25% pediatrico, :7636 — servirebbe il PTC Base completo), di
quanto la RCP appiattisce la curva di sopravvivenza, e i pesi dell'asse — i
guadagni 48 e 25 (scelti per riprodurre i numeri di prima, non trovati in una
fonte), le soglie 1/3 e 2/3 della cute, 0,5 della tachipnea e 1,2 della
midriasi, il tetto a 2 e il pavimento a −1, e `picco`/`calmo`/`costante` del
simpaticomimetico. La sola ancorata è la glicemia: i 70 mg/dl sono le ERC 2025
cap. 12 :1125.

La conversione degli altri cinque scenari sul motore nuovo è lavoro ancora da fare.

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
- **`base.glicemia` e `base.spo2` non si vedono.** Quei due numeri escono dalle
  riserve (`riserve.glicemia`, `riserve.ossigenazione * 100`), non dalla base: un
  caso che li scrive solo nella base mostra i valori di `RISERVE_ADULTO`.
- **`fc`, `cute`, `fr` e `pupille` escono dall'asse dell'allarme**, non più dalla
  sola perdita di sangue: un caso che tocca `dolore`, `glicemia`, `ossigenazione`
  o `tonoAutonomo` muove anche quelli. E il dolore **non va sommato due volte**:
  entra nell'asse dentro `circolo`, non in `parametriVisibili`.
- **`richiede` e `indicazione` non sono la stessa cosa.** `richiede` **blocca**
  l'azione (a un incosciente lo zucchero per bocca non lo dai e basta).
  L'indicazione **non blocca mai**: ti lascia fare e ti dice che non serviva.
  Confonderle vuol dire impedire gesti che il soccorritore ha il diritto di fare
  sbagliando.
- **`letture.pa` è la stringa `'128/78'`, non un numero.** Un predicato che
  scrive `c.letture.pa < 90` confronta una stringa con un numero e non fallisce:
  restituisce `false` per sempre, in silenzio. Il contesto espone anche `pas`
  come numero, ed è quello che i predicati usano.
- **`rispondiDecisione` scrive in `fatte` senza passare da `completa`**: quelle
  voci non hanno `giudizio` e non devono averlo — una decisione non è un gesto.
  Chi legge `f.giudizio` deve reggere l'assenza.
- **Un'offesa può tendere a un bersaglio invece di consumare** (è il caso del
  `simpaticomimetico`). Un caso così non peggiora da solo e lo dichiara con
  `peggioraDaSolo: false`, se no il collaudo lo dà per rotto.
- I parametri di un caso convertito **si calibrano, non si copiano** dal vecchio:
  si chiama `parametriVisibili` da uno script e si guardano i numeri. Quelli
  scritti a mano nel motore a domande spesso non stanno in piedi con la
  fisiologia, e quando divergono ha ragione la fisiologia.

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

**Fatto in 1.8.1.** Il monitor mostra i tre parametri che misura davvero — HR,
SpO2, NIBP. CO2 e temperatura erano riquadri fermi a trattini perché nessuno
gliele passava; la temperatura sta fra le rilevazioni, dove la misuri. Le
rilevazioni ripetute lampeggiano e dicono da quanto ce l'hai.

**Fatto in 1.9.0 e 1.9.1.** I primi due scenari legacy convertiti,
`ipoglicemia-v3` e `incidente-v3`, e **`caso.diarioAzioni`**: il catalogo dice
cosa fai, il caso dice cosa trovi — la tessera di diabetico nel portafogli, il
segno della cintura sul torace. Stessa impostazione di `effettiAzioni`.

**Fatto in 1.10.0.** Il **gruppo C**, `sincope-v3` e `ictus-v3`: i due casi in
cui i parametri stanno bene e il prezzo dell'errore sta altrove. Nella sincope è
fisico — `posizione-seduta` toglie ritorno venoso, la pressione va a 72/45 e la
coscienza a V, e la seconda sincope non è un copione ma il calcolo. Nell'ictus è
il tempo e l'informazione: `caso.esordio` porta i minuti nella pagella, e
`core/ragguaglio.js` confronta le voci del ragguaglio modello con quello che hai
davvero raccolto. Chi fa 21/21 di pagella può avere in mano metà del ragguaglio,
ed è la lezione. Specifica e piano restano come storia della decisione:

- `docs/superpowers/specs/2026-08-21-casi-senza-fisiologia-design.md`
- `docs/superpowers/plans/2026-08-21-casi-senza-fisiologia.md`

**Fatto in 1.11.0.** L'asse dell'allarme e la prima metà del **gruppo A**,
`cocaina-v3`: un iperadrenergico a cui non manca niente — 152 di frequenza, 153
di massima, midriasi, cute sudata e saturazione 98, che è la prova contraria
all'ipossia e bisogna andarsela a prendere. Nessun antidoto da dare: l'ambiente
calmo è il trattamento e si vede scendere il numero. La domanda sulle sostanze
rende solo **in disparte**: le risposte dell'anamnesi possono avere varianti
condizionate dai tag. Specifica e piano restano come storia della decisione:

- `docs/superpowers/specs/2026-08-21-tono-autonomo-design.md`
- `docs/superpowers/plans/2026-08-21-tono-autonomo.md`

**Fatto in 1.12.0.** Il **giudizio clinico**: le indicazioni con la fonte, il
tempo buttato, e il sospetto sulle diciassette classi ARES. Il test
«quello che un caso chiede, il giudizio lo approva» in `tests/casi.test.mjs` è
il pezzo che ripaga: se un caso pretende un gesto che il giudizio considera
superfluo, uno dei due è sbagliato, e si scopre prima che lo impari un
volontario. Specifica e piano restano come storia della decisione:

- `docs/superpowers/specs/2026-08-22-giudizio-clinico-design.md`
- `docs/superpowers/plans/2026-08-22-giudizio-clinico.md`

**Il prossimo pezzo** è **A2, la dotazione**: i presidi veri dello zaino e
dell'ambulanza come azioni, le misure dove contano, un inventario sfogliabile.
Un presidio sbagliato è un caso particolare di azione non indicata, quindi
eredita il meccanismo da qui senza aggiungerci niente. Poi la **scheda ARES
compilabile** — le diciassette classi nascono qui e servono lì — e le **carte di
ripasso** rifatte.

Restano anche i cinque scenari: la seconda metà del
gruppo **A** — anafilassi, anticoagulante — e il gruppo **B** — bpco,
schiacciamento, arresto (tre meccanismi che il motore non ha). Ognuno ha la sua
specifica da scrivere.

- **BLS-D, triage, manovre**: moduli non ancora scritti. Le fonti ci sono tutte e gli
  agganci stanno in `tmp/testi/FONTI.md`: il BLS-D si scrive sul capitolo 4 delle ERC
  2025, il triage START sul Bolognin (:8630-8660, le quattro domande per esteso).
- **Arresto durante lo scenario** nel motore vecchio (nel v2 c'è già).
- **Cinque scenari legacy** ancora da portare sul motore a tempo: mezzo gruppo A
  (anafilassi, anticoagulante) e il gruppo B.
- **`ragguaglioVoci` sui quattro casi già scritti**: chi non le dichiara non vede
  il riquadro del confronto, e va bene così. Si aggiungono toccando quel caso.

Fuori perimetro per scelta dell'autore: account, sincronizzazione, export dei progressi.
