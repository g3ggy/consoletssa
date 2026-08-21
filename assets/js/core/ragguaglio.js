/* =====================================================================
   ragguaglio.js — quello che il ragguaglio dice, e quello che tu hai.

   Logica pura: nessun DOM, nessun orologio. Si collauda con
   `node --test tests/`.

   Il ragguaglio scritto nel caso è un modello: dice come si parla al
   Pronto Soccorso, e lo dice uguale a chi ha lavorato bene e a chi non
   ha fatto niente. Qui il caso dichiara anche le VOCI di quel modello,
   ognuna con la condizione che la rende davvero tua, e il debriefing
   può mostrare la differenza.

   Non si compone niente in prosa: comporre italiano corretto da dati
   sparsi è un lavoro a sé e suona finto. Si confronta e basta.
   ===================================================================== */

/* Le quattro provenienze di una voce. Sono tre fonti, non quattro:
   `azione` e `domanda` guardano nello stesso elenco delle cose fatte,
   ma con l'id scritto come il motore lo registra — le domande ci
   entrano già col loro prefisso. */
const FONTI = {
  azione: (chiave, d) => d.fatte.some((f) => f.id === chiave),
  domanda: (chiave, d) => d.fatte.some((f) => f.id === `domanda:${chiave}`),
  sapere: (chiave, d) => Boolean(d.saputo[chiave]),
  /* Una lettura vecchia vale: l'hai rilevata, e quel numero lo puoi
     dire. Che sia da rifare è un altro discorso, e lo dice la tessera. */
  lettura: (chiave, d) => d.letture[chiave] !== undefined,
};

function risolvi(da, dati) {
  const taglio = String(da).indexOf(':');
  if (taglio < 0) return false;
  const fonte = FONTI[String(da).slice(0, taglio)];
  return fonte ? fonte(String(da).slice(taglio + 1), dati) : false;
}

/**
 * Quali voci del ragguaglio modello sei davvero in grado di dire.
 *
 * @param {object} caso
 * @param {object} dati  { fatte, saputo, letture } — come li tiene il motore
 * @returns {{voci: {t: string, da: string|null, tuo: boolean}[], tue: number, totale: number}}
 */
export function revisioneRagguaglio(caso, dati = {}) {
  const d = { fatte: [], saputo: {}, letture: {}, ...dati };
  const voci = (caso?.ragguaglioVoci || []).map((v) => ({
    t: v.t,
    da: v.da || null,
    /* Una voce senza `da` non dipende da niente che tu abbia fatto:
       «trasportata con preallerta» è vera perché l'hai trasportata. */
    tuo: v.da ? risolvi(v.da, d) : true,
  }));
  return { voci, tue: voci.filter((v) => v.tuo).length, totale: voci.length };
}
