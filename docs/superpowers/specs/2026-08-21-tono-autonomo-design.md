# Il tono autonomo — disegno

L'allarme adrenergico come asse del motore, e `cocaina-v3`.

Quarto pezzo dopo il motore fisiologico a offese (1.7.0), l'anamnesi a
domande (1.8.0) e i casi senza fisiologia (1.10.0). Prima metà del
**gruppo A**: la seconda — `anafilassi-v3` e `anticoagulante-v3` — avrà
la sua specifica.

---

## Il problema

Il capitolo 27 degli appunti è intitolato *«questa è la parte più
preziosa della lezione, ed è ciò che quasi nessun corso spiega»*, e dice
una cosa sola:

> Quando l'organismo percepisce un problema — **qualunque** problema —
> attiva la risposta di allarme e rilascia adrenalina. E lo fa allo
> stesso modo che si tratti di un infarto, di un'emorragia o del bisogno
> urgente di andare in bagno. **I segni d'allarme sono aspecifici:
> dicono che c'è un problema, NON quale.**

Il motore non lo sa. Conosce **un solo innesco** — il sangue che manca —
e da lì calcola frequenza, cute, refill e sete. Tutto il resto non
allarma nessuno. Le conseguenze si vedono, e sono già scritte:

- **l'ipoglicemico non è tachicardico né sudato.** Bolognin :4287 dice
  che «la cute appare umida e sudata» e che il paziente «può essere
  ostile e aggressivo, tanto da essere scambiato per un intossicato da
  alcolici» — che è esattamente quello che dicono i passanti in
  `ipoglicemia-v3`. Nel motore ha frequenza 72 e cute normale;
- **la sincope è pallida per finta.** In `sincope-v3` il colpo d'occhio
  dice «pallida e sudata», la tessera Cute legge «normale», e la
  bradicardia vagale è una frequenza 58 scritta a mano nella base con un
  commento che si scusa;
- **l'infartuato non è sudato.** `toracico-v3` ha dolore 7 e cute
  normale, mentre il quadro classico dell'infarto è pallido e sudato
  (Bolognin :6481);
- **la cocaina non è modellabile per niente.** Un trentenne
  normovolemico con FC 150 e PA 150/80 non ha niente che il motore sappia
  produrre: non gli manca il sangue.

E c'è un guasto piccolo che appartiene a questa famiglia: **l'azione
`pupille` è un `rileva` morto.** `parametriVisibili` non restituisce
nessun campo `pupille`, quindi l'azione costa venti secondi e scrive
`{t: 20}` senza valore. La midriasi è un segno d'allarme, e non c'è
modo di vederla.

## La risposta

Non una riserva in più: **un asse**.

`allarme` è una funzione pura che somma tutto quello che il corpo ha da
temere — quanto sangue manca, quanto ossigeno manca, quanto zucchero
manca, quanto fa male — più un termine che il caso dichiara per quello
che viene **da fuori**: la cocaina in positivo, il vago in negativo.

Da quell'unico numero escono frequenza, pressione, cute e pupille. È il
capitolo 27 messo nel motore: gli stessi segni per cause diverse, e il
soccorritore che deve andare a cercare la causa invece di collezionare
segni.

## Decisioni prese

1. **Un asse solo, bidirezionale.** Non due riserve separate: sul mezzo
   quello che vedi è la risultante, e chiedere al caso due numeri invece
   di uno non aggiunge niente di insegnabile.
2. **Solo `tonoAutonomo` si dichiara.** Il resto dell'allarme si calcola
   da riserve che esistono già. Un caso non scrive «è tachicardico»: la
   tachicardia esce da quello che al paziente manca.
3. **L'asse non tocca tutto.** Frequenza, pressione, cute e pupille sì.
   **Refill e sete restano sulla perdita volemica**, perché misurano il
   volume e non l'allarme: un normovolemico vasocostretto riempie
   comunque in fretta, e la sete di Bolognin :6481 è sete da ipovolemia,
   non bocca secca da adrenalina.
