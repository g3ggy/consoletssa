/* =====================================================================
   anamnesi.js — raccogliere informazioni facendo domande.

   Logica pura: nessun DOM, nessun orologio. Si collauda con
   `node --test tests/`.

   L'idea portante è che una risposta non è un dato: è quello che una
   persona ti ha detto. Cambia a seconda di chi la dà — il paziente
   confuso, la moglie che sa il nome del farmaco, il figlio che parla
   senza sapere — e nessuno ti dice quale delle due valga. Per esserne
   sicuro devi chiedere a un altro e confrontare.

   Il Bolognin dice perché conta: «se il paziente dovesse entrare in
   stato di incoscienza prima dell'arrivo in ospedale non sarebbe più in
   grado di riferire alcun dato» (:2708). Chi non chiede finché parla,
   dopo non chiede più.
   ===================================================================== */

/* Il paziente c'è sempre e non va dichiarato dal caso. */
export const PAZIENTE = { id: 'paziente', label: 'il paziente' };

/** Chi si può interrogare in questo caso, col paziente per primo. */
export function interlocutoriDi(caso) {
  const altri = caso?.anamnesi?.interlocutori || [];
  return [PAZIENTE, ...altri];
}

/**
 * Questo interlocutore è in grado di rispondere adesso?
 * Solo il paziente può non esserlo: gli altri parlano comunque.
 */
export function puoRispondere(idInterlocutore, coscienza) {
  if (idInterlocutore !== PAZIENTE.id) return { ok: true };
  /* A e V rispondono: a V risponde male, ma risponde — ed è la
     trappola. Da P in giù non c'è più nessuno con cui parlare. */
  if (coscienza === 'A' || coscienza === 'V') return { ok: true };
  return { ok: false, motivo: 'Non risponde alle domande: chiedi a chi c\'è.' };
}

/**
 * Cosa risponde questa persona a questa domanda, adesso.
 *
 * @param {object} domanda        la voce del catalogo
 * @param {object} anamnesi       il blocco `anamnesi` del caso
 * @param {string} interlocutore  a chi l'hai chiesto
 * @param {string} coscienza      AVPU del paziente in questo momento
 * @returns {{testo: string, qualita: string, rivela: string[], ripiego: string|null}}
 */
export function rispostaA({ domanda, anamnesi, interlocutore, coscienza }) {
  const scritta = anamnesi?.risposte?.[domanda.id]?.[interlocutore];

  /* Nessuno è obbligato a sapere tutto: se il caso non ha scritto la
     risposta per questa persona, quella persona non lo sa. È il modo di
     dire «chiedilo a qualcun altro» senza scriverlo trentasei volte. */
  if (!scritta) {
    return { testo: domanda.nonSo, qualita: 'vaga', rivela: [], ripiego: 'nonSo' };
  }

  return {
    testo: scritta.t,
    qualita: scritta.qualita || 'buona',
    /* Solo una risposta buona rivela qualcosa: una vaga ti lascia dove
       eri, una sbagliata ti porta altrove. */
    rivela: scritta.qualita === 'buona' ? [...(scritta.rivela || [])] : [],
    ripiego: null,
  };
}
