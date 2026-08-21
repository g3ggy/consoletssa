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

/* Il punto di partenza di un adulto sano. Un caso dichiara solo quello
   che gli serve: il resto viene da qui. */
export const RISERVE_ADULTO = {
  volemia: 5000,          // ml — Bolognin :3560, «circa cinque litri»
  ossigenazione: 0.98,    // frazione: quanto ossigeno arriva ai tessuti
  glicemia: 90,           // mg/dl
  contrattilita: 1,       // quanto pompa il cuore, 1 = normale
  tonoVascolare: 1,       // quanto tengono i vasi, 1 = normale
  dolore: 0,              // 0-10
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

/* Sotto questa sistolica il polso radiale non si sente più.
   Bolognin :8650, dentro l'algoritmo START. */
const PAS_POLSO_RADIALE = 80;

const fra = (v, min, max) => Math.min(max, Math.max(min, v));

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

  const tenuta = tenutaPressoria(perdita, !bloccato);
  const pas = Math.round(base.pas * tenuta * riserve.tonoVascolare);

  /* La diastolica non segue la sistolica: durante il compenso la
     vasocostrizione la alza, e il differenziale si stringe. È un segno
     precoce, e si legge prima che la sistolica si muova. */
  const differenziale = Math.max(12, (base.pas - base.pad) * (1 - perdita));
  const pad = Math.round(Math.max(0, Math.min(pas - 8, pas - differenziale)));

  return {
    fc: fra(fc, 0, 220),
    pas: fra(pas, 0, 300),
    pad: fra(pad, 0, 200),
    polsoRadiale: pas >= PAS_POLSO_RADIALE,
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
  const refill = Number((1.4 + 7 * Math.max(0, perdita - 0.08)).toFixed(1));

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
     compenso anche quello, e maschera l'ipovolemia. */
  const fc = Math.round(c.fc + riserve.dolore * SPINTA_DOLORE_FC);
  const pas = Math.round(c.pas + riserve.dolore * SPINTA_DOLORE_PAS);

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

  return {
    fc: fra(fc, 0, 220),
    pas: fra(pas, 0, 300),
    /* mai sotto zero: un monitor non stampa una diastolica negativa */
    pad: Math.max(0, Math.min(c.pad, fra(pas, 0, 300) - 8)),
    spo2,
    fr,
    glicemia: Math.round(riserve.glicemia),
    dolore: Math.round(riserve.dolore),
    coscienza: peggiore(s.coscienza, daGlicemia),
    cute: s.cute,
    refill: s.refill,
    sete: s.sete,
    polsoRadiale: c.polsoRadiale,
    fase: c.fase,
    perdita: c.perdita,
  };
}
