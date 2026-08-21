/* =====================================================================
   casi.js — scenari per il motore di intervento (formato 2).

   Tutto è dichiarativo: per aggiungere un caso si compila questo
   oggetto, non si scrive codice. Le condizioni sono funzioni normali
   che ricevono lo stato del paziente.

   Due formati convivono.

   Formato 2 — il caso dichiara i parametri e di quanto peggiorano:
   iniziale        i parametri all'arrivo della squadra
   decorso.base    variazione AL MINUTO se non si fa nulla di utile
   decorso.freni   variazioni aggiuntive quando un tag è attivo
   effettiAzioni   effetto tutto del caso su un'azione generica

   Formato 3 — il caso dichiara la CAUSA e il decorso viene da sé:
   fisiologia.base       i suoi parametri da sano, la base dei calcoli
   fisiologia.riserve    quanto sangue, quanto zucchero: non si vedono mai
   fisiologia.offese     che cosa gli sta facendo male, e a che ritmo
   fisiologia.modificatori   età, terapia cronica

   In comune:
   eventi          cose che succedono a un certo istante, con condizione
   soglie          righe di diario quando un parametro passa un confine
   azioni          necessarie / utili / dannose per la pagella
   ===================================================================== */

export const CASI = [
  /* ================================================================= */
  {
    id: 'shock-v3',
    ecg: { pattern: 'normale' },
    titolo: '"Si sente fiacco"',
    tipo: 'medico',
    difficolta: 3,
    motore: 3,
    capitoli: ['cap-29', 'cap-27'],

    dispatch: {
      codice: 'VERDE',
      testo: 'Uomo di 74 anni, "si sente fiacco". Nient\'altro dalla centrale.',
      luogo: 'Abitazione privata, piano terra',
    },
    scena: {
      testo: 'Abitazione ordinata, la moglie vi apre tranquilla e dice che "è solo un po\' stanco". Nessun rischio.',
      sicura: true,
    },
    colpoOcchio: {
      testo: 'Seduto in poltrona, vigile ma spento, risponde lentamente. Cute pallida e fredda, leggermente sudato. Non riferisce dolore.',
      vitale: true,
    },

    fisiologia: {
      /* Il suo normale: un iperteso di settantaquattro anni in terapia. */
      base: { fc: 72, pas: 145, pad: 85, spo2: 98, fr: 14, glicemia: 96, temp: 36.1 },
      riserve: { volemia: 4800 },
      /* Sanguina nello stomaco da ore: quando arrivate ha già perso quasi
         un litro, ed è per questo che "si sente fiacco". Il laccio non
         serve, la compressione nemmeno: qui l'unica cosa che conta è
         arrivare in ospedale prima che il compenso finisca. */
      offese: [
        { tipo: 'emorragia', sede: 'interna', portata: 20, gia: 980 },
      ],
      /* Il betabloccante gli tiene la frequenza bassa: il compenso non
         si vede. È la trappola del caso, e si scopre solo chiedendo la
         terapia. */
      modificatori: { eta: 74, terapia: ['betabloccante'] },
    },

    anamnesi: {
      interlocutori: [{ id: 'moglie', label: 'la moglie' }],
      risposte: {
        disturbi: {
          paziente: { t: '«Mi sento le gambe molli. Stamattina mi sono alzato e mi girava tutto.»', qualita: 'buona' },
          moglie: { t: '«È da ieri che è spento, non ha voluto cenare.»', qualita: 'buona' },
        },
        allergie: {
          paziente: { t: '«No, niente allergie.»', qualita: 'buona' },
        },
        /* La trappola del caso: lui il nome non se lo ricorda, e finché
           ti fermi a lui quel betabloccante resta invisibile. */
        terapia: {
          paziente: { t: '«Quella per la pressione, mi pare. Una la mattina.»', qualita: 'vaga' },
          moglie: {
            t: '«Il Cardicor per il cuore, e la cardioaspirina. Gliela do io tutte le mattine.»',
            qualita: 'buona',
            rivela: ['betabloccante'],
          },
        },
        patologie: {
          paziente: { t: '«La pressione alta. E il cuore che batte storto, ogni tanto.»', qualita: 'vaga' },
          moglie: { t: '«Ipertensione, e ha l\'aritmia. L\'anno scorso l\'hanno tenuto due giorni in ospedale.»', qualita: 'buona' },
        },
        'ultimo-pasto': {
          paziente: { t: '«Stamattina un caffè. Non mi va giù niente.»', qualita: 'buona' },
          moglie: { t: '«Ieri a pranzo, poi più niente. E ha fatto due volte il bagno, scuro.»', qualita: 'buona', rivela: ['melena'] },
        },
        evento: {
          paziente: { t: '«Niente, mi sono solo sentito debole. Non sono caduto.»', qualita: 'buona' },
          moglie: { t: '«Ieri sera è stato male in bagno, ma non ha voluto che chiamassi.»', qualita: 'buona' },
        },
      },
    },

    eventi: [
      {
        id: 'alzarsi', t: 110,
        testo: 'Il paziente si sposta in avanti sulla poltrona: vuole alzarsi per andare in bagno.',
        decisione: {
          domanda: 'Cosa fai?',
          opzioni: [
            {
              t: 'Lo fermo e lo faccio restare seduto, gli spiego perché',
              ok: true,
              w: 'Con quella pressione, alzarsi significa svenire. E cadere.',
            },
            {
              t: 'Lo accompagno, tanto ci sono io a reggerlo',
              ok: false,
              effetto: { tag: 'in-piedi' },
              w: 'Si è quasi accasciato fra le tue braccia: il ritorno venoso è crollato di colpo.',
            },
            {
              t: 'Lo lascio fare, è casa sua',
              ok: false,
              effetto: { tag: 'in-piedi' },
              w: 'Un paziente ipoteso che si alza da solo è un paziente che cade. Non è maleducazione: è clinica.',
            },
          ],
        },
      },
      {
        id: 'moglie-terapia', t: 200,
        testo: 'La moglie, senza che tu chieda: «Ma è normale che sia così bianco? La pastiglia per il cuore gliel\'ho data io stamattina, quella che gli tiene giù il battito».',
      },
      /* Da qui in giù gli eventi raccontano e basta: la coscienza e il
         respiro li decide la fisiologia, e l'arresto arriva quando le
         riserve sono finite — non a un minuto scritto nel copione. */
      {
        id: 'coscienza', t: 300, se: (p) => p.coscienza !== 'A',
        testo: 'Fatica a seguire il discorso: risponde solo se lo chiami per nome.',
      },
      {
        id: 'peggio', t: 480, se: (p) => p.pas < 72,
        effetto: { respiro: { tipo: 'dispnea', fr: 30 } },
        testo: 'Non risponde più alla voce, reagisce solo se lo stimoli. Il respiro si fa superficiale e frequente.',
      },
    ],

    arresto: { finestraRcp: 60 },

    soglie: [
      { id: 's-pallore', se: (p) => p.pas < 88, testo: 'Le ginocchia si marezzano, le labbra perdono colore.' },
      { id: 's-radiale', se: (p) => p.polsoRadiale === false, testo: 'Al polso non senti più niente: cerchi il carotideo, e c\'è.' },
      { id: 's-antishock', se: (p) => p.tag.includes('antishock') && p.pas > 95, testo: 'Riprende un po\' di colore in viso.' },
    ],

    azioni: {
      necessarie: [
        { id: 'valuta-scena', entro: 60, peso: 1 },
        { id: 'misura-pa', entro: 150, peso: 3 },
        { id: 'monitor', entro: 210, peso: 2 },
        { id: 'refill', entro: 180, peso: 3 },
        { id: 'domanda:terapia', entro: 300, peso: 3 },
        { id: 'domanda:patologie', entro: 360, peso: 1 },
        { id: 'antishock', entro: 300, peso: 3 },
        { id: 'coperta', entro: 420, peso: 1 },
        { id: 'riferisci-infermiere', entro: 360, peso: 2 },
        { id: 'allerta-co', entro: 420, peso: 1 },
        { id: 'accesso-prepara', entro: 420, peso: 1 },
        { id: 'inf-accesso', entro: 480, peso: 1 },
        { id: 'inf-liquidi', entro: 540, peso: 2 },
        { id: 'carica', entro: 780, peso: 2 },
      ],
      utili: ['misura-glicemia', 'rassicura', 'polso-radiale', 'conta-fr', 'coperta', 'colorito', 'chiedi-sete'],
      dannose: [
        { id: 'posizione-seduta', penalita: 3, perche: 'In un paziente ipoteso la posizione seduta toglie ritorno venoso: la pressione scende ancora.' },
        { id: 'spinale', perche: 'Nessun trauma: sono tre minuti persi e un paziente scomodo.' },
        { id: 'zucchero-os', perche: 'La glicemia è normale: non è quello il problema.' },
      ],
    },

    chiave: 'Sta sanguinando dentro, e non si vede. Il parametro che comanda non è la frequenza: è la sistolica, e prima ancora sono la cute e il refill. Cute pallida e fredda, riempimento capillare lungo, codice verde dalla centrale — ed è uno shock.',
    trappola: 'Il paziente parla, la moglie è tranquilla, la centrale ha detto verde. Il betabloccante gli impedisce di tachicardizzare: la frequenza che leggi non ti dice niente, e chi si fida della frequenza qui sbaglia paziente. Guardagli la cute, fai il refill, e chiedi sempre la terapia cronica.',
    ragguaglio: 'Uomo di 74 anni, iperteso in terapia con betabloccante. Astenia ingravescente da alcune ore, nessun dolore, nessun trauma. All\'arrivo PA 84/60, FC 72, cute pallida fredda e sudata, riempimento capillare oltre i due secondi, coscienza conservata. Sospetto sanguinamento gastroenterico in atto. Posizione antishock, ossigeno, coperta, accesso venoso e liquidi dall\'infermiere.',
  },

  /* ================================================================= */
  {
    id: 'toracico-v3',
    ecg: { pattern: 'stemi-inferiore' },
    titolo: 'Dolore toracico in casa',
    tipo: 'medico',
    difficolta: 2,
    motore: 3,
    capitoli: ['cap-25', 'cap-27'],

    dispatch: {
      codice: 'GIALLO',
      testo: 'Uomo di 68 anni, dolore al petto da circa 40 minuti. Il figlio riferisce che è sudato e non sta bene.',
      luogo: 'Abitazione privata, secondo piano senza ascensore',
    },
    scena: {
      testo: 'Appartamento illuminato, familiari presenti e collaborativi. Le scale sono strette: per scendere servirà il telo o la sedia.',
      sicura: true,
    },
    colpoOcchio: {
      testo: 'Seduto sul divano, pallido, sudato, una mano chiusa a pugno sul petto. Parla a frasi complete e ti guarda arrivare.',
      vitale: true,
    },

    fisiologia: {
      /* Il suo normale: iperteso, senza terapia che gli freni il cuore. */
      base: { fc: 70, pas: 132, pad: 80, spo2: 98, fr: 16, glicemia: 128, temp: 36.4 },
      /* Il sangue c'è tutto: quello che manca è il coronarico che lo
         porta al muscolo. Arriva con quaranta minuti di dolore addosso. */
      riserve: { volemia: 5000, dolore: 7, ossigenazione: 0.95 },
      /* Il miocardio soffre e pompa sempre meno; il dolore da solo alza
         frequenza e pressione, che fanno soffrire ancora di più il
         miocardio. È il circolo vizioso da rompere, e si rompe portandolo
         in emodinamica — non restando lì a rassicurarlo. */
      offese: [
        { tipo: 'ischemia-miocardica', intensita: 0.020 },
        { tipo: 'dolore-acuto', intensita: 0.20 },
        /* respira male perché ha male e perché il cuore congestiona: è
           il poco che l'ossigeno può frenare */
        { tipo: 'ipossia-ventilatoria', intensita: 0.0012 },
      ],
      modificatori: { eta: 68, terapia: [] },
    },

    anamnesi: {
      interlocutori: [{ id: 'figlio', label: 'il figlio' }],
      risposte: {
        disturbi: {
          paziente: { t: '«Un peso qui in mezzo. Come se ci fosse qualcuno seduto sopra.»', qualita: 'buona' },
          figlio: { t: '«Dice che è il petto. È tutto sudato, guardi.»', qualita: 'buona' },
        },
        allergie: {
          paziente: { t: '«Nessuna.»', qualita: 'buona' },
          figlio: { t: '«Che io sappia no.»', qualita: 'vaga' },
        },
        terapia: {
          paziente: { t: '«Una per la pressione e una per il colesterolo.»', qualita: 'buona' },
          figlio: { t: '«Ramipril e atorvastatina. Le scatole sono di là.»', qualita: 'buona' },
        },
        patologie: {
          paziente: { t: '«Pressione alta, colesterolo. Fumo da quando avevo vent\'anni.»', qualita: 'buona', rivela: ['fumatore'] },
          figlio: { t: '«Il medico gli dice sempre di smettere di fumare.»', qualita: 'vaga' },
        },
        'ultimo-pasto': {
          paziente: { t: '«Ho pranzato verso l\'una.»', qualita: 'buona' },
        },
        evento: {
          paziente: { t: '«È cominciato mentre portavo su la spesa. Mi sono dovuto fermare.»', qualita: 'buona', rivela: ['esordio-da-sforzo'] },
          figlio: { t: '«L\'ho trovato seduto sulle scale, bianco.»', qualita: 'buona' },
        },
        esordio: {
          paziente: { t: '«Così, tutto insieme. Non mi era mai capitato.»', qualita: 'buona', rivela: ['prima-volta'] },
        },
        allevia: {
          paziente: { t: '«Niente. Mi sono seduto e non è passato.»', qualita: 'buona', rivela: ['non-passa-a-riposo'] },
        },
        'qualita-dolore': {
          paziente: { t: '«Un peso, una morsa. Non è una fitta.»', qualita: 'buona' },
        },
        /* Il dolore lo sente lui: al figlio non si può chiedere, e il
           ripiego del catalogo lo dice senza che il caso scriva niente. */
        irradiazione: {
          paziente: { t: '«Adesso arriva anche qui, alla mascella. E dentro il braccio.»', qualita: 'buona', rivela: ['dolore-irradiato'] },
        },
        intensita: {
          paziente: { t: '«Otto. Forse nove.»', qualita: 'buona' },
        },
        'durata-dolore': {
          paziente: { t: '«Da quaranta minuti buoni, e non molla.»', qualita: 'buona' },
        },
      },
    },

    /* Sdraiare un cardiopatico gli manda addosso il sangue che il cuore
       non riesce già a spingere: respira peggio e ha più male. Non è una
       penalità dichiarata, è quello che gli succede. */
    effettiAzioni: {
      antishock: { ossigenazione: -0.04, dolore: +1.5 },
    },

    eventi: [
      {
        id: 'irradia', t: 150,
        testo: 'Ti dice che ora il dolore gli arriva alla mandibola e dentro il braccio sinistro. «Non è mai stato così».',
      },
      {
        id: 'figlio', t: 260,
        testo: 'Il figlio, in corridoio: «Ma dobbiamo scendere a piedi? Papà le scale non le fa».',
        decisione: {
          domanda: 'Come lo porti giù?',
          opzioni: [
            {
              t: 'Con la sedia da trasporto o il telo, seduto, senza farlo camminare',
              ok: true,
              w: 'Uno sforzo adesso aumenta il consumo di ossigeno del miocardio già in sofferenza.',
            },
            {
              t: 'A piedi appoggiato a noi: sono solo due rampe',
              ok: false,
              effetto: { dolore: +2, ossigenazione: -0.03, contrattilita: -0.08 },
              w: 'Due rampe di scale sono uno sforzo massimale per un cuore in ischemia. È il modo più semplice per farlo peggiorare davanti a te.',
            },
          ],
        },
      },
      {
        id: 'sudore', t: 330, se: (p) => p.dolore > 8,
        testo: 'Diventa grigio e si copre di sudore freddo: la maglietta è bagnata sulla schiena.',
      },
      {
        id: 'extrasistoli', t: 480, se: (p) => !p.tag.includes('in-viaggio'),
        testo: 'Sul monitor compaiono battiti anticipati, isolati ma sempre più frequenti.',
      },
      /* L'arresto dell'infartuato non è la pompa che si spegne piano: è
         il ritmo che si rompe di colpo, in fibrillazione, mentre il
         paziente ti sta ancora parlando. Per questo resta un evento e
         non emerge dalle riserve — e per questo scatta solo se sei
         ancora lì invece che in viaggio. */
      {
        id: 'arresto', t: 690, se: (p) => !p.tag.includes('in-viaggio'),
        effetto: { arresto: true },
        testo: 'Il paziente si irrigidisce, poi si affloscia contro lo schienale.',
      },
    ],

    arresto: { ritmo: 'fv', finestraRcp: 60 },

    soglie: [
      { id: 's-dolore', se: (p) => p.dolore >= 9, testo: 'Non riesce più a stare fermo: cerca una posizione che non trova.' },
      { id: 's-spo2', se: (p) => p.spo2 < 93, testo: 'Il respiro si fa più corto, parla a frasi più brevi.' },
      { id: 's-o2', se: (p) => p.tag.includes('o2') && p.spo2 > 96, testo: 'Con l\'ossigeno il respiro si calma un poco.' },
    ],

    azioni: {
      necessarie: [
        { id: 'valuta-scena', entro: 60, peso: 1 },
        { id: 'posizione-seduta', entro: 150, peso: 2 },
        { id: ['o2-maschera', 'o2-reservoir'], entro: 240, peso: 2, label: 'Ossigeno a flusso adeguato' },
        { id: 'monitor', entro: 240, peso: 2 },
        { id: 'misura-pa', entro: 300, peso: 2 },
        { id: 'domanda:durata-dolore', entro: 300, peso: 2 },
        { id: 'domanda:terapia', entro: 420, peso: 1 },
        { id: 'ecg-elettrodi', entro: 420, peso: 2 },
        { id: 'ecg-esegui', entro: 480, peso: 2 },
        { id: 'riferisci-infermiere', entro: 420, peso: 2 },
        { id: 'carica', entro: 660, peso: 3 },
      ],
      utili: ['rassicura', 'accesso-prepara', 'allerta-co', 'conta-fr', 'misura-glicemia'],
      dannose: [
        { id: 'antishock', penalita: 3, perche: 'Sdraiarlo aumenta il ritorno venoso al cuore e peggiora il respiro: nel dolore toracico si trasporta seduto, salvo che sia pallido e ipoteso.' },
        { id: 'spinale', perche: 'Non è un trauma: tre minuti buttati mentre il miocardio soffre.' },
      ],
    },

    chiave: 'Sudorazione algida, pallore e dolore irradiato sono la scarica adrenergica su base ischemica. Il tempo qui è muscolo: ogni minuto sulla scena è tessuto che non torna. L\'ECG precoce decide dove va il paziente.',
    trappola: 'Il quadro sembra stabile perché parla e la pressione è alta. Ma il dolore sale da solo e a un certo punto il ritmo si rompe. E non farlo camminare: due rampe di scale sono uno sforzo massimale.',
    ragguaglio: 'Uomo di 68 anni, iperteso e dislipidemico, fumatore, nessun anticoagulante. Dolore oppressivo retrosternale irradiato a mandibola e braccio sinistro, insorto sotto sforzo circa 40 minuti prima del nostro arrivo, con sudorazione algida. PA 152/92, FC 96, SpO₂ 95% poi 98 in ossigeno. ECG a dodici derivazioni eseguito sul posto. Trasportato seduto, senza fargli fare scale. Sospetta sindrome coronarica acuta.',
  },

  /* ================================================================= */
  {
    id: 'ipoglicemia-v3',
    ecg: { pattern: 'normale' },
    titolo: 'Confuso e aggressivo in strada',
    tipo: 'medico',
    difficolta: 2,
    motore: 3,
    capitoli: ['cap-22', 'cap-33'],

    dispatch: {
      codice: 'VERDE',
      testo: 'Uomo di 52 anni trovato confuso e aggressivo in strada. I passanti riferiscono che "è ubriaco".',
      luogo: 'Marciapiede, zona centrale',
    },
    scena: {
      testo: 'Marciapiede con un crocchio di persone attorno. Il paziente è agitato e non collabora: valuta se servono le forze dell\'ordine.',
      sicura: false,
      rischio: 'persone potenzialmente aggressive',
    },
    colpoOcchio: {
      testo: 'Seduto a terra, sudato, agitato, eloquio impastato. Alito che sa di alcol. Ti risponde male ma ti risponde.',
      vitale: true,
    },

    fisiologia: {
      /* Il suo normale: cinquantadue anni, nessuna ipertensione. */
      base: { fc: 72, pas: 128, pad: 78, spo2: 97, fr: 16, glicemia: 96, temp: 35.8 },
      /* Arriva a 55: sotto la soglia di ipoglicemia delle ERC 2025
         cap. 12 (:1125, sotto i 70 mg/dl) ma ancora sopra i 50, cioè
         ancora vigile e in grado di deglutire. È il punto del caso: lo
         zucchero per bocca si può ancora dare, e fra pochi minuti no.

         La temperatura è 35.8 perché è a terra da un pezzo. Nel motore
         è un numero fermo: l'ipotermia non è ancora un'offesa. */
      riserve: { glicemia: 55 },
      /* Un mg/dl e mezzo al minuto: da 55 scende sotto i 50 in tre
         minuti e mezzo, e sotto i 30 — il coma — in diciotto.
         ASSUNZIONE NOSTRA: il ritmo di caduta non sta nei manuali. */
      offese: [
        { tipo: 'ipoglicemia', intensita: 1.4 },
      ],
      modificatori: { eta: 52, terapia: [] },
    },

    /* Il portafogli dice quello che lui non è in grado di dire: è il
       Bolognin :4299 — per strada si cercano targhette e cartellini. */
    diarioAzioni: {
      'cerca-documenti': 'Nel portafogli, dietro la carta d\'identità: tessera di esenzione per diabete mellito insulino-dipendente, e uno schema di terapia con l\'insulina della sera.',
    },

    anamnesi: {
      interlocutori: [{ id: 'passanti', label: 'i passanti' }],
      risposte: {
        disturbi: {
          paziente: { t: '«Mi gira la testa. E ho fame, ho una fame che non vi dico.»', qualita: 'buona' },
          passanti: { t: '«Urlava. Poi si è seduto per terra e non si è più alzato.»', qualita: 'buona' },
        },
        allergie: {
          paziente: { t: '«Nessuna.»', qualita: 'buona' },
        },
        terapia: {
          paziente: { t: '«L\'insulina. Ieri sera me la sono fatta e poi non ho cenato.»', qualita: 'buona', rivela: ['insulina'] },
        },
        /* La risposta che manda fuori strada. Non è vaga: è sbagliata, e
           detta con la sicurezza di chi ha visto. Nessuna etichetta lo
           dice — per accorgersene bisogna chiedere anche a lui, o
           misurare la glicemia. */
        patologie: {
          paziente: { t: '«Il diabete. Da vent\'anni, con le punture.»', qualita: 'buona', rivela: ['diabete'] },
          passanti: { t: '«Guardi, quello è ubriaco. Passa di qui tutti i giorni.»', qualita: 'sbagliata' },
        },
        'ultimo-pasto': {
          paziente: { t: '«Ieri a pranzo. Poi ho bevuto e basta.»', qualita: 'buona', rivela: ['digiuno'] },
          passanti: { t: '«E che ne so io.»', qualita: 'vaga' },
        },
        evento: {
          paziente: { t: '«Stavo camminando e mi sono sentito mancare.»', qualita: 'buona' },
          passanti: { t: '«Era già così quando siamo arrivati.»', qualita: 'vaga' },
        },
      },
    },

    eventi: [
      {
        id: 'crocchio', t: 90,
        testo: 'Uno del crocchio si avvicina troppo e alza la voce: «Ma lo volete portare via o no?».',
        decisione: {
          domanda: 'Cosa fai?',
          opzioni: [
            {
              t: 'Allontano le persone e continuo a lavorare',
              ok: true,
              w: 'La scena la governi tu. Un capannello attorno a un paziente agitato è il modo più semplice per farlo agitare di più.',
            },
            {
              t: 'Lascio perdere, tanto non danno fastidio',
              ok: false,
              w: 'Non è maleducazione: è sicurezza. Il crocchio è una variabile che non controlli.',
            },
          ],
        },
      },
      {
        id: 'sudore', t: 240, se: (p) => p.glicemia < 50,
        testo: 'La camicia è bagnata sulla schiena e le mani sono fredde e umide. Fatica a tenere il filo del discorso.',
      },
      {
        id: 'non-risponde', t: 420, se: (p) => p.coscienza !== 'A',
        testo: 'Smette di rispondere alle domande: reagisce solo se lo chiami forte e lo scuoti.',
      },
    ],

    arresto: { finestraRcp: 60 },

    soglie: [
      { id: 's-vigile', se: (p) => p.coscienza === 'V', testo: 'L\'eloquio si impasta: risponde a mezze parole e perde il filo.' },
      { id: 's-coma', se: (p) => p.coscienza === 'P' || p.coscienza === 'U', testo: 'Non risponde più: ora le vie aeree sono un problema tuo, e c\'è saliva in bocca.' },
      { id: 's-risalita', se: (p) => p.glicemia > 70, testo: 'Si rischiara: ti guarda negli occhi e si scusa per come vi ha trattati.' },
    ],

    azioni: {
      necessarie: [
        { id: 'valuta-scena', entro: 60, peso: 2 },
        { id: 'chiedi-ffoo', entro: 120, peso: 1 },
        { id: 'avpu', entro: 120, peso: 1 },
        { id: 'misura-glicemia', entro: 180, peso: 4 },
        { id: 'zucchero-os', entro: 240, peso: 4 },
        { id: 'cerca-documenti', entro: 360, peso: 2 },
        { id: 'domanda:terapia', entro: 480, peso: 1 },
        { id: 'allerta-co', entro: 480, peso: 1 },
        { id: 'carica', entro: 720, peso: 2 },
      ],
      utili: ['dpi', 'allontana-curiosi', 'misura-pa', 'rassicura', 'copri', 'domanda:ultimo-pasto', 'conta-fr'],
      dannose: [
        { id: 'sposta-sicurezza', perche: 'Non c\'è un pericolo che lo giustifichi: spostare di peso un paziente agitato serve solo a farsi male in due.' },
        { id: 'spinale', perche: 'Nessun trauma e nessuna caduta riferita: tre minuti buttati mentre la glicemia scende.' },
      ],
    },

    chiave: 'Confusione, aggressività, sudorazione e incoordinazione sono identiche in un\'ubriacatura e in un\'ipoglicemia. Sotto i 70 mg/dl è ipoglicemia e va trattata; e finché è vigile e deglutisce, bastano venti grammi di zucchero per bocca. Quella finestra si chiude da sola mentre parli.',
    trappola: '"Tanto è ubriaco" è il modo migliore per far arrivare in coma un ipoglicemico. L\'etilista cronico tende all\'ipoglicemia perché l\'alcol blocca la gluconeogenesi: le due cose convivono spesso, e l\'alito che sa di alcol non esclude niente. Per strada non c\'è un familiare a cui chiedere — la risposta ce l\'ha lui in tasca, e il crocchio ti dirà la cosa sbagliata con la faccia di chi sa.',
    ragguaglio: 'Uomo di 52 anni, diabetico in terapia insulinica, abuso alcolico cronico. Trovato in strada confuso, agitato e sudato, scambiato dai presenti per un ubriaco. Glicemia capillare 55 mg/dl all\'arrivo, cosciente e in grado di deglutire: somministrati venti grammi di zucchero per via orale, con risalita a 78 e ripresa del sensorio. Riferisce insulina serale senza cena. FC 72, PA 128/78, SpO₂ 97%, T 35.8.',
  },

  /* ================================================================= */
  {
    id: 'incidente-v3',
    ecg: { pattern: 'normale' },
    titolo: 'Auto contro palo',
    tipo: 'trauma',
    difficolta: 2,
    motore: 3,
    capitoli: ['cap-14', 'cap-21'],

    dispatch: {
      codice: 'ROSSO',
      testo: 'Incidente stradale, auto contro palo. Un occupante, cosciente, ancora dentro il veicolo.',
      luogo: 'Strada extraurbana',
    },
    scena: {
      testo: 'Carreggiata con il traffico che continua a scorrere a fianco senza rallentare, e sotto la vettura una pozza di liquido. I vigili del fuoco non sono ancora arrivati.',
      sicura: false,
      rischio: 'traffico e liquidi infiammabili',
    },
    colpoOcchio: {
      testo: 'Seduto al posto di guida, cosciente, parla e risponde. Parabrezza infranto a ragnatela, volante deformato, airbag esploso. Cintura allacciata.',
      vitale: true,
    },

    fisiologia: {
      /* Il suo normale: trentadue anni, nessuna patologia. */
      base: { fc: 66, pas: 118, pad: 74, spo2: 98, fr: 14, glicemia: 110, temp: 36.2 },
      /* «Il volante ferma il tronco, non gli organi interni, che
         proseguono nel loro movimento in avanti» — Bolognin :6248. Quel
         volante deformato è ottocento millilitri già persi dentro
         l'addome quando la squadra arriva: il sedici per cento, appena
         sopra la soglia in cui il compenso si accende. Nel giovane
         regge, e la sistolica resta quasi normale mentre il
         differenziale si stringe. */
      riserve: { volemia: 5000, dolore: 4, ossigenazione: 0.96 },
      offese: [
        { tipo: 'emorragia', sede: 'interna', portata: 35, gia: 800 },
        { tipo: 'dolore-acuto', intensita: 0.12 },
        /* Il torace ha preso il volante: respira corto perché gli fa
           male e perché il polmone contuso scambia peggio. */
        { tipo: 'ipossia-ventilatoria', intensita: 0.0010 },
      ],
      modificatori: { eta: 32, terapia: [] },
    },

    /* La dinamica è scritta anche addosso, per chi lo guarda: è la
       parte di «E» che si salta quando si ha fretta. */
    diarioAzioni: {
      esposizione: 'Sul torace il segno obliquo della cintura, e in mezzo allo sterno un\'impronta rossa larga quanto il volante. L\'addome alto è teso e fa male appena lo tocchi.',
    },

    anamnesi: {
      interlocutori: [{ id: 'testimone', label: 'il testimone' }],
      risposte: {
        disturbi: {
          paziente: { t: '«Il petto, e qui sopra la pancia. E non riesco a prendere fiato.»', qualita: 'buona' },
          testimone: { t: '«Si lamentava del petto. Io l\'ho lasciato lì com\'era, non l\'ho toccato.»', qualita: 'buona' },
        },
        allergie: {
          paziente: { t: '«Nessuna.»', qualita: 'buona' },
        },
        terapia: {
          paziente: { t: '«Non prendo niente.»', qualita: 'buona' },
        },
        patologie: {
          paziente: { t: '«Niente, sto bene. Non vado mai dal medico.»', qualita: 'buona' },
        },
        'ultimo-pasto': {
          paziente: { t: '«Ho cenato un paio d\'ore fa.»', qualita: 'buona' },
        },
        /* Il cuore del caso. Il Bolognin (:6237-6240) mette la dinamica
           fra le cose da chiedere per prime — «cosa ha colpito cosa e a
           che velocità? ha avuto la possibilità di frenare?» — e lui non
           è in grado di rispondere: era dentro l'urto. Chi ha visto sì. */
        evento: {
          paziente: { t: '«È stato un attimo. Non lo so, ho perso il controllo e mi sono ritrovato qui.»', qualita: 'vaga' },
          testimone: {
            t: '«Andava forte, forte davvero. E non ha frenato: guardi per terra, non c\'è una riga. Ha preso il palo in pieno.»',
            qualita: 'buona',
            rivela: ['dinamica-maggiore'],
          },
        },
        esordio: {
          paziente: { t: '«Da quando ho battuto. Prima stavo benissimo.»', qualita: 'buona' },
        },
        allevia: {
          paziente: { t: '«Se sto fermo è meno peggio. Se provo a tirare il fiato no.»', qualita: 'buona' },
        },
        'qualita-dolore': {
          paziente: { t: '«Come una botta. Sordo, e mi stringe.»', qualita: 'buona' },
        },
        irradiazione: {
          paziente: { t: '«No, sta lì. Ma è largo, prende tutto il petto.»', qualita: 'buona' },
        },
        intensita: {
          paziente: { t: '«Sei. Sette quando respiro.»', qualita: 'buona' },
        },
        'durata-dolore': {
          paziente: { t: '«Da quando è successo. Dieci minuti, forse.»', qualita: 'buona' },
          testimone: { t: '«Ho chiamato subito: saranno dieci minuti, non di più.»', qualita: 'buona' },
        },
      },
    },

    eventi: [
      {
        id: 'vuole-uscire', t: 150,
        testo: 'Slaccia la cintura e prova a girarsi per scendere: «Sto bene, mi faccia uscire da qui».',
        decisione: {
          domanda: 'Cosa fai?',
          opzioni: [
            {
              t: 'Gli tengo la testa e gli dico di non muoversi finché non lo immobilizziamo',
              ok: true,
              w: 'Il rachide si protegge già dalla A, e in un\'auto lo si protegge tenendo la testa mentre l\'altro monta il collare.',
            },
            {
              t: 'Lo aiuto a scendere: se cammina da solo è meglio per tutti',
              ok: false,
              effetto: { dolore: 2, volemia: -150 },
              w: 'Un rachide a rischio che si torce da solo. E muoversi con un addome che sanguina accelera quello che sta già succedendo.',
            },
          ],
        },
      },
      {
        id: 'vvf', t: 420,
        testo: 'Arrivano i vigili del fuoco: mettono i cunei, staccano la batteria e presidiano la carreggiata.',
      },
      {
        id: 'cede', t: 600, se: (p) => p.fc > 125,
        testo: 'Si fa più bianco e più sudato, e comincia a chiederti se è grave. Ripete la stessa domanda due volte.',
      },
    ],

    arresto: { finestraRcp: 60 },

    soglie: [
      { id: 's-differenziale', se: (p) => (p.pas - p.pad) < 32, testo: 'Massima e minima si avvicinano: il differenziale si sta stringendo.' },
      { id: 's-cute', se: (p) => p.cute === 'pallida-fredda-sudata', testo: 'La cute diventa fredda e appiccicosa sotto le dita.' },
      { id: 's-radiale', se: (p) => p.polsoRadiale === false, testo: 'Al polso non senti più niente: cerchi il carotideo, e c\'è.' },
      { id: 's-o2', se: (p) => p.tag.includes('o2') && p.spo2 > 97, testo: 'Con l\'ossigeno la saturazione risale e respira un po\' meglio.' },
    ],

    azioni: {
      necessarie: [
        { id: 'valuta-scena', entro: 60, peso: 3 },
        { id: 'dpi', entro: 90, peso: 1 },
        { id: 'chiedi-vvf', entro: 150, peso: 2 },
        { id: 'collare', entro: 240, peso: 3 },
        { id: ['o2-reservoir', 'o2-maschera'], entro: 300, peso: 2, label: 'Ossigeno a flusso adeguato' },
        { id: 'misura-pa', entro: 300, peso: 2 },
        { id: 'esposizione', entro: 360, peso: 2 },
        { id: 'domanda:evento', entro: 420, peso: 2 },
        { id: 'riferisci-infermiere', entro: 480, peso: 1 },
        { id: 'allerta-co', entro: 540, peso: 1 },
        { id: 'ked', entro: 660, peso: 3 },
        { id: 'spinale', entro: 840, peso: 2 },
        { id: 'carica', entro: 960, peso: 3 },
      ],
      utili: ['allontana-curiosi', 'refill', 'colorito', 'polso-radiale', 'conta-fr', 'monitor', 'rassicura', 'copri', 'accesso-prepara', 'inf-accesso', 'domanda:durata-dolore'],
      dannose: [
        {
          id: 'sposta-sicurezza', penalita: 3,
          perche: 'Estrarlo di peso dall\'abitacolo si fa solo con un pericolo imminente e nessuna alternativa. Qui la scena si mette in sicurezza, e per tirarlo fuori c\'è il KED: è nato per questo — tutelare il rachide mentre si estrae un infortunato da un veicolo (Bolognin :9301).',
        },
        {
          id: 'telo', penalita: 2,
          perche: 'Il telo portaferiti serve per spazi stretti e scale, non per un traumatizzato seduto in auto: non immobilizza niente.',
        },
        {
          id: 'zucchero-os',
          perche: 'La glicemia è normale e ha un addome che potrebbe finire in sala operatoria: non si dà niente per bocca.',
        },
      ],
    },

    chiave: 'La dinamica è un dato clinico. Il volante ferma il tronco ma non gli organi, che proseguono in avanti: quel volante deformato vale più dei parametri di adesso. Il giovane compensa a lungo — la sistolica sta su e il differenziale si stringe — e quando cede, cede in fretta.',
    trappola: 'Prima la scena: traffico e liquidi, e i vigili del fuoco non ci sono ancora. Un soccorritore investito è un secondo paziente e un mezzo in meno per tutti. Poi il rachide, che si protegge già dalla A e non dopo. E non fidarti dei numeri: sono quasi normali perché ha trent\'anni, non perché stia bene.',
    ragguaglio: 'Uomo di circa trent\'anni, nessuna patologia nota, nessuna terapia. Incidente auto contro palo ad alta velocità riferita dal testimone, senza frenata, cintura allacciata, airbag esploso, volante e parabrezza deformati. Cosciente e orientato, dolore toracico e addominale alto, dispnea. All\'arrivo FC 106, PA 128/91 con differenziale ristretto, FR 24, SpO₂ 96%, cute pallida, riempimento capillare 2,4 secondi. Segno della cintura sul torace e addome alto teso. Collare, ossigeno ad alti flussi, estricazione con KED e immobilizzazione su tavola spinale. Sospette lesioni interne da dinamica maggiore.',
  },
  /* ================================================================= */
  {
    id: 'sincope-v3',
    ecg: { pattern: 'normale' },
    titolo: 'Svenimento in coda alle poste',
    tipo: 'medico',
    difficolta: 1,
    motore: 3,
    capitoli: ['cap-28', 'cap-25'],

    dispatch: {
      codice: 'VERDE',
      testo: 'Donna di 24 anni svenuta mentre era in fila. Ora è cosciente.',
      luogo: 'Ufficio postale',
    },
    scena: {
      testo: 'Sala d\'attesa affollata e calda, persone intorno che guardano. Nessun rischio, ma serve spazio per lavorare.',
      sicura: true,
    },
    colpoOcchio: {
      testo: 'Sdraiata a terra, cosciente e orientata, pallida e sudata. Dice che le è già successo una volta al prelievo del sangue.',
      vitale: true,
    },

    fisiologia: {
      /* Il suo normale: ventiquattro anni, sportiva, nessuna patologia.
         La frequenza a 58 è ASSUNZIONE NOSTRA e copre una lacuna: il
         motore muove la frequenza col compenso e col dolore, mai verso
         il basso, quindi la bradicardia vagale del manuale non è
         modellabile e si dichiara come se fosse la sua di base. */
      base: { fc: 58, pas: 112, pad: 70, spo2: 99, fr: 14, glicemia: 84, temp: 36.3 },
      /* Il vago ha ancora la mano sul freno: il letto vascolare è
         allargato e la pressione sta bassa. Il sangue c'è tutto.
         Glicemia e ossigenazione stanno QUI e non nella base: è dalle
         riserve che escono i numeri che si vedono. */
      riserve: { volemia: 5000, tonoVascolare: 0.80, ossigenazione: 0.99, glicemia: 84 },
      /* Nessuna offesa: la sincope è già finita quando arrivate, e se
         il quadro peggiorasse non sarebbe più una sincope. */
      offese: [],
      modificatori: { eta: 24, terapia: [] },
    },

    anamnesi: {
      interlocutori: [{ id: 'impiegata', label: 'l\'impiegata' }],
      risposte: {
        /* Il «no» che ricevi è il reperto: è così che una sincope resta
           una sincope invece di essere qualcos'altro che non hai
           cercato (Bolognin :4324). */
        disturbi: {
          paziente: {
            t: '«Adesso solo un po\' di debolezza. Non ho male da nessuna parte, né al petto né alla pancia, e respiro bene.»',
            qualita: 'buona',
            rivela: ['nessun-segno-grave'],
          },
          impiegata: { t: '«Era bianca come un lenzuolo. Adesso ha già ripreso colore.»', qualita: 'buona' },
        },
        allergie: {
          paziente: { t: '«Nessuna.»', qualita: 'buona' },
        },
        terapia: {
          paziente: { t: '«Non prendo niente. E no, non sono incinta.»', qualita: 'buona' },
        },
        patologie: {
          paziente: { t: '«Niente. Mi era già successo una volta, al prelievo del sangue.»', qualita: 'buona', rivela: ['gia-successo'] },
        },
        'ultimo-pasto': {
          paziente: { t: '«Non ho fatto colazione, sono uscita di corsa.»', qualita: 'buona', rivela: ['digiuno'] },
        },
        evento: {
          paziente: {
            t: '«Ero in fila da venti minuti, faceva caldissimo. Mi è venuta la nausea e la vista si è chiusa.»',
            qualita: 'buona',
            rivela: ['prodromi', 'fattore-scatenante'],
          },
          impiegata: {
            t: '«È scivolata giù piano, non ha battuto la testa. Meno di un minuto ed era di nuovo con noi, lucida.»',
            qualita: 'buona',
            rivela: ['durata-breve', 'nessun-trauma'],
          },
        },
      },
    },

    eventi: [
      {
        id: 'vuole-alzarsi', t: 120,
        testo: 'Si tira su su un gomito: «Sto bene adesso, davvero. Posso alzarmi? Mi vergogno, mi guardano tutti».',
        decisione: {
          domanda: 'Cosa le dici?',
          opzioni: [
            {
              t: 'Le chiedo di restare giù ancora un po\', e faccio allontanare le persone',
              ok: true,
              w: 'Il manuale è esplicito: farla sedere o alzare adesso può farla risvenire. E il capannello è metà del suo imbarazzo.',
            },
            {
              t: 'La faccio sedere piano: se sta bene non ha senso tenerla a terra',
              ok: false,
              effetto: { tonoVascolare: -0.04 },
              w: 'È presto. Il tono vascolare non è ancora tornato, e tirarla su toglie il ritorno venoso che la sta tenendo cosciente.',
            },
          ],
        },
      },
      {
        id: 'colore', t: 300, se: (p) => p.coscienza === 'A',
        testo: 'Riprende colore in viso e comincia a fare domande su cosa è successo: è completamente tornata.',
      },
    ],

    arresto: { finestraRcp: 60 },

    soglie: [
      { id: 's-risviene', se: (p) => p.coscienza !== 'A', testo: 'Gli occhi le si rovesciano indietro e non risponde più: è svenuta un\'altra volta.' },
      { id: 's-caldo', se: (p) => p.tag.includes('antishock'), testo: 'Con le gambe sollevate il colorito migliora a vista d\'occhio.' },
    ],

    azioni: {
      necessarie: [
        { id: 'valuta-scena', entro: 60, peso: 2 },
        { id: 'allontana-curiosi', entro: 150, peso: 2 },
        { id: 'avpu', entro: 150, peso: 1 },
        { id: 'antishock', entro: 210, peso: 3 },
        { id: 'misura-glicemia', entro: 240, peso: 3 },
        { id: 'misura-pa', entro: 300, peso: 2 },
        { id: 'domanda:disturbi', entro: 360, peso: 3 },
        { id: 'domanda:evento', entro: 420, peso: 2 },
        { id: 'carica', entro: 600, peso: 2 },
      ],
      utili: ['dpi', 'rassicura', 'conta-fr', 'colorito', 'monitor', 'copri', 'domanda:ultimo-pasto', 'domanda:patologie'],
      dannose: [
        {
          id: 'posizione-seduta', penalita: 3,
          perche: 'Il manuale dice di mantenerla supina o in posizione antishock: farla sedere o alzare in piedi può provocare una ulteriore sincope (Bolognin :4322). Ed è esattamente quello che succede.',
        },
        {
          id: 'spinale',
          perche: 'È scivolata giù piano e non ha battuto la testa: l\'impiegata l\'ha visto. Tre minuti buttati e una ragazza spaventata.',
        },
      ],
    },

    chiave: 'Prodromi tipici — caldo, nausea, vista che si chiude — fattore scatenante evidente, ripresa completa in meno di un minuto: è una sincope vasovagale. Il vago fa l\'opposto dell\'adrenalina: bradicardia, ipotensione, nausea. E la glicemia si misura comunque.',
    trappola: 'Sincope vuol dire perdita di coscienza transitoria con risoluzione spontanea completa: se all\'arrivo il paziente è ancora alterato NON è una sincope, è un\'altra cosa e va cercata. L\'altra trappola è la fretta di rimetterla in piedi perché «sta bene»: il tono vascolare non è ancora tornato, e la fai svenire una seconda volta davanti a tutti.',
    ragguaglio: 'Donna di 24 anni, nessuna patologia nota, nessuna terapia, a digiuno. Sincope in ambiente caldo e affollato dopo venti minuti in piedi, con prodromi tipici e ripresa spontanea completa in meno di un minuto, testimoniata. Nessun trauma cranico. Nega dolore toracico, dispnea e dolore addominale. All\'arrivo vigile e orientata, PA 90/56, FC 58, glicemia 84. Mantenuta supina con arti inferiori sollevati.',
    ragguaglioVoci: [
      { t: 'Donna di 24 anni, nessuna patologia e nessuna terapia', da: 'domanda:patologie' },
      { t: 'A digiuno da ieri sera', da: 'sapere:digiuno' },
      { t: 'Prodromi tipici e venti minuti in piedi al caldo', da: 'sapere:prodromi' },
      { t: 'Ripresa spontanea completa in meno di un minuto, testimoniata', da: 'sapere:durata-breve' },
      { t: 'Nessun trauma cranico', da: 'sapere:nessun-trauma' },
      { t: 'Nega dolore toracico, dispnea e dolore addominale', da: 'sapere:nessun-segno-grave' },
      { t: 'PA 90/56', da: 'lettura:pa' },
      { t: 'Glicemia 84', da: 'lettura:glicemia' },
      { t: 'Mantenuta supina con arti inferiori sollevati', da: 'azione:antishock' },
    ],
  },

];

export const CASI_INDICE = Object.fromEntries(CASI.map((c) => [c.id, c]));
