/* =====================================================================
   fisiologia.js — come sta il paziente, e perché.

   Logica pura: nessun DOM, nessuna dipendenza, nessun orologio. Si
   collauda con `node --test tests/`.

   L'idea portante è che i parametri che vedi sul monitor NON sono
   memorizzati da nessuna parte: si calcolano. Sotto ci sono le riserve
   — quanto sangue, quanto ossigeno, quanto zucchero — che nessuno vede
   mai, e in mezzo c'è il compenso: quello che il corpo fa per restare
   in piedi mentre le riserve si consumano.

   È il motivo per cui un paziente può avere la pressione normale ed
   essere già in mezzo a uno shock: la pressione è l'ultima cosa a
   cedere, non la prima. Vedi Bolognin :6481 e :7636.
   ===================================================================== */

const fra = (v, min, max) => Math.min(max, Math.max(min, v));

/* Il punto di partenza di un adulto sano. Un caso dichiara solo quello
   che gli serve: il resto viene da qui. */
export const RISERVE_ADULTO = {
  volemia: 5000,          // ml — Bolognin :3560, «circa cinque litri»
  ossigenazione: 0.98,    // frazione: quanto ossigeno arriva ai tessuti
  glicemia: 90,           // mg/dl
  contrattilita: 1,       // quanto pompa il cuore, 1 = normale
  tonoVascolare: 1,       // quanto tengono i vasi, 1 = normale
  dolore: 0,              // 0-10
  /* Quello che viene da FUORI: una sostanza simpaticomimetica lo alza,
     il tono vagale lo abbassa. È l'unico termine dell'allarme che un
     caso dichiara: gli altri si calcolano da quello che manca. */
  tonoAutonomo: 0,
};

/** Le riserve all'arrivo della squadra, coi predefiniti per quelle non
    dichiarate. `volemiaIniziale` resta impressa: la perdita è sempre
    relativa a quanto ne aveva questo paziente, non a un valore medio. */
export function riserveIniziali(dichiarate = {}) {
  const r = { ...RISERVE_ADULTO, ...dichiarate };
  return { ...r, volemiaIniziale: r.volemia };
}

/** Quanto sangue ha perso, in frazione di quello che aveva. */
export function perditaVolemica(riserve) {
  const iniziale = riserve.volemiaIniziale || RISERVE_ADULTO.volemia;
  return Math.max(0, (iniziale - riserve.volemia) / iniziale);
}

/* Le soglie della perdita, in frazione della volemia.

   ATTENZIONE ALLA FONTE. Il Bolognin dà solo la soglia pediatrica: il
   bambino compensa fino al 25% e poi crolla (:7636). Per l'adulto le
   soglie 15/30/40 vengono dallo schema ATLS/PTC, che nei manuali che
   abbiamo non c'è: il PTC Base in `tmp/` è la sola integrazione COVID
   2020. Finché non arriva il PTC completo queste tre soglie sono
   ASSUNZIONE NOSTRA, non linea guida. Se il manuale arriva, si
   correggono qui e i test dicono subito cosa cambia. */
export const SOGLIE_PERDITA = {
  compenso: 0.15,
  scompenso: 0.30,
  crollo: 0.40,
};

/** In che fase è il paziente, data la frazione di sangue persa.

    · nessuna   — non si vede niente, nemmeno cercando
    · compenso  — tachicardia e vasocostrizione, ma la PRESSIONE TIENE.
                  È la fase che inganna: i segni ci sono, i numeri no.
    · scompenso — il compenso non basta più, la pressione cede
    · crollo    — verso l'arresto */
export function faseCompenso(perdita) {
  if (perdita >= SOGLIE_PERDITA.crollo) return 'crollo';
  if (perdita >= SOGLIE_PERDITA.scompenso) return 'scompenso';
  if (perdita >= SOGLIE_PERDITA.compenso) return 'compenso';
  return 'nessuna';
}

