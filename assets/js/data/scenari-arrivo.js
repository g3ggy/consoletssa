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
