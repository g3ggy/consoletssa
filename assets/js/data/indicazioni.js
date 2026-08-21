/* =====================================================================
   indicazioni.js — quando si fa cosa.

   `azioni.js` dice COME si fa un gesto: quanto dura, chi lo può fare,
   cosa scrive nel diario. Qui sta l'altra metà, che è materiale clinico
   e porta la fonte accanto: QUANDO quel gesto ha senso.

   Un'azione che non compare qui è sempre lecita. Si scrive
   un'indicazione solo dove il manuale ha una regola vera e dove
   sbagliare si vede sul mezzo.

   IL VINCOLO, che vale per ogni predicato qui dentro: `quando` riceve
   soltanto quello che il soccorritore PUÒ SAPERE in quell'istante —
   la coscienza, i parametri che ha già misurato, quello che l'anamnesi
   gli ha dato, cosa ha già fatto, che tipo di caso è. Mai lo stato vero
   del paziente. Se `misura-glicemia` fosse «indicata quando la glicemia
   sta sotto 70», leggerebbe il numero che si ottiene facendo proprio
   quel gesto: il banco ti direbbe che dovevi misurarla solo dopo che
   l'hai misurata.

   Le righe citate come `Bolognin :N` sono del testo estratto in
   `tmp/testi/Manuale-TSSA-2022_cW6HYJE.txt`, fuori da git. La mappa sta
   in `tmp/testi/FONTI.md`.
   ===================================================================== */

