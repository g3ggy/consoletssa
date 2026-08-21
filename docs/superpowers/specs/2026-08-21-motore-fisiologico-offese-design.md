# Motore fisiologico a offese — disegno

21 agosto 2026 · Console TSSA

---

## Il problema

Oggi ogni caso dichiara di quanto peggiora al minuto:

```js
decorso: { base: { pas: -2.5, pad: -1.5, fc: +1.6, spo2: -0.1 } }
```

Tre difetti.

**I numeri sono inventati.** Li ho messi io a occhio, caso per caso. Non vengono
da nessun manuale e non c'è modo di verificarli.

**La retta è medicina sbagliata.** Un paziente che perde sangue non scende di
2,5 mmHg al minuto per sempre: compensa — tachicardizza, vasocostringe, la
pressione *tiene* — e poi scompensa di colpo. Il Bolognin lo dice esplicitamente
(:6481, :7636); la retta non lo sa rappresentare.

**Il paziente non muore.** Arriva a un fondo e ci resta. Manca la posta in gioco.

## Cosa si ruba, e cosa no

Da **Pulse / BioGears** (motori di fisiologia in C++, Apache 2.0) si prende
l'*impostazione*: il caso dichiara la **causa**, e il decorso emerge dal modello.
Non si prende il codice — è C++, richiede un passo di build ed è decine di
megabyte: fuori da entrambe le regole del progetto.

Dai manuali si prendono i **numeri e i segni**: Bolognin TSSA 2022 per il
compenso e il triage, linee guida ERC per l'arresto. Gli agganci precisi stanno
in `tmp/testi/FONTI.md`.

---

## Decisioni prese

| Domanda | Scelta |
|---|---|
| Profondità del modello | **Riserve + compenso.** I parametri visibili non sono memorizzati: si calcolano |
| Come finisce | **Arresto, poi finestra di rianimazione.** Poi ROSC o morte |
| I segni del compenso | **Solo se li cerchi.** Nessun avviso automatico |
| Quante offese nel primo giro | **Sette.** Il catalogo però si disegna tutto qui |

---

## 1. Architettura

```
core/fisiologia.js    NUOVO — logica pura. Riserve + offese + intervallo →
                      riserve nuove e parametri visibili. Non sa cosa sia
                      un'azione né che ora è. ~250 righe.
core/sim-engine.js    orchestrazione: tempo, squadra, azioni, diario.
                      Chiama fisiologia invece di proiettare rette.
data/offese.js        NUOVO — catalogo delle offese. Solo dati.
data/casi.js          formato v3: i casi dichiarano offese, non derive.
```

Separare invece di gonfiare `sim-engine.js` (480 righe) tiene entrambi sotto il
tetto e rende la fisiologia collaudabile da sola, senza tempo né azioni attorno.

## 2. Il paziente in tre strati

| Strato | Contiene | Chi lo vede |
|---|---|---|
| **Riserve** | volemia, ossigenazione, glicemia, contrattilità, tono vascolare, dolore | nessuno, mai |
| **Compenso** | quanto l'organismo sta tirando per restare in piedi | solo chi lo cerca |
| **Parametri** | FC, PA, SpO2, FR, coscienza, refill, cute | chi li misura |

Le offese mangiano le riserve. Il compenso reagisce. I parametri sono il
risultato: non stanno da nessuna parte, si calcolano a ogni lettura.

### Perché "solo se li cerchi"

I segni del compenso — pallore, cute fredda, sudorazione algida, refill oltre i
due secondi, sete — esistono nello stato ma **non compaiono nel diario da soli**.
Si vedono facendo l'azione che li cerca.

```
il monitor dice     PA 118/72, FC 104          "tutto bene"
la realtà è         perdita al 22%, compenso in pieno
per accorgersene    refill capillare · colorito · cute · sete
senza guardare      nessun avviso. Fra due minuti la PA cede.
```

È la lezione del Bolognin resa giocabile: *«è errato pensare che stia bene solo
perché mantiene dei parametri inalterati»* (:7636).

## 3. Il catalogo delle offese

Ogni offesa è una funzione pura `(offesa, riserve, dt, tag) → delta riserve`,
dichiarata in `data/offese.js` — dove `offesa` è la riga scritta nel caso, con i
suoi parametri (`portata`, `sede`), e `tag` sono i provvedimenti già presi. Il
catalogo si disegna completo perché il formato non cambi più; se ne realizzano
sette nel primo giro.

Le **riserve** sono lo stato del paziente: `volemia`, `ossigenazione`,
`glicemia`, `contrattilità`, `tonoVascolare`, `dolore`. Un'offesa ne consuma una
o più. `dolore` è una riserva come le altre, non un'offesa: l'offesa è ciò che la
alza.

### Primo giro — sette

