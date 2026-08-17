/* =====================================================================
   anatomy.js — contenuti del modulo Corpo.

   Ogni elemento è ancorato a un OSSO dello scheletro del modello glTF
   (nomi Mixamo, senza il prefisso "mixamorig") più uno scostamento
   espresso in frazioni dell'altezza del paziente:

     off: [x, y, z]   x = +sinistra del paziente · y = alto · z = avanti

   Ancorare alle ossa invece che a coordinate fisse significa che i punti
   restano al loro posto anche quando il modello si muove o cambia
   posizione (supino, semiseduto, antishock).
   ===================================================================== */

export const HOTSPOTS = [
  {
    key: 'vie-aeree',
    label: 'Vie aeree',
    kicker: 'A — airway',
    title: 'Vie aeree e rachide cervicale',
    bone: 'Neck', off: [0, 0.015, 0.045],
    chapter: 'cap-13',
    body: `La <b>A</b> non è "guardo se respira": è verificare che ci sia un condotto aperto fra l'aria e
    i polmoni. Nel paziente incosciente la lingua cade all'indietro ed è la prima causa di ostruzione.
    Se sospetti un trauma, la stessa manovra si fa proteggendo il rachide cervicale.`,
    list: [
      'Incosciente supino: iperestensione del capo, oppure sublussazione della mandibola se c\'è trauma',
      'Rumori: russamento (lingua), gorgoglio (liquidi), stridore (edema o corpo estraneo)',
      'Se non risolvi la A non passi alla B: è questo che rende l\'ABCDE una gerarchia e non un elenco',
    ],
    quote: 'Il rachide cervicale si protegge già dalla A, non "dopo".',
  },
  {
    key: 'polmoni',
    label: 'Polmoni',
    kicker: 'B — breathing',
    title: 'Polmoni e ventilazione',
    bone: 'Spine1', off: [-0.055, 0.03, 0.055],
    chapter: 'cap-25',
    body: `La ventilazione normale dell'adulto è di 12-16 atti al minuto: sopra 24 è tachipnea, sotto 9
    bradipnea. La saturazione dice quanto ossigeno arriva davvero al sangue, ma è un numero lento:
    scende quando il compenso è già in corso da un po'.`,
    list: [
      'SpO₂ 95-100% normale · 90-95% sorveglia · sotto 90% ipossia',
      'Se c\'è broncospasmo severo l\'ossigeno trova un muro: non entra negli alveoli',
      'Il paziente ortopnoico (seduto, proteso in avanti, braccia puntate) ti dice già dov\'è il problema',
      'Conta gli atti guardando il torace senza dirglielo: se sa di essere contato, cambia ritmo',
    ],
    quote: 'Un paziente agitato va considerato ipossico fino a prova contraria.',
  },
  {
    key: 'cuore',
    label: 'Cuore',
    kicker: 'C — circulation',
    title: 'Cuore e coronarie',
    bone: 'Spine2', off: [0.03, -0.01, 0.06],
    chapter: 'cap-25',
    body: `Il miocardio è un muscolo: per lavorare consuma ossigeno, e glielo portano le coronarie.
    Se una coronaria si occlude, il muscolo a valle lavora in ischemia — è un crampo. Se l'ostruzione
    persiste, quel tessuto muore e non torna indietro.`,
    list: [
      'Angina e infarto nelle prime fasi non si distinguono sul territorio: si trattano allo stesso modo',
      'Non solo trombi: stress ed emozione forte danno vasocostrizione coronarica',
      'Nel dolore toracico il paziente si trasporta SEDUTO — tranne se è pallido e ipoteso',
      'Arresto cardiocircolatorio significa che si ferma la pompa, non per forza l\'attività elettrica',
    ],
    quote: 'In FV l\'attività elettrica c\'è, ma è caotica: nessuna gittata, nessun polso.',
  },
  {
    key: 'aorta',
    label: 'Aorta',
    kicker: 'grandi vasi',
    title: 'Aorta e dissezione',
    bone: 'Spine2', off: [0, 0.05, 0.015],
    chapter: 'cap-25',
    body: `La dissezione aortica è una delle ipotesi da escludere per prime nel dolore toracico: la parete
    del vaso si scolla e il sangue si fa strada nel mezzo. È rara, ma se la manchi il paziente muore.`,
    list: [
      'Fattori di rischio: ipertensione, fumo, connettivopatie',
      'Segno d\'allarme: asimmetria dei polsi — da un lato c\'è, dall\'altro no',
      'Dolore lacerante che migra verso la schiena',
      'In addome basso, una massa pulsante fa pensare all\'aneurisma dell\'aorta addominale',
    ],
    quote: 'Mentalità gerarchica: si parte dall\'ipotesi più grave e si scende, mai il contrario.',
  },
  {
    key: 'cervello',
    label: 'Cervello',
    kicker: 'D — disability',
    title: 'Cervello, coscienza e glicemia',
    bone: 'Head', off: [0, 0.035, 0.035],
    chapter: 'cap-22',
    body: `La coscienza ha due componenti: la <b>vigilanza</b> (occhi aperti, stato di veglia) e il
    <b>contenuto</b> (orientamento su tempo, spazio e persona). Si può essere perfettamente vigili e
    non consapevoli — ed è una condizione grave, non un paziente "un po' confuso".`,
    list: [
      'AVPU: Alert · Vocal · Painful · Unresponsive',
      'Gradi: vigile → confusione → letargia → sopore → stupor → coma',
      'Afasia produttiva: capisce ma non riesce a parlare. Comprensiva: parla ma non ha capito',
      'Davanti a qualunque alterazione della coscienza: <b>glicemia</b>, sempre',
    ],
    quote: '«Come si chiama?» — la risposta ti dice se ha capito la domanda. È il discrimine più utile che c\'è.',
  },
  {
    key: 'addome',
    label: 'Addome',
    kicker: 'dolore viscerale',
    title: 'Addome e irradiazione',
    bone: 'Spine', off: [-0.01, -0.02, 0.062],
    chapter: 'cap-26',
    body: `Negli organi interni i recettori del dolore sono pochi e le vie nervose convergono con quelle
    della cute: il segnale arriva grossolano e il cervello lo attribuisce alla sede sbagliata. Per questo
    il dolore viscerale si irradia, e per questo un infarto può presentarsi come mal di stomaco.`,
    list: [
      'Dolore epigastrico = possibile origine <b>cardiaca</b> fino a prova contraria (infarto inferiore)',
      'Donna in età fertile con dolore ai quadranti bassi: sempre ipotesi ginecologica',
      'Gravidanza possibile fino a prova contraria — l\'ectopica è un\'emergenza emorragica',
      'Emorragia interna: compensa, compensa, poi crolla di colpo',
    ],
    quote: '«Avrà mangiato male» è l\'errore classico: quello è l\'infarto inferiore.',
  },
  {
    key: 'surreni',
    label: 'Surreni',
    kicker: 'risposta di allarme',
    title: 'Scarica adrenergica',
    bone: 'Spine', off: [0.05, 0.0, -0.06],
    chapter: 'cap-27',
    body: `Quando l'organismo percepisce un problema — qualunque esso sia — rilascia adrenalina.
    È vasocostrittrice, tachicardizzante, broncodilatatrice, e spegne tutto ciò che in quel momento
    non serve alla sopravvivenza, digestione compresa.`,
    list: [
      'Pallore · sudorazione algida · tachicardia · respiro profondo · bocca secca · tremori · midriasi',
      'È la STESSA risposta per un infarto e per uno spavento: dice che c\'è un problema, non quale',
      'Riconosci l\'allarme, poi vai a cercare la causa: non collezionare segni',
    ],
    quote: 'Il nervo vago fa l\'opposto: bradicardia, ipotensione, nausea, svuotamento. È la sincope vasovagale.',
  },
  {
    key: 'cute',
    label: 'Cute e polsi',
    kicker: 'perfusione periferica',
    title: 'Cute, polsi e refill',
    bone: 'LeftHand', off: [0.02, 0.01, 0.03],
    chapter: 'cap-29',
    body: `La periferia è il primo distretto che l'organismo sacrifica quando la pressione cala: chiude i
    vasi di cute e mucose per mandare il sangue a cervello e cuore. Per questo la cute è un parametro,
    non un dettaglio estetico.`,
    list: [
      'Pallida, fredda e sudata: vasocostrizione da scarica adrenergica — shock fino a prova contraria',
      'Calda, arrossata ed edematosa con ipotensione: pensa all\'anafilassi, è l\'eccezione',
      'Polso radiale assente ma carotideo presente: pressione già molto bassa',
      'Tocca la schiena, non il torace: dice se la sudorazione è algida o da sforzo',
    ],
    quote: 'FC 125 con PA 80/50 è più grave di FC 62 con PA 180/100: il primo sta compensando.',
  },
];