/* =====================================================================
   L'allarme.

   «Quando l'organismo percepisce un problema — QUALUNQUE problema —
   attiva la risposta di allarme e rilascia adrenalina. I segni
   d'allarme sono aspecifici: dicono che c'è un problema, NON quale.»
   È il capitolo 27 degli appunti, ed è la parte di lezione che l'autore
   segnala come la più preziosa.

   Il motore prima conosceva un solo innesco — il sangue che manca — e
   da lì calcolava la frequenza. Qui gli inneschi sono quattro, più
   quello che arriva da fuori, e sommano su un asse solo: positivo verso
   l'adrenalina, negativo verso il vago.

   Le quattro normalizzazioni sono ASSUNZIONE NOSTRA. Il manuale dice
   che questi fatti allarmano il corpo, non quanto ciascuno pesi
   rispetto agli altri. La sola ancorata è la glicemia: i 70 mg/dl sono
   la soglia di ipoglicemia delle ERC 2025 cap. 12 :1125.
   ===================================================================== */

/* Sotto questa saturazione il corpo comincia a preoccuparsi. */
const OSSIGENAZIONE_TRANQUILLA = 0.95;
const PESO_IPOSSIA = 4;              // ossigenazione 0,70 → un allarme pieno
const SOGLIA_IPOGLICEMIA = 70;       // ERC 2025 cap. 12 :1125
const AMPIEZZA_IPOGLICEMIA = 40;     // glicemia 30 → un allarme pieno

/** L'allarme che NON viene dal sangue che manca.

    Serve separato perché la vasocostrizione da ipovolemia sostiene già
    la pressione dentro `tenutaPressoria`: contarla una seconda volta
    come spinta pressoria sarebbe un doppione. */
export function allarmeEsogeno(riserve = {}) {
  const ossigenazione = riserve.ossigenazione ?? RISERVE_ADULTO.ossigenazione;
  const glicemia = riserve.glicemia ?? RISERVE_ADULTO.glicemia;
  return Math.max(0, OSSIGENAZIONE_TRANQUILLA - ossigenazione) * PESO_IPOSSIA
    + Math.max(0, (SOGLIA_IPOGLICEMIA - glicemia) / AMPIEZZA_IPOGLICEMIA)
    + fra(riserve.dolore || 0, 0, 10) / 10
    + (riserve.tonoAutonomo || 0);
}

/** Quanto il corpo è in allarme, da −1 (vago pieno) a +2.

    Il tetto non è arbitrario: 1 è il compenso che sta per cedere, e una
    scarica simpaticomimetica piena sta più in alto — è il motivo per cui
    un trentenne che ha tirato ha una frequenza più alta di un uomo che
    ha perso un litro e mezzo di sangue. */
export function allarme(riserve = {}) {
  const daPerdita = perditaVolemica(riserve) / SOGLIE_PERDITA.scompenso;
  return fra(daPerdita + allarmeEsogeno(riserve), -1, 2);
}

/* Quanto sale la frequenza a fronte della perdita. Tarato perché a
   metà del compenso (30%) un paziente da 72 arrivi intorno a 120, che
   è quello che si vede sul mezzo. ASSUNZIONE NOSTRA. */
const GUADAGNO_TACHICARDIA = 160;

/* Di quanta perdita in più la pressione si riduce a un terzo, una volta
   che il compenso ha ceduto. La caduta è esponenziale e non lineare per
   un motivo pratico: la pressione non arriva mai a zero da sola: si
   avvicina. Un paziente con la sistolica a zero e la diastolica a zero
   non è un paziente ipoteso, è un paziente in arresto, e a dichiarare
   l'arresto ci pensa `verificaArresto`, non l'aritmetica.
   ASSUNZIONE NOSTRA. */
const CADUTA_PRESSORIA = 0.10;

/* Di quanto la vasocostrizione avvicina la diastolica alla sistolica,
   per punto di perdita. ASSUNZIONE NOSTRA: il Bolognin :6481 dice che
   il differenziale si stringe, non di quanto. */
const STRETTA_DIFFERENZIALE = 0.5;

/* Sotto questa sistolica il polso radiale non si sente più.
   Bolognin :8650, dentro l'algoritmo START. */
const PAS_POLSO_RADIALE = 80;

/** Quanto regge la pressione, da 1 (intatta) a 0 (niente).

    Finché il compenso tiene vale 1: è il punto di tutto il modello. La
    vasocostrizione mantiene la sistolica mentre il sangue se ne va, e
    chi guarda solo il monitor non si accorge di niente. Passata la
    soglia dello scompenso il sostegno cade in fretta. */
