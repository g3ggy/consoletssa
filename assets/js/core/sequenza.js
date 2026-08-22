/* =====================================================================
   sequenza.js — quello che va fatto prima.

   Logica pura: riceve l'elenco di quello che hai fatto e restituisce le
   inversioni. Non toglie punti: si raccontano, come il tempo buttato.

   Sono due, e sono poche apposta. Ogni segnalazione in più è rumore che
   copre quelle che contano, e queste due contano perché riguardano la
   sicurezza di chi soccorre prima ancora che quella del paziente:
   valutare la scena e mettersi i DPI vengono prima di toccare chiunque.
   ===================================================================== */

/* Cosa NON conta come «toccare il paziente»: le azioni che riguardano la
   scena e le persone intorno, e le domande — chiedere non è toccare.

   Spostare il paziente in zona sicura resta fuori da questo elenco di
   proposito: è un gesto di scena, ma è anche il momento in cui gli metti
   le mani addosso, e i guanti dovevi averli già. */
const NON_E_CONTATTO = new Set([
  'valuta-scena', 'dpi', 'allontana-curiosi', 'gestisci-familiari',
  'chiedi-ffoo', 'chiedi-vvf', 'cerca-documenti', 'allerta-co',
  'richiedi-automedica', 'parla-in-disparte',
]);

const eContatto = (f) => !String(f.id).startsWith('domanda:')
  && !String(f.id).startsWith('decisione:')
  && !NON_E_CONTATTO.has(f.id);

/** Le inversioni di metodo in quello che hai fatto.
    @param {Array} fatte  `{ id, t }` in ordine di esecuzione */
export function inversioni(fatte = []) {
  const primo = fatte.filter(eContatto).sort((a, b) => a.t - b.t)[0];
  if (!primo) return [];

  const primaDi = (id) => fatte.some((f) => f.id === id && f.t <= primo.t);
  const trovate = [];

  if (!primaDi('valuta-scena')) {
    trovate.push({
      id: 'scena-prima',
      primoContatto: primo.id,
      t: primo.t,
      perche: 'Hai toccato il paziente prima di valutare la scena. È il passo zero: '
        + 'un soccorritore non deve mai finire per essere soccorso, e quello che non '
        + 'hai guardato addosso non smette di esserci.',
      fonte: 'Bolognin :2599',
    });
  }

  if (!primaDi('dpi')) {
    trovate.push({
      id: 'dpi-prima',
      primoContatto: primo.id,
      t: primo.t,
      perche: 'Hai toccato il paziente senza aver indossato i DPI. Il rischio '
        + 'infettivo non si vede, e i guanti si mettono prima, non quando ti accorgi '
        + 'che c\'è sangue.',
      fonte: 'Bolognin :5368',
    });
  }

  return trovate;
}
