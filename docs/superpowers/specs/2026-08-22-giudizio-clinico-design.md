# Il giudizio clinico — disegno

Quando un gesto è indicato, quanto costa farne uno che non serve, e cosa
pensi di avere davanti.

Primo dei due pezzi che rendono la simulazione una cosa in cui si sceglie.
Il secondo — la dotazione vera dello zaino e dell'ambulanza — eredita da
qui il meccanismo e avrà la sua specifica.

---

## Il problema

Il motore a tempo sa dire due cose di un'azione: che era **necessaria**
(sta in `azioni.necessarie` del caso, con un peso e una finestra) o che era
**dannosa** (sta in `azioni.dannose`, con una penalità). Tutto il resto è
gratis.

Il risultato è che conviene fare tutto. Chi misura la glicemia a un
infartuato vigile, chi mette il collare a un uomo seduto sul divano di casa
sua, chi esegue un ECG a dodici derivazioni su una sincope già risolta non
perde nulla che si veda: non è una voce della pagella, non compare nel
debriefing, e il punteggio finale è identico a quello di chi ha fatto
solo il necessario.

C'è già un costo, ma è invisibile e debole: quelle azioni occupano la
squadra, e chi ne fa troppe arriva tardi sulle finestre. Nessuno però
gli dice mai che il ritardo veniva da lì, né tantomeno **perché** quel
gesto non serviva.

Il secondo buco è più grande. In venti minuti di simulazione al
soccorritore non viene mai chiesto **cosa pensa di avere davanti**. Il
debriefing gli regala la `chiave` bell'e pronta alla fine, quando ormai
non decide più niente. Un banco che vuole insegnare a riconoscere le
situazioni non può non fare mai quella domanda.

## La risposta

Tre cose, in un pezzo solo perché sono la stessa cosa vista da tre lati.

**Ogni azione può dichiarare quando è indicata**, con la fonte del
manuale accanto. Il motore confronta il predicato con quello che il
soccorritore sa in quel momento e decide se il gesto ci stava.

**Il gesto che non ci stava costa il suo tempo, e il tempo si vede.** Non
si tolgono punti: in servizio nessuno te ne toglie, perdi minuti e basta.
Il debriefing somma quei minuti e li mette accanto alle finestre che hai
mancato.

**Il sospetto si dichiara.** Il banco lo chiede una volta dopo il colpo
d'occhio, e da lì in poi lo cambi quando vuoi. Alla fine sa da dove sei
partito, dove sei arrivato, e a che minuto hai azzeccato la prima volta.

---

## Il vincolo: solo quello che puoi sapere

È la scelta che decide se tutto il meccanismo è credibile o è un
imbroglio.

Se `misura-glicemia` fosse «indicata quando la glicemia sta sotto 70»,
il predicato leggerebbe un numero che il soccorritore ottiene **facendo
proprio quel gesto**. Circolare: il banco ti direbbe che dovevi
misurarla solo dopo che l'hai misurata, e ti direbbe che non dovevi
proprio nei casi in cui era doveroso escluderla.

Quindi il predicato non riceve mai lo stato del paziente. Riceve un
**contesto di conoscibile**, costruito dal motore con quello che il
soccorritore ha davvero in mano in quell'istante:

| campo | cos'è |
|---|---|
| `coscienza` | A/V/P/U — si vede senza strumenti |
| `letture` | solo i parametri già misurati: `{ glicemia: 55, pa: '128/78' }` |
| `saputo` | le chiavi scoperte con l'anamnesi: `{ diabetico: true }` |
| `tag` | cosa è già stato fatto |
| `caso` | `{ tipo: 'medico' \| 'trauma', dinamica: bool }` |
| `t` | i secondi trascorsi |

L'ossigeno diventa allora onesto in tutte e due le direzioni: *indicato
se la saturazione che hai in mano sta sotto 94, oppure se il paziente
respira male e la saturazione non l'hai ancora presa*. Chi lo mette a un
uomo che parla a frasi complete con 98 di saturazione letta sta facendo
un gesto che non serve, e il banco può dirglielo senza barare.

**Il sospetto dichiarato non entra nel contesto**, di proposito: se
dichiarare «C08 metabolica» rendesse indicata la glicemia, basterebbe
dichiarare il falso per giustificare qualunque gesto. Le due cose si
valutano separate.

---

## Dove vive la conoscenza

File nuovo `data/indicazioni.js`, separato da `azioni.js` come `offese.js`
è separato dai casi. `azioni.js` dice **come si fa** un gesto — durata,
chi lo può fare, cosa scrive nel diario. `indicazioni.js` dice **quando si
fa**, ed è materiale clinico con la fonte accanto:

```js
'misura-glicemia': {
  quando: (c) => c.coscienza !== 'A'
    || c.saputo.diabetico
    || c.saputo['sospetto-ipoglicemia'],
  perche: 'Si misura a chi ha la coscienza alterata, a un diabetico noto '
    + 'o se sospetti un\'ipoglicemia. A un paziente vigile e orientato, '
    + 'senza niente che punti da quella parte, il numero non cambia '
    + 'quello che fai.',
  fonte: 'ERC 2025 cap. 12 :1125',
},
```

