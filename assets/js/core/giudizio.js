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
import { VOCI_PRESIDI } from '../data/presidi.js';

/** Il gesto era indicato, con quello che sapevi quando l'hai deciso.

    Le indicazioni si passano come parametro solo per poterle sostituire
    nei test: nell'uso vero sono quelle del catalogo.

    `cercaAlternativa` esiste per fermare la ricorsione: quando proviamo
    le sorelle di una famiglia le interroghiamo senza chiedere a loro
    un'altra alternativa, se no si rimbalzerebbero all'infinito. */
export function indicata(idAzione, contesto, indicazioni = INDICAZIONI, cercaAlternativa = true) {
  const regola = indicazioni[idAzione];

  /* Nessuna regola scritta vuol dire nessuna regola da rispettare. Si
     scrive un'indicazione solo dove il manuale ne ha una, e tutto il
     resto resta lecito: è quello che permette di coprire venti azioni
     adesso e le altre quando ci si arriva. */
  if (!regola) return { ok: true, perche: null, fonte: null, invece: null };

  let passa;
  try {
    passa = Boolean(regola.quando(contesto));
  } catch (errore) {
    /* Un'indicazione scritta male è un bug nostro, e non deve pagarlo un
       volontario a metà scenario: nel dubbio il gesto passa. */
    return { ok: true, perche: null, fonte: null, invece: null };
  }

  if (passa) return { ok: true, perche: null, fonte: null, invece: null };

  return {
    ok: false,
    perche: regola.perche,
    fonte: regola.fonte || null,
    invece: cercaAlternativa ? alternativaNellaFamiglia(idAzione, contesto, indicazioni) : null,
  };
}

/* Il presidio sbagliato ha delle sorelle, e ognuna ha già la sua regola:
   si prova a interrogarle con lo stesso contesto e si nomina la prima che
   in quell'istante era indicata. Non c'è contenuto nuovo da scrivere e
   non c'è niente da tenere allineato — l'alternativa esce dalle stesse
   regole che hanno bocciato il gesto, quindi non può contraddirle.

   «La prima» vuol dire l'ordine del catalogo, e quell'ordine non è
   casuale: dentro una famiglia le misure stanno dalla più leggera alla
   più pesante — occhialini, maschera, Venturi, reservoir. Proporre la
   prima indicata significa quindi proporre la più leggera che bastava,
   che è esattamente la lezione quando hai messo l'alto flusso per niente.

   `null` quando la famiglia non c'è, o quando nessuna sorella era
   indicata: e quel «non serviva nessun presidio di questa famiglia» è
   un'informazione utile quanto l'altra. */
function alternativaNellaFamiglia(idAzione, contesto, indicazioni) {
  const voce = VOCI_PRESIDI.find((v) => v.id === idAzione);
  if (!voce) return null;

  const sorelle = VOCI_PRESIDI.filter((v) => v.famiglia === voce.famiglia && v.id !== idAzione);
  for (const s of sorelle) {
    const v = indicata(s.id, contesto, indicazioni, false);
    /* Una sorella SENZA regola scritta risulterebbe «indicata» per il
       principio che senza regola tutto è lecito, e proporla sarebbe un
       consiglio senza fondamento: si propone solo chi ha una regola che
       dice di sì. */
    if (v.ok && indicazioni[s.id]) {
      return {
        id: s.id,
        label: s.label,
        perche: indicazioni[s.id].perche,
        fonte: indicazioni[s.id].fonte || null,
      };
    }
  }
  return null;
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