/* Sedi in cui viene percepito il dolore di origine cardiaca. */
export const PAIN_SITES = [
  { bone: 'Spine2', off: [0, 0, 0.055], r: 0.055, label: 'Retrosternale' },
  { bone: 'Neck', off: [0, 0.03, 0.035], r: 0.032, label: 'Mandibola e collo' },
  { bone: 'LeftArm', off: [0.01, 0.02, 0.01], r: 0.036, label: 'Spalla sinistra' },
  { bone: 'LeftForeArm', off: [0.01, -0.02, 0.01], r: 0.028, label: 'Braccio sinistro' },
  { bone: 'Spine', off: [0, 0.005, 0.06], r: 0.04, label: 'Epigastrio' },
  { bone: 'Spine1', off: [0, 0, -0.055], r: 0.045, label: 'Dorso interscapolare' },
];

/* Dove si vedono addosso i segni della scarica adrenergica. */
export const ADRENERGIC_SITES = [
  { bone: 'Head', off: [0, 0.02, 0.05], r: 0.028, label: 'Pallore del volto' },
  { bone: 'Head', off: [0, 0.05, 0.04], r: 0.022, label: 'Sudorazione algida alla fronte' },
  { bone: 'Head', off: [0.028, 0.025, 0.05], r: 0.013, label: 'Midriasi' },
  { bone: 'Head', off: [-0.028, 0.025, 0.05], r: 0.013, label: 'Midriasi' },
  { bone: 'Head', off: [0, -0.02, 0.055], r: 0.02, label: 'Bocca secca' },
  { bone: 'Spine2', off: [0.03, -0.01, 0.06], r: 0.03, label: 'Tachicardia' },
  { bone: 'LeftHand', off: [0, 0, 0.02], r: 0.026, label: 'Tremori alle mani' },
  { bone: 'RightHand', off: [0, 0, 0.02], r: 0.026, label: 'Cute fredda e umida' },
  { bone: 'Spine1', off: [0, 0, -0.06], r: 0.036, label: 'Sudorazione al dorso' },
];

