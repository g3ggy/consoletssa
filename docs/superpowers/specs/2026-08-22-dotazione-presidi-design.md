# La dotazione — i presidi veri e le loro misure

Disegno del pezzo **A2**, 22 agosto 2026. Segue *Il giudizio clinico*
(1.12.0), che aveva lasciato questo esplicitamente fuori:

> I presidi veri dello zaino e dell'ambulanza. Sono il pezzo successivo.
> Un presidio sbagliato è un caso particolare di azione non indicata,
> quindi eredita questo meccanismo senza aggiungerci niente.

Questa specifica prende quella frase alla lettera. Il motore non cambia.

---

## Il problema

Nella palette c'è scritto «Cannula orofaringea». Sul mezzo non esiste la
cannula orofaringea: esistono sei cannule, ognuna con un numero e un
colore, e infilare la 5 arancione a una donna minuta le spinge la lingua
in gola invece di toglierla. Lo stesso vale per il sondino di
aspirazione, per l'ago cannula che prepari all'infermiere, per la
maschera dell'ossigeno.

Il banco insegna *quando* fare un gesto e *quanto costa* farlo per
niente. Non insegna ancora **quale pezzo prendere in mano**, che è la
domanda che il volontario si trova davanti allo zaino aperto, di notte,
con qualcuno per terra.

C'è una seconda cosa che oggi non si vede. L'ossigeno ha tre voci con il
flusso scritto nell'etichetta — «12-15 l/min» — e quel numero non ha
nessuna conseguenza: la bombola non si svuota mai. Un flusso senza un
prezzo non è una scelta.

---

## La risposta: una misura è un'azione vera

`cannula-3` è un'azione come `collare` o `misura-glicemia`. Ha il suo id,
la sua durata, il suo diario, la sua indicazione con la sua fonte.

Questo è tutto il disegno. Ne discende che:

- il motore non cambia di una riga — `necessarie`, `azioniDisponibili`,
  `fatte`, `haFatto`, la pagella e `giudizio.js` lavorano sugli id come
  hanno sempre fatto;
- **il presidio sbagliato è già un'azione non indicata**, e paga il
  prezzo che il pezzo precedente ha stabilito per il superfluo: i suoi
  secondi, accanto alle finestre mancate;
- una misura senza regola scritta non esiste. `indicazioni.js` è il posto
  dove la regola vive, e ogni voce nuova ne porta una con la fonte.

L'alternativa era tenere l'azione unica e appenderle sotto un elenco di
varianti, con id composti tipo `cannula:3` da far attraversare motore,
casi, pagella e test. Costava cinque punti di modifica al motore per non
guadagnare niente: il catalogo piatto era già la struttura giusta.

---

## Dove vive: `data/presidi.js`

File nuovo. Contiene le **famiglie** e i generatori che ne producono le
voci. Le sei Guedel nascono da una funzione, non da sei blocchi
copiaincollati:

```js
{
  famiglia: 'guedel',
  cat: 'A',
  label: 'Cannula orofaringea',
  comeSiMisura: 'Dagli incisivi all\'angolo della mandibola, o dal lobo '
    + 'dell\'orecchio all\'angolo della bocca.',
  fonteMisura: 'Bolognin :5428, :5938',
  misure: [
    { n: 0, colore: 'nero',     etichetta: 'mis. 0 — nero' },
    /* … */
  ],
}
```

`azioni.js` importa le voci generate e le sparge nel suo `ELENCO`:
resta il catalogo unico che è sempre stato, e sta sotto le 600 righe.
`presidi.js` sta sotto le 300.

I campi che una voce generata porta oltre ai soliti:

- `famiglia` — l'id della famiglia, che serve alla palette per
  raggrupparle;
- `misura` — il numero o il calibro, per il diario e per il debriefing;
- `flusso` — solo per l'ossigeno: i litri al minuto, che alimentano il
  conto della bombola.

---

## Come si sceglie, sul telefono

La palette mostra **il capofamiglia**, una riga sola: «Cannula
orofaringea — 6 misure». Toccandola si apre la carta delle misure, che è
la stessa carta già scritta per la decisione dell'evento: in cima il
promemoria di come si misura, con la fonte; sotto i bottoni, ognuno col
colore vero del presidio.

Aprire la carta **non costa tempo**, e nemmeno chiuderla. È il criterio
già stabilito per il sospetto: guardare non è un gesto, e il banco non
punisce chi si ferma a pensare. Il cronometro parte quando scegli.

Sul telefono questo tiene la categoria A a sei righe invece di quindici,
che è la ragione per cui non si è scelto il catalogo tutto steso.