4. **I pesi si scelgono per non muovere quello che c'è.** Il guadagno è
   tarato perché al 30% di perdita l'asse valga esattamente il numero di
   oggi. Dove un caso pubblicato si sposta, si sposta **di proposito** e
   sta scritto qui sotto.
5. **Il compenso bloccato blocca solo la tachicardia.** Un betabloccato
   può essere bradicardico: il blocco vale sul lato positivo dell'asse,
   non su quello negativo.
6. **Niente farmaci nuovi.** Sulla cocaina non ci sono antidoti da
   somministrare, e il volontario non ne dà comunque.

---

## 1. Architettura

Cinque pezzi. Tre sono generali, due sono il caso.

| Pezzo | Dove | Cosa fa |
|---|---|---|
| `allarme()` e la riserva `tonoAutonomo` | `core/fisiologia.js` | l'asse, e i parametri che ne escono |
| offesa `simpaticomimetico` | `data/offese.js` | tiene alto il tono autonomo, l'ambiente calmo lo abbassa |
| risposte a varianti | `core/anamnesi.js` | la stessa domanda rende diversamente se sei in disparte |
| azione `parla-in-disparte` | `data/azioni.js` | produce il tag che apre la variante |
| `cocaina-v3` e i tre retrofit | `data/casi.js` | il caso nuovo, e i casi che l'asse rimette a posto |

Nessun pezzo nuovo tocca il DOM. `intervento.js` cambia in un punto
solo: la tessera delle pupille.

---

## 2. L'allarme

In `core/fisiologia.js`, accanto a `perditaVolemica` e `faseCompenso`.

**La riserva nuova**, in `RISERVE_ADULTO`:

```js
tonoAutonomo: 0,   // quello che viene da fuori: cocaina +, vago −
```

**L'asse**, in due pezzi che servono a due cose diverse:

```
allarmeDaPerdita = perdita / SOGLIE_PERDITA.scompenso
                   // al 30% di perdita vale 1: è la soglia in cui il compenso cede

allarmeEsogeno   = max(0, 0.95 − ossigenazione) × 4      // ossigenazione 0,70 → 1
                 + max(0, (70 − glicemia) / 40)          // glicemia 30 → 1
                 + dolore / 10                           // dolore 10 → 1
                 + tonoAutonomo                          // dichiarato dal caso

allarme          = fra(allarmeDaPerdita + allarmeEsogeno, −1, 2)
```

Le quattro soglie di normalizzazione sono **assunzione nostra**: il
manuale dice che questi quattro fatti allarmano il corpo, non quanto
ciascuno pesi rispetto agli altri. La soglia della glicemia è la sola
ancorata: i 70 mg/dl sono la soglia di ipoglicemia delle ERC 2025
cap. 12 :1125, già usata in `ipoglicemia-v3`.

Il tetto a 2 non è arbitrario: **1 è il compenso che sta per cedere**, e
una scarica simpaticomimetica piena sta più in alto — è il motivo per
cui un trentenne che ha tirato ha una frequenza più alta di un uomo che
ha perso un litro e mezzo di sangue. Il pavimento a −1 è il vago pieno.

**Cosa ne esce:**

| Parametro | Da cosa | Nota |
|---|---|---|
| `fc` | `base.fc + 48 × allarme × contrattilita` | 48 è scelto perché `48 × (perdita/0.30) ≡ 160 × perdita`: **identico a oggi a ogni perdita** |
| `pas` | spinta di `25 × max(0, allarmeEsogeno)` | solo l'esogeno: il sostegno della vasocostrizione da ipovolemia è già dentro `tenuta`, contarlo due volte sarebbe un errore. `25 × 1` a dolore 10 è **identico a oggi** |
| `cute` | soglie su `|allarme|` | il valore assoluto perché il capitolo 28 mette «sudorazione, pallore, offuscamento visivo» fra i **prodromi vagali**: le due forze opposte danno la stessa cute. Le soglie 0,33 e 0,67 riproducono le attuali 10% e 20% di perdita |
| `pupille` | `allarme ≥ 0.8` → `'midriatiche'`, altrimenti `'normali'` | **campo nuovo**. Solo sul lato positivo: il vago non dà midriasi |
| `fr` | tachipnea quando `allarme ≥ 0.5` | la soglia è equivalente a quella di oggi (perdita 15% ≡ allarme 0,5), e il capitolo 27 mette il respiro «più profondo e frequente» fra i segni. Senza, `cocaina-v3` dovrebbe dichiarare `base.fr: 26` a mano |
| `refill`, `sete` | **invariati**, sulla perdita | misurano il volume, non l'allarme |
| `coscienza` | **invariata** | l'agitazione da sostanze non è un'alterazione dell'AVPU |

