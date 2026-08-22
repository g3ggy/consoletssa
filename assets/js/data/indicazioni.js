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

/* ------------------------- i presidi con la misura ------------------ */

/* Il manuale dà la MISURAZIONE della cannula — incisivi/angolo della
   mandibola (:5428), lobo/angolo della bocca (:5938) — e non dà la
   tabella che lega il numero al paziente. La mappa qui sotto è nostra. */
const GUEDEL_PER_CORPORATURA = { minuta: 2, media: 3, robusta: 4 };

const guedel = (n) => ({
  quando: (c) => GUEDEL_PER_CORPORATURA[c.caso.corporatura || 'media'] === n,
  perche: 'Non è la misura di questo paziente. La cannula si sceglie sulla '
    + 'corporatura e si controlla misurandola: corta non scavalca la lingua, '
    + 'lunga la spinge in gola — e una cannula che spinge la lingua fa il '
    + 'contrario di quello per cui l\'hai messa.',
  fonte: 'Bolognin :5428 e :5938 per la misurazione — la mappa corporatura → numero è ASSUNZIONE NOSTRA',
});

/* Si aspira quando c'è qualcosa da togliere: è la regola che valeva per
   l'unica `aspira` di prima, e vale identica per tutti e quattro i
   calibri. Sopra ci sta il calibro. */
const cEQualcosaDaAspirare = (c) => c.coscienza !== 'A'
  || c.saputo.vomito || c.saputo.secrezioni || c.tag.includes('vomito');

const sondino = (ch) => ({
  quando: (c) => cEQualcosaDaAspirare(c) && (ch === 16 || ch === 18),
  perche: (ch === 16 || ch === 18)
    ? 'Su vie aeree pulite l\'aspirazione non serve, e stimola il riflesso faringeo.'
    : 'Il calibro si sceglie sulle secrezioni e sulla corporatura: il 6 e il 10 sono '
      + 'per il bambino. In un adulto si intasano al primo grumo, e mentre li lavi il '
      + 'paziente continua ad avere roba in bocca.',
  fonte: 'Bolognin :2852-2862',
});

/* «Dal calibro più grosso, che lascia passare cioè un flusso maggiore di
   liquido al minuto, al più piccolo» (:10448). Da lì la regola: dove il
   problema è il volume si prepara grosso. Quali quadri siano «di volume»
   è nostro, e sta tutto in questa riga. */
const serveVolume = (c) => c.caso.tipo === 'trauma'
  || Boolean(c.saputo['emorragia-esterna'])
  || (c.letture.pas !== undefined && c.letture.pas < 100)
  || c.tag.includes('antishock') || c.tag.includes('laccio') || c.tag.includes('compressione');

const ago = (g) => ({
  quando: (c) => (serveVolume(c) ? (g === 14 || g === 16) : (g === 18 || g === 20)),
  perche: (g === 14 || g === 16)
    ? 'Il calibro grosso si prepara dove serve riempire in fretta: trauma, '
      + 'emorragia, pressione bassa. Su un paziente stabile a cui basta una via '
      + 'è più difficile da far entrare, e non serve a niente di più.'
    : 'Qui il problema è il volume, e il calibro decide quanti millilitri al '
      + 'minuto passano. Un 18 o un 20 in un paziente da riempire è una via '
      + 'aperta che non travasa: prepara il 14 o il 16.',
  fonte: 'Bolognin :10448 — quali quadri chiedano volume è ASSUNZIONE NOSTRA',
});

/* Nel dolore toracico l'ossigeno è nella lista dei compiti del soccorritore —
   «somministrare O2 secondo i protocolli locali» (Bolognin :3761) — e il
   manuale mette gli occhialini proprio lì, «supporto terapeutico (es. dolore
   toracico, episodio sincopale...)» (:3254). Vale anche col saturimetro a
   posto, ed è il motivo per cui questa clausola sta accanto alle soglie e non
   dentro.

   ATTENZIONE, le due fonti non dicono la stessa cosa: le ERC 2025 cap. 12 :154
   dicono di titolare l'ossigeno per stare fra 94 e 98%, e a quel paziente lì
   non ne servirebbe. Il corso è sul Bolognin e il protocollo è quello locale,
   quindi il banco segue il manuale — ma il presidio resta una scelta, e il
   reservoir a chi satura 95 continua a essere alto flusso per niente. */
const doloreToracico = (c) => Boolean(c.saputo['dolore-toracico'] || c.saputo['oppressione-toracica']);

