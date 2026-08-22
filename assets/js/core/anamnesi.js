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

import { DOMANDE_ELENCO } from '../data/domande.js';

/* Il paziente c'è sempre e non va dichiarato dal caso. */
export const PAZIENTE = { id: 'paziente', label: 'il paziente' };

/* In italiano la preposizione e l'articolo si fondono, e «chiedi a il
   paziente» non si legge. Gli interlocutori si dichiarano con l'articolo
   davanti — «la moglie», «il figlio» — così restano leggibili anche da
   soli, nella barra della palette; qui si articola la preposizione per
   il diario e per il debriefing. */
const ARTICOLI = [/^il /, /^lo /, /^la /, /^l'/, /^i /, /^gli /, /^le /];
const FUSIONE = {
  a: ['al ', 'allo ', 'alla ', 'all\'', 'ai ', 'agli ', 'alle '],
  da: ['dal ', 'dallo ', 'dalla ', 'dall\'', 'dai ', 'dagli ', 'dalle '],
};

/* Un nome proprio non ha articolo e la preposizione resta staccata:
   «a Marco», non «al Marco». */
function articolata(preposizione, label) {
  const testo = String(label);
  const i = ARTICOLI.findIndex((quale) => quale.test(testo));
  return i < 0
    ? `${preposizione} ${testo}`
    : testo.replace(ARTICOLI[i], FUSIONE[preposizione][i]);
}

/** «il paziente» → «al paziente». */
/** La domanda come la fai a chi hai davanti.

    Al paziente si parla a lui; a chi gli sta accanto si parla di lui, e
    si chiede quello che quella persona può sapere. Una domanda che non
    dichiara la seconda voce ripiega sulla prima, così un catalogo a metà
    non rompe niente. */
export const testoDomanda = (d, interlocutore) => (
  interlocutore === PAZIENTE.id ? d.testo : (d.testoTerzi || d.testo)
);

export const aChi = (label) => articolata('a', label);

/** «il paziente» → «dal paziente». */
export const daChi = (label) => articolata('da', label);

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
/* Una risposta può essere scritta in più varianti, e vince la prima il
   cui `se(tag)` combacia. Serve a una cosa sola, ma importante: la
   stessa persona risponde diversamente a seconda di CHI STA
   ASCOLTANDO. Il capitolo 33 degli appunti è esplicito — la domanda
   sulle sostanze va fatta in disparte, senza amici o familiari
   presenti, e allora arriva una verità «che il paziente non aveva detto
   a nessun altro».

   Chi scrive un oggetto solo, come hanno fatto tutti i casi finora,
   continua a funzionare senza saperne niente. */
function variante(scritta, tag) {
  if (!Array.isArray(scritta)) return scritta;
  return scritta.find((v) => !v.se || v.se(tag)) || null;
}

export function rispostaA({ domanda, anamnesi, interlocutore, coscienza, tag = [] }) {
  const scritta = variante(anamnesi?.risposte?.[domanda.id]?.[interlocutore], tag);

  /* Nessuno è obbligato a sapere tutto: se il caso non ha scritto la
     risposta per questa persona, quella persona non lo sa. È il modo di
     dire «chiedilo a qualcun altro» senza scriverlo trentasei volte. */
  if (!scritta) {
    return { testo: domanda.nonSo, qualita: 'vaga', rivela: [], ripiego: 'nonSo' };
  }

  /* Un paziente a coscienza V risponde: solo che quello che dice non
     vale. È una regola sola e non una scala — qualunque fosse la qualità
     scritta nel caso, da confuso esce il testo di ripiego e non rivela
     niente. Chi già mentiva continua a mentire: un bugiardo confuso non
     diventa sincero, e il debriefing deve poterlo dire.

     ASSUNZIONE NOSTRA: che un confuso sia inattendibile lo dice la
     clinica, dove si fermi esattamente l'attendibilità no. */
  const confuso = interlocutore === PAZIENTE.id
    && coscienza === 'V'
    && scritta.qualita !== 'falsa';
  if (confuso) {
    return { testo: domanda.confuso, qualita: 'vaga', rivela: [], ripiego: 'confuso' };
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

/** Le domande che ha senso fare col paziente in questo stato. */
export function domandeDisponibili(stato) {
  return DOMANDE_ELENCO.filter((d) => !d.richiede || d.richiede(stato || {}));
}

/* Da quale risposta si è cavato di più: serve a tenere la migliore
   quando la stessa domanda è stata fatta a due persone. */
const PESO_QUALITA = { buona: 3, vaga: 2, sbagliata: 1, falsa: 0 };

/**
 * Cosa dire alla fine: quello che ha raccolto, e dove si è fermato
 * troppo presto.
 *
 * @param {object} caso
 * @param {object[]} raccolte  { domanda, interlocutore, qualita, rivela, ripiego, t }
 */
export function revisioneAnamnesi(caso, raccolte = []) {
  const chi = interlocutoriDi(caso);
  const etichetta = (id) => chi.find((i) => i.id === id)?.label || id;

  /* Di ogni domanda resta la risposta migliore che ha ottenuto: se ha
     chiesto prima al paziente e poi alla moglie, quello che sa è quello
     che gli ha detto la moglie. */
  const migliori = new Map();
  raccolte.forEach((r) => {
    const attuale = migliori.get(r.domanda);
    if (!attuale || PESO_QUALITA[r.qualita] > PESO_QUALITA[attuale.qualita]) {
      migliori.set(r.domanda, r);
    }
  });

  const voci = [...migliori.values()].map((r) => ({
    domanda: r.domanda,
    da: etichetta(r.interlocutore),
    qualita: r.qualita,
    rivela: [...(r.rivela || [])],
    t: r.t,
  }));

  /* L'avviso non è per quello che non ha chiesto — di quello se ne
     occupa la pagella — ma per quello che ha chiesto alla persona
     sbagliata e ha dato per buono. */
  const avvisi = voci
    .filter((v) => v.qualita !== 'buona')
    .map((v) => {
      const risposte = caso?.anamnesi?.risposte?.[v.domanda] || {};
      /* Una risposta a varianti vale per la MIGLIORE che dichiara: se
         una delle sue vie porta a una risposta buona, quella persona
         «avrebbe risposto meglio». */
      const dichiaraBuona = (r) => (Array.isArray(r)
        ? r.some((x) => x?.qualita === 'buona')
        : r?.qualita === 'buona');
      const chiSapeva = Object.keys(risposte)
        .filter((id) => dichiaraBuona(risposte[id]))
        .filter((id) => !raccolte.some((r) => r.domanda === v.domanda && r.interlocutore === id));
      if (!chiSapeva.length) return null;
      return `${etichetta(chiSapeva[0])} avrebbe risposto meglio: chiedere a chi c'è costa pochi secondi.`;
    })
    .filter(Boolean);

  return { voci, avvisi };
}
