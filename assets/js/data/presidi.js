/* =====================================================================
   presidi.js — i pezzi veri, con le loro misure.

   `azioni.js` dice cosa fai. Qui sta quale pezzo prendi in mano. Sul
   mezzo non esiste «la cannula orofaringea»: esistono sei cannule, ognuna
   con un numero e un colore, e infilare la 5 arancione a una donna minuta
   le spinge la lingua in gola invece di toglierla.

   Ogni misura diventa un'azione vera, con il suo id. Il motore non
   impara niente: un presidio sbagliato è un'azione non indicata, e paga
   il prezzo del superfluo — i suoi secondi — come tutto il resto.

   I nomi, i numeri e i colori vengono dalla check-list ARES 118 —
   allegato 1 «Zaino di soccorso ASI» e allegato 2 «Ambulanza
   infermieristica», IO.42 Rev.1 — che sta in `tmp/check-list
   ambulanza.pdf`, fuori da git. È una scansione: `pdftotext` non ne
   cava niente, si legge a schermo.
   ===================================================================== */

/* Le voci si generano dalla famiglia: le sei Guedel si scrivono una
   volta sola, non sei. Una misura può soprascrivere la durata — i
   presidi dell'ossigeno non si montano tutti nello stesso tempo. */
function vociDi(f) {
  return f.misure.map((m) => ({
    id: m.id,
    cat: f.cat,
    famiglia: f.id,
    misura: m.misura,
    etichettaMisura: m.etichetta,
    colore: m.colore || null,
    label: `${f.label} — ${m.etichetta}`,
    durata: m.durata ?? f.durata,
    chi: [...f.chi],
    diario: f.diario(m),
    spiega: m.spiega,
    ...(f.unaVolta ? { unaVolta: true } : {}),
    ...(f.richiede ? { richiede: f.richiede } : {}),
    ...(f.motivoBloccato ? { motivoBloccato: f.motivoBloccato } : {}),
    ...(f.applica ? { applica: f.applica } : {}),
    ...(m.flusso ? { flusso: m.flusso } : {}),
  }));
}

