/* =====================================================================
   domande.js — le domande dell'anamnesi, uguali per tutti gli scenari.

   Il catalogo sta qui e le risposte stanno nei casi: il soccorritore
   impara le domande, non il caso. Sono quelle del Bolognin :2715 per
   il SAMPLE e :2723 per l'OPQRST, con le formulazioni del manuale.

   Ogni domanda porta due testi di ripiego, perché nessun caso è
   obbligato a riempire tutta la griglia:
   · `nonSo`   quando quell'interlocutore non ne sa niente;
   · `confuso` quando risponde un paziente non lucido (AVPU a V), che
               risponde ma non vale — e nessuno te lo dice.

   Le durate sono ASSUNZIONE NOSTRA: una domanda costa meno di una
   pressione (40 s) e più di un refill (15 s).
   ===================================================================== */

/* Le sei dell'OPQRST si chiedono solo a chi ha male: senza dolore non
   hanno senso, e la lista sul telefono resta corta. */
const HA_DOLORE = (p) => (p?.dolore ?? 0) > 0;

const ELENCO = [
  /* ============================== SAMPLE ============================ */
  {
    id: 'disturbi', schema: 'SAMPLE', lettera: 'S', durata: 20,
    testo: 'Quali disturbi lamenta?',
    nonSo: 'Scuote la testa: non l\'ha sentito dire.',
    confuso: '«Eh… non lo so. Sto male.»',
  },
  {
    id: 'allergie', schema: 'SAMPLE', lettera: 'A', durata: 15,
    testo: 'È allergico a farmaci, cibi o sostanze?',
    nonSo: '«Questo non lo so proprio.»',
    confuso: '«Mi pare di no… non mi ricordo.»',
  },
  {
    id: 'terapia', schema: 'SAMPLE', lettera: 'M', durata: 25,
    testo: 'Quali farmaci sta prendendo attualmente?',
    nonSo: 'Alza le spalle: non lo sa dire.',
    confuso: '«Mah… qualcosa per la pressione, mi sa.»',
  },
  {
    id: 'patologie', schema: 'SAMPLE', lettera: 'P', durata: 20,
    testo: 'Soffre di qualche malattia?',
    nonSo: '«Non me l\'ha mai detto.»',
    confuso: '«Il cuore, forse. Non mi viene.»',
  },
  {
    id: 'ultimo-pasto', schema: 'SAMPLE', lettera: 'L', durata: 15,
    testo: 'Quando ha mangiato o bevuto l\'ultima volta?',
    nonSo: '«Non c\'ero, non saprei.»',
    confuso: '«Stamattina… o ieri sera. Non lo so.»',
  },
  {
    id: 'evento', schema: 'SAMPLE', lettera: 'E', durata: 20,
    testo: 'Cosa stava succedendo quando è cominciato?',
    nonSo: '«L\'ho trovato già così.»',
    confuso: 'Ti guarda e non risponde alla domanda.',
  },

  /* ============================== OPQRST =========================== */
  {
    id: 'esordio', schema: 'OPQRST', lettera: 'O', durata: 20,
    testo: 'Com\'è cominciato? Le era già capitato?',
    richiede: HA_DOLORE,
    nonSo: '«Non saprei dirle, non ero con lui.»',
    confuso: '«Prima… non lo so quando.»',
  },
  {
    id: 'allevia', schema: 'OPQRST', lettera: 'P', durata: 20,
    testo: 'Cosa lo fa stare meglio, e cosa peggio?',
    richiede: HA_DOLORE,
    nonSo: 'Non sa rispondere.',
    confuso: '«Uguale. È sempre uguale.»',
  },
  {
    id: 'qualita-dolore', schema: 'OPQRST', lettera: 'Q', durata: 15,
    testo: 'Che tipo di dolore è?',
    richiede: HA_DOLORE,
    nonSo: 'Non è una cosa che può sapere lui.',
    confuso: '«Fa male e basta.»',
  },
  {
    id: 'irradiazione', schema: 'OPQRST', lettera: 'R', durata: 15,
    testo: 'Il dolore si sposta da qualche parte?',
    richiede: HA_DOLORE,
    nonSo: 'Non è una cosa che può sapere lui.',
    confuso: 'Si tocca il petto e non aggiunge altro.',
  },
  {
    id: 'intensita', schema: 'OPQRST', lettera: 'S', durata: 15,
    testo: 'Quanto le fa male, da 1 a 10?',
    richiede: HA_DOLORE,
    nonSo: 'Non è una cosa che può sapere lui.',
    confuso: '«Tanto. Non lo so, tanto.»',
  },
  {
    id: 'durata-dolore', schema: 'OPQRST', lettera: 'T', durata: 20,
    testo: 'Da quanto è cominciato? Quanto dura?',
    richiede: HA_DOLORE,
    nonSo: '«Da un po\', ma non so dirle da quando.»',
    confuso: '«Da stamattina… o da prima.»',
  },
];

export const DOMANDE_ELENCO = ELENCO;
export const DOMANDE = Object.fromEntries(ELENCO.map((d) => [d.id, d]));
