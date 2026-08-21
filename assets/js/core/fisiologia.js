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