function tenutaPressoria(perdita, compensoAttivo) {
  const cede = compensoAttivo ? SOGLIE_PERDITA.scompenso : SOGLIE_PERDITA.compenso;
  if (perdita <= cede) return 1;
  return fra(Math.exp(-(perdita - cede) / CADUTA_PRESSORIA), 0, 1);
}

/* Quanto la posizione cambia il sangue che torna al cuore.

   Non è un dettaglio da manuale: è il motivo per cui a un ipoteso le
   gambe si alzano e non lo si fa mettere seduto. Il sangue che non
   torna al cuore è sangue che il cuore non può mandare al cervello.
   Bolognin :6489 dà la posizione antishock; i coefficienti sono
   ASSUNZIONE NOSTRA. */
export const RITORNO_VENOSO = {
  antishock: +0.15,
  seduta: -0.20,
  'in-piedi': -0.35,
};

/** Il ritorno venoso adesso, dato quello che è stato fatto al paziente. */
export function ritornoVenoso(tag = []) {
  const somma = tag.reduce((acc, x) => acc + (RITORNO_VENOSO[x] || 0), 0);
  return fra(1 + somma, 0.5, 1.3);
}

/**
 * I parametri del circolo, calcolati dalle riserve.
 * @param {object} riserve
 * @param {object} base           i parametri suoi da sano
 * @param {object} modificatori   { compensoBloccato }
 */
export function circolo(riserve, base, modificatori = {}) {
  const perdita = perditaVolemica(riserve);
  const bloccato = Boolean(modificatori.compensoBloccato);

  /* Senza compenso non c'è tachicardia riflessa: il paziente resta
     sulla sua frequenza mentre la pressione se ne va. È il quadro
     della lesione mielica (Bolognin :6487) e quello di chi prende un
     betabloccante. */
  const fc = bloccato
    ? base.fc
    : Math.round(base.fc + GUADAGNO_TACHICARDIA * perdita * riserve.contrattilita);

  /* La posizione agisce sulla TENUTA, non sulla pressione: alzare le
     gambe a chi non ha perso niente non lo fa diventare iperteso, ma a
     chi sta cedendo restituisce qualche mmHg. Per questo si moltiplica
     la tenuta e si tiene il tetto a 1. */
  const tenuta = fra(tenutaPressoria(perdita, !bloccato) * (modificatori.ritornoVenoso ?? 1), 0, 1);

  /* Tre cose fanno la pressione, e ognuna può mancare per conto suo:
     quanto sangue c'è (la tenuta), quanto i vasi lo stringono (il tono),
     e quanto il cuore lo spinge (la contrattilità). Un infartuato ha
     tutto il suo sangue e la pressione che scende lo stesso: è la pompa
     che non ce la fa, e i liquidi lì non servono. */
  const pas = Math.round(base.pas * tenuta * riserve.tonoVascolare * riserve.contrattilita);

  /* La diastolica si tiene in rapporto alla sistolica, e il rapporto si
     alza col compenso: è così che il differenziale si stringe, ed è un
     segno precoce — si legge prima che la sistolica si muova.

     Il rapporto e non la sottrazione, perché sottrarre un differenziale
     fisso a una sistolica che crolla darebbe diastoliche a zero: un
     «40 su 0» non è un paziente grave, è un errore di aritmetica. */
  const rapporto = fra(base.pad / base.pas + STRETTA_DIFFERENZIALE * perdita, 0.4, 0.85);
  const pad = Math.round(Math.max(0, Math.min(pas - 8, pas * rapporto)));

  return {
    fc: fra(fc, 0, 220),
    pas: fra(pas, 0, 300),
    pad: fra(pad, 0, 200),
    polsoRadiale: pas >= PAS_POLSO_RADIALE,
    rapporto,
    perdita,
    fase: faseCompenso(perdita),
  };
}

/* I segni del compenso, che il soccorritore vede solo se li cerca.

   Nessuno di questi compare da solo nel diario: esistono nello stato e
   basta. Ci vuole l'azione che li va a cercare — il test del refill, il
   colorito, la mano sulla cute, la domanda sulla sete. Chi guarda solo
   il monitor non li vede, ed è esattamente l'errore che il banco deve
   far commettere una volta perché non si ripeta sul mezzo.

   L'elenco è quello del Bolognin :6481: alterazione della coscienza,
   tachipnea, pallore con cute fredda e sudorazione algida, tachicardia,
   senso di sete. */
