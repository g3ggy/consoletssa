# I casi senza fisiologia — disegno

Ictus e sincope sul motore a tempo, e il ragguaglio messo a confronto.

Terzo pezzo dopo il motore fisiologico a offese (1.7.0) e l'anamnesi a
domande (1.8.0). Copre due dei dieci scenari legacy da convertire.

---

## Il problema

Il motore a tempo punisce chi sbaglia facendo peggiorare il paziente: la
pressione scende, la coscienza cede, e alla fine si arriva all'arresto. È
il meccanismo su cui sono costruiti i quattro casi già convertiti.

Due degli scenari che restano non funzionano così, e non per un difetto:
per definizione.

**L'ictus** ha frequenza 88, respiro 16, saturazione 96, glicemia 118. La
sola cosa fuori norma è la pressione a 178/95, che in fase acuta è
attesa e che sul territorio non si abbassa. La paziente non peggiora
mentre siete lì, e non deve: il danno cerebrale corre in ospedale, non
sul mezzo. Quello che decide il trattamento è l'ora dell'ultimo momento
in cui è stata vista bene — un'informazione, non un parametro.

**La sincope** è già risolta quando arrivate. La definizione stessa lo
dice: «perdita di coscienza transitoria a completa risoluzione
spontanea. Un paziente ancora con alterazione della coscienza all'arrivo
del mezzo di soccorso non va pertanto mai considerato una sincope»
(Bolognin :4313). Se peggiorasse, non sarebbe più questo caso.

Portarli sul motore a tempo senza rispondere a una domanda li rende due
schermate vuote: **cosa costa sbagliare, quando i numeri stanno bene?**

## La risposta

Ogni caso paga nella moneta che ha davvero.

**La sincope ha una conseguenza fisica, e sta scritta nel manuale**:
«mantenere il paziente supino o in posizione antishock: farlo sedere o
addirittura alzare in piedi potrebbe provocare una ulteriore sincope»
(Bolognin :4322). Chi la tira su la fa risvenire. Questo il motore lo sa
già fare — è ritorno venoso — e non serve nessuna offesa nuova.

**L'ictus non ha una conseguenza fisica sul mezzo.** Lì il prezzo è il
tempo bruciato e l'informazione che non hai raccolto, e si paga in due
posti: il conto del tempo dall'esordio, e il confronto fra il ragguaglio
modello e quello che sei davvero in grado di dire.

## Decisioni prese

1. **Niente offese nuove.** Il gruppo si costruisce con quello che c'è.
2. **Il prezzo è misto**: fisico dove esiste (sincope), informativo dove
   il fisico non c'è (ictus).
3. **Un reperto che non è un parametro sta nel diario, non in una
   tessera.** Le tessere del monitor dicono numeri misurati; un braccio
   che non si alza non è un numero che invecchia.
4. **Il tempo si rende visibile col conto, non con una finestra che si
   chiude.** Nessun intervento su questo banco dura quattro ore: una
   finestra terapeutica insegnerebbe «tanto c'è tempo».
5. **Il ragguaglio si confronta, non si genera.** Comporre prosa italiana
   da dati sparsi è un lavoro a sé e suona finto; confrontare voce per
   voce usa dati che il motore ha già.

---

## 1. Architettura

Cinque pezzi. Tre sono generali e serviranno a chi viene dopo; due sono i
casi.

```
assets/js/data/azioni.js        + azione `esame-neurologico`
assets/js/core/ragguaglio.js    NUOVO — il confronto, logica pura
assets/js/core/sim-engine.js    + `caso.esordio` nella pagella
                                + la revisione del ragguaglio
assets/js/data/casi.js          + `ictus-v3` e `sincope-v3`
assets/js/modules/intervento.js + due riquadri nel debriefing
```

`core/ragguaglio.js` è un modulo nuovo e non un pezzo di `sim-engine.js`,
che è già a settecento righe. È logica pura: si collauda in Node senza
browser, come `fisiologia.js` e `anamnesi.js`.

## 2. L'esame neurologico

Una sola azione nel catalogo, categoria D, trenta secondi, eseguibile da
te. Il diario del catalogo è generico; **cosa trovi lo dice il caso** con
`diarioAzioni`, il gancio introdotto in 1.9.0 per i documenti
dell'ipoglicemico e il segno della cintura dell'incidente.

```js
{
  id: 'esame-neurologico', cat: 'D', label: 'Esame neurologico rapido',
  durata: 30, chi: ['tu'],
  diario: 'Gli chiedi di sorridere, di tenere le braccia avanti a occhi chiusi, di ripetere una frase.',
  spiega: 'Faccia, braccia, linguaggio. Basta che uno dei tre sia alterato: e serve anche a escludere, perché l\'ipoglicemia imita l\'ictus.',
}
```

I tre segni sono quelli del Bolognin :4112-4125: paresi facciale
(sorridere o mostrare i denti), deficit motorio degli arti superiori
(braccia estese dieci secondi a occhi chiusi), anomalie del linguaggio
(ripetere una frase). «L'alterazione di ciascuno dei tre segni è
fortemente suggestiva per un ictus.»