**Il lato negativo ha due volani, e non è un doppione.** Il vago
rallenta il cuore *e* allarga i vasi, e nel motore sono due riserve
diverse: `tonoAutonomo` per la frequenza e per la cute, `tonoVascolare`
per la pressione. `sincope-v3` le dichiara tutte e due perché il vago fa
tutte e due le cose. Non si sommano sulla stessa grandezza, quindi
niente si conta due volte — e la spinta pressoria dell'asse prende solo
il lato positivo (`max(0, allarmeEsogeno)`), così un tono negativo non
va mai a *sottrarre* pressione una seconda volta.

Col compenso bloccato (betabloccante, lesione mielica — Bolognin :6487)
la frequenza usa **solo la parte negativa** dell'asse:

```
fc = base.fc + 48 × min(0, allarme)
```

Oggi è `fc = base.fc` e basta. Per `shock-v3`, che ha l'asse positivo,
il risultato non cambia di un battito.

---

## 3. I casi già pubblicati

Il conto è dichiarato prima di scrivere il codice, e diventa test.

| Caso | Cosa succede | Perché va bene |
|---|---|---|
| `shock-v3` | **niente**, a nessun parametro | compenso bloccato, dolore 0, solo emorragia |
| `ictus-v3` | **niente** | allarme 0 su tutti i termini |
| `toracico-v3` | frequenza su di ~10, **cute pallida-fredda-sudata**, **respiro da 16 a 26** | ha dolore 7: il quadro classico dell'infarto è pallido, sudato e dispnoico (Bolognin :6481). Oggi ha cute normale e respiro tranquillo, ed è sbagliato |
| `incidente-v3` | frequenza su di ~5 | ha ipossia in corso. La lezione — sistolica che sale mentre sanguina, differenziale che si stringe — non cambia |
| `ipoglicemia-v3` | **tachicardico e sudato da solo** | Bolognin :4287. Il buco noto si chiude, e i passanti che dicono «è ubriaco» adesso hanno davanti un paziente che gli somiglia davvero |
| `sincope-v3` | la frequenza 58 finta **muore** | diventa `tonoAutonomo` negativo. La bradicardia e il pallore escono dal modello, e **un'assunzione nostra sparisce da CLAUDE.md** |

Per `sincope-v3` il ritocco è: base con la sua frequenza da riposo vera,
`tonoAutonomo` intorno a −0,35 — abbastanza negativo da portare la
frequenza sui 55-58 **e** da superare la soglia 0,33 della cute, che è
quello che il colpo d'occhio promette. Il numero esatto si calibra con
lo script, non a occhio. La seconda sincope da posizione seduta continua
a funzionare com'è: è ritorno venoso, e l'asse non la tocca.

---

## 4. L'offesa `simpaticomimetico`

In `data/offese.js`, sullo stampo delle sette che ci sono.

Non consuma: **tende a un bersaglio**. È il modo in cui si comporta una
sostanza in circolo, ed è anche l'unico modo per cui `tonoAutonomo` non
scappa verso l'infinito sommando delta a ogni secondo.