export const INDICAZIONI = {

  /* ---------------------------- A: vie aeree ---------------------- */

  aspira: {
    quando: (c) => c.coscienza !== 'A'
      || c.saputo.vomito || c.saputo.secrezioni || c.tag.includes('vomito'),
    perche: 'Si aspira quando c\'è qualcosa da togliere: vomito, sangue, '
      + 'secrezioni. Su vie aeree pulite l\'aspirazione non serve e '
      + 'stimola il riflesso faringeo.',
    fonte: 'Bolognin :2835-2864',
  },

  collare: {
    quando: (c) => c.caso.tipo === 'trauma',
    perche: 'Il collare serve dove c\'è un trauma o una dinamica che possa '
      + 'aver coinvolto il rachide. Su un paziente medico, seduto dove '
      + 'l\'hai trovato, è un minuto perso e un collo bloccato per niente.',
    fonte: 'Bolognin :5564-5570',
  },

  /* ---------------------------- B: respiro ------------------------- */

  /* I tre presidi dell'ossigeno hanno la stessa indicazione di fondo —
     serve ossigeno — ma flussi diversi, e il presidio giusto dipende da
     quanto ne serve. Il Bolognin :2786-2800 è esplicito su una cosa che
     conta più delle soglie: «il saturimetro non deve sostituire la
     nostra osservazione e valutazione». Per questo ogni predicato
     accetta anche il paziente che si VEDE respirare male, senza numero:
     aspettare il saturimetro per dare ossigeno a un dispnoico grave
     sarebbe la lezione sbagliata. */

  'o2-occhialini': {
    quando: (c) => (c.letture.spo2 !== undefined && c.letture.spo2 < 94 && c.letture.spo2 >= 90)
      || (c.letture.spo2 === undefined && c.saputo.dispnea),
    perche: 'Gli occhialini danno pochi litri: vanno bene per una '
      + 'desaturazione lieve. Se la saturazione è sotto 90 non bastano, e '
      + 'se sta sopra 94 non serviva niente.',
    fonte: 'Bolognin :2786-2800',
  },

  'o2-maschera': {
    quando: (c) => (c.letture.spo2 !== undefined && c.letture.spo2 < 94)
      || (c.letture.spo2 === undefined && c.saputo.dispnea),
    perche: 'La maschera si mette a chi ha la saturazione sotto 94, o a chi '
      + 'lo vedi respirare male prima ancora di misurarla. Su un paziente '
      + 'che parla a frasi complete con 98 di saturazione non cambia niente.',
    fonte: 'Bolognin :2786-2800',
  },

  'o2-reservoir': {
    quando: (c) => (c.letture.spo2 !== undefined && c.letture.spo2 < 90)
      || c.coscienza !== 'A'
      || (c.letture.spo2 === undefined && c.saputo.dispnea),
    perche: 'Il reservoir è l\'alto flusso: si tiene per chi è davvero '
      + 'ipossico, sotto 90, o per chi non è vigile. Metterlo a chi ha una '
      + 'desaturazione lieve consuma la bombola e non aggiunge nulla.',
    fonte: 'Bolognin :2786-2800',
  },

  /* ---------------------------- C: circolo -------------------------- */

  laccio: {
    quando: (c) => Boolean(c.saputo['emorragia-esterna']) || c.caso.tipo === 'trauma',
    perche: 'Il laccio emostatico è per un\'emorragia esterna di un arto che '
      + 'non si ferma con la compressione. Senza sangue che esce non c\'è '
      + 'niente da stringere.',
    fonte: 'Bolognin :8059-8071',
  },

  compressione: {
    quando: (c) => Boolean(c.saputo['emorragia-esterna']) || c.caso.tipo === 'trauma',
    perche: 'La compressione diretta si fa dove esce il sangue. Su un '
      + 'paziente che non sanguina all\'esterno non c\'è punto da comprimere.',
    fonte: 'Bolognin :8015-8030',
  },

  /* Il Bolognin descrive per esteso il quadro del dolore toracico
     (:3680-3700) e i compiti del soccorritore (:3750-3760), ma non dice
     mai a chi si fa un tracciato a dodici derivazioni: quello è
     materiale del monitor, non del corso. La soglia qui sotto è nostra,
     scelta sui casi in cui il tracciato cambia davvero la destinazione —
     dolore o oppressione, cardiopalmo, sincope — più una frequenza che
     da sola è già qualcosa da guardare. */
  'ecg-elettrodi': {
    quando: (c) => Boolean(c.saputo['oppressione-toracica'] || c.saputo['dolore-toracico']
      || c.saputo.cardiopalmo || c.saputo.sincope)
      || (c.letture.fc !== undefined && (c.letture.fc > 120 || c.letture.fc < 50)),
    perche: 'Le dodici derivazioni si fanno per un sospetto cardiologico: '
      + 'dolore toracico, cardiopalmo, sincope, un\'aritmia sul monitor. '
      + 'Sono due minuti buoni, e su un caso che non c\'entra col cuore '
      + 'sono due minuti tolti a quello che serve.',
    fonte: 'ASSUNZIONE NOSTRA — il quadro sta in Bolognin :3680-3700, la soglia no',
  },

  'ecg-esegui': {
    quando: (c) => c.tag.includes('ecg'),
    perche: 'Il tracciato si acquisisce dopo aver messo gli elettrodi: senza '
      + 'quelli non c\'è niente da registrare.',
    fonte: 'conseguenza tecnica, non clinica',
  },

  antishock: {
    quando: (c) => (c.letture.pas !== undefined && c.letture.pas < 100)
      || Boolean(c.saputo.sincope) || c.tag.includes('shock'),
    perche: 'La posizione antishock serve a chi ha la pressione bassa o è '
      + 'appena svenuto. A un normoteso non fa niente, e a un dispnoico o a '
      + 'un dolore toracico si sta togliendo la posizione che lo aiuta.',
    fonte: 'Bolognin :3906-3918 e :4321',
  },

  'dae-piastre': {
    quando: (c) => c.coscienza === 'U' || c.tag.includes('arresto'),
    perche: 'Le piastre si attaccano a chi non risponde e non respira. Su un '
      + 'paziente cosciente non c\'è niente da analizzare.',
    fonte: 'ERC 2025 cap. 4 — algoritmo BLS-D',
  },

  /* ------------------------- valutazione ---------------------------- */

  'misura-temp': {
    quando: (c) => Boolean(c.saputo.febbre || c.saputo.infezione)
      || c.tag.includes('freddo') || c.caso.tipo === 'trauma',
    perche: 'La temperatura si misura se sospetti un\'infezione, se il '
      + 'paziente è stato al freddo, o in un trauma dove l\'ipotermia è una '
      + 'delle cose che uccidono. Fuori da lì è un numero che non usi.',
    fonte: 'Bolognin :4451 (febbre), :2820 (ipotermia), :6342 (la E del trauma)',
  },

  refill: {
    quando: (c) => (c.letture.pas !== undefined && c.letture.pas < 110)
      || c.letture.cute === 'pallida' || c.letture.cute === 'pallida, fredda, sudata'
      || c.caso.tipo === 'trauma' || Boolean(c.saputo['emorragia-esterna']),
    perche: 'Il refill è un segno di compenso: si cerca dove sospetti che '
      + 'manchi volume. Su chi ha pressione e colorito normali dice sempre '
      + '«sotto i due secondi», e non ti ha insegnato niente.',
    fonte: 'Bolognin :6489 e :6470-6490',
  },

  'chiedi-sete': {
    quando: (c) => (c.letture.pas !== undefined && c.letture.pas < 110)
      || c.letture.cute === 'pallida' || c.letture.cute === 'pallida, fredda, sudata'
      || c.caso.tipo === 'trauma' || Boolean(c.saputo['emorragia-esterna']),
    perche: 'La sete è uno dei segni dell\'ipovolemia, e come gli altri si '
      + 'cerca quando hai un motivo per sospettarla.',
    fonte: 'Bolognin :6470-6490',
  },

  /* ---------------------------- D: coscienza ------------------------ */

  'misura-glicemia': {
    quando: (c) => c.coscienza !== 'A'
      || Boolean(c.saputo.diabetico || c.saputo.insulina || c.saputo.deficit),
    perche: 'La glicemia si misura a chi ha la coscienza alterata, a un '
      + 'diabetico noto, o davanti a un deficit neurologico — perché '
      + 'un\'ipoglicemia imita l\'ictus e va esclusa. A un paziente vigile e '
      + 'orientato, senza niente che punti da quella parte, il numero non '
      + 'cambia quello che fai.',
    fonte: 'ERC 2025 cap. 12 :1125',
  },

  'esame-neurologico': {
    quando: (c) => c.coscienza !== 'A'
      || Boolean(c.saputo.deficit || c.saputo.afasia || c.saputo['esordio-improvviso']),
    perche: 'I tre segni di Cincinnati si cercano davanti a un sospetto '
      + 'neurologico: un deficit riferito, un eloquio strano, un esordio '
      + 'improvviso. Su un dolore toracico non aggiungono niente.',
    fonte: 'Bolognin :4112-4125',
  },

  'zucchero-os': {
    quando: (c) => c.letture.glicemia !== undefined && c.letture.glicemia < 70,
    perche: 'Lo zucchero per bocca si dà a un\'ipoglicemia MISURATA. Darlo a '
      + 'naso, senza il numero, vuol dire non sapere se stai trattando la '
      + 'cosa giusta — e a chi non deglutisce bene è pericoloso.',
    fonte: 'ERC 2025 cap. 12 :1125',
  },

  autoiniettore: {
    quando: (c) => Boolean(c.saputo.anafilassi || c.saputo.puntura
      || c.saputo['allergia-nota'] || c.saputo.orticaria),
    perche: 'L\'autoiniettore di adrenalina è per una reazione anafilattica: '
      + 'esposizione a un allergene più segni sistemici. Fuori da quel '
      + 'quadro non è il presidio giusto.',
    fonte: 'ERC 2021 cap. 6 — anafilassi',
  },

  /* --------------------------- E: esposizione ----------------------- */

  esposizione: {
    quando: (c) => c.caso.tipo === 'trauma' || c.coscienza !== 'A',
    perche: 'Si scopre un paziente per vedere quello che addosso non si '
      + 'vede: ferite, ematomi, il segno della cintura. Su un medico '
      + 'vigile che ti racconta tutto è un minuto perso e una persona '
      + 'esposta al freddo e agli sguardi.',
    fonte: 'Bolognin :6342 — la E di EXPOSURE nell\'ABCDE del trauma',
  },

  /* --------------------------- immobilizzo -------------------------- */

  spinale: {
    quando: (c) => c.caso.tipo === 'trauma',
    perche: 'La tavola spinale è per il trauma. Tre minuti su un paziente '
      + 'medico sono tre minuti tolti a quello che gli serve davvero, e un '
      + 'paziente immobilizzato senza motivo sta peggio, non meglio.',
    fonte: 'Bolognin :5564-5570',
  },

  ked: {
    quando: (c) => c.caso.tipo === 'trauma',
    perche: 'Il KED serve a estrarre da un veicolo un traumatizzato stabile. '
      + 'Fuori da quella situazione sono quattro minuti buttati.',
    fonte: 'Bolognin :9301-9307',
  },

  materassino: {
    quando: (c) => c.caso.tipo === 'trauma',
    perche: 'Il materassino a depressione immobilizza un traumatizzato per il '
      + 'trasporto. Su un paziente medico non c\'è niente da immobilizzare.',
    fonte: 'Bolognin :9420-9431',
  },

  steccobenda: {
    quando: (c) => c.caso.tipo === 'trauma' || Boolean(c.saputo.frattura),
    perche: 'La steccobenda immobilizza un arto che si sospetta fratturato. '
      + 'Senza un arto da immobilizzare non serve.',
    fonte: 'Bolognin :6999-7007 e :9477-9490',
  },
};
