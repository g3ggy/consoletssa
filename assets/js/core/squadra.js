/* =====================================================================
   squadra.js — chi c'è, chi è libero, quanti ne serve un gesto.

   Logica pura: nessun DOM, nessun orologio, nessuno stato di modulo. Le
   funzioni ricevono la squadra e il tempo e restituiscono squadre nuove;
   non mutano mai quella che ricevono.

   Stava dentro `sim-engine.js`, che con la 1.15.0 era arrivato a 855
   righe contro le 800 che il progetto si è dato come massimo. Si stacca
   bene perché è l'unico pezzo del motore che non fa succedere niente al
   paziente: sa solo chi ha le mani libere.

   E toglie tre copie della stessa cosa: i nomi dei ruoli stavano in
   `sim-engine.js`, in `intervento.js` e — le preposizioni — anche in
   `intervento-palette.js`.
   ===================================================================== */

/** Come si chiama ogni ruolo, quando lo si scrive a schermo. */
export const NOMI_MEMBRO = {
  tu: 'Tu',
  autista: 'Autista',
  infermiere: 'Infermiere',
  medico: 'Medico',
};

export const etichettaMembro = (chi) => NOMI_MEMBRO[chi] || chi;

/* In italiano la preposizione si fonde con l'articolo: «chiedi a
   autista» non è italiano, come non lo era «chiedi a il paziente» prima
   che l'anamnesi imparasse `aChi()`. */
const VERSO = {
  autista: 'all\'autista',
  infermiere: 'all\'infermiere',
  medico: 'al medico',
};

export const versoIlMembro = (chi) => VERSO[chi] || `a ${etichettaMembro(chi).toLowerCase()}`;

/* «Si fa in due» si legge, «si fa in 2» no: la cifra in mezzo alla frase
   inciampa, e il rifiuto è una riga che un volontario legge di corsa. */
const A_PAROLE = { 2: 'due', 3: 'tre', 4: 'quattro' };

export const aParole = (n) => A_PAROLE[n] || String(n);

/* ========================= chi c'è, e come sta ====================== */

/** La squadra a inizio intervento: tutti presenti, tutti con le mani
    libere. `liberoA` è il secondo in cui la persona torna disponibile. */
export const creaSquadra = (membri = []) => Object.fromEntries(
  membri.map((m) => [m, { liberoA: 0, azione: null }]),
);

/** Qualcuno che arriva a intervento iniziato — il medico dell'automedica.
    Arriva libero, e libero da adesso. */
export const aggiungiMembro = (squadra, chi, t) => ({
  ...squadra,
  [chi]: { liberoA: t, azione: null },
});

/* ======================== chi può fare cosa ========================= */

/** Chi, sulla carta, potrebbe eseguire questo gesto.

    Il catalogo dichiara un solo ruolo sanitario, `infermiere`, e chi lo
    incarna dipende da chi c'è: quello di bordo, o il medico
    dell'automedica quando arriva. */
export const candidati = (az) => (az?.chi || [])
  .flatMap((m) => (m === 'infermiere' ? ['infermiere', 'medico'] : [m]));

/** Chi, adesso, ha davvero le mani libere: c'è a bordo e ha finito. */
export const membriLiberi = (az, squadra, t) => candidati(az)
  .filter((m) => squadra[m] && squadra[m].liberoA <= t);

/* ===================== quante persone occupa ======================== */

/** Quante persone porta via il gesto.

    `chi` sono i candidati, non i partecipanti: fino alla 1.15.0
    `chi: ['tu','autista']` voleva dire «la può fare uno dei due», e la
    tavola spinale nel banco la metteva una persona sola. `servono` dice
    quante ne occupa; `tuttaLaSquadra` è il caso dei DPI, che se li mette
    chiunque ci sia.

    Il `Math.max(1, …)` non è difensivo: senza, un equipaggio con tutti
    occupati darebbe zero, e il controllo «ci sono abbastanza liberi?»
    passerebbe proprio quando non c'è nessuno. */
export const quantiServono = (az, liberi = []) => (az.tuttaLaSquadra
  ? Math.max(1, liberi.length)
  : (az.servono || 1));

/** Chi finisce per farlo. Quello che hai scelto tiene il posto, gli altri
    si prendono fra i liberi nell'ordine in cui stanno. */
export const impegnatiPer = (chi, liberi = [], servono = 1) => [
  chi,
  ...liberi.filter((m) => m !== chi),
].slice(0, servono);

/* ======================= occupare e liberare ======================== */

/** Il gesto parte: chi lo fa è impegnato fino a `fineA`. */
export function occupa(squadra, chi = [], fineA, idAzione) {
  const nuova = { ...squadra };
  chi.forEach((m) => { nuova[m] = { liberoA: fineA, azione: idAzione }; });
  return nuova;
}

/** Il gesto è finito: si toglie l'azione e basta.

    `liberoA` non si tocca — dice fino a quando la persona è impegnata, e
    lo ha deciso chi ha fatto partire il gesto. Chi non c'è si salta. */
export function libera(squadra, chi = []) {
  const nuova = { ...squadra };
  chi.forEach((m) => {
    if (nuova[m]) nuova[m] = { ...nuova[m], azione: null };
  });
  return nuova;
}