Non è `unaVolta`: in viaggio si ricontrolla, ed è giusto poterlo rifare.

**Trovarlo negativo vale quanto trovarlo alterato.** Un caso che non è un
ictus può metterlo fra le azioni utili, e il diario dirà che i tre segni
sono a posto: è così che si impara che l'esame serve anche a escludere.

## 3. Il conto del tempo

Il caso dichiara da quanti minuti è cominciato quando la squadra arriva:

```js
esordio: 35,   // minuti passati all'arrivo della squadra
```

Il debriefing ne fa un riquadro:

> All'arrivo erano passati **35 minuti** dall'esordio.
> Sulla scena ne avete spesi **22**.
> Il paziente parte per l'ospedale a **57 minuti** dall'esordio.

Il viaggio non si modella: il conto si ferma a quando caricate, perché è
l'unico pezzo che dipende da voi.

Il riquadro compare solo nei casi che dichiarano `esordio`. Vale per ogni
caso tempo-dipendente: il dolore toracico lo userà, e lì «tempo è
muscolo» smetterà di essere una frase nel debriefing.

## 4. Il confronto del ragguaglio

Oggi `caso.ragguaglio` è un testo fisso, e il debriefing lo mostra
comunque — anche a chi non ha fatto niente di quello che il testo elenca.
È etichettato «come lo diresti», quindi si legge come modello, ma resta
una cosa che la console dice di aver fatto senza che sia successo.

Il caso dichiara anche **le voci** del ragguaglio, ognuna con la
condizione che la rende tua:

```js
ragguaglioVoci: [
  { t: 'Donna di 71 anni, ipertesa in terapia',   da: 'domanda:patologie' },
  { t: 'Vista bene l\'ultima volta alle 9:40',     da: 'sapere:esordio-9-40' },
  { t: 'Afasia produttiva ed emiparesi destra',    da: 'azione:esame-neurologico' },
  { t: 'PA 178/95',                                da: 'lettura:pa' },
  { t: 'Glicemia 118',                             da: 'lettura:glicemia' },
],
```

Quattro prefissi, tre fonti che il motore ha già — `azione:` e
`domanda:` guardano nello stesso elenco, con l'id scritto come il motore
lo registra:

| voce | cerca | vero quando |
|---|---|---|
| `azione:collare`      | `fatte`, id `collare`         | hai eseguito quell'azione |
| `domanda:patologie`   | `fatte`, id `domanda:patologie` | hai fatto quella domanda a qualcuno |
| `sapere:esordio-9-40` | `saputo`                      | qualcuno ti ha rivelato quella chiave |
| `lettura:pa`          | `letture`                     | hai quel parametro, anche se scaduto |

Per `azione:` il motore toglie il prefisso e cerca l'id nudo; per
`domanda:` cerca la voce così com'è, perché è così che `chiedi()` la
registra fra le cose fatte.

`revisioneRagguaglio(caso, { fatte, saputo, letture })` restituisce
l'elenco delle voci con `tuo: true|false`. Il debriefing le disegna verdi
o ambra sotto il ragguaglio modello, e chiude con una riga sola: *«di
cinque cose che il ragguaglio dice, tre le hai davvero.»*

Una voce senza `da` è sempre tua: serve per le parti che non dipendono da
niente («trasportata con preallerta»).

Il testo in prosa **resta**. Il confronto gli sta accanto, non lo
sostituisce: il modello serve a sapere come si dice, il confronto a
sapere cosa ti manca.

I casi già scritti che non dichiarano `ragguaglioVoci` non cambiano: il
riquadro del confronto semplicemente non compare.

## 5. `sincope-v3`

Donna di 24 anni, svenuta in coda alle poste. Cosciente e orientata
all'arrivo, pallida e sudata, sdraiata a terra.

```js
fisiologia: {
  base: { fc: 58, pas: 112, pad: 70, spo2: 99, fr: 14, glicemia: 84, temp: 36.3 },
  riserve: { volemia: 5000, tonoVascolare: 0.80 },
  offese: [],
  modificatori: { eta: 24, terapia: [] },
},
```

Il tono vascolare basso è il vago che ha ancora la mano sul freno.
Verificato sul motore:

```
supina                →  PA 90/56   coscienza A
tag 'seduta'          →  PA 72/45   coscienza V
```

**La trappola scatta da sola.** `posizione-seduta` mette il tag `seduta`,
il ritorno venoso cala, la pressione scende sotto i 75 e la coscienza
cede: risviene. Non c'è nessun copione — è la stessa fisica che fa male
allo shockato seduto in `shock-v3`. `posizione-seduta` va fra le
dannose, col perché del Bolognin :4322.

**La seconda metà della lezione sta nell'anamnesi.** Il manuale dice che
«la concomitanza con dolore toracico, dispnea, dolore addominale deve
suggerire sempre una patologia maggiore» (:4324). Le sue risposte a
quelle domande sono dei «no», e quel «no» è il reperto che vale: è così
che una sincope resta una sincope invece di essere qualcos'altro che non
hai cercato.