### Un'azione senza indicazione è sempre lecita

È il principio che tiene il lavoro sostenibile. Indossare i DPI, valutare
la scena, fare l'AVPU, rassicurare, chiamare la centrale non si giudicano
mai: non hanno una controindicazione e non c'è niente da insegnare.

Si scrive un'indicazione **solo dove il manuale ha una regola vera**. Si
parte da una ventina di azioni — quelle su cui si sbaglia davvero — e si
cresce nei cicli seguenti senza che nulla si rompa nel frattempo: il
motore tratta l'assenza di indicazione come «va sempre bene».

### Le venti di partenza

Scelte perché su ognuna esiste una regola scritta e un errore che si vede
sul mezzo. Le soglie e le fonti si verificano su `tmp/testi/FONTI.md` in
fase di realizzazione: quelle qui sotto sono il perimetro, non i valori
definitivi.

- **`misura-glicemia`** — coscienza alterata, diabetico noto, sospetta
  ipoglicemia
- **`o2-occhialini` / `o2-maschera` / `o2-reservoir`** — la saturazione
  letta, o la difficoltà respiratoria vista; e il flusso giusto per il
  presidio giusto
- **`collare` / `spinale` / `ked` / `materassino`** — trauma o dinamica
  compatibile; su un medico senza trauma sono minuti buttati e un
  paziente immobilizzato per niente
- **`ecg-elettrodi` / `ecg-esegui`** — dolore toracico, sospetto
  cardiologico, aritmia sul monitor
- **`esame-neurologico`** — deficit riferito o sospetto neurologico
- **`misura-temp`** — sospetto infettivo, ipotermia, colpo di calore
- **`chiedi-sete` / `refill`** — sospetto di ipovolemia: sono i segni del
  compenso, e cercarli su chi non ha perso niente non insegna nulla
- **`esposizione`** — trauma o necessità di vedere; su un anziano al
  freddo, se non serve, è un danno
- **`zucchero-os`** — glicemia bassa **letta** e coscienza A
- **`autoiniettore`** — sospetto anafilattico
- **`laccio` / `compressione`** — emorragia esterna
- **`aspira`** — secrezioni o vomito nelle vie aeree
- **`dae-piastre`** — assenza di coscienza e di respiro

---

## Il giudizio, e quando si dà

Modulo nuovo `core/giudizio.js`, logica pura come `fisiologia.js` e
`anamnesi.js`: nessun DOM, nessun orologio, collaudabile con
`node --test`.

```js
/** Il gesto ci stava, con quello che sapevi in quel momento. */
export function indicata(idAzione, contesto)   // → { ok, perche, fonte }

/** I secondi buttati e su cosa. */
export function tempoButtato(fatte, catalogo)  // → { secondi, voci }
```

### Si giudica nell'istante in cui si esegue

Non alla fine, ed è una scelta di sostanza. Misurare la glicemia **prima**
di sapere che è diabetico è un gesto diverso dal farlo dopo: nel primo
caso stai sparando nel mucchio, nel secondo stai seguendo un'informazione.
Giudicare tutto alla fine, col contesto finale, premierebbe il primo per
merito del secondo.

Quindi `sim-engine.js` valuta al momento dell'esecuzione e lo registra:

```js
fatte = [...fatte, { id, chi, t, indicata: false, perche: '…' }]
```

Il campo in più non rompe niente: la pagella oggi legge `fatte` per
`id` e `t`, e continua a farlo.

### Il costo

La somma delle `durata` delle azioni non indicate. Il debriefing la mette
davanti insieme al confronto che la rende concreta: quali finestre hai
mancato, e se senza quei secondi ci saresti stato dentro.

---

## Il sospetto

`data/classi-patologia.js` — le classi della scheda ARES 118, che sono
**diciassette**: da C01 a C15, poi C19 «altra patologia» e C20 «patologia
non identificata». Il modulo salta C16, C17 e C18, e le saltiamo anche
noi: la scheda vera è quella e va imparata com'è.

Ogni caso dichiara la sua:

```js
classe: 'C07',                       // Tossicologica, per cocaina-v3
classeAnche: ['C02'],                // difendibile, conta giusta
sospettiPlausibili: ['C02', 'C03', 'C07', 'C08'],
```

`classeAnche` serve dove più d'una regge davvero: la sincope è
difendibile come C02 cardiocircolatoria e come C04 neurologica, e un
banco che ne bocciasse una insegnerebbe una cosa falsa.

### I due momenti

**La prima impressione** arriva subito dopo il colpo d'occhio, una volta
sola, e il banco si ferma ad aspettarla. Non mostra tutte e diciassette le
classi — su un telefono sono illeggibili — ma le quattro o sei che il caso
dichiara plausibili, più «non lo so» che è sempre in fondo ed è una
risposta legittima: a volte è la sola onesta.

