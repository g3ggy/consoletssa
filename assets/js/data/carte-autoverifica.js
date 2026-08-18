/* =====================================================================
   carte-autoverifica.js — le cinquanta domande di autoverifica del
   manuale (capitoli 17 e 36), con la risposta.

   Le domande sono quelle scritte negli appunti: qui diventano carte da
   ripasso, con la risposta ricavata dal capitolo di riferimento. Chi
   studia può quindi ripassare esattamente su quello che il manuale
   chiede di saper rispondere.
   ===================================================================== */

export const CARTE_AUTOVERIFICA = [
  /* ===================== PARTE 1 · capitolo 17 ===================== */
  { id: "q1-01", tema: "Emergenza e urgenza", cap: "cap-3", parte: 1,
    q: "Qual è la differenza tra emergenza e urgenza? E tra urgenza differibile e indifferibile? A quali codici colore corrispondono?",
    a: "Emergenza: immediato pericolo di vita, almeno una funzione vitale compromessa o stato di shock → codice ROSSO. Urgenza: nessun pericolo immediato. Indifferibile (GIALLO) se il quadro può evolvere, differibile (VERDE) se non cambia nell'arco di qualche ora. BIANCO: nessuna urgenza, poteva rivolgersi al medico di base." },

  { id: "q1-02", tema: "Caratteristiche del paziente", cap: "cap-1", parte: 1,
    q: "Elenca tre caratteristiche non modificabili del paziente e spiega perché ognuna cambia l'approccio.",
    a: "Età: cambia le cause probabili, i valori normali dei parametri e la capacità di compenso; bambino e anziano sono i due estremi fragili. Sesso: cambia il ventaglio delle ipotesi, in particolare quelle ginecologiche. Etnia e origine geografica: non è un pregiudizio ma epidemiologia — rischio cardiovascolare aumentato e infarto più precoce nell'origine sud-asiatica, alterazioni della ripolarizzazione all'ECG che nell'origine africana possono essere una variante benigna." },

  { id: "q1-03", tema: "Dolore addominale nella donna", cap: "cap-1", parte: 1,
    q: "Perché in una donna in età fertile con dolore addominale basso l'approccio è diverso rispetto a un uomo?",
    a: "Perché va sempre considerata una causa ginecologica, che nel maschio semplicemente non esiste. Una gravidanza va considerata possibile fino a prova contraria, e una gravidanza ectopica è un'emergenza vera: la paziente rischia la vita per emorragia interna. Da qui la domanda mirata, senza imbarazzi: come sta dal punto di vista ginecologico, ultima mestruazione, possibilità di gravidanza." },

  { id: "q1-04", tema: "Omeostasi", cap: "cap-4", parte: 1,
    q: "Cos'è l'omeostasi? Fai due esempi di meccanismo di compenso.",
    a: "L'equilibrio interno dell'organismo: dinamico, non un valore fisso. Compensi: la tachicardia quando la pressione cala, perché aumentando la frequenza si cerca di mantenere la gittata; la vasocostrizione periferica, che chiude i vasi di cute e mucose per centralizzare il sangue su cervello e cuore. Un terzo esempio è la tachipnea quando l'ossigeno scarseggia." },

  { id: "q1-05", tema: "Insulto", cap: "cap-4", parte: 1,
    q: "Cosa si intende per \"insulto\" in medicina?",
    a: "Un evento, esterno o interno, che aggredisce l'equilibrio dell'organismo: trauma, infezione, emorragia, ischemia, sostanza tossica. L'organismo risponde compensando, e continua a compensare fino a esaurire le risorse: per questo un paziente può sembrare stabile a lungo e poi crollare di colpo." },

  { id: "q1-06", tema: "Segno e sintomo", cap: "cap-6", parte: 1,
    q: "Differenza tra segno e sintomo. Classifica: dolore toracico, cute sudata, nausea, SpO₂ 88%, vertigine, cianosi.",
    a: "Il segno lo rilevo io, il sintomo me lo riferisce il paziente. Segni: cute sudata, SpO₂ 88%, cianosi. Sintomi: dolore toracico, nausea, vertigine." },

  { id: "q1-07", tema: "Parametri vitali", cap: "cap-5", parte: 1,
    q: "Elenca i parametri vitali con i range normali dell'adulto.",
    a: "FC 60-100 bpm · FR 12-16 atti/min · PA circa 120/80 mmHg · SpO₂ 95-100% · temperatura 36-37 °C · glicemia 70-110 mg/dl." },

  { id: "q1-08", tema: "Mentalità gerarchica", cap: "cap-7", parte: 1,
    q: "Cosa significa mentalità gerarchica? Applicala al dolore toracico.",
    a: "Partire dall'ipotesi più grave e scendere, non il contrario. Nel dolore toracico: infarto, embolia polmonare, dissezione aortica, tamponamento cardiaco, pneumotorace iperteso, rottura esofagea. Solo dopo aver ragionevolmente escluso queste si scende alle cause benigne." },

  { id: "q1-09", tema: "Mentalità chirurgica", cap: "cap-7", parte: 1,
    q: "Cosa significa mentalità chirurgica?",
    a: "Sapere abbastanza per capire, ma soprattutto fare. Valutazioni mirate e rapide, domande chiuse e utili, azione prima della spiegazione: se non respira bene, ossigeno subito e poi si parla. La valutazione primaria sta sotto i 90 secondi." },

  { id: "q1-10", tema: "Colpo d'occhio", cap: "cap-10", parte: 1,
    q: "Cosa valuti nel colpo d'occhio iniziale?",
    a: "Accessibilità (è incarcerato? prono? ha il casco?), vitalità (parla, si muove, reagisce?), presenza di emorragie massive, aspetto della cute (pallore, cianosi, sudorazione), e se servono altre squadre. Tutto questo prima dell'ABCDE." },

  { id: "q1-11", tema: "Paziente non vitale", cap: "cap-11", parte: 1,
    q: "Elenca le condizioni in cui puoi trovare un paziente non vitale.",
    a: "Morte biologica, paziente moribondo in fase agonica, arresto cardiocircolatorio, arresto respiratorio, coma, ipotermia grave, e le forme simulate: sincope psicogena e simulazione volontaria." },

  { id: "q1-12", tema: "Arresto cardiocircolatorio", cap: "cap-11", parte: 1,
    q: "Perché si dice arresto cardiocircolatorio e non semplicemente cardiaco?",
    a: "Perché quello che si arresta è la funzione di pompa, cioè il circolo, non necessariamente l'attività elettrica. In fibrillazione ventricolare l'attività elettrica c'è, ma è caotica e non produce nessuna gittata." },

  { id: "q1-13", tema: "FV e asistolia", cap: "cap-11", parte: 1,
    q: "Differenza tra FV e asistolia. Quale delle due è defibrillabile e perché una prognosi è migliore dell'altra?",
    a: "La FV è attività elettrica caotica: è defibrillabile ed è uno dei ritmi iniziali dell'arresto, quindi trovarla significa che l'arresto è recente. L'asistolia è assenza di attività elettrica: non è defibrillabile e in genere indica un arresto che dura da oltre 4-5 minuti, con prognosi nettamente peggiore. La probabilità di successo della defibrillazione cala del 7-10% per ogni minuto." },

  { id: "q1-14", tema: "Gasping", cap: "cap-11", parte: 1,
    q: "Cos'è il gasping e come lo si tratta?",
    a: "È il respiro agonico: il paziente boccheggia rumorosamente a bocca aperta, ma non ci sono movimenti toracici efficaci né flusso d'aria. Non è respiro: il paziente è in arresto e si inizia subito la RCP. L'errore classico è dire «però respira» e perdere minuti preziosi." },

  { id: "q1-15", tema: "Paziente vitale", cap: "cap-12", parte: 1,
    q: "Cosa osservi per primo in un paziente vitale?",
    a: "Se è cosciente e come comunica, come respira (frequenza, fatica, rumori, posizione assunta spontaneamente), l'aspetto della cute (colore, temperatura, sudorazione) e la presenza di emorragie. Sono tutte cose che si vedono prima di toccarlo e prima di qualsiasi strumento." },

  { id: "q1-16", tema: "X-ABCDE", cap: "cap-13", parte: 1,
    q: "Cosa significa la \"X\" in X-ABCDE?",
    a: "Il controllo delle emorragie massive. Un'emorragia catastrofica svuota il paziente in pochi minuti: va bloccata prima di ogni altra manovra, compresa la gestione delle vie aeree." },

  { id: "q1-17", tema: "ABCDE e AVPU", cap: "cap-13", parte: 1,
    q: "Spiega A, B, C, D, E e la scala AVPU.",
    a: "A: vie aeree pervie e protezione del rachide cervicale. B: respiro, frequenza, efficacia, saturazione. C: circolo, polsi, cute, emorragie, pressione. D: stato di coscienza e glicemia. E: esposizione del paziente per cercare le lesioni, poi copertura termica. AVPU: Alert (vigile), Vocal (risponde alla voce), Painful (risponde solo al dolore), Unresponsive (nessuna risposta)." },

  { id: "q1-18", tema: "SAMPLE e OPQRST", cap: "cap-13", parte: 1,
    q: "Spiega SAMPLE e OPQRST.",
    a: "SAMPLE: Segni e sintomi, Allergie, Medicine, Patologie pregresse, Last meal (ultimo pasto), Eventi. OPQRST indaga il dolore: Onset (insorgenza), Provocation e Palliation (cosa lo peggiora o allevia), Quality (che tipo di dolore), Radiation (dove si irradia), Severity (intensità da 1 a 10), Time (da quanto dura)." },

  { id: "q1-19", tema: "Scena sicura", cap: "cap-14", parte: 1,
    q: "Cosa comprende la \"scena sicura\"? Fai tre esempi di rischio non evidente.",
    a: "Non solo i pericoli visibili come traffico o fuoco, ma tutto ciò che può colpire te. Tre rischi che non si vedono: gas o sostanze chimiche in un ambiente chiuso, persone aggressive o sotto effetto di sostanze, il rischio infettivo. Si aggiungono animali, insetti, materiali instabili. Mai da soli, sempre con un mezzo di comunicazione e con le vie di uscita sotto controllo." },

  { id: "q1-20", tema: "Etica sulla scena", cap: "cap-15", parte: 1,
    q: "Perché non si commenta mai sulla scena?",
    a: "Perché l'udito è l'ultimo senso che se ne va: il paziente incosciente o in fase terminale sente. E non si commenta neanche appena chiusa la porta, né vicino ai citofoni, né in ascensore: i familiari sono ovunque e quello che dici resta." },

  /* ===================== PARTE 2 · capitolo 36 ===================== */
  { id: "q2-01", tema: "Le tre fasi", cap: "cap-18", parte: 2,
    q: "Quali sono le tre fasi del soccorso? Cosa si fa in ciascuna?",
    a: "Prima: valutazione iniziale, il «triage sulla porta» — sicurezza della scena, colpo d'occhio, azioni salvavita immediate. Seconda: valutazione secondaria e rivalutazione continua — SAMPLE, OPQRST, parametri, esame del paziente, e poi si ricontrolla. Terza: il ragguaglio, cioè la consegna al Pronto Soccorso." },

  { id: "q2-02", tema: "Triage sulla porta", cap: "cap-18", parte: 2,
    q: "Cos'è il \"triage sulla porta\" e a quali due domande risponde?",
    a: "È l'inquadramento che fai nei primi secondi, prima di toccare il paziente. Risponde a due domande: è vitale o non vitale? E c'è qualcosa che lo sta uccidendo adesso, su cui devo agire subito?" },

  { id: "q2-03", tema: "Posizione nel dolore toracico", cap: "cap-19", parte: 2,
    q: "Perché il paziente con dolore toracico si trasporta seduto? Qual è l'unica eccezione?",
    a: "Perché la posizione seduta o semiseduta alleggerisce il lavoro del cuore e facilita l'espansione del torace. L'eccezione è il paziente pallido e ipoteso, cioè in shock: in quel caso va supino con gli arti inferiori sollevati, perché il problema è il ritorno venoso." },

  { id: "q2-04", tema: "Scala e protocollo", cap: "cap-20", parte: 2,
    q: "Differenza tra scala di valutazione e protocollo. In quale categoria rientra l'ABCDE? E l'algoritmo BLSD?",
    a: "Una scala serve a misurare e classificare (AVPU, GCS, la scala del dolore). Un protocollo è una sequenza di azioni da eseguire in un ordine stabilito. L'ABCDE è una sequenza di valutazione e trattamento, quindi un metodo operativo con valore di protocollo; il BLSD è un algoritmo vero e proprio, quindi un protocollo." },

  { id: "q2-05", tema: "ABCDE come cerchio", cap: "cap-21", parte: 2,
    q: "Perché l'ABCDE va immaginato come un cerchio e non come una lista? Fai un esempio di \"ritorno indietro\".",
    a: "Perché non si percorre una volta sola: si gira attorno al paziente e si ricomincia. Esempio: hai risolto la A, dato ossigeno in B e stai valutando il circolo quando il paziente vomita — torni immediatamente alla A ad aspirare, perché il problema a monte annulla tutto quello che hai fatto a valle." },

  { id: "q2-06", tema: "Non si passa oltre", cap: "cap-21", parte: 2,
    q: "Perché non si passa alla lettera successiva senza aver risolto la precedente? Esempio del broncospasmo.",
    a: "Perché il problema a monte rende inutile qualunque cosa tu faccia a valle. Esempio: in un broncospasmo severo l'ossigeno trova un muro e non entra negli alveoli — dare più litri non serve finché il broncospasmo non viene trattato. Allo stesso modo, con le vie aeree ostruite l'ossigeno non arriva comunque." },

  { id: "q2-07", tema: "Componenti della coscienza", cap: "cap-22", parte: 2,
    q: "Quali sono le due componenti dello stato di coscienza?",
    a: "La vigilanza, cioè lo stato di veglia con gli occhi aperti, e il contenuto o consapevolezza, cioè l'orientamento su tempo, spazio e persona. Si può essere perfettamente vigili e non consapevoli, ed è una condizione grave." },

  { id: "q2-08", tema: "Gradi di alterazione", cap: "cap-22", parte: 2,
    q: "Elenca i gradi di alterazione della coscienza dal più lieve al più profondo.",
    a: "Vigile → confusione → letargia → sopore → stupor → coma." },

  { id: "q2-09", tema: "Afasia", cap: "cap-22", parte: 2,
    q: "Differenza tra afasia produttiva e comprensiva. Come le distingui con una sola domanda?",
    a: "Nella produttiva il paziente capisce ma non riesce a parlare; nella comprensiva parla ma non ha capito la domanda. Basta chiedere «come si chiama?»: se la risposta è pertinente ha compreso, e il problema è nella produzione. Se risponde a caso ma fluentemente, non ha capito." },

  { id: "q2-10", tema: "Segni di morte certa", cap: "cap-23", parte: 2,
    q: "Quali sono i segni di morte certa che impediscono l'inizio delle manovre? Come si distinguono dall'ipotermia grave?",
    a: "Rigor mortis, macchie ipostatiche, decomposizione, lesioni palesemente incompatibili con la vita, decapitazione, carbonizzazione. L'ipotermia grave può simulare la morte — rigidità, assenza apparente di respiro e polso — ma è reversibile: nessuno è morto finché non è caldo e morto." },

  { id: "q2-11", tema: "Anticoagulanti", cap: "cap-24", parte: 2,
    q: "Perché la voce M del SAMPLE (anticoagulanti) è così importante in un trauma cranico?",
    a: "Perché il paziente scoagulato sanguina molto più a lungo: un ematoma intracranico può espandersi lentamente e dare sintomi anche ore dopo, quando il paziente è già tornato a casa. È il dato che cambia il codice, e nel ragguaglio va detto per primo." },

  { id: "q2-12", tema: "Ultimo pasto", cap: "cap-24", parte: 2,
    q: "Perché si chiede l'ultimo pasto?",
    a: "Perché a stomaco pieno il rischio di inalazione in caso di vomito è alto, e perché condiziona l'eventuale anestesia in ospedale. In più orienta: un digiuno prolungato spiega un'ipoglicemia o una lipotimia." },

  { id: "q2-13", tema: "Medico e trauma insieme", cap: "cap-24", parte: 2,
    q: "Fai un esempio in cui un problema medico e uno traumatico coesistono.",
    a: "Un anziano che perde coscienza al volante per un'aritmia e finisce contro un muro: il trauma è la conseguenza, la causa è medica, e curare solo il trauma significa rimandare a casa il problema vero. Oppure un diabetico in ipoglicemia che cade e batte la testa." },

  { id: "q2-14", tema: "Strutture toraciche", cap: "cap-25", parte: 2,
    q: "Elenca le strutture toraciche e almeno un'ipotesi grave per ciascuna.",
    a: "Cuore: infarto e tamponamento cardiaco. Grandi vasi: dissezione aortica. Polmoni e pleura: pneumotorace iperteso ed embolia polmonare. Esofago: rottura esofagea. Parete toracica e coste: volet costale. È l'elenco che rende obbligatoria la mentalità gerarchica davanti a un dolore al petto." },

  { id: "q2-15", tema: "Dolore viscerale", cap: "cap-26", parte: 2,
    q: "Perché il dolore viscerale è mal localizzato e si irradia? Elenca cinque sedi di irradiazione del dolore cardiaco.",
    a: "Perché negli organi interni i recettori del dolore sono pochi e le vie nervose convergono con quelle della cute: il segnale arriva grossolano e il cervello lo attribuisce alla sede sbagliata. Sedi del dolore cardiaco: retrosternale, mandibola e collo, spalla e braccio sinistro, epigastrio, dorso interscapolare." },

  { id: "q2-16", tema: "Scarica adrenergica", cap: "cap-27", parte: 2,
    q: "Cos'è la scarica adrenergica? Elenca cinque segni e spiegane la fisiologia.",
    a: "È la risposta di allarme dell'organismo, con rilascio di adrenalina, davanti a un problema qualunque. Pallore: vasocostrizione cutanea per centralizzare il sangue. Sudorazione algida: attivazione simpatica su cute fredda. Tachicardia: si aumenta la frequenza per mantenere la gittata. Respiro profondo: broncodilatazione per prendere più ossigeno. Midriasi, bocca secca e tremori completano il quadro." },

  { id: "q2-17", tema: "Segni aspecifici", cap: "cap-27", parte: 2,
    q: "Perché si dice che i segni d'allarme sono aspecifici? Cosa ci fai, allora?",
    a: "Perché compaiono identici qualunque sia la causa: la stessa scarica adrenergica c'è nell'infarto e in uno spavento. Dicono che c'è un problema, non quale. Li usi per capire che il paziente sta compensando qualcosa e per alzare la soglia di attenzione, poi vai a cercare la causa: non si collezionano segni, si cerca il motivo." },

  { id: "q2-18", tema: "Sudorazione", cap: "cap-27", parte: 2,
    q: "Differenza tra sudorazione algida e da sforzo. Con quale domanda e quale gesto le distingui?",
    a: "L'algida è su cute fredda e umida, spesso con pallore, e compare a riposo: è un segno d'allarme. Quella da sforzo o da calore è su cute calda. La domanda è «ha fatto uno sforzo o era fermo?»; il gesto è toccare la schiena, non il torace, dove la temperatura si sente davvero." },

  { id: "q2-19", tema: "Nervo vago", cap: "cap-28", parte: 2,
    q: "Cos'è il nervo vago e quali effetti produce? Perché si sviene nella sincope vasovagale?",
    a: "È un nervo, non un ormone, e la sua stimolazione fa l'opposto dell'adrenalina: bradicardia, ipotensione, nausea e vomito, rilascio degli sfinteri. Il calo simultaneo di frequenza e pressione riduce la perfusione cerebrale, e il cervello si spegne per qualche secondo: è la sincope vasovagale." },

  { id: "q2-20", tema: "Non fermarsi al parametro", cap: "cap-29", parte: 2,
    q: "Chi è più grave: FC 125 con PA 80/50, o FC 62 con PA 180/100? Perché?",
    a: "Il primo. La tachicardia non è la malattia: è il compenso alla pressione crollata, quindi il quadro è uno shock. Sarebbe ancora più grave una PA 80/50 con frequenza 60, perché vorrebbe dire che il compenso è assente o esaurito." },

  { id: "q2-21", tema: "Shock", cap: "cap-29", parte: 2,
    q: "Qual è il segno più indicativo di shock secondo il Manuale TSSA? Con quali valori si allerta la CO?",
    a: "La pressione arteriosa sistolica sotto 100 mmHg orienta; sotto 90 lo shock è conclamato. Si allerta la centrale per PA sistolica sotto 90, FC sopra 120, alterazioni dello stato di coscienza, segni di shock conclamato o causa non dominabile sul posto." },

  { id: "q2-22", tema: "Non fare diagnosi", cap: "cap-29", parte: 2,
    q: "Perché non si deve \"fare diagnosi\" sul soccorso? Cos'è il rischio di fissarsi su un'ipotesi?",
    a: "Perché non ne hai gli strumenti e non è il tuo ruolo: si formula un sospetto e lo si dichiara come tale. Il rischio è la chiusura precoce: una volta scelta un'ipotesi si smette di vedere i dati che la contraddicono, e si consegna in ospedale un quadro già deformato." },

  { id: "q2-23", tema: "Ragguaglio", cap: "cap-30", parte: 2,
    q: "Elenca i quattro punti del ragguaglio.",
    a: "Età e sesso del paziente. Patologie rilevanti, con gli anticoagulanti per primi. Evento, con l'ora, e parametri salienti. Prestazioni eseguite. Poi ti fermi: il resto è nella scheda." },

  { id: "q2-24", tema: "Scheda di soccorso", cap: "cap-31", parte: 2,
    q: "Perché sulla scheda non si scrive \"frattura\"? Come si scrive invece?",
    a: "Perché «frattura» è una diagnosi, e per farla serve una radiografia. Si descrive quello che si vede: «deformità anatomica dell'arto superiore destro, con limitazione funzionale e dolore alla palpazione». Lo stesso vale per «infarto», che diventa «sospetta sindrome coronarica acuta»." },

  { id: "q2-25", tema: "Etilista e glicemia", cap: "cap-33", parte: 2,
    q: "Perché a un paziente etilista si misura sempre la glicemia?",
    a: "Perché confusione, aggressività, sudorazione e incoordinazione sono identiche in un'ubriacatura e in un'ipoglicemia, e le due condizioni convivono spesso: l'etilista cronico tende all'ipoglicemia perché l'alcol inibisce la gluconeogenesi. «Tanto è ubriaco» è il modo migliore per far arrivare in coma un ipoglicemico." },

  { id: "q2-26", tema: "Domanda sulle sostanze", cap: "cap-33", parte: 2,
    q: "Come si chiede a un paziente se ha fatto uso di sostanze? Cosa fai se nega?",
    a: "In disparte, senza tono da guardia, con una domanda diretta e non giudicante, spiegando che serve a curarlo e non a denunciarlo. Se nega ma il quadro dice il contrario, non insisti e non lo metti sotto torchio: annoti il sospetto, tratti quello che vedi e lo riferisci in ospedale." },

  { id: "q2-27", tema: "Paziente agitato", cap: "cap-25", parte: 2,
    q: "Perché un paziente agitato va considerato ipossico fino a prova contraria?",
    a: "Perché il cervello mal ossigenato produce agitazione prima che sonnolenza: l'agitazione è spesso il primo segno di ipossia, non un problema di carattere. Va ossigenato, non calmato. Vale anche nel trauma cranico, dove è la lesione a parlare e non il paziente." },

  { id: "q2-28", tema: "Crush syndrome", cap: "cap-35", parte: 2,
    q: "Perché nella crush syndrome togliere il peso può uccidere il paziente?",
    a: "Perché il muscolo compresso va in rabdomiolisi: si distrugge e accumula potassio e mioglobina. Finché il peso c'è, restano lì. Alla rimozione entrano in circolo tutti insieme: iperkaliemia con aritmie potenzialmente fatali e insufficienza renale acuta da mioglobina. Si stabilizza e si infonde prima di estricare." },

  { id: "q2-29", tema: "Anafilassi", cap: "cap-35", parte: 2,
    q: "Perché nell'anafilassi conclamata il cortisone non basta?",
    a: "Perché il cortisone ha una latenza di ore, mentre l'anafilassi uccide in minuti chiudendo le vie aeree e facendo crollare la pressione. Serve l'adrenalina, che agisce subito: vasocostringe, broncodilata e riduce l'edema. Il cortisone semmai serve dopo, per prevenire la reazione tardiva." },

  { id: "q2-30", tema: "Proattività", cap: "cap-34", parte: 2,
    q: "Cosa significa \"proattività\" in equipaggio? Fai due esempi concreti.",
    a: "Anticipare invece di aspettare che ti venga chiesto. Primo esempio: prepari il materiale per l'accesso venoso prima che l'infermiere lo domandi, così quando serve è già lì. Secondo: riferisci spontaneamente un dato che hai visto e che nessuno ti ha chiesto, come il blister sul comò o la bombola di ossigeno in un angolo. Il rovescio della medaglia è agire fuori dal proprio ruolo o dal protocollo: la catena di responsabilità esiste e va rispettata." },
];