```js
simpaticomimetico: {
  fonte: 'ERC 2021 cap. 6 :3625 — emergenze ipertensive da cocaina e anfetamine',
  applica: (offesa, riserve, dt, tag) => {
    /* L'ambiente calmo è il trattamento vero: monitori, tieni bassa la
       voce, trasporti. Non c'è altro da dare. */
    const bersaglio = tag.includes('rassicurato') ? offesa.calmo : offesa.picco;
    return { tonoAutonomo: (bersaglio - riserve.tonoAutonomo) * (dt / offesa.costante) };
  },
},
```

`picco`, `calmo` e `costante` (in secondi) li dichiara il caso. Il
paziente arriva **già al picco**: il caso lo scrive nelle riserve, come
`gia` fa per l'emorragia.

Il freno è `rassicurato`, il tag che l'azione `rassicura` già produce. È
la gestione che dicono sia gli appunti — *«ambiente calmo, poche
persone, tono basso»* — sia le ERC 2021 cap. 6 :1271, che per le
emergenze ipertensive da agonisti adrenergici parlano di sedazione e
alfa-antagonisti puri: roba che sul mezzo non c'è, e che comunque non
è del volontario.

---

## 5. La domanda in disparte

Il capitolo 33 non dice *cosa* chiedere: dice **come**, e la differenza
è tutto il caso.

> *«Ascolta, perdonami la domanda. Non sono una guardia, a me non
> interessa. Ma per il tuo bene: hai fatto uso di qualcosa?»*
> Meglio **in disparte**, senza familiari o amici presenti.

Il motore sa già voltarti verso un'altra persona. Non sa che la stessa
persona risponde diversamente a seconda di **chi altro sta ascoltando**.

**La modifica**, piccola e retrocompatibile: una risposta del caso può
essere un **elenco di varianti** invece di un oggetto solo. Vince la
prima il cui `se(tag)` combacia; una senza `se` è il ripiego.

```js
evento: {
  paziente: [
    { se: (tag) => tag.includes('in-disparte'),
      t: '«…ho tirato. Un paio di volte. E avevo bevuto.»',
      qualita: 'buona', rivela: ['cocaina', 'alcol'] },
    { t: '«Eravamo a una festa. Non lo so, mi è partito il cuore.»',
      qualita: 'vaga' },
  ],
  amico: { t: '«Boh. Stavamo bevendo, tutto qui.»', qualita: 'vaga' },
},
```

`rispostaA` riceve in più i tag correnti; `sim-engine.chiedi` glieli
passa. `revisioneAnamnesi`, che oggi legge `risposte[domanda][chi].qualita`
per l'avviso «chi avrebbe risposto meglio», va insegnata a leggere anche
gli elenchi: per una variante conta la **migliore** qualità dichiarata.

**L'azione nuova**, in `comunicazione`:

```js
{
  id: 'parla-in-disparte', cat: 'comunicazione',
  label: 'Parla col paziente in disparte', durata: 40, chi: ['tu'],
  unaVolta: true,
  richiede: (p) => p.coscienza === 'A',
  motivoBloccato: 'Non è abbastanza presente per una conversazione riservata.',
  applica: () => ({ tag: 'in-disparte' }),
}
```

Il suo `spiega` porta la formula del manuale, che è la cosa che il
volontario deve imparare a memoria.

---

## 6. `cocaina-v3`

La fonte è il **caso 4** degli appunti (capitolo 32), preso di peso:
uomo di trent'anni, a casa con un amico, vigile e agitato, sudato,
tachipnoico, FC 150, PA 150/80, ECG normale ma tachicardico.

**Fisiologia.** Base da trentenne sano. Offese: `simpaticomimetico` al
picco, e `ischemia-miocardica` a intensità bassa — *«il dolore toracico
in questi casi è ischemico fino a prova contraria»*. Il tono autonomo
dichiarato sta intorno a 1,6, che è quello che serve per arrivare a 150
di frequenza e 150 di sistolica; il numero si calibra con lo script.

Attenzione al margine: 1,6 di tono più il dolore dell'ischemia arrivano
vicino al tetto di 2, e sopra il tetto la frequenza smette di
rispondere. In calibrazione va guardato **quanto resta di corsa** dopo
qualche minuto di dolore che sale, e se il margine non basta si abbassa
il picco invece di alzare il tetto: un asse che sfonda ovunque non
distingue più niente.