| id | Riserva colpita | Fonte |
|---|---|---|
| `emorragia` | volemia ↓ | Bolognin :6469 |
| `vasodilatazione` | tono vascolare ↓, volemia intatta | Bolognin :6473 (anafilassi, shock spinale) |
| `ipossia-ventilatoria` | ossigenazione ↓ | Bolognin :3277, :6425 |
| `ischemia-miocardica` | contrattilità ↓, dolore ↑, rischio FV | ERC 2025 cap. 5 |
| `dolore-acuto` | riserva `dolore` ↑, che a sua volta alza FC e PA per via adrenergica | Bolognin :6481 |
| `ipoglicemia` | glicemia ↓, coscienza ↓ | Bolognin |
| `blocco-compenso` | annulla la tachicardia riflessa | Bolognin :6487 |

### Giri successivi — cinque

`stimolazione-adrenergica` (cocaina) · `depressione-snc` (oppiacei) ·
`deficit-focale` (ictus) · `crush-riperfusione` · `ipotermia`.

L'ultima e la penultima hanno bisogno del PTC Base completo, che non abbiamo:
quello in `tmp/` è la sola integrazione COVID 2020.

### La forma

```js
{
  id: 'emorragia',
  fonte: 'Bolognin :6469-6490',
  // la compressione diretta riduce la portata, non la azzera
  applica: (offesa, riserve, dt, tag) => ({
    volemia: -offesa.portata * dt * (tag.includes('compressione') ? 0.2 : 1),
  }),
}
```

## 4. Il compenso

È il pezzo che fa la differenza fra questo modello e una retta.

```
perdita < 15%      niente di visibile
perdita 15-30%     COMPENSO
                   · tachicardia
                   · vasocostrizione → pallore, cute fredda, refill > 2 s
                   · tachipnea, sete
                   · PA sistolica ANCORA NORMALE
                   · il differenziale si stringe: la diastolica sale
perdita 30-40%     SCOMPENSO — la PA cede, la coscienza si altera
perdita > 40%      crollo → arresto
```

Il ginocchio al 30% è il cuore della lezione.

### Quando il compenso non c'è

Due strade, stesso effetto, e sono le trappole migliori che abbiamo:

- **lesione mielica** — il controllo nervoso sul circolo periferico viene meno:
  ipoteso con frequenza normale o bradicardico (Bolognin :6487);
- **betabloccante in terapia** — il paziente è pallido, freddo, sudato e ha 78
  di frequenza. Lo scopri solo con l'anamnesi.

Il secondo è il punto in cui fisiologia e anamnesi si toccano: **la domanda
giusta cambia il modello**. È la ragione per cui i due formati si disegnano
insieme.

## 5. Arresto e morte

Riserve esaurite → arresto. **Il ritmo iniziale dipende dalla causa**, e decide
se il defibrillatore serve a qualcosa:

| Causa | Ritmo | Il DAE |
|---|---|---|
| ischemia miocardica | FV / TV senza polso | scarica |
| ipossia | PEA → asistolia | non scarica |
| emorragia | PEA → asistolia | non scarica |

Insegna da solo che nell'arresto asfittico la risposta sono ventilazione e
compressioni, non la scarica.

Poi la sopravvivenza decade:

```
niente RCP        −6% al minuto        ERC 2025 cap. 4 :961
RCP in corso      curva più piatta     ← coefficiente da trovare
defibrillazione   solo se il ritmo la consente
```

Se nessuno fa niente entro la finestra: `esito: 'morto'`, lo scenario si chiude
e si va al debriefing. Il binario esiste già in `sim-engine.js:205-210`; oggi ci
si arriva solo per evento scritto a mano.

## 6. Il formato dei casi, versione 3

```js
{
  id: 'shock-v3', titolo: '"Si sente fiacco"', motore: 3,
  tipo: 'medico', difficolta: 3, capitoli: ['cap-29', 'cap-27'],
  dispatch: { … }, scena: { … }, colpoOcchio: { … },   // invariati

  fisiologia: {
    // il suo normale, prima dell'offesa: la base dei calcoli
    base: { fc: 72, pas: 135, pad: 82, spo2: 98, fr: 14, glicemia: 96 },
    riserve: { volemia: 4800 },                        // ml; le altre riserve
                                                       // partono dai predefiniti
                                                       // dell'adulto sano
    offese: [
      { tipo: 'emorragia', sede: 'digestiva', portata: 55, gia: 900 },
    ],
    modificatori: { eta: 74, terapia: ['betabloccante'] },
  },

  anamnesi: { … },                    // vedi sotto
  eventi: [ … ], soglie: [ … ],       // narrativa: restano come sono
  azioni: { necessarie, utili, dannose },   // invariato
}
```

Due chiavi fanno il lavoro:

- **`gia: 900`** — quanti ml ha già perso quando arriva la squadra. È così che si
  sceglie la gravità all'arrivo, invece di scrivere a mano `pas: 96`. I parametri
  iniziali escono da soli e sono coerenti col compenso.
- **`modificatori.terapia`** — alimenta `blocco-compenso`.

Spariscono `iniziale`, `decorso.base`, `decorso.freni`, `decorso.limiti`,
`effettiAzioni`: erano tutti numeri scritti a mano che ora si ricavano.

### Le azioni agiscono sulle riserve, non sui parametri

