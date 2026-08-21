/* =====================================================================
   pagella.js — com'è andata.

   Logica pura: nessun DOM, nessuna dipendenza, nessun orologio. Riceve
   una fotografia dello stato quando la partita si chiude e ne ricava il
   verdetto; non muta niente e non sa che esista un motore.

   Stava dentro `sim-engine.js`, che era arrivato a 866 righe contro le
   800 che il progetto si è dato come massimo. Si stacca bene perché è
   l'unico pezzo del motore che non fa succedere niente: legge e basta,
   come `debriefing.js` disegna e basta.
   ===================================================================== */

import { revisioneAnamnesi } from './anamnesi.js';
import { revisioneRagguaglio } from './ragguaglio.js';
import { tempoButtato } from './giudizio.js';
import { DOMANDE } from '../data/domande.js';
import { nomeClasse } from '../data/classi-patologia.js';

const COSCIENZA_PESO = { A: 0, V: 1, P: 2, U: 3 };

/** Quanto è grave il quadro, in astratto. Serve solo a confrontare due
    momenti dello stesso paziente, non a classificare i pazienti fra loro. */
export function gravita(stato) {
  if (!stato) return 0;
  if (stato.esito === 'morto') return 100;
  let g = 0;
  if (stato.pas < 90) g += 2; else if (stato.pas < 100) g += 1;
  if (stato.spo2 < 90) g += 2; else if (stato.spo2 < 94) g += 1;
  g += COSCIENZA_PESO[stato.coscienza] ?? 0;
  if (stato.fc > 120 || stato.fc < 50) g += 1;
  if (stato.polsoRadiale === false) g += 3;
  return g;
}

/** Com'è andata col riconoscimento. `null` se il caso non dichiara una
    classe: senza risposta giusta non c'è niente da valutare. */
export function revisioneSospetto(caso, sospetti = []) {
  if (!caso.classe) return null;
  const giusta = (c) => c === caso.classe || (caso.classeAnche || []).includes(c);
  const azzeccato = sospetti.find((x) => giusta(x.codice));
  return {
    storico: sospetti,
    prima: sospetti[0] || null,
    finale: sospetti[sospetti.length - 1] || null,
    giusto: Boolean(sospetti.length && giusta(sospetti[sospetti.length - 1].codice)),
    azzeccatoA: azzeccato ? azzeccato.t : null,
    cambi: Math.max(0, sospetti.length - 1),
    attesa: caso.classe,
    attesaLabel: nomeClasse(caso.classe),
  };
}

/** Il verdetto di fine intervento.

    @param {object} caso   lo scenario
    @param {object} dati   la fotografia che il motore consegna:
      `{ s, statoIniziale, catalogo, fatte, raccolte, saputo, letture,
         storico, sospetti, t }` */
export function compilaPagella(caso, dati) {
  const {
    s, statoIniziale, catalogo = {}, fatte = [], raccolte = [],
    saputo = {}, letture = {}, storico = [], sospetti = [], t = 0,
  } = dati;
  const conf = caso.azioni || {};

  /** Una voce può accettare più azioni equivalenti: `id: ['o2-maschera', 'o2-reservoir']`. */
  const combacia = (voce, idAzione) => (Array.isArray(voce.id)
    ? voce.id.includes(idAzione)
    : voce.id === idAzione);
  /* Una voce può essere un'azione o una domanda dell'anamnesi: il
     nome si va a prendere nel catalogo giusto. */
  const nome = (x) => (String(x).startsWith('domanda:')
    ? DOMANDE[String(x).slice('domanda:'.length)]?.testo
    : catalogo[x]?.label) || x;
  const etichetta = (voce) => (Array.isArray(voce.id)
    ? voce.id.map((x) => nome(x)).join(' oppure ')
    : nome(voce.id));

  const necessarie = (conf.necessarie || []).map((n) => {
    const fatto = fatte.find((f) => combacia(n, f.id));
    const entro = n.entro ?? Infinity;
    const inTempo = fatto && fatto.t <= entro;
    const peso = n.peso ?? 1;
    return {
      id: Array.isArray(n.id) ? n.id[0] : n.id,
      label: n.label || etichetta(n),
      fatta: Boolean(fatto),
      t: fatto?.t ?? null,
      entro: n.entro ?? null,
      peso,
      punti: !fatto ? 0 : (inTempo ? peso : peso / 2),
      ritardo: Boolean(fatto && !inTempo),
    };
  });

  const dannose = (conf.dannose || [])
    .filter((d) => fatte.some((f) => combacia(d, f.id)))
    .map((d) => ({
      id: Array.isArray(d.id) ? d.id[0] : d.id,
      label: d.label || etichetta(d),
      perche: d.perche,
      penalita: d.penalita ?? 2,
    }));

  /* Il superfluo non toglie punti: costa i secondi che ha preso, e
     quei secondi si vedono nelle finestre mancate. */
  const buttato = tempoButtato(fatte, catalogo);

  const gIniziale = gravita(statoIniziale);
  const gFinale = gravita(s);
  let esitoPaziente = 'stabile';
  if (s.esito === 'morto') esitoPaziente = 'morto';
  else if (gFinale > gIniziale + 0.5) esitoPaziente = 'peggiorato';
  else if (gFinale < gIniziale - 0.5) esitoPaziente = 'migliorato';

  const puntiAzioni = necessarie.reduce((a, r) => a + r.punti, 0);
  const penalita = dannose.reduce((a, r) => a + r.penalita, 0);
  const max = necessarie.reduce((a, r) => a + r.peso, 0) || 1;

  return {
    necessarie,
    dannose,
    anamnesi: revisioneAnamnesi(caso, raccolte),
    /* Il tempo dall'esordio, per i casi in cui il tempo è la terapia.
       Il viaggio non lo sappiamo e non lo inventiamo: il conto si
       ferma a quando la squadra parte, che è l'unico pezzo che
       dipende da lei. */
    esordio: typeof caso.esordio === 'number'
      ? {
        primaDiVoi: caso.esordio * 60,
        vostro: t,
        allaPartenza: caso.esordio * 60 + t,
      }
      : null,
    /* Il ragguaglio scritto nel caso resta e si legge com'è: serve a
       sapere come si dice. Questo è quanto di quel testo sei in grado
       di sostenere davvero. */
    ragguaglio: revisioneRagguaglio(caso, { fatte, saputo, letture }),
    esitoPaziente,
    tempoButtato: buttato,
    sospetto: revisioneSospetto(caso, sospetti),
    gravitaIniziale: gIniziale,
    gravitaFinale: gFinale,
    secondi: t,
    punti: Math.max(0, puntiAzioni - penalita),
    max,
    percentuale: Math.round((Math.max(0, puntiAzioni - penalita) / max) * 100),
    storico: [...storico, { t, pas: s.pas, fc: s.fc, spo2: s.spo2 }],
  };
}
