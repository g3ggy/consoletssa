/* =====================================================================
   scenari-arrivo.js — l'arrivo sul posto e l'inquadramento dell'azione
   immediata, caso per caso.

   Perché è un file a parte: nel motore a domande i primi passi erano
   uguali per tutti e dodici gli scenari ("sei arrivato sul posto",
   risposta "valuto la scena"), e il passo dell'azione immediata
   enunciava un principio senza mai dire quale fosse il problema.
   Qui ogni caso porta il SUO arrivo, con quello che vedi davvero prima
   di scendere dal mezzo, e la SUA descrizione precisa del momento in cui
   devi decidere.

   deriva              di quanto peggiorano i parametri AL MINUTO se
                       nessuno interviene: il monitor non resta fermo
   arrivo.testo        cosa hai sotto gli occhi appena arrivato
   arrivo.domanda      la decisione che quel posto ti impone
   arrivo.scelte       opzioni di quel caso: la risposta giusta cambia
   situazione          cosa hai davanti, e cosa minaccia la vita, al
                       momento dell'azione immediata
   azioniSbagliate     errori plausibili proprio per questo caso
   ===================================================================== */

export const DETTAGLI_ARRIVO = {
  /* ------------------------------------------------------------------ */
  toracico: {
    deriva: { FC: +0.9, SpO2: -0.15, PA: -1.2 },
    arrivo: {
      testo: "Il figlio vi aspetta al portone e vi fa strada. Secondo piano, scale strette, niente ascensore. Sul pianerottolo non c'è nessun pericolo: la scena è tranquilla.",
      domanda: "Cosa porti su?",
      scelte: [
        { t: "Borsa, ossigeno, monitor e DAE: salgo attrezzato", ok: true,
          w: "Su un dolore toracico il DAE sale con te. Se il cuore si ferma mentre sei là sopra, tornare al mezzo sono due minuti che non hai." },
        { t: "Solo la borsa: prima vedo, poi decido cosa serve", ok: false,
          w: "Su altri casi è ragionevole, qui no. Due rampe di scale a vuoto costano più del peso del materiale." },
        { t: "Salgo con la barella a cucchiaio, tanto va portato giù", ok: false,
          w: "Prima valuti, poi decidi come scendere. E su scale strette la cucchiaio non passa: serviranno telo o sedia." },
        { t: "Chiedo ai familiari di farlo scendere in strada mentre saliamo", ok: false,
          w: "Mai. Due rampe di scale sono uno sforzo massimale per un cuore che sta già lavorando senza ossigeno." },
      ],
    },
    situazione: "Uomo di 68 anni seduto sul divano, pallido, sudato, la mano chiusa a pugno in mezzo al petto. Il dolore dura da 40 minuti, è iniziato mentre saliva le scale e non è passato mettendosi seduto. Non hai ancora nessun parametro, e non ti serve: quello che minaccia la vita è un miocardio che sta lavorando senza ossigeno, e ogni minuto che passa è muscolo che non torna.",
    azioniSbagliate: [
      { t: "Lo faccio sdraiare, così gli prendo la pressione più comodamente",
        w: "Sdraiarlo aumenta il ritorno venoso e fa lavorare di più il cuore. Nel dolore toracico si sta seduti." },
      { t: "Gli faccio prendere l'aspirina che ha in casa",
        w: "Non sei tu a somministrare farmaci, nemmeno quelli di casa. Lo riferisci all'infermiere e decide lui." },
    ],
  },

  /* ------------------------------------------------------------------ */
  bpco: {
    deriva: { FC: +1.2, SpO2: -0.45, PA: -0.5 },
    arrivo: {
      testo: "La badante vi apre e vi accompagna in camera. In un angolo c'è la bombola dell'ossigeno domiciliare. La signora vi guarda entrare senza salutare: sta usando tutto il fiato che ha per respirare.",
      domanda: "Da cosa parti?",
      scelte: [
        { t: "Mi metto alla sua altezza e la lascio nella posizione che ha scelto", ok: true,
          w: "È ortopnoica: quella posizione se l'è trovata da sola perché è l'unica in cui riesce a respirare. Non gliela cambi." },
        { t: "La sdraio sul letto per valutarla meglio", ok: false,
          w: "È il modo più rapido per farla peggiorare davanti a te." },
        { t: "Chiedo subito alla badante l'elenco delle terapie", ok: false,
          w: "Serve, ma dopo. Prima guardi come respira: la B viene prima della raccolta dati." },
        { t: "Spengo il concentratore per misurare la saturazione in aria ambiente", ok: false,
          w: "Non si toglie ossigeno a chi ne ha bisogno per ottenere un numero più pulito. Annoti che è in ossigenoterapia e vai avanti." },
      ],
    },
    situazione: "Donna di 79 anni seduta sul bordo del letto, protesa in avanti con le braccia puntate sulle ginocchia. Parla a frasi spezzate, le labbra sono lievemente cianotiche, da due giorni tossisce e ha la febbre. Il problema è in B: non le arriva abbastanza ossigeno. Finché non lavori lì, tutto il resto può aspettare.",
    azioniSbagliate: [
      { t: "Le prendo la pressione, poi decido",
        w: "La pressione adesso non ti dice niente di utile. Il problema è il respiro e si vede a occhio nudo." },
      { t: "La faccio camminare fino alla barella, sono pochi passi",
        w: "Con quella saturazione, pochi passi bastano a farla desaturare ancora." },
    ],
  },

  /* ------------------------------------------------------------------ */
  arresto: {
    deriva: { FC: 0, SpO2: 0, PA: 0 },
    arrivo: {
      testo: "Open space, una decina di colleghi in cerchio intorno a un uomo a terra. Uno vi fa segno con la mano. Nessun pericolo ambientale — ma nessuno sta facendo niente.",
      domanda: "Cosa fai entrando?",
      scelte: [
        { t: "Faccio allargare il cerchio e vado dritto al paziente con il DAE", ok: true,
          w: "Spazio per lavorare e defibrillatore addosso. In un arresto i secondi si contano in percentuali di sopravvivenza." },
        { t: "Chiedo ai colleghi cosa è successo prima di avvicinarmi", ok: false,
          w: "La storia te la faranno raccontare dopo. Quello che vedi da qui basta per muoverti adesso." },
        { t: "Aspetto l'automedica: è già stata allertata", ok: false,
          w: "Nessuno aspetta l'ALS per cominciare a comprimere. Quando arriva, deve trovare una RCP già in corso." },
      ],
    },
    situazione: "Uomo di 61 anni supino a terra, immobile. Non risponde quando lo chiami e lo scuoti. Ogni tanto boccheggia rumorosamente a bocca aperta e poi resta fermo per parecchi secondi: il torace non si espande in modo efficace e non senti flusso d'aria. Questo non è respiro, è respiro agonico. Il cuore non sta pompando: sono già passati dei secondi.",
    azioniSbagliate: [
      { t: "Aspetto ancora un momento: ogni tanto respira",
        w: "Il gasping non è respiro. Aspettare qui significa buttare via le uniche percentuali che hai." },
      { t: "Lo metto in posizione laterale di sicurezza",
        w: "La PLS è per chi è incosciente ma respira. Qui il respiro non c'è: si comprime." },
    ],
  },

  /* ------------------------------------------------------------------ */
  shock: {
    deriva: { FC: +1.6, SpO2: -0.1, PA: -2.5 },
    arrivo: {
      testo: "La moglie vi apre e dice subito «l'ho fatto sedere, è solo un po' stanco». Casa in ordine, nessun rischio, nessuna fretta nella sua voce. Il codice della centrale era verde.",
      domanda: "Con che testa entri?",
      scelte: [
        { t: "Il codice della centrale non è un verdetto: guardo io e decido io", ok: true,
          w: "Quel verde è nato da come ha raccontato la cosa chi ha chiamato. Il tuo colpo d'occhio vale di più, e qui vale molto di più." },
        { t: "È un verde: valutazione con calma, poi si vede", ok: false,
          w: "È così che si arriva tardi. Il codice si conferma o si cambia sul posto, non si eredita." },
        { t: "Mi faccio raccontare tutto dalla moglie prima di avvicinarmi", ok: false,
          w: "La storia serve, ma dopo. Due secondi di colpo d'occhio dicono più di cinque minuti di racconto." },
      ],
    },
    situazione: "Uomo di 74 anni seduto in poltrona, vigile ma spento, che risponde lentamente. La cute è pallida e fredda al tatto, con un velo di sudore. Non ha dolore, non è dispnoico, non ha niente di eclatante: ha l'aspetto di uno che sta compensando qualcosa. Ed è proprio questo il punto — il compenso regge finché regge, e quando cede lo fa tutto insieme.",
    azioniSbagliate: [
      { t: "Lo faccio alzare e lo accompagno alla barella",
        w: "Un paziente che sta compensando un'ipotensione, messo in piedi, sviene. E cade." },
      { t: "Chiamo il medico curante per farmi dire la terapia",
        w: "Non è il momento e non serve: la terapia la chiedi alla moglie in trenta secondi." },
    ],
  },

  /* ------------------------------------------------------------------ */
  ipoglicemia: {
    deriva: { FC: +0.6, SpO2: 0, PA: -0.4 },
    arrivo: {
      testo: "Marciapiede, un crocchio di sei o sette persone attorno a un uomo seduto a terra. Qualcuno filma con il telefono. Un passante ripete a voce alta «è ubriaco, lasciatelo perdere».",
      domanda: "Come ti avvicini?",
      scelte: [
        { t: "Faccio allargare le persone, valuto se è aggressivo e mi tengo una via di uscita", ok: true,
          w: "Paziente agitato in mezzo alla gente: prima la tua sicurezza e lo spazio per lavorare, poi tutto il resto." },
        { t: "Mi inginocchio subito accanto a lui e comincio a valutarlo", ok: false,
          w: "Inginocchiarsi davanti a una persona agitata, con la gente addosso, ti toglie ogni via di uscita." },
        { t: "Resto sul mezzo e aspetto le forze dell'ordine", ok: false,
          w: "Si chiamano quando servono, ma qui l'uomo è seduto e non ti sta aggredendo: aspettare e basta è solo tempo perso." },
        { t: "Discuto con chi sta filmando finché non smette", ok: false,
          w: "Fai allontanare, non discuti. Il tuo tempo appartiene al paziente." },
      ],
    },
    situazione: "Uomo di 52 anni seduto a terra, sudato, agitato, con l'eloquio impastato. Non collabora e ha l'alito che sa di alcol. Confusione, sudorazione, tremori e incoordinazione sono identici in un'ubriacatura e in un'ipoglicemia — e le due cose convivono spesso. Non hai ancora nessun numero, e senza quel numero stai solo indovinando.",
    azioniSbagliate: [
      { t: "Gli do da bere qualcosa di zuccherato, male non fa",
        w: "A un paziente che non collabora lo zucchero rischia di finire nei polmoni. E comunque prima serve il dato." },
      { t: "Lo lascio smaltire e avviso i vigili urbani",
        w: "È il modo più efficace per far arrivare in coma un ipoglicemico." },
    ],
  },

  /* ------------------------------------------------------------------ */
  incidente: {
    deriva: { FC: +1.4, SpO2: -0.3, PA: -1.8 },
    arrivo: {
      testo: "Auto contro palo, in carreggiata. Il traffico continua a scorrere a fianco senza rallentare, sotto la vettura c'è una pozza di liquido. I vigili del fuoco non sono ancora arrivati. Il conducente è dentro e si muove.",
      domanda: "Prima cosa?",
      scelte: [
        { t: "Metto in sicurezza la scena e chiedo i vigili del fuoco", ok: true,
          w: "Traffico e liquidi. Un soccorritore investito è un secondo paziente e un mezzo in meno per tutti." },
        { t: "Vado subito al finestrino: è cosciente e parla", ok: false,
          w: "Lui è vivo adesso; il rischio adesso sei tu. La scena viene prima del paziente, sempre." },
        { t: "Lo faccio uscire dall'auto e lo porto al sicuro", ok: false,
          w: "L'estricazione immediata si fa solo con un pericolo imminente e nessuna alternativa. Qui il rachide è a rischio e la scena si può mettere in sicurezza." },
      ],
    },
    situazione: "Uomo seduto al posto di guida, cosciente e collaborante. Parabrezza infranto a ragnatela, volante deformato, airbag esploso, cintura allacciata. Dice di avere male al torace e all'addome alto e di sentirsi «senza fiato». La dinamica qui è un dato clinico: quel volante ha preso il suo torace, e i parametri normali di adesso non escludono niente.",
    azioniSbagliate: [
      { t: "Gli faccio fare un respiro profondo per capire quanto gli fa male",
        w: "Non serve a niente e in un torace traumatizzato fa solo male." },
      { t: "Aspetto i vigili del fuoco senza toccare nulla",
        w: "Nell'attesa la scena la metti in sicurezza tu: cunei, freno a mano, quadro spento — e intanto tieni la testa e parli col paziente." },
    ],
  },

  /* ------------------------------------------------------------------ */
  anticoagulante: {
    deriva: { FC: +0.2, SpO2: 0, PA: +0.3 },
    arrivo: {
      testo: "La figlia vi apre e dice «è caduta ma sta benissimo, secondo me non c'era bisogno di chiamarvi». Corridoio con poca luce e un tappeto arrotolato a metà. La signora è seduta a terra, appoggiata al muro.",
      domanda: "Cosa fai per prima cosa?",
      scelte: [
        { t: "Guardo il pavimento e il tappeto prima ancora di guardare lei", ok: true,
          w: "La dinamica è metà della valutazione: come è caduta, da che altezza, su cosa ha battuto. E quel tappeto può far cadere anche te." },
        { t: "La faccio alzare e sedere su una sedia, sta bene", ok: false,
          w: "Prima di muovere un anziano caduto vuoi sapere se ha battuto la testa e che terapia prende." },
        { t: "Rassicuro la figlia e mi preparo a chiudere come non trasportata", ok: false,
          w: "Troppo presto. Quella decisione si prende dopo aver saputo cosa prende come farmaci." },
      ],
    },
    situazione: "Donna di 84 anni seduta a terra, vigile e orientata, con un piccolo ematoma sulla fronte. Non ha vomitato, ricorda tutto, non ha perso coscienza. È il caso più tranquillo della giornata — e lo resterebbe, se non ci fosse una domanda ancora senza risposta: che cosa prende come terapia.",
    azioniSbagliate: [
      { t: "La lascio a casa: è lucida e non ha sintomi",
        w: "È presto per decidere: il dato che cambia tutto non l'hai ancora chiesto." },
      { t: "Le metto del ghiaccio sull'ematoma e la osservo dieci minuti",
        w: "Dieci minuti sul posto non escludono niente. Un ematoma intracranico può manifestarsi ore dopo." },
    ],
  },

  /* ------------------------------------------------------------------ */
  anafilassi: {
    deriva: { FC: +2.2, SpO2: -0.8, PA: -3.2 },
    arrivo: {
      testo: "Giardino sul retro. Sotto la grondaia, a tre o quattro metri dal paziente, si vede chiaramente un nido di calabroni con insetti che entrano ed escono. L'uomo è in piedi vicino alla siepe, i familiari intorno a lui.",
      domanda: "Prima cosa?",
      scelte: [
        { t: "Porto il paziente e i familiari lontano dal nido", ok: true,
          w: "La causa è ancora lì e può pungere di nuovo, lui o te. Prima si toglie tutti dalla fonte, poi si tratta." },
        { t: "Comincio a valutarlo dov'è: sta male adesso", ok: false,
          w: "Lavorare a tre metri da un nido attivo significa rischiare una seconda puntura, su di lui o su di te." },
        { t: "Chiedo ai vigili del fuoco di rimuovere il nido", ok: false,
          w: "Servirà, ma non adesso: bastano dieci metri di distanza e trenta secondi." },
      ],
    },
    situazione: "Uomo di 39 anni in piedi, agitato, con la voce roca, il volto e le labbra gonfi e chiazze rosse diffuse sul torace. Dice che gli si sta chiudendo la gola. È stato punto dieci minuti fa e non sapeva di essere allergico. La cute è calda, non fredda. Quello che minaccia la vita, qui, sono le vie aeree che si stanno chiudendo mentre lo guardi.",
    azioniSbagliate: [
      { t: "Gli faccio prendere l'antistaminico che ha in casa",
        w: "Nell'anafilassi antistaminico e cortisone arrivano troppo tardi. Serve adrenalina, e la decide il sanitario." },
      { t: "Metto del ghiaccio sulla puntura",
        w: "Il problema non è più la puntura: è la reazione di tutto l'organismo." },
    ],
  },

  /* ------------------------------------------------------------------ */
  cocaina: {
    deriva: { FC: +1.1, SpO2: -0.05, PA: +0.8 },
    arrivo: {
      testo: "Vi apre un ragazzo che resta sulla porta e vi guarda senza dire niente. Appartamento in disordine, musica ancora accesa, sul tavolo del salotto bicchieri e una carta di credito.",
      domanda: "Come imposti la scena?",
      scelte: [
        { t: "Chiedo all'amico di restare, ma parlo col paziente in disparte", ok: true,
          w: "Certe informazioni nessuno te le dà davanti a terzi. E l'amico serve: è l'unico che sa davvero cosa è successo stanotte." },
        { t: "Faccio uscire tutti e resto solo con il paziente", ok: false,
          w: "Restare solo in un appartamento con un paziente agitato non è una buona idea, e perdi l'unico testimone." },
        { t: "Chiedo subito all'amico cosa hanno preso, davanti a tutti", ok: false,
          w: "Domanda giusta, momento sbagliato: davanti agli altri la risposta sarà «niente»." },
      ],
    },
    situazione: "Uomo di 30 anni seduto, vigile, sudato, agitato, con le pupille dilatate; parla velocemente e non riesce a stare fermo. Riferisce cardiopalmo e un senso di oppressione al torace. Ha trent'anni e nessuna patologia nota: un quadro iperadrenergico a quell'età ha quasi sempre una causa esterna, e quella causa nessuno te la dirà spontaneamente.",
    azioniSbagliate: [
      { t: "Lo tranquillizzo dicendogli che gli passerà da solo",
        w: "Rassicurare sì, minimizzare no: quel torace va monitorato, il dolore in questi casi è ischemico fino a prova contraria." },
      { t: "Chiamo le forze dell'ordine perché ha usato droghe",
        w: "Non è compito tuo e distrugge il rapporto. La domanda serve a curarlo, non a denunciarlo." },
    ],
  },

  /* ------------------------------------------------------------------ */
  ictus: {
    deriva: { FC: +0.2, SpO2: -0.05, PA: +0.6 },
    arrivo: {
      testo: "Il marito vi aspetta sul pianerottolo con la carta d'identità già in mano e dice «io l'ho vista bene alle 9:40, ne sono sicuro». Sono le 10:15. Casa tranquilla, nessun rischio.",
      domanda: "Che valore dai a quella frase?",
      scelte: [
        { t: "È il dato più importante che porterò in ospedale: me lo faccio confermare e lo annoto subito", ok: true,
          w: "Nell'ictus l'ora dell'ultimo momento in cui è stata vista bene decide il trattamento. Trentacinque minuti significano finestra aperta." },
        { t: "È un dettaglio: conta quello che vedo io adesso", ok: false,
          w: "Quello che vedi tu dice che c'è un ictus. Quell'ora dice se si può ancora fare qualcosa." },
        { t: "Lo chiederò dopo, insieme al resto dell'anamnesi", ok: false,
          w: "Rischi di perderlo. Adesso il marito è lucido; fra dieci minuti sarà in ansia e non sarà più sicuro di niente." },
      ],
    },
    situazione: "Donna di 71 anni seduta al tavolo, vigile, con la bocca asimmetrica e il braccio destro che non solleva. Capisce quello che le chiedi ma fatica a rispondere: è un'afasia produttiva, non è confusa e non è «un po' rincitrullita». Non ha dolore, respira bene, il circolo tiene. Quello che è a rischio qui non è il respiro né il circolo: è il tempo.",
    azioniSbagliate: [
      { t: "Le faccio bere un sorso d'acqua per vedere se deglutisce",
        w: "Nel sospetto ictus il paziente sta a digiuno: il rischio di inalazione è concreto." },
      { t: "Aspetto qualche minuto per vedere se migliora da sola",
        w: "Ogni minuto di attesa è tessuto cerebrale che non torna." },
    ],
  },

  /* ------------------------------------------------------------------ */
  sincope: {
    deriva: { FC: -0.8, SpO2: +0.1, PA: +1.4 },
    arrivo: {
      testo: "Sala d'attesa affollata e calda, una ventina di persone in fila. Una ragazza è sdraiata a terra fra due sedie, cosciente, con qualcuno che le fa aria con un volantino. Un impiegato vi fa cenno da dietro il vetro.",
      domanda: "Prima cosa?",
      scelte: [
        { t: "Faccio spazio intorno a lei e la lascio sdraiata", ok: true,
          w: "Sdraiata è esattamente dove deve stare: la posizione è già metà del trattamento. Lo spazio serve a te." },
        { t: "La faccio alzare e sedere su una sedia, sta più comoda", ok: false,
          w: "Farla alzare adesso è il modo più semplice per farla svenire una seconda volta." },
        { t: "La porto fuori all'aria aperta di peso", ok: false,
          w: "Prima la valuti. E un paziente non si sposta di peso se non c'è un pericolo." },
      ],
    },
    situazione: "Donna di 24 anni sdraiata a terra, cosciente e orientata, pallida e sudata. Racconta che prima di svenire ha sentito caldo, nausea e «la vista che si chiudeva», e che si è ripresa da sola in meno di un minuto. È in piedi da venti minuti in una sala calda, a digiuno. Il quadro è talmente tipico che il rischio vero è darlo per scontato senza confermarlo.",
    azioniSbagliate: [
      { t: "Le do dello zucchero: sarà un calo di zuccheri",
        w: "«Calo di zuccheri» è una diagnosi da bar. La glicemia è un dato, e si misura." },
      { t: "Chiudo sul posto: sta bene e si è ripresa",
        w: "Presto. Una sincope si valuta, e in una giovane a digiuno vanno esclusi altri motivi." },
    ],
  },

  /* ------------------------------------------------------------------ */
  schiacciamento: {
    deriva: { FC: +1.3, SpO2: -0.2, PA: -1.1 },
    arrivo: {
      testo: "Cantiere. I vigili del fuoco stanno già puntellando la lastra con dei martinetti. Sopra il paziente c'è altro materiale accatastato che non sembra stabile. Il caposquadra dei VVF vi viene incontro.",
      domanda: "Come entri in scena?",
      scelte: [
        { t: "Mi presento al caposquadra dei VVF e mi faccio dire dove posso stare", ok: true,
          w: "In un cantiere con materiale instabile la sicurezza la comandano loro. Ti muovi dove ti dicono, con casco e DPI." },
        { t: "Vado dal paziente: è cosciente e mi sta chiamando", ok: false,
          w: "Sotto un carico non puntellato non ci si mette. Un soccorritore schiacciato non salva nessuno." },
        { t: "Aspetto che la lastra venga rimossa prima di avvicinarmi", ok: false,
          w: "Non serve aspettare la rimozione: appena la zona è puntellata puoi lavorare. E la rimozione, in questo caso, è proprio la cosa da non affrettare." },
      ],
    },
    situazione: "Uomo cosciente e lucido, supino, con gli arti inferiori intrappolati sotto una lastra di cemento da più di un'ora. Dice di non sentire più le gambe. In superficie non vedi quasi niente: il danno è dentro i muscoli compressi, e comincerà a farsi sentire nel momento esatto in cui il peso verrà tolto.",
    azioniSbagliate: [
      { t: "Aiuto i vigili del fuoco a sollevare la lastra il prima possibile",
        w: "È la mossa che può ucciderlo: alla rimozione, potassio e mioglobina entrano in circolo tutti insieme." },
      { t: "Gli slaccio le scarpe e provo a sfilargli le gambe",
        w: "Trazione su arti compressi da un'ora: si peggiora e basta." },
    ],
  },
};