---

## Le quattro famiglie

### Guedel — sei misure, e una mappa che è nostra

Il manuale dà la **misurazione**, non la tabella. Due riferimenti, tutti
e due suoi: la distanza fra gli incisivi e l'angolo della mandibola
(`:5428`), oppure fra il lobo dell'orecchio e l'angolo della bocca
(`:5938`). Non dice da nessuna parte che l'adulto medio porti la 3.

Quindi il caso dichiara `corporatura` — `'minuta' | 'media' | 'robusta'`
— e la mappa corporatura → misura è **assunzione nostra**, marcata nel
codice come tutte le altre:

| corporatura | misura | colore |
|---|---|---|
| minuta | 2 | verde |
| media | 3 | giallo |
| robusta | 4 | rosso |

Le 0 e 1 (nero, bianco) sono pediatriche, la 5 arancione è il collo
grosso. Restano nel catalogo perché stanno nello zaino: sceglierle su un
adulto medio è l'errore che il banco deve poter mostrare.

I casi che non dichiarano niente valgono `'media'`. I sette casi
esistenti non si toccano.

I colori vengono dalla check-list ARES 118, allegato 1 (`IO.42 Rev.1`),
che elenca le Guedel dalla 0 nera alla 5 arancione. È una fonte nuova per
il progetto e va aggiunta a `tmp/testi/FONTI.md`: il PDF non ha testo —
è una scansione da telefono — e `pdftotext` restituisce tre byte. Si
legge a schermo, come si è fatto qui.

### Ossigeno — cinque presidi, e il flusso che adesso pesa

Oggi ce ne sono tre. La check-list ne ha di più, e il manuale li descrive
tutti:

| voce | flusso | cosa dice la fonte |
|---|---|---|
| occhialini | 2-4 l/min | mai oltre 4, si secca il naso; danno il 36% — «pazienti generalmente non compromessi» `:3251` |
| maschera semplice | 6-8 l/min | 35-60%; **mai sotto i 4**, o non c'è ricambio e si accumula anidride carbonica `:3257` |
| Venturi | secondo l'ugello | «indispensabile» nel BPCO, che con alte concentrazioni ipoventila `:3264-3270` |
| reservoir (BLB) | 12-15 l/min | sopra i 12 l/min eroga il 100% `:3261`; nel trauma 12-15 da regolare per stare fra 94 e 98 `:6425` |
| con nebulizzatore | 6-8 l/min | il presidio del farmaco inalato: lo monti tu, la fiala è dell'infermiere |

Gli id vecchi — `o2-occhialini`, `o2-maschera`, `o2-reservoir` — restano
quelli che sono: sono già presidi distinti, e i casi li citano.
`o2-venturi` e `o2-nebulizzatore` sono nuovi. Le loro indicazioni si
scrivono accanto alle tre che ci sono già.

La check-list li chiama con i nomi veri del magazzino — «Maschera O2 BLB
Adulti», «Maschera O2 Venturi», «Maschera O2 con nebulizzatore mis.
adulti» — e l'etichetta della palette porta il nome del manuale con
quello del magazzino accanto, perché sono la stessa cosa e sullo zaino
c'è scritto il secondo.

### Sondino di aspirazione — quattro calibri

Il manuale dà la regola in due pezzi: «scegliere il sondino di calibro
adeguato alle secrezioni presenti ed alla corporatura della persona», e
la lunghezza utile «non maggiore della distanza tra il lobo
dell'orecchio e l'angolo della mandibola» (`:2852-2854`). Più la cautela
che vale già oggi: mai più di dieci secondi di seguito, e sul cosciente
il sondino spinto in fondo fa vomitare (`:2858-2862`).

Il CH è sulla check-list: 6, 10, 16, 18. Che 16 e 18 siano gli adulti e
6 e 10 i pediatrici è **assunzione nostra**: il manuale dice «adeguato»
e non dà numeri.

`aspira` diventa quindi una famiglia. La sua indicazione attuale — si
aspira quando c'è qualcosa da togliere — resta e vale per tutte e
quattro le voci; sopra ci si aggiunge il calibro.

### Ago cannula — quattro calibri, per l'infermiere

Il calibro lo prepari tu, buca lui. Il manuale elenca numeri e colori,
che sono universali: 14 arancione, 16 grigio, 18 verde, 20 rosa, e i
pediatrici 22 blu e 24 giallo (`:10448`). E dice la cosa che serve a
scegliere: dal calibro più grosso, «che lascia passare cioè un flusso
maggiore di liquido al minuto», al più piccolo.

