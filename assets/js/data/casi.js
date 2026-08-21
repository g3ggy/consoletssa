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
    id: 'toracico-v2',
    ecg: { pattern: 'stemi-inferiore' },
    titolo: 'Dolore toracico in casa',
    tipo: 'medico',
    difficolta: 2,
    motore: 2,
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

    iniziale: {
      coscienza: 'A',
      viePervie: true,
      respiro: { tipo: 'normale', fr: 22 },
      fc: 96, pas: 152, pad: 92, ritmo: 'sinusale',
      polsoRadiale: true,
      spo2: 95, glicemia: 128, temp: 36.4,
      cute: 'pallida-fredda', dolore: 7,
    },

    decorso: {
      base: { dolore: +0.28, spo2: -0.12, fc: +0.7, pas: -0.8 },
      freni: {
        o2: { spo2: +1.6 },
        seduta: { dolore: -0.18, spo2: +0.4 },
        rassicurato: { dolore: -0.12, fc: -0.6 },
        'in-viaggio': { dolore: -0.1 },
      },
      limiti: { pas: [60, 220], pad: [40, 130], fc: [40, 190], spo2: [75, 100], dolore: [0, 10] },
    },

    /* sdraiarlo peggiora il respiro e il dolore */
    effettiAzioni: {
      antishock: { spo2: -4, dolore: +1.5 },
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
              effetto: { dolore: +2, spo2: -3, fc: +18 },
              w: 'Due rampe di scale sono uno sforzo massimale per un cuore in ischemia. È il modo più semplice per farlo peggiorare davanti a te.',
            },
          ],
        },
      },
      {
        id: 'sudore', t: 330, se: (p) => p.dolore > 8,
        effetto: { fc: +8 },
        testo: 'Diventa grigio e si copre di sudore freddo: la maglietta è bagnata sulla schiena.',
      },
      {
        id: 'extrasistoli', t: 480, se: (p) => !p.tag.includes('in-viaggio'),
        testo: 'Sul monitor compaiono battiti anticipati, isolati ma sempre più frequenti.',
      },
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
];

export const CASI_INDICE = Object.fromEntries(CASI.map((c) => [c.id, c]));