export function segni(riserve, base, modificatori = {}) {
  const perdita = perditaVolemica(riserve);
  const fase = faseCompenso(perdita);

  /* Il refill si allunga con la vasocostrizione periferica: è il segno
     più precoce che si possa misurare, e costa quindici secondi.
     Normale sotto i due secondi — Bolognin :6489. */
  const refill = Number((1.4 + 12 * Math.max(0, perdita - 0.08)).toFixed(1));

  let cute = 'normale';
  if (perdita >= 0.20) cute = 'pallida-fredda-sudata';
  else if (perdita >= 0.10) cute = 'pallida';

  /* La coscienza è l'ultima a cedere, e quando cede è tardi. */
  let coscienza = 'A';
  if (fase === 'crollo') coscienza = 'U';
  else if (perdita >= 0.35) coscienza = 'P';
  else if (fase === 'scompenso') coscienza = 'V';

  /* Nella lesione mielica manca la tachicardia ma NON la vasocostrizione
     sotto il livello della lesione: il pallore c'è lo stesso. */
  return {
    cute,
    refill,
    sete: perdita >= 0.20,
    coscienza,
    tachipnea: perdita >= SOGLIE_PERDITA.compenso,
    fase,
  };
}

/* Quanto il dolore alza frequenza e pressione, per punto di scala.
   ASSUNZIONE NOSTRA: il Bolognin dice che succede (:6481), non di
   quanto. */
const SPINTA_DOLORE_FC = 3.5;
const SPINTA_DOLORE_PAS = 2.5;

const PESO_COSCIENZA = { A: 0, V: 1, P: 2, U: 3 };
const SCALA_COSCIENZA = ['A', 'V', 'P', 'U'];

/** Il peggiore fra due stati di coscienza. */
function peggiore(a, b) {
  return SCALA_COSCIENZA[Math.max(PESO_COSCIENZA[a] ?? 0, PESO_COSCIENZA[b] ?? 0)];
}

/**
 * Tutto quello che un soccorritore può misurare o vedere addosso al
 * paziente, calcolato dalle riserve. Nessuno di questi valori è
 * memorizzato da qualche parte: escono da qui ogni volta.
 */
export function parametriVisibili(riserve, base, modificatori = {}) {
  const c = circolo(riserve, base, modificatori);
  const s = segni(riserve, base, modificatori);

  /* Il dolore tira su frequenza e pressione per via adrenergica: è
     compenso anche quello, e maschera l'ipovolemia. La scala arriva a
     dieci: oltre, il paziente non ha modo di dirtelo. */
  const dolore = fra(riserve.dolore, 0, 10);
  const fc = Math.round(c.fc + dolore * SPINTA_DOLORE_FC);
  const pas = Math.round(c.pas + dolore * SPINTA_DOLORE_PAS);

  const spo2 = Math.round(fra(riserve.ossigenazione * 100, 50, 100));

  /* Si respira più in fretta per due motivi diversi: perché manca
     ossigeno, o perché manca sangue da ossigenare. */
  const fr = Math.round(fra(
    base.fr + (s.tachipnea ? 10 : 0) + Math.max(0, (0.95 - riserve.ossigenazione) * 100),
    0, 60,
  ));

  /* Sotto i 50 di glicemia la coscienza va, e non c'entra niente col
     sangue: è il quadro che si confonde con l'ictus e con l'ubriaco. */
  const daGlicemia = riserve.glicemia < 30 ? 'P' : (riserve.glicemia < 50 ? 'V' : 'A');

  /* Al cervello non interessa quanto sangue è uscito: interessa quanto
     gliene arriva. Chi non ha compenso diventa ipoteso avendo perso
     poco, e la coscienza segue la pressione, non i millilitri. Le
     soglie sono ASSUNZIONE NOSTRA. */
  const daPerfusione = pas < 45 ? 'U' : (pas < 55 ? 'P' : (pas < 75 ? 'V' : 'A'));

  return {
    fc: fra(fc, 0, 220),
    pas: fra(pas, 0, 300),
    /* La diastolica segue la sistolica anche quando è il dolore ad
       alzarla: la scarica adrenergica stringe i vasi, non li apre.
       Mai sotto zero: un monitor non stampa una diastolica negativa. */
    pad: Math.max(0, Math.round(Math.min(fra(pas, 0, 300) * c.rapporto, fra(pas, 0, 300) - 8))),
    spo2,
    fr,
    glicemia: Math.round(riserve.glicemia),
    dolore: Math.round(dolore),
    coscienza: peggiore(peggiore(s.coscienza, daGlicemia), daPerfusione),
    cute: s.cute,
    refill: s.refill,
    sete: s.sete,
    polsoRadiale: c.polsoRadiale,
    fase: c.fase,
    perdita: c.perdita,
  };
}