Da lì la regola: dove serve **volume** — emorragia, trauma, shock — si
prepara grosso, 14 o 16. Sul medico stabile bastano 18 o 20. I due
pediatrici restano fuori dal catalogo: nessun caso è pediatrico, e una
voce che non si può mai usare è rumore nella palette.

`accesso-prepara` diventa la famiglia. `inf-accesso` continua a
richiedere che il materiale sia pronto, qualunque calibro sia: chi
prepara il 20 in un emorragico ha comunque preparato, e paga
l'indicazione, non il blocco. È la distinzione fra `richiede` e
`indicazione` che il progetto ha già pagato una volta.

### Il collare resta com'è

Il manuale non numera le misure. Dà il metodo — la distanza fra il bordo
inferiore del mento e la spalla, misurata a dita e riportata sul bottone
laterale del presidio (`:8778-8810`) — e dice che esistono sia i modelli
in più misure sia quelli universali regolabili.

Mettere dei numeri sarebbe inventarli. Il metodo di misurazione va nel
`spiega` dell'azione, dove il volontario lo legge; la scelta non si
sdoppia.

---

## Gli id che cambiano, e chi li nomina

Tre azioni diventano famiglie e i loro id spariscono. Vale la pena
elencare chi li cita oggi, perché è tutto il lavoro di raccordo che
questo pezzo comporta:

| oggi | domani | chi lo nomina |
|---|---|---|
| `cannula` | `cannula-0` … `cannula-5` | nessuno fuori da `azioni.js` |
| `aspira` | `sondino-6`, `sondino-10`, `sondino-16`, `sondino-18` | l'indicazione `aspira` in `indicazioni.js`, che si riscrive per calibro |
| `accesso-prepara` | `ago-14`, `ago-16`, `ago-18`, `ago-20` | `casi.js` in tre punti (:176 fra le necessarie, :370 e :698 fra le utili) e `inf-accesso.richiede` (:474) |

`presidi.js` esporta anche gli elenchi degli id per famiglia, e i casi li
usano invece di riscriverli:

```js
utili: [...IDS.ago, 'rassicura', 'allerta-co', /* … */]
necessarie: [{ id: ['ago-14', 'ago-16'], entro: 420, peso: 1 }]
```

La seconda riga è la lezione dello shock: lì il calibro grosso non è una
preferenza, è il motivo per cui si mette un accesso. Un 20 rosa prepara
comunque — `inf-accesso` non si blocca — ma non chiude la voce
necessaria e paga i suoi secondi.

`inf-accesso.richiede` si riscrive senza toccare il motore:

```js
richiede: (p, ctx) => IDS.ago.some((id) => ctx.haFatto(id)),
```

`aspiratore-prepara` resta com'è: prepari la macchina, poi scegli il
sondino da attaccarci.

In `tests/azioni.test.mjs` c'è una mappa che classifica le azioni
dell'ossigeno per effetto: va estesa alle due voci nuove.

## Il vincolo del conoscibile, di nuovo

La regola del pezzo precedente vale identica: il predicato di
un'indicazione riceve solo quello che il soccorritore **sa in
quell'istante**.

La corporatura è conoscibile: si vede a colpo d'occhio, prima ancora di
toccare il paziente. Entra quindi nel contesto come `c.caso.corporatura`
insieme a `c.caso.tipo`, non fra le riserve nascoste.

Il resto non cambia: `pas` come numero e non la stringa `letture.pa`, e
niente stato vero del paziente dentro i predicati.

---

## Il giudizio: la misura sbagliata costa due volte

Se il caso dichiara `necessarie: [{ id: 'cannula-3' }]` e tu metti la 5:

1. la voce necessaria resta **mancata** — il punto si perde;
2. la 5 è **non indicata** — paghi i suoi venticinque secondi, e
   compaiono nel tempo buttato accanto alle finestre che hai mancato.

Sembra severo ed è giusto: una cannula lunga non è mezzo gesto, è un
gesto contrario. La spinge, la lingua, invece di tenerla.

Dove le misure lecite sono più d'una, il caso lo dice con la forma che il
motore ha già — `{ id: ['sondino-16', 'sondino-18'], … }` — che è la
stessa usata oggi per l'ossigeno alla riga 688 di `casi.js`.

---

## La bombola che si svuota

Il flusso conta solo se qualcosa lo paga.

Il motore tiene `bombola: { litri, flusso }`, aggiornata creando
l'oggetto nuovo come tutto il resto. Ogni voce dell'ossigeno dichiara il
suo `flusso`; metterne una nuova sostituisce la precedente, non si somma.

Il conto è la formula del manuale (`:3372-3395`):