Cosa si vede: FC ~150, PA ~150/80, **midriasi**, cute pallida e sudata,
tachipnea, **SpO₂ 98**.

**La trappola** è del capitolo 33 e non è la droga:

> **Un paziente agitato va considerato IPOSSICO fino a prova contraria.**

Qui la saturazione è 98 e l'ipossia non c'entra — ma bisogna
**misurarla** prima di dirlo. Il monitor sta presto fra le necessarie, e
il debriefing lo dice: hai fatto la cosa giusta perché hai guardato, non
perché hai indovinato.

**La chiave** porta la diagnosi differenziale degli appunti: il quadro
opposto — bradipnea, miosi, coscienza depressa, cute fredda — orienta
agli **oppiacei**, e con la cocaina il quadro dipende dalla dose e dal
taglio, quindi non sempre è agitazione.

**L'evento** è il rifiuto del trasporto. *«Sto bene adesso, non voglio
andare in ospedale»*, e l'amico che spinge perché lo lascino stare. Gli
appunti sono espliciti: **trasporto sempre**, anche se sembra star bene,
perché il rischio cardiovascolare acuto è reale. Chi cede, in
debriefing, si sente dire quello che è successo al caso citato a
lezione: cocaina e alcol fanno cocaetilene nel fegato, più tossico e a
emivita più lunga, e quel paziente è arrivato in terapia intensiva con
FC 160 e pressione non rilevabile.

**Il ragguaglio dice «sospetto»**, mai un'affermazione: *«lo segnalate
come sospetto — mai un'affermazione»*. E le voci del ragguaglio
(`ragguaglioVoci`, da 1.10.0) rendono visibile che senza la domanda in
disparte quella riga non è tua.

**Cosa NON fa il caso:** nessun farmaco, nessun antidoto, nessun
betabloccante — che le ERC 2021 cap. 6 :3834 mettono esplicitamente
fuori dalla prima linea. Si monitora, si tiene calmo, si trasporta.

---

## 7. Il formato dei casi, cosa cambia

Due cose in più, tutte e due facoltative:

- `fisiologia.riserve.tonoAutonomo` — un numero. Chi non lo scrive ha 0,
  e non cambia niente;
- una risposta dell'anamnesi può essere un **elenco di varianti** invece
  di un oggetto. Chi scrive un oggetto continua a funzionare.

Nessuna migrazione. I sei casi pubblicati restano validi così come sono;
tre vengono ritoccati perché il modello adesso dice meglio di loro.

---

## 8. Collaudo

`allarme` è logica pura e si collauda con numeri, in
`tests/fisiologia.test.mjs`: i quattro termini uno per uno, il segno, i
tetti, e il compenso bloccato che ferma solo il lato positivo.

**I test di non-regressione sono scritti, non sperati.** In
`tests/casi.test.mjs` c'è un test che fissa i parametri d'arrivo di
`shock-v3` e `ictus-v3` al mmHg: se l'asse li muove, si rompe. Per i
tre casi che cambiano di proposito, i test vecchi si aggiornano ai
valori nuovi **dopo** averli guardati con lo script di calibrazione —
mai adattando il test al numero che esce.

`cocaina-v3` porta i suoi: arriva iperadrenergico e normossico, la
domanda in disparte rende e quella davanti all'amico no, l'ambiente
calmo abbassa davvero il tono, e chi lo lascia a casa lo trova nel
debriefing.

Poi il browser, a larghezza telefono: la tessera delle pupille, la
palette dell'anamnesi con l'azione nuova, il debriefing.

---

## 9. Fonti

Appunti dell'autore (`content/manuale.md`):

- **cap. 27** — la scarica adrenergica, i segni aspecifici, la tabella
  segno/perché, la sudorazione algida contro quella da sforzo;
