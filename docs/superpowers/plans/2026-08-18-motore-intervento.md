# Motore di intervento — piano di implementazione

> **Per chi esegue:** i passi sono caselle da spuntare. Ogni task finisce con un commit.
> Il motore è logica pura e si collauda con `node --test`; l'interfaccia si verifica a
> mano su desktop e su viewport telefono.

**Obiettivo:** sostituire il questionario a otto passi con un intervento a turni in cui il
paziente evolve, le azioni costano tempo e la squadra si divide il lavoro.

**Architettura:** `sim-engine.js` è logica pura senza DOM (stato del paziente, orologio,
decorso, eventi, squadra, punteggio). `azioni.js` è il catalogo condiviso. `casi.js`
contiene i casi in formato nuovo, dichiarativi. `intervento.js` disegna e basta.

**Tecnologie:** moduli ES nativi, nessuna dipendenza. Test con il runner incluso in Node.

**Spec di riferimento:** `docs/superpowers/specs/2026-08-18-motore-intervento-design.md`

---

## Struttura dei file

| File | Responsabilità |
|---|---|
| `assets/js/core/sim-engine.js` | stato del paziente, orologio a turni, decorso, eventi, squadra, letture, punteggio. Nessun DOM. |
| `assets/js/data/azioni.js` | catalogo delle azioni: durata, esecutori, prerequisiti, effetti, spiegazione. |
| `assets/js/data/casi.js` | casi in formato `motore: 2`. Due per iniziare. |
| `assets/js/modules/intervento.js` | interfaccia: diario, palette, monitor, squadra, debriefing. |
| `assets/css/intervento.css` | stili di diario, palette e pagella. |
| `assets/js/modules/simulazioni.js` | modificato: elenco dei casi, instrada al runtime giusto. |
| `tests/sim-engine.test.mjs` | collaudo del motore. |

---

## Task 1 — Nucleo del motore: stato e orologio

**File:** crea `assets/js/core/sim-engine.js`, crea `tests/sim-engine.test.mjs`

- [ ] **1.1** Test: `creaIntervento(caso)` restituisce lo stato iniziale del caso, `t = 0`,
      `esito = 'in-corso'`, e nessuna lettura disponibile.
- [ ] **1.2** Test: `avanza(60)` applica `decorso.base` una volta (pas -3 su un caso con
      `base.pas = -3`), e mezzo delta su `avanza(30)`.
- [ ] **1.3** Test: i valori restano dentro `decorso.limiti`.
- [ ] **1.4** Test: un tag attivo in `freni` somma il suo delta alla base.
- [ ] **1.5** Implementa `creaIntervento`, `avanza`, `applicaDecorso`, `limita`.
- [ ] **1.6** `node --test tests/sim-engine.test.mjs` verde.
- [ ] **1.7** Commit: `feat(sim): stato del paziente e decorso nel tempo`.

## Task 2 — Azioni, squadra e letture

**File:** modifica `assets/js/core/sim-engine.js`, `tests/sim-engine.test.mjs`

- [ ] **2.1** Test: `esegui('misura-pa', 'tu')` avanza l'orologio di 40 s e registra la
      lettura `pa` con il proprio istante.
- [ ] **2.2** Test: `esegui('misura-pa', 'autista')` avanza l'orologio di soli 5 s (il tempo
      di delegare) e la lettura compare quando l'autista finisce.
- [ ] **2.3** Test: un membro occupato non accetta una seconda azione.
- [ ] **2.4** Test: `letturaScaduta('glicemia')` è vera dopo 120 s, falsa prima.
- [ ] **2.5** Test: con il tag `monitor` attivo, `fc` e `spo2` risultano sempre fresche.
- [ ] **2.6** Test: un'azione con `unaVolta` non è più disponibile dopo l'esecuzione;
      un'azione il cui `richiede` è falso non è disponibile.
- [ ] **2.7** Implementa `esegui`, la coda dei completamenti, `azioniDisponibili`,
      `letture`, `letturaScaduta`.
- [ ] **2.8** Test verdi, commit: `feat(sim): azioni, squadra a tre e letture che invecchiano`.

## Task 3 — Eventi, soglie e arresto

**File:** modifica `assets/js/core/sim-engine.js`, `tests/sim-engine.test.mjs`

- [ ] **3.1** Test: un evento a `t = 120` senza condizione scatta una volta sola e finisce
      nel diario.
- [ ] **3.2** Test: un evento con `se` falso al suo istante scatta più tardi, quando la
      condizione diventa vera.
- [ ] **3.3** Test: un evento con `decisione` blocca l'orologio finché non si risponde, e
      l'opzione scelta applica il suo `effetto`.
- [ ] **3.4** Test: una soglia con `unaVolta` produce una riga di diario una volta sola.
- [ ] **3.5** Test: un evento con `effetto.arresto` porta polso assente, coscienza `U`,
      respiro `gasping`; senza RCP entro 60 s l'esito diventa `morto`; con la RCP no.
- [ ] **3.6** Implementa `scattaEventi`, `verificaSoglie`, `rispondiDecisione`,
      `gestisciArresto`.
- [ ] **3.7** Test verdi, commit: `feat(sim): eventi, soglie e arresto`.

## Task 4 — Punteggio e chiusura

**File:** modifica `assets/js/core/sim-engine.js`, `tests/sim-engine.test.mjs`

- [ ] **4.1** Test: azione necessaria entro `entro` vale peso pieno, oltre vale metà,
      omessa vale zero.