- contenuto = volume della bombola × atmosfere del manometro. Una
  portatile da 2 litri a 200 bar sono **400 litri**;
- autonomia in minuti = litri disponibili ÷ flusso erogato. A 15 l/min,
  ventisei minuti.

Su uno scenario da quindici minuti una bombola piena non finisce, e va
bene: il numero serve nel **debriefing**, che dice quanto hai erogato,
quanto ne resta e per quanti minuti di trasporto basta.

Diventa vero quando un caso dichiara la bombola **già scarica** —
`bombola: { litri: 2, bar: 50 }`, cioè cento litri — che è la trappola
del controllo mezzo non fatto. Lì si esaurisce davvero: il diario lo
dice, il tag dell'ossigeno cade, la saturazione torna dov'era.

Nessuno dei sette casi la dichiara scarica. La meccanica c'è e si accende
quando un caso la vorrà: è lo stesso criterio con cui il motore ha già
`peggioraDaSolo`.

---

## Quello che si vede

- **La palette**: il capofamiglia con quante misure ha.
- **La carta delle misure**: il promemoria di come si misura con la
  fonte, e i bottoni col colore del presidio. Gratis in tempo.
- **Il diario**: la misura scritta per esteso — «Cannula orofaringea
  mis. 3 gialla posizionata», «Ago cannula 16 grigio pronto sul telino».
- **Il debriefing**: le misure sbagliate compaiono nel tempo buttato che
  già c'è, con il perché e la fonte. Più un riquadro nuovo per la
  bombola, quando l'ossigeno è stato erogato.

---

## Come si collauda

`node --test tests/*.test.mjs`, come sempre, e solo logica pura.

1. **Ogni voce generata ha la sua indicazione.** Una misura senza regola
   è una misura che il banco approva in silenzio: sarebbe il difetto
   peggiore possibile, perché invisibile. Il test lo impedisce.
2. **Il generatore produce quello che deve** — id, colori e calibri
   attesi per le quattro famiglie, e nessun id duplicato nel catalogo.
3. **Il conto della bombola** contro l'esempio del manuale: 2 litri a
   200 bar fanno 400 litri; a 15 l/min fanno 26 minuti.
4. **Il test che ripaga, già scritto**: «quello che un caso chiede, il
   giudizio lo approva», in `tests/casi.test.mjs`. Adesso copre anche le
   misure: se un caso pretende `cannula-3` su un paziente robusto, uno
   dei due è sbagliato e si scopre prima che lo impari un volontario.
5. **A mano, sul telefono**: la carta delle misure a larghezza stretta,
   e le etichette lunghe («Maschera O2 con nebulizzatore») contro
   `data-lungo`, che è la trappola già pagata delle tessere.

---

## Cosa questo disegno NON fa, di proposito

- **L'inventario sfogliabile.** Era in questo pezzo nella tabella di
  marcia, ed esce: il cuore funziona senza, e trascrivere centocinquanta
  voci da una scansione è lavoro di trascrizione da verificare riga per
  riga. Va col pezzo della **scheda ARES**, che pesca dalla stessa
  check-list.
- **Il controllo mezzo a tempo** con le mancanze nascoste da scoprire.
- **Il pediatrico.** Nessun caso lo è. Le Guedel 0 e 1 restano nel
  catalogo perché stanno nello zaino ed è giusto poterle sbagliare; gli
  aghi 22 e 24 no, perché nessuno li preparerebbe mai.
- **Le misure del collare**, che il manuale non dà.
- **I farmaci del box termico come azioni.** Sono dell'infermiere: li
  chiedi, non li scegli.
- **Un'indicazione per ogni azione del catalogo.** Vale la regola di
  1.12.0: si scrive dove la regola esiste, il resto resta lecito.

---

## Le assunzioni nostre, da marcare nel codice

- **La mappa corporatura → misura della Guedel** (2 minuta, 3 media, 4
  robusta). Il manuale dà la misurazione anatomica, non la tabella.
- **Il CH del sondino per l'adulto** (16 e 18). Il manuale dice
  «adeguato alle secrezioni e alla corporatura» e non dà numeri.
- **La soglia del calibro dell'ago** fra il grosso e il sottile: che
  emorragia, trauma e shock vogliano 14-16 discende dal fatto, quello sì
  del manuale, che il calibro grosso lasci passare più flusso.
- **I flussi del Venturi e del nebulizzatore**: il Venturi dipende
  dall'ugello e il manuale non dà un numero unico.
- **Che la bombola predefinita sia una portatile da 2 litri a 200 bar.**
  La check-list dice quante bombole ci sono, non che capacità hanno.
