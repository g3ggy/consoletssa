/* =====================================================================
   classi-patologia.js — le classi di patologia della scheda ARES 118.

   Sono quelle stampate sul modulo di rilevazione dati, riquadro «Classe
   di patologia». Sono diciassette e non venti: il modulo salta C16, C17
   e C18, e li saltiamo anche noi. La scheda che ti trovi in mano è
   quella, e va imparata com'è.

   Servono in due posti: il sospetto che dichiari durante l'intervento, e
   — quando arriverà — la casella da barrare sulla scheda.
   ===================================================================== */

export const CLASSI = {
  C01: { codice: 'C01', label: 'Traumatica' },
  C02: { codice: 'C02', label: 'Cardiocircolatoria' },
  C03: { codice: 'C03', label: 'Respiratoria' },
  C04: { codice: 'C04', label: 'Neurologica' },
  C05: { codice: 'C05', label: 'Psichiatrica' },
  C06: { codice: 'C06', label: 'Neoplastica' },
  C07: { codice: 'C07', label: 'Tossicologica' },
  C08: { codice: 'C08', label: 'Metabolica' },
  C09: { codice: 'C09', label: 'Gastroenterologica' },
  C10: { codice: 'C10', label: 'Urologica' },
  C11: { codice: 'C11', label: 'Oculistica' },
  C12: { codice: 'C12', label: 'Otorinolaringoiatrica' },
  C13: { codice: 'C13', label: 'Dermatologica' },
  C14: { codice: 'C14', label: 'Ostetrico-ginecologica' },
  C15: { codice: 'C15', label: 'Infettiva' },
  C19: { codice: 'C19', label: 'Altra patologia' },
  C20: { codice: 'C20', label: 'Patologia non identificata' },
};

/* Diciassette voci di fila non si leggono su un telefono. Il
   raggruppamento è per apparato, e l'ultimo gruppo tiene le classi che
   non stanno da nessun'altra parte — «non identificata» compresa, che è
   una risposta legittima e non un ripiego. */
export const GRUPPI_CLASSI = [
  { label: 'Trauma', codici: ['C01'] },
  { label: 'Cuore e respiro', codici: ['C02', 'C03'] },
  { label: 'Cervello e psiche', codici: ['C04', 'C05'] },
  { label: 'Metabolismo e sostanze', codici: ['C07', 'C08'] },
  { label: 'Addome e apparati', codici: ['C09', 'C10', 'C14'] },
  { label: 'Occhi, orecchie, pelle', codici: ['C11', 'C12', 'C13'] },
  { label: 'Altro', codici: ['C06', 'C15', 'C19', 'C20'] },
];

/** Il nome per esteso, come si dice a voce: «C08 metabolica». */
export const nomeClasse = (codice) => (CLASSI[codice]
  ? `${CLASSI[codice].codice} ${CLASSI[codice].label.toLowerCase()}`
  : codice);