- **cap. 28** — il nervo vago, la forza opposta: bradicardia,
  ipotensione, svuotamento, e i prodromi che sono gli stessi
  dell'adrenergico;
- **cap. 32, caso 4** — il trentenne con FC 150: quadro, ragionamento,
  gestione, diagnosi differenziale con gli oppiacei, cocaetilene;
- **cap. 33** — come si fa la domanda sulle sostanze, in disparte e
  senza scopo punitivo; l'agitato da considerare ipossico.

Manuale Bolognin TSSA 2022 (`tmp/testi/Manuale-TSSA-2022_cW6HYJE.txt`):

- **:3563** — frequenza cardiaca dell'adulto, 60-100;
- **:4287-4289** — coma ipoglicemico: cute umida e sudata, irritabilità,
  ostilità, «scambiato per un intossicato da alcolici»;
- **:6481** — i segni del compenso adrenergico nello shock;
- **:6487** — l'eccezione mielica: ipoteso senza tachicardia;
- **:6489** — refill capillare normale sotto i due secondi.

Linee guida ERC 2021 capitolo 6, traduzione IRC
(`tmp/testi/LG-ERC-2021_Capitolo-6_CircSpeciali.pdf.txt` — **è 2021**,
non 2025):

- **:1271** e **:3625** — emergenze ipertensive da agonisti adrenergici
  (cocaina, anfetamine): benzodiazepine, vasodilatatori, alfa-antagonisti
  puri;
- **:3834** — tabella delle droghe d'abuso: per la cocaina i
  betabloccanti **non** sono trattamento di prima linea.

ERC 2025 capitolo 12 **:1125** — la soglia dei 70 mg/dl.

## 10. Le assunzioni nostre, da marcare nel codice

- **i quattro pesi dell'allarme esogeno** — ipossia ×4, ipoglicemia su
  40 mg/dl, dolore su 10, tono autonomo diretto. Il manuale dice che
  questi fatti allarmano, non quanto ciascuno pesi;
- **il guadagno 48 sulla frequenza e 25 sulla pressione** — scelti per
  riprodurre esattamente i numeri di oggi, non trovati in una fonte;
- **le soglie 1/3 e 2/3 della cute**, **0,5 della tachipnea** e **1,2 della midriasi** — le prime tre scelte per riprodurre esattamente le soglie di perdita di oggi (10%, 20%, 15%), la midriasi messa **oltre l'1,0**, cioè oltre il compenso pieno, perché se comparisse a ogni dolore forte smetterebbe di essere un indizio;
- **il tetto a 2 e il pavimento a −1** dell'asse;
- **`picco`, `calmo` e `costante`** del simpaticomimetico: nessuna fonte
  dà una curva della cocaina in circolo, e il tempo di scena non arriva
  a mostrarla.

## 11. Fuori perimetro

- **La farmacocinetica del cocaetilene.** Il metabolita sta nella
  spiegazione del debriefing, non nel motore: su venti minuti di scena
  non si vede, e modellarlo insegnerebbe un dettaglio invece di un
  comportamento.
- **La miosi e gli oppiacei.** Il campo `pupille` nasce con due valori.
  Il quadro opposto è un altro caso — e c'è già `inf-naloxone` in
  catalogo che aspetta.
- **Due riserve separate**, simpatico e vagale. Sono davvero due sistemi
  e possono coesistere, ma sul mezzo si vede la risultante.
- **La bocca secca** come tessera a sé. La sete che c'è è quella da
  ipovolemia di Bolognin :6481: sovrapporci la xerostomia adrenergica
  farebbe leggere una cosa per un'altra.
- **`anafilassi-v3` e `anticoagulante-v3`**, che sono la seconda metà
  del gruppo A e avranno la loro specifica. L'anafilassi vuole
  un'offesa nuova — l'edema delle vie aeree — e ha già pronta la sua
  lezione più forte: le ERC 2021 cap. 6 :2392 raccontano che, su 214
  morti per anafilassi riviste nel Regno Unito, il collasso arrivava
  quando l'ipoteso veniva messo seduto o in piedi.