- [ ] **4.2** Test: un'azione dannosa produce una voce in negativo con la sua spiegazione.
- [ ] **4.3** Test: `chiudi()` calcola l'esito del paziente confrontando i parametri finali
      con quelli iniziali (migliorato · stabile · peggiorato · morto).
- [ ] **4.4** Implementa `pagella()` e `chiudi()`.
- [ ] **4.5** Test verdi, commit: `feat(sim): pagella dell'intervento`.

## Task 5 — Catalogo delle azioni

**File:** crea `assets/js/data/azioni.js`

- [ ] **5.1** Scrivi le categorie: `scena`, `A`, `B`, `C`, `D`, `E`, `valutazione`,
      `immobilizzo`, `comunicazione`.
- [ ] **5.2** Scrivi le azioni di valutazione: FC, PA, FR, SpO₂, glicemia, temperatura,
      AVPU, pupille, polso radiale, collega il monitor.
- [ ] **5.3** Scrivi scena, A, B, C, D, E, immobilizzo, comunicazione, e le azioni di
      assistenza all'infermiere.
- [ ] **5.4** Test: ogni azione ha `id` unico, `durata > 0`, almeno un esecutore valido,
      e `spiega` non vuota.
- [ ] **5.5** Commit: `feat(sim): catalogo delle azioni del soccorritore`.

## Task 6 — Due casi in formato nuovo

**File:** crea `assets/js/data/casi.js`

- [ ] **6.1** Converti `shock` ("si sente fiacco"): decorso che scende, evento
      "prova ad alzarsi" a 2 minuti, scivolamento a `V` sotto 75 di sistolica, arresto a
      9 minuti sotto 60.
- [ ] **6.2** Converti `toracico`: decorso lento, evento "il dolore si intensifica",
      peggioramento se messo supino, arresto in FV al minuto 11 se non trasportato.
- [ ] **6.3** Test: entrambi i casi superano una simulazione automatica «non faccio nulla»
      senza eccezioni, e una «faccio le azioni necessarie» che porta esito non peggiorato.
- [ ] **6.4** Commit: `feat(sim): primi due casi per il motore nuovo`.

## Task 7 — Interfaccia: monitor, diario, squadra

**File:** crea `assets/js/modules/intervento.js`, crea `assets/css/intervento.css`

- [ ] **7.1** Guscio della vista: intestazione con cronometro e barra del tempo, monitor a
      lato, diario al centro, palette in basso.
- [ ] **7.2** Monitor: FC e SpO₂ continui col monitor collegato, PA con orario, letture
      scadute sbiadite con l'icona di rilevazione.
- [ ] **7.3** Diario: righe con istante e tipo (osservazione, azione, evento, allarme,
      infermiere), scorrimento automatico in fondo.
- [ ] **7.4** Squadra: tre pastiglie con chi è occupato e per quanto.
- [ ] **7.5** Verifica a mano su desktop: si avvia un caso, si eseguono azioni, il diario
      cresce, il monitor si aggiorna.
- [ ] **7.6** Commit: `feat(sim): interfaccia dell'intervento`.

## Task 8 — Palette e decisioni

**File:** modifica `assets/js/modules/intervento.js`, `assets/css/intervento.css`

- [ ] **8.1** Palette per categoria, con durata e chi può eseguire; su telefono pannello
      che sale da un pulsante grande.
- [ ] **8.2** Scelta dell'esecutore quando l'azione ammette più membri.
- [ ] **8.3** Carte di decisione degli eventi dentro il diario, con riscontro immediato
      (o rimandato in modalità esame).
- [ ] **8.4** Verifica a mano: delega un'azione, l'orologio avanza di 5 s e il risultato
      arriva dopo.
- [ ] **8.5** Commit: `feat(sim): palette delle azioni e decisioni sugli eventi`.

## Task 9 — Debriefing

**File:** modifica `assets/js/modules/intervento.js`, `assets/css/intervento.css`

- [ ] **9.1** Pagella: necessarie, ritardi, dannose, esito, minuti sulla scena.
- [ ] **9.2** Grafico dei parametri nel tempo con i momenti chiave marcati.
- [ ] **9.3** Doppia linea del tempo: la tua e quella ideale.
- [ ] **9.4** Chiave di lettura, trappola, capitoli da rileggere, pulsanti «ripeti» e
      «altro scenario».
- [ ] **9.5** Commit: `feat(sim): debriefing con pagella e grafico dei parametri`.

## Task 10 — Innesto e telefono

**File:** modifica `assets/js/modules/simulazioni.js`, `index.html`, `sw.js`,
`assets/css/mobile.css`

- [ ] **10.1** Elenco dei casi con distinzione fra formato nuovo e classico; il selettore
      instrada al runtime giusto guardando `caso.motore`.
- [ ] **10.2** Registra `intervento.css` in `index.html` e i file nuovi in `sw.js`,
      alzando la versione della cache.
- [ ] **10.3** Adattamenti telefono: monitor appiccicato, palette a tutta larghezza,
      diario leggibile.
- [ ] **10.4** Verifica a mano su viewport 390×844 e 375×667.
- [ ] **10.5** Commit e pubblicazione: `feat(sim): motore di intervento attivo sui primi
      due casi`.

---

## Collaudo automatico

`node --test tests/` deve restare verde a ogni commit. Il motore non importa nulla che
richieda un browser, quindi i test girano senza impalcature.
