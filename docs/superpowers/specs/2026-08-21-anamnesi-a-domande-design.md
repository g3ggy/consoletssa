# Anamnesi a domande — disegno

21 agosto 2026 · Console TSSA

---

## Il problema

Nel motore vecchio l'anamnesi è il passo 5: sei riquadri SAMPLE che si toccano
uno per uno e sputano la risposta.

```js
sample: {
  S: 'Dolore oppressivo retrosternale, irradiato alla mandibola…',
  M: 'Ramipril, atorvastatina. Nessun anticoagulante.',
  …
}
```

Tre difetti, gli stessi del vecchio decorso a rette.

**Non costa niente.** Sei tocchi, zero secondi, e sai tutto. Sul mezzo l'anamnesi
è tempo tolto a qualcos'altro, e il tempo è l'unica risorsa che non torna.

**Non si sbaglia mai.** La risposta è una sola, sempre vera, sempre completa. Chi
la legge impara che l'anamnesi è un modulo da riempire, mentre è una cosa di cui
dubitare: il paziente confuso che dice «quella per la pressione», la moglie che
sa il nome del farmaco, il figlio che non sa niente ma parla lo stesso.

**Non serve a niente.** Le sei risposte non cambiano il caso: sono testo che
scorre. Nel motore nuovo esiste già un paziente che ha un betabloccante addosso —
`shock-v3`, `modificatori.terapia` — e il soccorritore **non ha modo di
scoprirlo**. Il modello e l'anamnesi si toccano lì, e finora quel punto è vuoto.

## Cosa insegna

Una cosa sola, e per questo il disegno può restare piccolo:

> La domanda giusta, alla persona giusta, prima che sia tardi.

Il resto — quante voci hai riempito, quanto è lungo il ragguaglio — viene dopo.

---

## Decisioni prese

| Domanda | Scelta |
|---|---|
| Da dove vengono le domande | **Catalogo unico**, come le azioni. Il caso scrive solo le risposte |
| Come si sceglie chi risponde | **Ti giri verso qualcuno**, e da lì tutte le domande vanno a lui |
| Come si scopre una risposta cattiva | **Non te lo dice nessuno**: si incrocia |
| Cosa cambia quando scopri qualcosa | **Quello che sai e quello che riferisci.** Non la fisiologia |
| Chi fa le domande | **Tu.** Non si delega |
| Paziente non lucido | **La coscienza decide**: a V risponde ma non vale, a P e U non risponde |
| Quante domande | **Sei SAMPLE sempre, sei OPQRST quando ha dolore** |

---

## 1. Architettura

```
core/anamnesi.js      NUOVO — logica pura. (domanda, risposte del caso,
                      interlocutore, coscienza) → cosa dice e cosa rivela.
                      Non sa cosa sia il tempo né il DOM. ~120 righe.
data/domande.js       NUOVO — il catalogo: sei SAMPLE, sei OPQRST. Solo dati.
core/sim-engine.js    +50 righe: interlocutore corrente, `chiedi()`, e il
                      registro di quello che sai.
data/casi.js          blocco `anamnesi` per caso: interlocutori e risposte.
modules/intervento.js la categoria «Anamnesi» nella palette, con in cima chi
                      hai davanti; la scheda «quello che sai» nel debriefing.
```

Lo stesso taglio del motore fisiologico: la logica che si può sbagliare sta in un
file puro e collaudabile da solo, il motore ci mette attorno il tempo e il
diario, l'interfaccia ci mette i tocchi.

`sim-engine.js` passa da 600 a circa 650 righe. Resta sotto il tetto, ma è il
file che cresce a ogni lavoro: quando arriverà la conversione dei dieci scenari
legacy andrà spezzato, e il candidato naturale è il pezzo squadra-e-azioni.

## 2. Il catalogo delle domande

