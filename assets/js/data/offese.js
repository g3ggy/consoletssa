/* =====================================================================
   offese.js — che cosa sta facendo male al paziente.

   Un caso non dichiara più di quanto peggiorano i parametri: dichiara
   la CAUSA, e il decorso viene fuori da solo. È l'impostazione dei
   motori di fisiologia seri (Pulse, BioGears): lì si chiamano "insulti".

   Ogni offesa è una funzione pura che consuma riserve. Riceve anche i
   tag — cioè i provvedimenti già presi — perché comprimere una ferita
   cambia la portata dell'emorragia, non i parametri.
   ===================================================================== */

/** Le sedi su cui un laccio emostatico ha senso. */
const SEDI_DA_LACCIO = ['arto', 'braccio', 'gamba'];

export const OFFESE = {
  emorragia: {
    id: 'emorragia',
    fonte: 'Bolognin :6469 — ipovolemia assoluta',
    /* La compressione diretta riduce molto la portata ma non la ferma:
       finché non si arriva in sala operatoria il sangue continua ad
       andarsene. Il laccio invece chiude, ma solo su un arto: sul
       torace o sull'addome non c'è niente da stringere. */
    applica: (offesa, riserve, dt, tag) => {
      const sedeDaLaccio = SEDI_DA_LACCIO.includes(offesa.sede);
      if (sedeDaLaccio && tag.includes('laccio')) return {};
      const freno = tag.includes('compressione') ? 0.2 : 1;
      return { volemia: -(offesa.portata / 60) * dt * freno };
    },
  },

  vasodilatazione: {
    id: 'vasodilatazione',
    fonte: 'Bolognin :6473 — ipovolemia relativa (anafilassi, shock spinale)',
    /* Il sangue c'è tutto, ma il letto vascolare si è allargato e non
       tiene: la pressione scende con la volemia intatta. Per questo i
       liquidi da soli non bastano e ci vuole l'adrenalina. */
    applica: (offesa, riserve, dt, tag) => {
      const freno = tag.includes('adrenalina') ? -0.5 : 1;   // negativo = recupera
      return { tonoVascolare: -(offesa.intensita / 60) * dt * freno };
    },
  },

  'ipossia-ventilatoria': {
    id: 'ipossia-ventilatoria',
    fonte: 'Bolognin :3277, :6425 — ossigeno ad alti flussi',
    applica: (offesa, riserve, dt, tag) => {
      const freno = tag.includes('o2') ? 0.3 : 1;
      const recupero = tag.includes('pallone') ? -0.4 : freno;
      return { ossigenazione: -(offesa.intensita / 60) * dt * recupero };
    },
  },

  'ischemia-miocardica': {
    id: 'ischemia-miocardica',
    fonte: 'ERC 2025 cap. 5 — sindrome coronarica acuta',
    /* Il miocardio che soffre pompa meno e fa male. Il dolore da solo
       alza frequenza e pressione, che fanno soffrire ancora di più il
       miocardio: è il circolo vizioso che va rotto in fretta. */
    applica: (offesa, riserve, dt, tag) => ({
      contrattilita: -(offesa.intensita / 60) * dt,
      dolore: tag.includes('analgesia') ? 0 : (offesa.intensita * 8 / 60) * dt,
    }),
  },

  'dolore-acuto': {
    id: 'dolore-acuto',
    fonte: 'Bolognin :6481 — compenso adrenergico',
    applica: (offesa, riserve, dt, tag) => ({
      dolore: tag.includes('analgesia') ? -(2 / 60) * dt : (offesa.intensita / 60) * dt,
    }),
  },

  ipoglicemia: {
    id: 'ipoglicemia',
    fonte: 'Bolognin — glicemia e stato di coscienza',
    applica: (offesa, riserve, dt, tag) => {
      if (tag.includes('zucchero') || tag.includes('glucosata')) {
        return { glicemia: (3 / 60) * dt };
      }
      return { glicemia: -(offesa.intensita / 60) * dt };
    },
  },

  'blocco-compenso': {
    id: 'blocco-compenso',
    fonte: 'Bolognin :6487 — lesione mielica, e i betabloccanti',
    /* Non consuma niente: è uno stato. Il suo effetto lo legge
       `parametriVisibili` attraverso il modificatore. */
    applica: () => ({}),
    bloccaCompenso: true,
  },
};

/**
 * Fa agire tutte le offese attive per `dt` secondi.
 * Restituisce riserve NUOVE: quelle in ingresso non si toccano.
 *
 * @param {object}   riserve
 * @param {object[]} offese    le righe scritte nel caso
 * @param {number}   dt        secondi
 * @param {string[]} tag       i provvedimenti già presi
 */
export function applicaOffese(riserve, offese = [], dt = 0, tag = []) {
  return offese.reduce((acc, offesa) => {
    const modello = OFFESE[offesa.tipo];
    if (!modello) return acc;
    const delta = modello.applica(offesa, acc, dt, tag) || {};
    const nuove = { ...acc };
    Object.entries(delta).forEach(([k, v]) => {
      if (typeof nuove[k] === 'number') nuove[k] = nuove[k] + v;
    });
    return nuove;
  }, { ...riserve });
}

/** Il caso ha un'offesa che blocca il compenso tachicardico? */
export function compensoBloccato(offese = [], modificatori = {}) {
  const daOffesa = offese.some((o) => OFFESE[o.tipo]?.bloccaCompenso);
  const daTerapia = (modificatori.terapia || []).includes('betabloccante');
  return daOffesa || daTerapia;
}
