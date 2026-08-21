/* =====================================================================
   giudizio.js — il gesto ci stava, o no.

   Logica pura: nessun DOM, nessuna dipendenza, nessun orologio.

   Il motore sapeva dire due cose di un'azione: che era necessaria o che
   era dannosa. Tutto il resto era gratis, e quindi conveniva fare tutto.
   Qui si dice la terza: che si poteva fare ma non serviva a niente, e
   che quei secondi sono usciti dalla tasca del paziente.

   La regola sta in `data/indicazioni.js` e riceve solo quello che il
   soccorritore SA in quel momento — mai lo stato nascosto. Il perché sta
   scritto lì.
   ===================================================================== */

import { INDICAZIONI } from '../data/indicazioni.js';

/** Il gesto era indicato, con quello che sapevi quando l'hai deciso.

    Le indicazioni si passano come parametro solo per poterle sostituire
    nei test: nell'uso vero sono quelle del catalogo. */
export function indicata(idAzione, contesto, indicazioni = INDICAZIONI) {
  const regola = indicazioni[idAzione];

  /* Nessuna regola scritta vuol dire nessuna regola da rispettare. Si
     scrive un'indicazione solo dove il manuale ne ha una, e tutto il
     resto resta lecito: è quello che permette di coprire venti azioni
     adesso e le altre quando ci si arriva. */
  if (!regola) return { ok: true, perche: null, fonte: null };

  let passa;
  try {
    passa = Boolean(regola.quando(contesto));
  } catch (errore) {
    /* Un'indicazione scritta male è un bug nostro, e non deve pagarlo un
       volontario a metà scenario: nel dubbio il gesto passa. */
    return { ok: true, perche: null, fonte: null };
  }

  return passa
    ? { ok: true, perche: null, fonte: null }
    : { ok: false, perche: regola.perche, fonte: regola.fonte || null };
}

/** Quanti secondi sono andati in gesti che non servivano, e quali.

    Il costo del superfluo è il tempo e basta: non si tolgono punti,
    perché in servizio nessuno te ne toglie. Perdi minuti, e i minuti si
    vedono nelle finestre che manchi. */
export function tempoButtato(fatte = [], catalogo = {}) {
  const voci = fatte
    /* Le voci senza giudizio sono le decisioni degli eventi, che non
       sono gesti e non si giudicano così. */
    .filter((f) => f.giudizio && f.giudizio.ok === false)
    .map((f) => ({
      id: f.id,
      label: catalogo[f.id]?.label || f.id,
      secondi: catalogo[f.id]?.durata || 0,
      perche: f.giudizio.perche,
      fonte: f.giudizio.fonte,
      t: f.t,
      chi: f.chi,
    }));

  return { secondi: voci.reduce((somma, v) => somma + v.secondi, 0), voci };
}