export const INDICAZIONI = {

  /* ---------------------------- A: vie aeree ---------------------- */

  /* --------------------- A: la cannula di Guedel ------------------- */

  'cannula-0': guedel(0),
  'cannula-1': guedel(1),
  'cannula-2': guedel(2),
  'cannula-3': guedel(3),
  'cannula-4': guedel(4),
  'cannula-5': guedel(5),

  /* ------------------- A: il sondino di aspirazione ----------------- */

  'sondino-6': sondino(6),
  'sondino-10': sondino(10),
  'sondino-16': sondino(16),
  'sondino-18': sondino(18),

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
      || (c.letture.spo2 === undefined && c.saputo.dispnea)
      || doloreToracico(c),
    perche: 'Gli occhialini danno pochi litri: vanno bene per una '
      + 'desaturazione lieve, o come supporto in un dolore toracico. Se la '
      + 'saturazione è sotto 90 non bastano, e su un paziente che respira '
      + 'bene e non ha dolore al petto non serviva niente.',
    fonte: 'Bolognin :2786-2800, e :3254 per il dolore toracico',
  },

  'o2-maschera': {
    quando: (c) => (c.letture.spo2 !== undefined && c.letture.spo2 < 94)
      || (c.letture.spo2 === undefined && c.saputo.dispnea)
      || doloreToracico(c),
    perche: 'La maschera si mette a chi ha la saturazione sotto 94, a chi lo '
      + 'vedi respirare male prima ancora di misurarla, o a un dolore '
      + 'toracico. Su un paziente che parla a frasi complete con 98 di '
      + 'saturazione e nessun dolore al petto non cambia niente.',
    fonte: 'Bolognin :2786-2800, e :3761 per il dolore toracico',
  },

  /* Il trauma è l'eccezione, e ha una fonte sua: il Bolognin :6424-6427
     mette il reservoir a 12-15 l/min sul traumatizzato in respiro
     spontaneo, «da regolare per ottenere un range di saturimetria tra il
     94% e il 98%». Prima di aver messo il saturimetro non sai quanto ne
     serve, e in un trauma non aspetti di saperlo. Dopo sì: se il numero
     c'è, vale il numero. */
  'o2-reservoir': {
    quando: (c) => (c.letture.spo2 !== undefined && c.letture.spo2 < 90)
      || c.coscienza !== 'A'
      || (c.letture.spo2 === undefined && (c.saputo.dispnea || c.caso.tipo === 'trauma')),
    perche: 'Il reservoir è l\'alto flusso: si tiene per chi è davvero '
      + 'ipossico, sotto 90, per chi non è vigile, o per il traumatizzato a '
      + 'cui la saturazione non l\'hai ancora presa. Metterlo a chi ha una '
      + 'desaturazione lieve consuma la bombola e non aggiunge nulla.',
    fonte: 'Bolognin :2786-2800 e :6424-6427 (il trauma)',
  },

  /* Il Venturi non è un presidio «più preciso» degli altri: è il
     presidio di un problema, l'ipercapnia. Il Bolognin :3264-3270 lo dà
     «indispensabile per l'erogazione a lungo termine dei pazienti con
     BPCO, i quali possono andare incontro ad ipoventilazione nel caso
     venga somministrato ossigeno ad alte concentrazioni». */
  'o2-venturi': {
    quando: (c) => Boolean(c.saputo.bpco || c.saputo['broncopneumopatia'] || c.saputo.ossigenoDomicilio),
    perche: 'Il Venturi serve dove l\'alta concentrazione è pericolosa: il '
      + 'bronchitico cronico che ipoventila se gli dai troppo ossigeno. Su '
      + 'chiunque altro è un presidio più lento da montare che non aggiunge '
      + 'niente al reservoir.',
    fonte: 'Bolognin :3264-3270',
  },

  'o2-nebulizzatore': {
    quando: (c) => Boolean(c.saputo.sibili || c.saputo.broncospasmo || c.saputo.bpco || c.saputo.asma),
    perche: 'La maschera col nebulizzatore serve a vaporizzare un farmaco: '
      + 'senza broncospasmo da trattare è una maschera semplice montata più '
      + 'lentamente.',
    fonte: 'Bolognin :3264 (i presidi) — l\'indicazione al farmaco inalato è del broncospasmo',
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

  /* -------------------- C: l'agocannula per l'accesso ---------------- */

  'ago-14': ago(14),
  'ago-16': ago(16),
  'ago-18': ago(18),
  'ago-20': ago(20),

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
    /* La sincope conta anche se adesso il paziente è vigile: una perdita
       di coscienza c'è stata, e l'ipoglicemia è una delle cause che la
       spiegano. Trovarlo sveglio non la esclude, la nasconde. */
    quando: (c) => c.coscienza !== 'A'
      || Boolean(c.saputo.diabetico || c.saputo.insulina || c.saputo.deficit
        || c.saputo.sincope),
    perche: 'La glicemia si misura a chi ha la coscienza alterata o l\'ha '
      + 'persa poco fa, a un diabetico noto, o davanti a un deficit '
      + 'neurologico — perché un\'ipoglicemia imita l\'ictus e va esclusa. A '
      + 'un paziente vigile e orientato, senza niente che punti da quella '
      + 'parte, il numero non cambia quello che fai.',
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