Dodici voci, scritte una volta per tutti gli scenari. I testi vengono dal
Bolognin (:2715 per il SAMPLE, :2723 per l'OPQRST), non dalla mia testa.

```js
terapia: {
  id: 'terapia', schema: 'SAMPLE', lettera: 'M',
  testo: 'Quali farmaci sta prendendo attualmente?',
  durata: 25,
  /* quando l'interlocutore non ne sa niente */
  nonSo: 'Alza le spalle: non lo sa dire.',
  /* quando risponde un paziente confuso: non se ne cava niente di sicuro */
  confuso: '«Mah… qualcosa per la pressione, mi sa.»',
},
```

| Lettera | id | Domanda | Quando compare |
|---|---|---|---|
| S | `disturbi` | Quali disturbi lamenta? | sempre |
| A | `allergie` | È allergico a farmaci, cibi o fattori ambientali? | sempre |
| M | `terapia` | Quali farmaci sta prendendo attualmente? | sempre |
| P | `patologie` | Soffre di qualche malattia? | sempre |
| L | `ultimo-pasto` | Quando e cosa ha mangiato o bevuto l'ultima volta? | sempre |
| E | `evento` | Cosa stava succedendo quando è cominciato? | sempre |
| O | `esordio` | Com'è cominciato? Le era già capitato? | se ha dolore |
| P | `allevia` | Cosa lo fa stare meglio, cosa peggio? | se ha dolore |
| Q | `qualita-dolore` | Che tipo di dolore è? | se ha dolore |
| R | `irradiazione` | Il dolore si sposta da qualche parte? | se ha dolore |
| S | `intensita` | Quanto le fa male, da 1 a 10? | se ha dolore |
| T | `durata-dolore` | Da quanto è cominciato? Quanto dura? | se ha dolore |

Le sei dell'OPQRST portano `richiede: (p) => p.dolore > 0`, che è il meccanismo
che il motore usa già per le altre azioni: la lista resta corta sul telefono e si
allunga da sola quando serve.

Le durate stanno fra i 15 e i 25 secondi: una domanda costa meno di una
pressione (40 s) e più di un refill (15 s). Sono **assunzione nostra**.

## 3. Le risposte, nel caso

```js
anamnesi: {
  /* il paziente c'è sempre e non va dichiarato; qui vanno gli altri */
  interlocutori: [
    { id: 'moglie', label: 'la moglie' },
  ],
  risposte: {
    terapia: {
      paziente: { t: '«Quella per la pressione, mi pare.»', qualita: 'vaga' },
      moglie: {
        t: '«Il Cardicor, e il Coumadin da tre anni.»',
        qualita: 'buona',
        rivela: ['betabloccante', 'anticoagulante'],
      },
    },
    allergie: {
      paziente: { t: '«No, niente.»', qualita: 'buona' },
    },
  },
}
```

`qualita` ∈ `buona` · `vaga` · `sbagliata` · `falsa`. **Non compare mai a
schermo**: serve al debriefing, che alla fine dice chi ti aveva risposto male.

### I tre ripieghi

Nessun caso è obbligato a riempire la griglia intera — dodici domande per tre
interlocutori sarebbero trentasei caselle, e la maggior parte non serve.

| Situazione | Cosa succede |
|---|---|
| risposta non scritta per quell'interlocutore | il `nonSo` del catalogo, niente rivelazioni |
| paziente a coscienza V | il `confuso` del catalogo, niente rivelazioni |
| paziente a coscienza P o U | l'azione è bloccata, col suo motivo |
| `richiede` non soddisfatto | la domanda non compare in lista |

Il degrado del paziente confuso è **una regola sola**, non una scala: a coscienza
V esce il testo `confuso` del catalogo e le rivelazioni saltano, qualunque fosse
la qualità scritta nel caso. Chi già mentiva (`falsa`) resta falsa, perché un
bugiardo confuso non diventa sincero — e perché il debriefing deve poter dire che
ti hanno mentito, non che eri arrivato tardi.

Costa dodici stringhe scritte una volta nel catalogo, invece di due testi per
ogni risposta di ogni caso.

## 4. Cosa cambia quando scopri qualcosa

`rivela` usa **le stesse chiavi** di `fisiologia.modificatori.terapia`:
`'betabloccante'` è la stringa che in `shock-v3` blocca il compenso tachicardico.
È la giuntura fra i due modelli, ed è tutta qui.

Scoprire **non cambia la fisiologia**: il farmaco agiva già da prima che
arrivaste, e farlo cominciare adesso sarebbe medicina falsa. Cambia tre cose:

1. **quello che sai** — una scheda che si riempie mentre chiedi, e che alla
   fine dice da chi l'hai saputo;
2. **la pagella** — le domande necessarie del caso, con il loro `entro`;
3. **il debriefing** — che ti dice dove ti sei fermato troppo presto.

Il testo del ragguaglio resta scritto a mano nel caso (vedi §6): comporlo dalle
risposte raccolte è il lavoro dopo, non questo.

Il Bolognin dice perché conta, e vale la pena riportarlo nel debriefing: «se il
paziente dovesse entrare in stato di incoscienza prima dell'arrivo in ospedale
non sarebbe più in grado di riferire alcun dato» (:2708). Chi non chiede finché
il paziente parla, dopo non chiede più.

## 5. Come si gioca

Nella palette una categoria **Anamnesi**. In cima chi hai davanti, sotto le
domande che si possono fare adesso.

```
PARLI CON:  [il paziente]   la moglie

 M  Quali farmaci sta prendendo attualmente?      25s
 P  Soffre di qualche malattia?                   20s
 A  È allergico a farmaci, cibi o sostanze?       15s
 …
 [rivolgiti alla moglie · 10s]
```

Cambiare interlocutore costa dieci secondi, come voltarsi. Rifare la stessa
domanda a un altro è lecito e costa il suo tempo: è l'unico modo per accorgersi
che qualcuno ha risposto male.

La risposta va nel diario **com'è stata detta**, senza etichette:

```
10:42  Chiedi al paziente: quali farmaci sta prendendo?
       «Quella per la pressione, mi pare.»

10:43  Chiedi alla moglie: quali farmaci sta prendendo?
       «Il Cardicor, e il Coumadin da tre anni.»
```

Le due risposte non coincidono, e sta a chi gioca accorgersene.

## 6. Pagella e debriefing

Ogni domanda fatta si registra fra le azioni con id `domanda:<id>`. La pagella
funziona **senza modifiche**: il caso mette fra le necessarie

```js
{ id: 'domanda:terapia', entro: 300, peso: 2 },
```

e il conto dei punti, il ritardo e la percentuale vengono da soli. L'unico
innesto **nella pagella** è l'etichetta: se l'id comincia per `domanda:`, il nome
si legge nel catalogo delle domande invece che in quello delle azioni.

Nel debriefing una scheda in più:

```
QUELLO CHE HAI RACCOLTO
 ● Medicine    dalla moglie: betabloccante, anticoagulante
 ● Malattie    dal paziente
 ○ Allergie    non chiesto
 ⚠ Il paziente ti aveva detto «quella per la pressione»: la moglie
   sapeva il nome. Chiedere a chi c'è costa venti secondi.
```

La riga con il triangolo compare quando una risposta `vaga`, `sbagliata` o
`falsa` è rimasta l'unica che hai su quella domanda, ed esisteva un
interlocutore che avrebbe risposto meglio.

Il testo del `ragguaglio` **resta scritto a mano** nel caso: comporlo dalle
risposte raccolte è un lavoro a sé, e non serve a insegnare la lezione di questo
pezzo.

## 7. Collaudo

`anamnesi.js` è logica pura: `node --test`, come il resto.

| Prova | Attesa |
|---|---|
| risposta scritta per l'interlocutore | esce quella, con le sue rivelazioni |
| risposta non scritta | esce il `nonSo`, nessuna rivelazione |
| paziente a coscienza V | esce il `confuso`, nessuna rivelazione |
| paziente a coscienza P | la domanda è bloccata |
| risposta `falsa` da confuso | resta falsa: un bugiardo confuso mente uguale |
| domanda OPQRST senza dolore | non compare in lista |
| stessa domanda a due interlocutori | si registrano due risposte, non una |

Nel motore, tre prove: la domanda consuma il suo tempo, si registra come
`domanda:<id>` fra le fatte, e a coscienza P viene rifiutata col motivo.

Il resto — la palette a larghezza telefono, la scheda del debriefing — si prova
nel browser, come tutto il resto del progetto.

## 8. Migrazione

I due casi del formato 3 prendono il blocco `anamnesi`:

- **`shock-v3`** — è il caso per cui esiste questo lavoro. Il paziente risponde
  vago sulla terapia, la moglie sa il nome del betabloccante. Chi chiede a lei
  capisce perché quella frequenza a 72 non vuol dire niente;
- **`toracico-v3`** — il figlio è sulla scena e sa le patologie; il paziente ha
  dolore, quindi ha l'OPQRST, ed è il caso in cui serve davvero.

I dodici scenari legacy tengono il loro `sample` a sei riquadri finché non
vengono convertiti: il motore vecchio non si tocca.

## 9. Fonti e lacune

**Fondato:**

- il SAMPLE con le domande per esteso — Bolognin :2715;
- l'OPQRST con le sei voci — Bolognin :2723;
- perché si raccoglie finché il paziente parla — Bolognin :2708.

**Assunzione nostra**, marcata nel codice:

1. **le durate delle domande** (15-25 s) e i dieci secondi per cambiare
   interlocutore. Nessun manuale li dà;
2. **il degrado a coscienza V**: che un paziente confuso risponda in modo
   inaffidabile è clinica ovvia, ma la regola «una tacca in giù» è nostra.

## 10. Fuori perimetro

- **Il ragguaglio generato** dalle risposte raccolte: lavoro a sé.
- **Insistere su una risposta** («chiedi meglio», rilancio): si incrocia con un
  altro interlocutore, e basta così.
- **Interlocutori che entrano ed escono** dalla scena nel tempo: gli eventi del
  caso possono già raccontarlo; se servirà, si aggiunge un `presenteSe`.
- **L'esame obiettivo orientato** (Bolognin :2740): è un'altra cosa, e sono altre
  azioni.
- **La conversione dei dieci scenari legacy**: viene dopo, sul formato ormai
  fermo.