/* Il ritmo con cui il cuore si ferma dipende da PERCHÉ si è fermato, e
   decide se il defibrillatore serve a qualcosa.

   Un cuore che si ferma perché il miocardio è ischemico va in
   fibrillazione: la scarica ha senso. Un cuore che si ferma perché non
   gli arriva più sangue o più ossigeno continua a produrre attività
   elettrica senza polso, e poi si spegne: la scarica non serve a niente
   e il tempo speso ad attaccare le piastre è tempo tolto alle
   compressioni. È la cosa che si sbaglia più spesso. */
export const RITMO_PER_CAUSA = {
  'ischemia-miocardica': { ritmo: 'fv', defibrillabile: true },
  emorragia: { ritmo: 'pea', defibrillabile: false },
  'ipossia-ventilatoria': { ritmo: 'pea', defibrillabile: false },
  vasodilatazione: { ritmo: 'pea', defibrillabile: false },
  ipoglicemia: { ritmo: 'pea', defibrillabile: false },
};

/* Sotto questa sistolica il circolo non è più compatibile con la vita. */
const PAS_ARRESTO = 40;

/* L'ossigenazione oltre la quale non si torna indietro. Si guarda la
   RISERVA e non il numero del pulsossimetro: sotto il cinquanta per
   cento la sonda al dito non legge più niente di attendibile, e un
   paziente che sta morendo di ipossia non aspetta che il monitor si
   decida. ASSUNZIONE NOSTRA. */
const OSSIGENAZIONE_ARRESTO = 0.45;

/**
 * Il paziente è arrestato? Restituisce `null` se no, altrimenti come e
 * perché.
 *
 * La causa è la prima offesa attiva che sappia uccidere: se sono più
 * d'una vince quella dichiarata per prima nel caso, che è anche quella
 * che il soccorritore dovrebbe aver riconosciuto.
 */
export function verificaArresto(riserve, base, modificatori, offese = []) {
  const p = parametriVisibili(riserve, base, modificatori);
  const senzaCircolo = p.pas < PAS_ARRESTO;
  const senzaOssigeno = riserve.ossigenazione < OSSIGENAZIONE_ARRESTO;
  const senzaPompa = riserve.contrattilita < 0.1;
  if (!senzaCircolo && !senzaOssigeno && !senzaPompa) return null;

  const causa = offese.map((o) => o.tipo).find((tipo) => RITMO_PER_CAUSA[tipo])
    || 'ischemia-miocardica';
  return { causa, ...RITMO_PER_CAUSA[causa] };
}

/* Quanto cala la probabilità di farcela, per ogni minuto che passa.

   Il numero senza RCP è delle linee guida: «ogni minuto di ritardo alla
   defibrillazione è associato a un incremento del 6% di probabilità di
   fallire l'interruzione della FV e a un 3-6% di riduzione della
   probabilità di sopravvivenza alla dimissione» — ERC 2025 cap. 4 :961.
   Si prende il 6%, il caso peggiore.

   Il numero CON la RCP in corso è ASSUNZIONE NOSTRA: le linee guida
   dicono che la rianimazione da parte degli astanti aumenta la
   sopravvivenza, ma un coefficiente al minuto non lo danno. Se si trova
   una fonte che lo quantifichi, si corregge qui. */
const CALO_SENZA_RCP = 0.06;
const CALO_CON_RCP = 0.02;      // assunzione nostra

/**
 * Probabilità di farcela, da 1 a 0, dopo `secondi` dall'arresto.
 * @param {string[]} tag   se contiene 'rcp' le compressioni sono in corso
 */
export function sopravvivenza(secondi, tag = []) {
  const minuti = Math.max(0, secondi / 60);
  const calo = tag.includes('rcp') ? CALO_CON_RCP : CALO_SENZA_RCP;
  return Math.max(0, (1 - calo) ** minuti);
}