Se il caso non dichiara `sospettiPlausibili`, il banco non chiede niente e
si va avanti. Nessun caso è obbligato a partecipare.

**Il riquadro** vive da lì in poi: una riga sotto la squadra con la classe
corrente e il minuto in cui l'hai dichiarata. Si tocca e si cambia, e lì
l'elenco è completo, raggruppato per apparato. Nessuno ti ferma più.

Il riquadro compare **solo se il caso dichiara `classe`**: senza una
risposta giusta non c'è niente da valutare, e un campo che non viene mai
corretto è peggio che assente. Un caso può quindi dichiarare `classe`
senza `sospettiPlausibili` — riquadro sì, prima impressione no — mentre
il contrario non ha senso e il collaudo lo rifiuta.

In **modalità esame** il riquadro resta e la prima impressione pure: sono
domande, non risposte. Quello che sparisce è il commento del debriefing
finché non chiudi, come per tutto il resto.

Il motore tiene lo storico:

```js
sospetti: [{ codice: 'C08', t: 40 }, { codice: 'C07', t: 260 }]
```

### Cosa ne dice il debriefing

Tre cose, e nessuna è un punteggio:

- da dove sei partito e dove sei arrivato;
- **a che minuto hai azzeccato la prima volta** — la misura vera del
  riconoscimento, e l'unica che distingue chi ha capito da chi ha
  indovinato alla fine;
- quante volte hai cambiato: rigidità da una parte, incertezza
  dall'altra, e le due si commentano diversamente.

Chi non ha mai azzeccato se lo sente dire con la classe giusta accanto.

---

## Quello che si vede

Nessuna pagina nuova. Tre innesti su quello che c'è.

**Nel diario**, subito sotto la riga dell'azione, la riga ambra con la
ragione secca e i secondi:

```
 1:20  › Misuri la glicemia.
        → 88 mg/dl
 ⚠     Non era indicata: è vigile e orientato.        40s persi
```

In **modalità esame** — che esiste già e che già nasconde le spiegazioni
delle decisioni — il diario tace, e tutto arriva alla fine.

**Il riquadro del sospetto**: una riga nella colonna del monitor, sotto la
squadra.

**Nel debriefing**, due sezioni: «quello che non serviva» col tempo
sommato e il confronto con le finestre, e «il sospetto» con la storia
delle ipotesi.

### Il debriefing esce da `intervento.js`

`modules/intervento.js` è a **852 righe**, già sopra il massimo di 800 che
il progetto si è dato, e queste tre aggiunte lo peggiorano.

Il debriefing è la metà che si stacca meglio: è una vista sola, si disegna
una volta a fine partita, non condivide stato con la simulazione in corso
e legge soltanto l'oggetto che `chiudi()` restituisce. Esce in
`modules/debriefing.js` **prima** che gli si aggiunga sopra qualcosa,
non dopo.

---

## Come si collauda

`tests/giudizio.test.mjs` nuovo, logica pura: il predicato con contesti
diversi, il conto dei secondi, il caso dell'azione senza indicazione che
resta sempre lecita, il contesto vuoto che non fa esplodere niente.

Due test che vale la pena avere altrove:

**La coerenza fra le necessarie e le indicazioni.** Ogni azione che un
caso dichiara `necessaria` deve risultare indicata nel contesto di quel
caso. Se un caso pretende un gesto che il giudizio considera superfluo,
uno dei due è sbagliato, e il collaudo lo dice subito invece di lasciarlo
scoprire a un volontario che si fida.

**Ogni `classe` dichiarata esiste davvero**, e chi dichiara
`sospettiPlausibili` dichiara anche `classe`. Un refuso su `C21` non deve
arrivare in produzione come una casella che non si accende, e una prima
impressione senza risposta giusta è una domanda a cui il banco non sa
rispondere.

---

## Cosa questo disegno NON fa, di proposito

- **I presidi veri dello zaino e dell'ambulanza.** Sono il pezzo
  successivo. Un presidio sbagliato è un caso particolare di azione non
  indicata, quindi eredita questo meccanismo senza aggiungerci niente.
- **Le misure dei presidi** — Guedel, collare, aghi. Stesso pezzo.
- **Il sospetto che influenza il giudizio delle azioni.** Barabile.
- **Togliere punti per il superfluo.** Il costo è il tempo.
- **Un'indicazione per tutte e sessantacinque le azioni.** Se ne scrivono
  venti, dove la regola esiste.
- **La scheda ARES.** Terzo pezzo, specifica sua. Le diciassette classi
  nascono qui e serviranno lì: è il campo «Classe di patologia» del
  modulo.

## Le assunzioni nostre, da marcare nel codice

- **quali venti azioni** meritano un'indicazione, e quali restano sempre
  lecite;
- **le soglie dentro i predicati** dove il manuale dà un'indicazione
  qualitativa e non un numero;
- **il fatto che il tempo buttato non tolga punti**: è una scelta
  didattica, non una regola clinica.
