# Motore di intervento — progetto

**Data:** 18 agosto 2026
**Stato:** approvato, primo scaglione da realizzare

---

## Il problema

Il simulatore attuale è un questionario a otto passi fissi. Funziona, ma si esaurisce
alla seconda partita, per tre motivi che si tengono insieme.

**Non c'è costo.** Rilevare tutti i parametri e chiedere tutte e sei le voci del SAMPLE
non toglie nulla a nessuno, quindi la scelta ottimale è sempre "fai tutto". Dove non c'è
un prezzo non c'è una decisione: c'è una lista da spuntare.

**Non c'è incertezza.** Ogni informazione esiste, è completa ed è vera. Sul campo
l'informazione è la materia più sporca che si maneggi: manca, è vaga, è sbagliata in
buona fede, oppure viene nascosta di proposito.

**Non c'è conseguenza.** Il paziente è una fotografia. Se sbagli l'azione immediata il
quadro resta identico, e per questo la domanda «quale problema minaccia la vita?» suona
retorica: nessun problema sta minacciando niente, visibilmente.

Il passo finale sul ragguaglio soffre della stessa malattia in forma pura: la risposta
giusta è una proprietà della categoria, non del caso, quindi si impara una volta sola.

## L'obiettivo

Trasformare la simulazione da questionario a **intervento**: un paziente che cambia nel
tempo, azioni che costano, una squadra con cui dividersi il lavoro, e un debriefing che
mostra quando il quadro ha girato e per quale gesto.

---

## Decisioni prese

| Ambito | Decisione |
|---|---|
| Ruolo del giocatore | Soccorritore TSSA. In Lazio l'infermiere è a bordo: fa lui i farmaci, il soccorritore assiste e riferisce. |
| Scorrere del tempo | A turni: l'orologio avanza solo quando si agisce. Nessuna pressione da orologio reale. |
| Squadra | Tre: **tu** (soccorritore), **autista**, **infermiere**. Le azioni si possono delegare e corrono in parallelo. |
| Primo scaglione | Il motore: tempo, decorso, azioni, squadra, monitor evolutivo, debriefing. Due casi riscritti per collaudarlo. |

### Cosa può fare il giocatore

Solo gesti che un soccorritore volontario esegue davvero:

- ossigeno in tutte le forme, posizionamento, immobilizzazione, emorragie, RCP e DAE;
- **zucchero per os** al paziente cosciente, **autoiniettore di adrenalina del paziente**;
- **assistenza all'infermiere**: preparare l'accesso venoso, montare la flebo, preparare
  l'aspiratore, attaccare le piastre, ventilare col pallone durante la RCP, posizionare
  gli elettrodi per l'ECG, tenere la testa durante le manovre;
- **riferire all'infermiere**, che decide sulla base di ciò che gli porti.

I farmaci restano dell'infermiere. Chiederglieli senza il dato che serve produce una
risposta di rimando («prima misurale la glicemia»): è il ragguaglio che entra dentro lo
scenario, non solo alla fine.

---

## Architettura

Tre pezzi separati, ciascuno con un compito solo.

```
assets/js/core/sim-engine.js     logica pura: stato, orologio, decorso, squadra, punteggio
assets/js/data/azioni.js         catalogo delle azioni, condiviso da tutti i casi
assets/js/data/casi.js           casi in formato nuovo (motore: 2)
assets/js/modules/intervento.js  interfaccia: diario, palette, monitor, debriefing
assets/css/intervento.css        stili del diario e della palette
```

`sim-engine.js` non tocca il DOM e non importa nulla dell'interfaccia: si può collaudare
da solo. `intervento.js` non contiene regole cliniche: legge lo stato e disegna.

I dodici casi attuali restano funzionanti con il flusso esistente
(`modules/simulazioni.js`) finché non vengono convertiti. Il selettore degli scenari
guarda `caso.motore` e apre il runtime giusto.

---

## Modello dati

### Stato del paziente (a tempo di esecuzione)

```js
{
  t: 0,                                   // secondi simulati dall'arrivo
  coscienza: 'A',                         // A · V · P · U
  viePervie: true,
  respiro: { tipo: 'normale', fr: 16 },   // normale·dispnea·bradipnea·gasping·assente
  fc: 88, pas: 130, pad: 80,
  ritmo: 'sinusale',
  polsoRadiale: true,
  spo2: 97, glicemia: 110, temp: 36.5,
  cute: 'normale',
  dolore: 0,
  esito: 'in-corso',                      // in-corso · morto · consegnato
  tag: Set(['o2', 'antishock', ...]),     // marcatori lasciati dalle azioni
}
```