Interlocutori: lei, e **un'impiegata delle poste** che ha visto la
caduta e può dire quanto è durata — «meno di un minuto, poi ha riaperto
gli occhi» — che è l'altro dato della definizione.

`esordio` non si dichiara: qui il tempo non decide niente.

## 6. `ictus-v3`

Donna di 71 anni, non parla bene e non muove il braccio destro.

```js
fisiologia: {
  base: { fc: 88, pas: 178, pad: 95, spo2: 96, fr: 16, glicemia: 118, temp: 36.6 },
  riserve: {},
  offese: [],
  modificatori: { eta: 71, terapia: [] },
},
esordio: 35,
```

**Nessuna offesa.** La pressione alta è la sua, in fase acuta, e non si
abbassa sul territorio: sta nella `base` perché è quello che ha adesso,
non qualcosa che sta peggiorando.

**È afasica, non confusa.** La coscienza è A, quindi il ripiego `confuso`
dell'anamnesi non scatta e le sue risposte escono come sono scritte nel
caso — scritte come parla lei: corrette, brevi, faticate. «Sì… non… la
parola non…». Chi la tratta da confusa sbaglia paziente, ed è la trappola
dichiarata dello scenario. Il motore la rende senza una riga di codice
nuova.

**L'ora la dà il marito**, che l'ha vista bene alle 9:40 e l'ha trovata
così alle 10:15. La domanda `evento` a lui rivela `esordio-9-40`; la
stessa domanda a lei dà una risposta vaga, perché non è in grado.

La glicemia sta fra le necessarie: l'ipoglicemia imita l'ictus, e adesso
che `ipoglicemia-v3` esiste sul banco il confronto è a portata di mano.

## 7. Il formato dei casi, cosa cambia

Due chiavi nuove, tutte e due facoltative:

```
esordio            minuti passati dall'esordio all'arrivo della squadra
ragguaglioVoci     le voci del ragguaglio, con la condizione che le rende tue
```

E una regola che si allenta: **un caso di formato 3 dichiara il blocco
`fisiologia`, non per forza un'offesa.** Il test
`i casi di formato 3 dichiarano offese, non derive` oggi pretende
`offese.length > 0`; un paziente che non peggiora è legittimo e va
ammesso.

## 8. Collaudo

Logica pura, in Node:

- **`tests/ragguaglio.test.mjs`** (nuovo) — i quattro prefissi si
  risolvono contro le fonti giuste; una voce senza `da` è sempre tua; un
  caso senza `ragguaglioVoci` restituisce un elenco vuoto senza rompere.
- **`tests/casi.test.mjs`** — la sincope seduta risviene e supina no; il
  conto del tempo dell'ictus torna; l'afasica risponde come è scritto e
  non col ripiego del confuso; l'ora la dà il marito e non lei.
- **`tests/azioni.test.mjs`** — l'esame neurologico c'è ed è completo.

Nel browser, a larghezza telefono: i due riquadri nuovi del debriefing,
la sincope che risviene davvero toccando «posizione seduta», e le righe
del confronto che non sbordano.

## 9. Fonti

| cosa | dove |
|---|---|
| definizione di sincope, e il paziente ancora alterato che non lo è | Bolognin :4313-4315 |
| supino o antishock, farlo sedere o alzare può farlo risvenire | Bolognin :4322 |
| dolore toracico, dispnea o dolore addominale insieme alla sincope | Bolognin :4324 |
| i tre segni dell'esame neurologico | Bolognin :4112-4125 |
| FAST, e la T che sta per Time | Bolognin :4126-4133 |
| segni dell'ictus, afasia, emiparesi | Bolognin :4064-4090 |
| scale di riconoscimento e allertamento precoce | ERC 2025 cap. 12 :515-516, :1197-1210 |

**Lacuna dichiarata nel codice**: la bradicardia vagale non è
modellabile. Il motore muove la frequenza col compenso e col dolore, mai
verso il basso: nella sincope si dichiara `base.fc` a 58 con un commento
che dice perché. È la stessa lacuna già segnata per la scarica
adrenergica dell'ipoglicemico, e si chiude quando arriverà il tono
autonomo del gruppo A.

## 10. Fuori perimetro

- **Il ragguaglio generato in prosa.** Si confronta voce per voce, non si
  compone. Se un giorno servirà, le voci sono già lì per farlo.
- **Le tessere per i reperti neurologici.** Il deficit sta nel diario. Se
  si vorrà ricontrollarlo in viaggio con un valore che invecchia, sarà
  una decisione a sé.
- **La finestra terapeutica.** Nessun intervento dura quattro ore.
- **Gli altri sei scenari.** Il gruppo A (cocaina, anafilassi,
  anticoagulante) e il gruppo B (bpco, schiacciamento, arresto) hanno
  ognuno la propria specifica.
- **Il tono autonomo** come modificatore delle riserve: serve a tre casi
  del gruppo A e si progetta lì, non qui.