```
compressione   → portata dell'emorragia × 0.2
laccio         → portata × 0
inf-liquidi    → volemia ↑
o2-reservoir   → ossigenazione ↑
antishock      → ritorno venoso ↑, cioè tenuta pressoria
posizione-seduta (in un ipoteso) → ritorno venoso ↓
```

`posizione-seduta` smette di essere una penalità dichiarata e diventa un errore
che si *paga in fisiologia*, che è il modo giusto di insegnarlo.

## 7. Anamnesi: la forma dei dati

Il **comportamento** dell'anamnesi ha la sua specifica. Qui si ferma la forma,
perché il formato dei casi nasca completo e non vada riaperto.

```js
anamnesi: {
  interlocutori: [
    { id: 'paziente', label: 'il paziente' },
    { id: 'moglie',   label: 'la moglie' },
  ],
  domande: [
    {
      id: 'terapia', schema: 'SAMPLE/M', durata: 25,
      testo: 'Che medicine prende?',
      risposte: {
        paziente: { testo: 'Quella per la pressione, mi pare.', qualita: 'vaga' },
        moglie:   { testo: 'Il Cardicor, e il Coumadin da tre anni.',
                    qualita: 'buona', rivela: ['betabloccante', 'anticoagulante'] },
      },
    },
  ],
}
```

`qualita` ∈ `buona` · `vaga` · `sbagliata` · `falsa`. Il `rivela` è la giuntura
col modello fisiologico: la risposta giusta all'interlocutore giusto accende un
modificatore che stava già agendo sul paziente a insaputa del soccorritore.

## 8. Migrazione

I casi sul motore v2 sono **due** (`shock-v2`, `toracico-v2`): si riscrivono a
mano, non serve un convertitore. `sim-engine.js` accetta solo il formato 3, così
non restano due strade aperte.

I dodici scenari legacy restano dove sono, sul motore vecchio, con la deriva
lineare ormai limitata dalla 1.6.1. La loro conversione è un lavoro a sé e viene
dopo, sul formato ormai fermo.

## 9. Collaudo

`fisiologia.js` è logica pura: `node --test`, come il resto del motore. I casi di
prova vengono dalle fonti, non dalla mia testa.

| Prova | Attesa | Fonte |
|---|---|---|
| perdita 20% | PA ancora normale, FC su, refill > 2 s | Bolognin :6481 |
| perdita 35% | PA scende, coscienza alterata | Bolognin :6481 |
| lesione mielica | ipoteso **senza** tachicardia | Bolognin :6487 |
| betabloccante | idem | — |
| arresto ipossico | PEA, il DAE non scarica | ERC 2025 cap. 5 |
| arresto ischemico | FV, il DAE scarica | ERC 2025 cap. 5 |
| compressione su emorragia | portata ridotta, non azzerata | Bolognin |
| nessun limite dichiarato | i parametri restano nei valori vitali | regressione 1.6.1 |

La prova sulla lesione mielica è quella che dice se il modello ha capito la
lezione giusta: un modello che fa sempre salire la frequenza quando la pressione
scende è un modello che non ha capito niente.

Il resto — interfaccia, leggibilità sul telefono — si prova nel browser a
larghezza telefono, come tutto il resto del progetto.

## 10. Fonti e lacune

**Quello che è fondato:**

- segni e meccanismi del compenso — Bolognin :6481
- assenza di compenso nella lesione mielica — Bolognin :6487
- soglia del 25% nel bambino — Bolognin :7636
- refill capillare < 2 s — Bolognin :6489
- polso radiale ⇒ PAS ≥ 80 mmHg — Bolognin :8650
- decadimento della sopravvivenza, −6%/min — ERC 2025 cap. 4 :961
- compressioni ≥ 5 cm e non oltre 6 — ERC 2025 cap. 4 :270

**Quello che manca, e che non va inventato in silenzio:**

1. **Le classi di emorragia dell'adulto** (le soglie 15 / 30 / 40%). Il Bolognin
   dà solo il 25% pediatrico. Le soglie adulte vengono da ATLS/PTC, e il PTC Base
   che abbiamo è la sola integrazione COVID 2020. **Finché non arriva una fonte,
   quelle soglie vanno marcate come assunzione nostra nel codice**, non spacciate
   per linea guida.
2. **Di quanto la RCP appiattisce la curva di sopravvivenza.** Ho la direzione,
   non un coefficiente citabile. Da cercare nel capitolo 3; se non si trova, si
   dichiara come scelta nostra.

Ogni costante nel codice porta il commento con la sua fonte, o la dicitura
«assunzione nostra» se fonte non ce n'è.

## 11. Fuori perimetro

- La conversione dei dieci scenari legacy: lavoro a sé, dopo.
- Il comportamento dell'anamnesi: specifica a sé. Qui c'è solo la forma dei dati.
- BLS-D, triage, manovre: moduli a sé.
- Le cinque offese del secondo giro.
- Il motore vecchio a otto passi: non lo si tocca, va in pensione con la
  conversione.