/* Organi mostrati quando la cute diventa traslucida. */
export const ORGANS = [
  { kind: 'heart', bone: 'Spine2', off: [0.022, -0.005, 0.018], s: 0.032, color: 0xC0303F, label: 'cuore' },
  { kind: 'lung', bone: 'Spine1', off: [0.058, 0.045, 0.006], s: 0.042, color: 0x8FBED2, opacity: 0.42, label: 'polmone sinistro' },
  { kind: 'lung', bone: 'Spine1', off: [-0.058, 0.045, 0.006], s: 0.042, color: 0x8FBED2, opacity: 0.42, label: 'polmone destro' },
  { kind: 'brain', bone: 'Head', off: [0, 0.028, 0.004], s: 0.036, color: 0xD9A2B4, opacity: 0.72, label: 'encefalo' },
  { kind: 'aorta', bone: 'Spine2', off: [0, 0.045, -0.004], s: 0.03, color: 0xB03A48, opacity: 0.88, label: 'aorta' },
  { kind: 'stomach', bone: 'Spine', off: [0.03, 0.022, 0.016], s: 0.026, color: 0xC8A46A, opacity: 0.7, label: 'stomaco' },
  { kind: 'liver', bone: 'Spine', off: [-0.04, 0.024, 0.016], s: 0.032, color: 0x8E5C4B, opacity: 0.7, label: 'fegato' },
  { kind: 'kidney', bone: 'Spine', off: [0.045, -0.01, -0.03], s: 0.018, color: 0x9C5560, opacity: 0.85, label: 'rene sinistro' },
  { kind: 'kidney', bone: 'Spine', off: [-0.045, -0.01, -0.03], s: 0.018, color: 0x9C5560, opacity: 0.85, label: 'rene destro' },
];

/* Posizioni di attesa e trasporto insegnate a lezione. */
export const POSITIONS = [
  {
    key: 'standing', label: 'In piedi', tilt: 0,
    note: 'Vista neutra di riferimento.',
  },
  {
    key: 'seduta', label: 'Semiseduta', tilt: -0.6,
    note: 'Dolore toracico e problemi respiratori: alleggerisce il lavoro del cuore e facilita l\'espansione del torace. È la posizione spontanea del paziente ortopnoico.',
  },
  {
    key: 'supina', label: 'Supina', tilt: -1.5708,
    note: 'Paziente incosciente che respira, oppure superficie rigida per la RCP. Attenzione: nel dispnoico peggiora tutto.',
  },
  {
    key: 'antishock', label: 'Antishock', tilt: -1.83,
    note: 'Supino con gli arti inferiori sollevati: favorisce il ritorno venoso quando la pressione è crollata. Sempre con la coperta: l\'ipotermia peggiora ogni shock.',
  },
];

export const HOME_INFO = {
  kicker: 'modulo corpo',
  title: 'Esplora il paziente',
  body: `Ruota il modello trascinando, avvicina con la rotella. I punti rossi sono le zone approfondite
  a lezione: aprine uno per leggerne la scheda. I livelli qui sotto accendono le mappe che di solito
  vengono solo descritte a voce.`,
  list: [
    '<b>Organi</b> — rende la cute traslucida e mostra cuore, polmoni, encefalo, aorta e addome',
    '<b>Irradiazione</b> — le sedi in cui viene percepito il dolore di origine cardiaca',
    '<b>Segni adrenergici</b> — dove li vedi addosso al paziente, uno per uno',
    '<b>Posizione</b> — come si mette il paziente e perché, secondo il problema',
  ],
  quote: 'Immagina di avere davanti un cruscotto: guarda quali spie sono accese, non una spia sola.',
};
