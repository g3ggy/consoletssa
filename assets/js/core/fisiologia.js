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
