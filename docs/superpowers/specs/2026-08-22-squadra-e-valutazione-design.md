# Chi fa cosa, e come si valuta — disegno

22 agosto 2026. Nasce da un giro di prova dell'autore sul mezzo, non da
un'idea a tavolino: sei osservazioni, di cui due mettono in discussione
l'impianto del motore a tempo.

---

## Il problema

Il motore modella tre cose in modo che non regge alla prova dei fatti.

**«Chi fa cosa» dice il falso.** Un'azione dichiara `chi: ['tu', 'autista']`,
e chi legge il codice capisce «la fanno in due». Non è così: vuol dire «la
può fare uno dei due», e infatti il motore ne occupa **uno**. Quindi nel
banco la tavola spinale, il KED, la barella a cucchiaio e il materassino a
depressione li mette **una persona sola**. Sono manovre che nella realtà non
esistono da soli, e il banco insegna il contrario.

Lo stesso vale al contrario per i DPI: il banco chiede *chi* li indossa, e
li fa indossare a uno. I DPI li mette tutta la squadra, sempre. Non è una
scelta e non deve sembrarlo.

**L'infermiere non è un membro a cui si assegnano compiti.** Il motore lo
tratta come l'autista: gli «assegni» l'adrenalina. Nella realtà l'infermiere
è il sanitario a bordo: tu gli riferisci il quadro e decide lui. Metà del
meccanismo c'è già — `inf-adrenalina` pretende che tu abbia riferito — ma il
linguaggio e la forma dicono un'altra cosa.

E c'è un pezzo di realtà che manca del tutto: **l'infermiere a bordo è una
particolarità del Lazio**. Altrove l'ambulanza è di soli soccorritori, e
quando serve una vena o un farmaco si chiama l'automedica. Un volontario che
si allena solo con l'infermiere accanto non impara la mossa che altrove è
la sola disponibile.

**Il cronometro dà voti che non c'entrano con la clinica.** Ogni azione
necessaria ha un `entro`, e chi arriva dopo prende mezzo punto. Ma nel
soccorso territoriale, salvo i casi in cui il tempo *è* la terapia, non si
corre: si stabilizza sul posto e poi si trasporta. Un banco che toglie punti
perché hai impiegato quaranta secondi in più insegna a correre, che è la
cosa sbagliata. Peggio: se l'attesa dipende da terzi — i vigili del fuoco che
devono mettere in sicurezza la scena — la penalità arriva per qualcosa su cui
il soccorritore non può fare niente.

E infine una cosa che manca: quando sbagli presidio il banco dice che non
serviva, col perché e la fonte, ma **non dice cosa serviva al posto suo**. È
lì che si impara.

---

## Quello che NON cambia: il punto di vista

Il banco resta il banco **del soccorritore**. È una decisione, e va scritta
perché durante il disegno è stata messa in discussione: avendo l'infermiere
in squadra — che nella realtà è chi guida il soccorso — verrebbe naturale
raccontare l'intervento dal suo punto di vista.

Non si fa, per due motivi. Il primo è il pubblico: questo è un banco per il
corso TSSA, e chi lo usa è un volontario. Il secondo è che il valore
didattico più grosso di tutto il progetto sta proprio nel fatto che **i
farmaci non li decidi tu**: riferisci un quadro e qualcun altro agisce di
conseguenza, e la qualità di quello che riferisci è la tua responsabilità
clinica. Spostare il punto di vista vorrebbe dire rifare il contenuto —
indicazioni, dosaggi, protocolli — e prendersi una responsabilità di un
altro ordine. Sarebbe un altro progetto.

---

## Chi fa cosa

### Le mani che servono

Un'azione dichiara `servono`, cioè quante persone occupa. Vale 1 se non è
scritto, quindi il catalogo di oggi non cambia se non dove serve.

| azione | mani | perché |
|---|---|---|
| `spinale`, `ked`, `cucchiaio`, `materassino`, `telo` | 2 | non esistono da soli: uno tiene l'asse, l'altro muove |
| `pallone` | 2 | «Meglio in due: uno tiene la maschera, uno spreme» — è già scritto nel suo `spiega` |
| tutte le altre | 1 | |

Il motore cambia in tre punti: `esegui` occupa `servono` membri invece di
uno; `azioniDisponibili` scarta quelle per cui non ci sono abbastanza
persone libere; e il riquadro della squadra mostra occupati tutti quelli che
la manovra ha preso.

