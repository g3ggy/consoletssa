/* =====================================================================
   bombola.js — quanto ossigeno ti resta.

   Logica pura: nessun DOM, nessuna dipendenza, nessun orologio. Riceve
   una bombola e ne restituisce un'altra: non muta niente.

   Il flusso, finché non c'era niente che lo pagasse, era un numero
   scritto nell'etichetta di un'azione. Qui diventa una scelta: gli alti
   flussi svuotano la bombola, e la bombola dura quanto dura.

   Il conto è quello del manuale:
   · contenuto = volume della bombola × atmosfere del manometro
     («tutte le bombole vengono caricate a 200 atmosfere», Bolognin :3372);
   · autonomia in minuti = litri disponibili ÷ flusso erogato (:3377).

   ASSUNZIONE NOSTRA: che la bombola predefinita sia una portatile da 2
   litri. La check-list ARES dice quante bombole ci sono a bordo, non che
   capacità hanno.
   ===================================================================== */

const LITRI_PREDEFINITI = 2;
const BAR_PREDEFINITI = 200;

/** Una bombola all'inizio dell'intervento. `conf` è quello che il caso
    dichiara: `{ litri, bar }`. Un caso che non dice niente ha la sua
    portatile piena. */
export function creaBombola(conf = {}) {
  const litri = conf.litri ?? LITRI_PREDEFINITI;
  const bar = conf.bar ?? BAR_PREDEFINITI;
  return { litri, bar, contenuto: litri * bar, erogati: 0, flusso: 0, finitaA: null };
}

/** Quanti litri restano. */
export const residui = (b) => Math.max(0, b.contenuto - b.erogati);

/** Per quanti minuti basta, al flusso che sta erogando adesso. */
export function autonomia(b, flusso = b.flusso) {
  if (!flusso) return Infinity;
  return residui(b) / flusso;
}

/** Il presidio nuovo sostituisce quello di prima: i flussi non si
    sommano, perché la maschera è una sola. */
export const conFlusso = (b, flusso) => ({ ...b, flusso });

/** Fa passare `secondi` di erogazione. Restituisce una bombola nuova. */
export function consuma(b, secondi, t) {
  if (!b.flusso || b.finitaA !== null) return b;
  const erogati = Math.min(b.contenuto, b.erogati + (b.flusso * secondi) / 60);
  const finita = erogati >= b.contenuto;
  return {
    ...b,
    erogati,
    flusso: finita ? 0 : b.flusso,
    finitaA: finita ? t : null,
  };
}

/** Quello che il debriefing racconta. `null` se l'ossigeno non è mai
    partito: senza erogazione non c'è niente da dire. */
export function riepilogo(b) {
  if (!b || b.erogati <= 0) return null;
  const resta = residui(b);
  return {
    contenuto: b.contenuto,
    litri: b.litri,
    bar: b.bar,
    erogati: Math.round(b.erogati),
    residui: Math.round(resta),
    flusso: b.flusso,
    /* A che flusso stava andando quando è finita la partita: serve a
       dire per quanti minuti sarebbe bastata durante il trasporto. */
    minutiResidui: b.flusso ? Math.floor(resta / b.flusso) : null,
    finitaA: b.finitaA,
  };
}