### Definizione di un caso

Tutto dichiarativo. Scrivere un caso nuovo significa compilare questo oggetto: nessuna
riga di codice per scenario.

```js
{
  id: 'shock', titolo: '…', tipo: 'medico', difficolta: 3, motore: 2,
  dispatch: { codice, testo, luogo },
  scena:    { testo, sicura, rischio },
  colpoOcchio: { testo, vitale },

  iniziale: { coscienza:'A', respiro:{tipo:'normale',fr:24}, fc:125, pas:80, pad:50,
              ritmo:'tachicardia', spo2:97, glicemia:96, temp:36.1,
              cute:'pallida-fredda', dolore:0 },

  decorso: {
    base:   { pas: -3, fc: +2, spo2: -0.2 },        // variazione al minuto
    freni:  { antishock: { pas: +1.5, fc: -1 },     // attivi se il tag è presente
              'o2-reservoir': { spo2: +3 } },
    limiti: { pas: [40, 220], fc: [20, 220], spo2: [55, 100] },
  },

  eventi: [
    { id:'alzarsi', t:120, testo:'Prova ad alzarsi per andare in bagno.',
      decisione: { domanda:'…', opzioni:[ {t:'…', ok:true,  effetto:{}, w:'…'},
                                          {t:'…', ok:false, effetto:{pas:-12}, w:'…'} ] } },
    { id:'scivola', t:360, se:(p)=>p.pas < 75, effetto:{ coscienza:'V' },
      testo:'Risponde più lentamente, fatica a seguirti.' },
  ],

  soglie: [ { se:(p)=>p.spo2 < 90, testo:'Le labbra si fanno cianotiche.', unaVolta:true } ],

  azioni: {
    necessarie: [ { id:'antishock', entro:240, peso:3 },
                  { id:'riferisci-infermiere', entro:300, peso:2 } ],
    utili:      [ 'coperta-isotermica', 'allerta-co', 'misura-pa' ],
    dannose:    [ { id:'posizione-seduta', perche:'Peggiora il ritorno venoso…' } ],
  },

  chiave: '…', trappola: '…', ragguaglio: '…', capitoli: ['cap-29'],
}
```

Le condizioni sono funzioni normali (`(p) => p.pas < 75`): il file è un modulo
JavaScript, quindi si leggono bene e non serve interpretare stringhe.

### Catalogo delle azioni

Condiviso da tutti i casi, in `data/azioni.js`.

```js
{
  id: 'o2-reservoir',
  cat: 'B',                                  // scena·A·B·C·D·E·immobilizzo·comunicazione·valutazione
  label: 'Ossigeno con maschera reservoir, 12-15 l/min',
  durata: 40,                                // secondi simulati
  chi: ['tu', 'autista'],                    // 'infermiere' per i farmaci
  richiede: (p) => p.viePervie,              // prerequisito, opzionale
  unaVolta: true,
  applica: (p) => ({ spo2: +4, tag: 'o2' }), // effetto immediato
  diario: 'Ossigeno con reservoir.',
  spiega: 'Alti flussi quando la saturazione è bassa o il quadro è critico.',
}
```

Le rilevazioni sono azioni come le altre, con in più il campo `rileva`:

```js
{ id:'misura-pa', cat:'valutazione', durata:40, chi:['tu','autista'],
  rileva:'pa', diario:(p) => `PA ${p.pas}/${p.pad} mmHg` }
```

---

## Il motore

### Orologio e squadra

Tre membri, ciascuno con un istante in cui torna libero. Ogni azione dichiara chi può
eseguirla.

- Azione fatta **da te**: l'orologio avanza di tutta la sua durata.
- Azione **delegata**: ti costa cinque secondi (il tempo di dirlo), il collega resta
  occupato per la durata piena e il risultato compare nel diario quando finisce.

L'orologio avanza sempre **fino al momento in cui sei di nuovo libero tu**. Le azioni
altrui che maturano nel frattempo vengono applicate in ordine di completamento.

### Decorso

Fra un istante e l'altro il motore applica le variazioni al minuto, in proporzione ai
secondi trascorsi. I `freni` si sommano alla base quando il loro tag è attivo. I valori
vengono poi riportati dentro i `limiti`.

### Eventi