**La scelta di chi la fa sparisce dove non è una scelta.** Se serve una
persona e ce n'è una libera, il gesto parte: niente due bottoni con due nomi.
La delega resta dove è una decisione vera — chiedere all'autista di fare una
cosa *mentre tu ne fai un'altra* — e si presenta come tale.

### I DPI

`dpi` diventa un gesto della squadra: nessuna domanda su chi, e nel diario
si scrive che li ha indossati l'equipaggio. Costa il suo tempo a tutti,
perché è quello che succede.

### L'infermiere non si comanda

Le azioni `cat: 'infermiere'` smettono di comparire come «chiedi a lui di
fare X» e diventano quello che sono: **conseguenze del quadro che gli hai
riferito**. In pratica cambia il verbo e il senso della riga nella palette —
non «Chiedi all'infermiere: adrenalina» ma «L'infermiere somministra
adrenalina», disponibile solo quando il quadro è stato riferito, esattamente
come oggi.

Il vincolo tecnico resta identico (`richiede`), quindi non si tocca il
motore: si tocca il modo in cui la cosa è detta. Cambiare le parole qui non è
cosmesi — è la differenza fra insegnare che dai ordini a un sanitario e
insegnare che gli riferisci un quadro.

### L'equipaggio, e l'automedica

Un intervento parte con un equipaggio, dichiarato nell'indirizzo:
`#/intervento/shock-v3` resta com'è oggi — infermiere a bordo — e
`#/intervento/shock-v3/msb` parte **senza**. La scelta si fa nella pagina
Simulazioni, prima di entrare.

Senza infermiere:

- i membri sono `tu` e `autista`, e basta;
- le azioni sanitarie non sono disponibili, e la palette lo dice invece di
  nasconderle in silenzio: senza sapere che esistono non impari a chiederle;
- `richiedi-automedica` diventa una mossa vera. La chiami, l'automedica ci
  mette il suo tempo, e quando arriva **entra in squadra un membro
  sanitario**, etichettato «il medico»: da quel momento le azioni della
  categoria `infermiere` sono disponibili e le esegue lui. Il meccanismo è
  quello che c'è già — cambia chi lo incarna e da quando.

Quanto ci mette è **assunzione nostra**: otto minuti dalla chiamata. Nella
realtà dipende da dove sei, e un caso può dichiarare il suo tempo.

Chi la chiama al minuto dieci se la vede arrivare al diciotto, e nel
frattempo il paziente peggiora davvero. La lezione — riconoscere presto che
questo paziente ti supera — non ha bisogno di essere votata: si paga da sé.

---

## Come si valuta

### Via il voto sul tempo

`punti` diventa `fatto ? peso : 0`. Il campo `entro` **resta nei casi** e
resta nel racconto — «l'hai fatto al minuto 7» — ma non dimezza più niente.

Il tempo continua a costare, e costa dove è vero: mentre temporeggi le
riserve si consumano, le finestre fisiologiche si chiudono da sole (lo
zucchero per bocca smette di essere possibile quando la coscienza cala, il
DAE serve nei minuti in cui serve), e il paziente lo consegni peggio di come
l'hai trovato. Questo il motore lo fa già: non serve una tabella che lo
imiti.

**Conseguenza da mettere in conto**: i punteggi salgono, e i Progressi
mostreranno uno scalino il giorno del rilascio. Le prove vecchie e nuove non
sono confrontabili. È accettabile — meglio uno scalino che un voto sbagliato.

### Le inversioni di metodo

Restano segnalate poche cose, e sono metodo, non cronometro:

- hai toccato il paziente **senza aver valutato la scena**;
- hai toccato il paziente **senza DPI**.

«Toccare» vuol dire la prima azione che agisce sul paziente — una manovra,
una rilevazione, un presidio — non le domande e non le azioni di scena.

Vivono in un modulo puro nuovo, `core/sequenza.js`, che riceve l'elenco di
quello che hai fatto e restituisce le inversioni. Non tolgono punti: si
raccontano, come il tempo buttato.

### L'alternativa: cosa andava usato

Quando un gesto risulta non indicato e appartiene a una **famiglia di
presidi**, il banco prova le sorelle con le regole che già esistono e nomina
quella che in quell'istante era indicata:

> Maschera con reservoir, 12-15 l/min — non era indicata: il reservoir è
> l'alto flusso… **Andava la maschera semplice, 6-8 l/min**: si mette a chi
> ha la saturazione sotto 94, o a chi lo vedi respirare male. *Bolognin
> :2786-2800*

Non c'è contenuto nuovo da scrivere e non c'è niente da tenere allineato:
l'alternativa **esce dalle stesse regole** che hanno bocciato il gesto,
quindi non può contraddirle. Se nessuna sorella era indicata, il banco lo
dice — «non serviva nessun presidio di questa famiglia» — che è
un'informazione altrettanto utile.

**Si calcola nell'istante in cui il gesto parte**, insieme al verdetto, e
viaggia con lui: è la stessa ragione per cui il verdetto si dà quando decidi
e non quando finisci. A fine partita il contesto di quel momento non esiste
più, e ricostruirlo darebbe la risposta sbagliata.

Le azioni senza famiglia non hanno alternativa da proporre: lì il messaggio
giusto resta quello di oggi, cioè che non serviva niente.

---

## I quattro fastidi, che si sistemano dentro

- **La domanda sui DPI** sparisce: è un gesto di squadra.
- **«Allontana i curiosi» e «Prendi da parte i familiari» non si ripetono
  più**: sono le sole due azioni di scena senza `unaVolta`, e il tag che
  lasciano (`scena-libera`, `familiari-gestiti`) diventa il loro guardiano,
  come per le famiglie di presidi.
- **Il timer della squadra scorre.** Il riquadro mostra già i secondi che
  mancano, ma si ridisegna solo quando succede qualcosa: finché aspetti resta
  fermo su un numero che sembra sbagliato. Va aggiornato ogni secondo finché
  qualcuno è occupato.
- **Le finestre non puniscono più** un'attesa che non dipende da te.

---

## Cosa questo disegno NON fa, di proposito

- **Non sposta il punto di vista sull'infermiere.** Vedi sopra: è un altro
  progetto.
- **Non modella l'attesa dei vigili del fuoco** come vincolo che ti impedisce
  di avvicinarti. Sarebbe realistico, ma cambia il ritmo di ogni scenario di
  trauma e merita una decisione sua.
- **Non tocca il contenuto clinico dei casi**: nessuna soglia, nessuna
  offesa, nessuna risposta dell'anamnesi.
- **Non rifà i Progressi** per assorbire lo scalino dei punteggi.
- **Non aggiunge alternative scritte a mano** dove la famiglia non c'è.

---

## Le assunzioni nostre, da marcare nel codice

- **Otto minuti perché arrivi l'automedica.** Dipende da dove sei; un caso
  può dichiarare il suo tempo.
- **Quali manovre chiedono due mani.** Spinale, KED, cucchiaio, materassino,
  telo e pallone sono quelle su cui il manuale è esplicito o dove la manovra
  non esiste da soli; la scelta di fermarsi a queste è nostra.
- **Quali inversioni contano.** Scena e DPI prima di toccare il paziente:
  due, non venti, perché ogni segnalazione in più è rumore che copre le due
  che contano.

---

## Come si collauda

`node --test tests/*.test.mjs`, solo logica pura.

1. **Una manovra a due mani occupa due persone**, e non parte se ce n'è una
   sola libera.
2. **Senza infermiere le azioni sanitarie non si possono fare**, e dopo
   l'arrivo dell'automedica sì.
3. **Il punteggio non guarda più l'orologio**: lo stesso identico giro di
   azioni fatto lento e fatto svelto dà lo stesso punteggio — e il paziente
   arriva peggio nel primo caso, che è dove si vede la differenza.
4. **L'alternativa è quella giusta e viene dalle regole**: sul dolore
   toracico a saturazione 95 il reservoir propone la maschera semplice; e
   dove nessuna sorella è indicata, non ne inventa una.
5. **Le due inversioni si accendono quando devono** e non quando il
   soccorritore ha fatto le cose in ordine.
6. **Il test che già ripaga**, «quello che un caso chiede, il giudizio lo
   approva», continua a valere: i casi non devono pretendere gesti che il
   giudizio boccia.
7. **A mano, sul telefono**: una manovra a due mani con l'autista occupato,
   il timer che scorre davvero, e un intervento intero senza infermiere.