const FAMIGLIE = [
  /* ---------------------- A: la cannula di Guedel ------------------- */
  {
    id: 'guedel',
    spiega: 'Tiene la lingua staccata dalla parete posteriore. Sei misure: quella giusta si prende sul paziente, non a occhio.',
    cat: 'A',
    label: 'Cannula orofaringea',
    durata: 25,
    chi: ['tu'],
    /* Niente `unaVolta`: le voci sono sei e `unaVolta` vale per una sola
       di loro. Quello che serve è che dopo la prima non se ne metta
       un'altra, e lo dice il tag che la prima ha lasciato. */
    richiede: (p) => (p.coscienza === 'P' || p.coscienza === 'U') && !p.tag.includes('cannula'),
    motivoBloccato: (p) => (p.tag.includes('cannula')
      ? 'Una cannula è già in sede.'
      : 'Il paziente ha ancora il riflesso faringeo: la vomiterebbe.'),
    applica: () => ({ viePervie: true, tag: 'cannula' }),
    comeSiMisura: 'Dagli incisivi all\'angolo della mandibola, oppure dal lobo '
      + 'dell\'orecchio all\'angolo della bocca.',
    fonteMisura: 'Bolognin :5428 e :5938',
    diario: (m) => `Cannula orofaringea ${m.etichetta} inserita con la concavità in alto e ruotata di 180°.`,
    misure: [
      {
        id: 'cannula-0', misura: 0, etichetta: 'mis. 0 nera', colore: '#1b1b1b',
        spiega: 'La più corta: neonato e lattante. In un adulto non arriva nemmeno alla base della lingua.',
      },
      {
        id: 'cannula-1', misura: 1, etichetta: 'mis. 1 bianca', colore: '#e8e8e8',
        spiega: 'Bambino piccolo. Su un adulto resta corta: spinge la lingua invece di scavalcarla.',
      },
      {
        id: 'cannula-2', misura: 2, etichetta: 'mis. 2 verde', colore: '#2f9e44',
        spiega: 'L\'adulto minuto: donna di corporatura piccola, anziano magro, mandibola corta.',
      },
      {
        id: 'cannula-3', misura: 3, etichetta: 'mis. 3 gialla', colore: '#f0c000',
        spiega: 'La misura dell\'adulto medio, quella da cui si parte quando non hai modo di misurare.',
      },
      {
        id: 'cannula-4', misura: 4, etichetta: 'mis. 4 rossa', colore: '#d64545',
        spiega: 'L\'adulto robusto: collo grosso, mandibola grande, corporatura importante.',
      },
      {
        id: 'cannula-5', misura: 5, etichetta: 'mis. 5 arancione', colore: '#ef8b3a',
        spiega: 'La più lunga. Su un adulto medio supera la base della lingua e la spinge in gola.',
      },
    ],
  },

  /* ------------------- A: il sondino di aspirazione ----------------- */
  {
    id: 'sondino',
    spiega: 'Si aspira solo quello che si vede, in uscita, mai più di dieci secondi. Il calibro dipende dalle secrezioni e dalla corporatura.',
    cat: 'A',
    label: 'Aspira le secrezioni',
    durata: 40,
    chi: ['tu'],
    richiede: (p) => p.tag.includes('aspiratore-pronto'),
    motivoBloccato: 'L\'aspiratore non è ancora pronto.',
    applica: () => ({ viePervie: true, spo2: +2 }),
    comeSiMisura: 'Il calibro si sceglie sulle secrezioni e sulla corporatura; la '
      + 'lunghezza utile non supera la distanza fra il lobo dell\'orecchio e l\'angolo '
      + 'della mandibola. Mai più di dieci secondi di seguito.',
    fonteMisura: 'Bolognin :2852-2862',
    diario: (m) => `Cavo orale aspirato col sondino ${m.etichetta}, in uscita e a movimenti circolari.`,
    misure: [
      {
        id: 'sondino-6', misura: 6, etichetta: 'CH 6',
        spiega: 'Il più sottile, per il lattante. In un adulto si intasa al primo grumo.',
      },
      {
        id: 'sondino-10', misura: 10, etichetta: 'CH 10',
        spiega: 'Pediatrico. Sull\'adulto passa, ma le secrezioni dense non ci salgono.',
      },
      {
        id: 'sondino-16', misura: 16, etichetta: 'CH 16',
        spiega: 'Il calibro dell\'adulto: passa il vomito senza traumatizzare le mucose.',
      },
      {
        id: 'sondino-18', misura: 18, etichetta: 'CH 18',
        spiega: 'Adulto con secrezioni abbondanti o dense. Più grosso aspira di più e irrita di più.',
      },
    ],
  },

  /* ---------------------- B: i presidi dell'ossigeno ---------------- */
  {
    id: 'ossigeno',
    spiega: 'Quanto ossigeno serve decide il presidio, e il presidio decide il flusso: dagli occhialini al reservoir cambia la percentuale che arriva.',
    cat: 'B',
    label: 'Ossigeno',
    durata: 30,
    chi: ['tu', 'autista'],
    /* Qui `unaVolta` ci sta: ogni presidio si mette una volta, ma
       cambiarlo strada facendo è lecito — ed è anzi quello che si fa
       quando il paziente migliora o peggiora. */
    unaVolta: true,
    applica: () => ({ tag: 'o2' }),
    comeSiMisura: 'Il presidio si sceglie su quanto ossigeno serve, e ognuno ha il suo '
      + 'flusso: sotto i 4 l/min la maschera semplice fa rirespirare anidride carbonica, '
      + 'sopra i 12 il reservoir eroga il 100%.',
    fonteMisura: 'Bolognin :3251-3270',
    diario: (m) => `Ossigeno: ${m.etichetta}.`,
    misure: [
      {
        id: 'o2-occhialini', misura: 4, etichetta: 'occhialini, 2-4 l/min', flusso: 4,
        spiega: 'Massimo 4 l/min o si secca il naso: danno il 36%, e vanno a chi respira bene.',
      },
      {
        id: 'o2-maschera', misura: 8, etichetta: 'maschera semplice, 6-8 l/min', flusso: 8,
        spiega: 'Dal 35 al 60%. Mai sotto i 4 l/min: senza ricambio si accumula anidride carbonica.',
      },
      {
        id: 'o2-venturi', misura: 8, etichetta: 'maschera Venturi', flusso: 8, durata: 35,
        spiega: 'L\'ugello miscela aria e ossigeno a percentuale nota: è il presidio del BPCO, che con alte concentrazioni ipoventila.',
      },
      {
        id: 'o2-reservoir', misura: 15, etichetta: 'reservoir (BLB), 12-15 l/min', flusso: 15, durata: 40,
        spiega: 'Sopra i 12 l/min eroga il 100%. Il pallone va gonfio prima di mettere la maschera.',
      },
      {
        id: 'o2-nebulizzatore', misura: 8, etichetta: 'con nebulizzatore, 6-8 l/min', flusso: 8, durata: 40,
        spiega: 'La maschera che vaporizza il farmaco: la monti tu, la fiala la mette l\'infermiere.',
      },
    ],
  },

  /* ------------------ C: l'agocannula per l'infermiere -------------- */
  {
    id: 'ago',
    spiega: 'Tu prepari, l\'infermiere punge. Il calibro decide quanti millilitri al minuto passano: si sceglie su quanto c\'è da riempire.',
    cat: 'C',
    label: 'Prepara il materiale per l\'accesso venoso',
    durata: 45,
    chi: ['tu', 'autista'],
    richiede: (p) => !p.tag.includes('ev-pronto'),
    motivoBloccato: 'Il materiale è già pronto sul telo.',
    applica: () => ({ tag: 'ev-pronto' }),
    comeSiMisura: 'Numero e colore sono universali. Dal calibro più grosso, che lascia '
      + 'passare più liquido al minuto, al più sottile.',
    fonteMisura: 'Bolognin :10448',
    diario: (m) => `Laccio, agocannula ${m.etichetta}, garza, cerotti e deflussore pronti sul telo.`,
    misure: [
      {
        id: 'ago-14', misura: 14, etichetta: '14 G arancione', colore: '#ef8b3a',
        spiega: 'Il più grosso: massimo flusso al minuto. Dove serve riempire in fretta.',
      },
      {
        id: 'ago-16', misura: 16, etichetta: '16 G grigio', colore: '#9aa0a6',
        spiega: 'Grosso e più facile da far entrare del 14: lo standard quando serve volume.',
      },
      {
        id: 'ago-18', misura: 18, etichetta: '18 G verde', colore: '#2f9e44',
        spiega: 'La via di mezzo: il paziente medico stabile a cui serve una via, non un travaso.',
      },
      {
        id: 'ago-20', misura: 20, etichetta: '20 G rosa', colore: '#ef9bbd',
        spiega: 'Sottile: vene fragili dell\'anziano, quando basta avere una via aperta.',
      },
    ],
  },
];

/** Le voci pronte da spargere nel catalogo delle azioni. */
export const VOCI_PRESIDI = FAMIGLIE.flatMap(vociDi);

/** Gli id di una famiglia, nell'ordine: i casi li usano invece di
    riscriverli a mano, e la palette ci si appoggia per l'ordine. */
export const IDS = Object.fromEntries(
  FAMIGLIE.map((f) => [f.id, f.misure.map((m) => m.id)]),
);

/** Quello che serve alla palette per disegnare la carta delle misure. */
export const FAMIGLIE_META = Object.fromEntries(FAMIGLIE.map((f) => [f.id, {
  id: f.id,
  cat: f.cat,
  label: f.label,
  spiega: f.spiega,
  comeSiMisura: f.comeSiMisura,
  fonteMisura: f.fonteMisura,
  ids: f.misure.map((m) => m.id),
}]));

/** Le voci di una famiglia, per id. */
export const vociDellaFamiglia = (idFamiglia) => VOCI_PRESIDI
  .filter((v) => v.famiglia === idFamiglia);