Un evento scatta quando l'orologio supera il suo istante e la sua condizione è vera.
Se porta una `decisione`, il tempo si ferma finché non rispondi. Gli eventi possono
peggiorare, migliorare, o mandare il paziente in **arresto**: ritmo defibrillabile o
asistolia, polso assente, coscienza U. Da lì contano solo RCP e DAE, e se la RCP non
parte entro un minuto simulato l'esito è `morto`.

### Rilevazioni che invecchiano

| Grandezza | Comportamento |
|---|---|
| FC · SpO₂ · tracciato | continue **dopo** aver collegato il monitor, si aggiornano da sole |
| PA | si lancia, 40 s, poi resta con il suo orario |
| glicemia · T · FR · GCS · pupille | rilevazione singola, il valore invecchia e dopo due minuti va rifatto |

L'interfaccia mostra l'età di ogni lettura e sbiadisce quelle vecchie.

### Punteggio

Non più un punto per domanda, ma una pagella per caso:

- azioni **necessarie** eseguite entro il tempo previsto (peso pieno) o in ritardo (metà);
- azioni **dannose** eseguite (penalità, con la spiegazione del perché);
- **esito del paziente** alla consegna: migliorato, stabile, peggiorato, morto;
- **minuti sulla scena**;
- gerarchia rispettata: penalità se si lavora sul circolo con le vie aeree ancora ostruite.

Il debriefing mostra la tua linea del tempo accanto a quella ideale e il grafico dei
parametri, con indicato il momento in cui il quadro ha girato e per quale gesto.

---

## Interfaccia

La colonna centrale smette di essere una pagina di domande e diventa un **diario che
scorre**: quello che vedi, quello che fai, quello che il paziente risponde, gli eventi.
Le decisioni compaiono come carte dentro il flusso.

- **In alto**: cronometro dell'intervento e barra del tempo con gli eventi marcati.
- **Monitor**: come oggi, più le frecce di tendenza e l'età delle letture.
- **Squadra**: tre pastiglie che dicono chi è occupato e con cosa, col conto alla rovescia.
- **Palette**: in basso, divisa per categoria; su telefono è un pannello che sale da un
  pulsante grande. Ogni azione mostra la durata e chi può eseguirla.
- **Debriefing**: pagella, doppia linea del tempo, grafico dei parametri, chiave di
  lettura, trappola, capitoli da rileggere.

Su telefono valgono le regole già adottate: monitor appiccicato in alto, bersagli da
42 px, palette a tutta larghezza.

---

## Collaudo

`sim-engine.js` è logica pura, quindi si collauda senza browser con un piccolo file di
prova eseguito da Node:

- il decorso senza azioni porta il "si sente fiacco" all'alterazione della coscienza al
  minuto previsto;
- con l'antishock entro i quattro minuti la sistolica risale e l'evento non scatta;
- un'azione delegata non ferma l'orologio del giocatore;
- l'arresto senza RCP entro un minuto porta a `morto`;
- una lettura più vecchia di due minuti risulta scaduta;
- il punteggio conta correttamente necessarie, ritardi e dannose.

L'interfaccia si verifica a mano su desktop e su viewport telefono, come già fatto per
gli altri moduli.

---

## Fuori da questo scaglione

Restano per dopo, in quest'ordine:

1. **Informazioni incerte**: informatori (paziente, familiare, badante, vicino, passante,
   nessuno), voci del SAMPLE mancanti, parziali, errate o nascoste, domanda in disparte,
   ricerca nell'ambiente per trovare blister, tessere e bombole.
2. **Ragguaglio da comporre**: si pescano quattro-sei blocchi da una dozzina specifici del
   caso, con dentro le trappole (la diagnosi, il dettaglio irrilevante).
3. **Eventi di scena**: curiosi che filmano, familiari che intralciano, paziente
   psichiatrico, richiesta di forze dell'ordine e vigili del fuoco.
4. **Conversione degli altri dieci casi** al formato nuovo.

---

## Rischi noti

- **Taratura del decorso.** I numeri al minuto vanno provati caso per caso: troppo
  rapidi e diventa un videogioco, troppo lenti e torna una fotografia.
- **Costo di scrittura.** Un caso passa da circa quaranta righe di dati a centocinquanta.
  Vale la pena convertire i dodici solo dopo che il motore è stabile.
- **Accuratezza del ruolo.** L'elenco delle azioni va riletto da chi conosce il protocollo
  locale prima di considerarlo definitivo.
