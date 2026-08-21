/* =====================================================================
   sim-engine.js — motore dell'intervento.

   Logica pura: nessun DOM, nessuna dipendenza. Si collauda con
   `node --test tests/`.

   Idee portanti
   -------------
   · L'orologio avanza SOLO quando il giocatore agisce (a turni).
   · Il paziente ha un decorso: senza le azioni giuste peggiora da solo.
   · Fare costa tempo, e il tempo è l'unica risorsa che non torna.
   · La squadra è di tre: tu, l'autista e l'infermiere. Le azioni
     delegate corrono in parallelo mentre tu fai altro.
   · Le rilevazioni invecchiano: quello che vedi è il valore di quando
     l'hai misurato, non quello di adesso.

   I valori che derivano nel tempo non vengono accumulati secondo per
   secondo (l'errore in virgola mobile si sommerebbe): si tiene un
   ANCORA — l'ultimo stato certo — e si proietta linearmente da lì.
   ===================================================================== */

/* `verificaArresto` si chiama come una funzione che sim-engine ha già:
   si importa sotto altro nome per non coprirla. */
import {
  riserveIniziali, parametriVisibili, ritornoVenoso,
  verificaArresto as arrestoDaRiserve,
} from './fisiologia.js';
import { applicaOffese, applicaTerapie, compensoBloccato } from '../data/offese.js';
import {
  PAZIENTE, aChi, interlocutoriDi, puoRispondere, rispostaA, domandeDisponibili,
  revisioneAnamnesi,
} from './anamnesi.js';
import { revisioneRagguaglio } from './ragguaglio.js';
import { DOMANDE } from '../data/domande.js';

/* Chiavi che derivano nel tempo secondo `decorso`. */
const DERIVATE = ['pas', 'pad', 'fc', 'spo2', 'temp', 'glicemia', 'fr', 'dolore'];

/* Quanto resta valida una rilevazione singola prima di essere rifatta. */
const VALIDITA_LETTURA = 120;

/* Grandezze che il monitor tiene sotto controllo di continuo. */
const CONTINUE = ['fc', 'spo2', 'ritmo'];

const COSCIENZA_PESO = { A: 0, V: 1, P: 2, U: 3 };

/* Estremi oltre i quali il numero non è più un dato clinico ma un errore di
   calcolo. Non sono valori "normali" — quelli stanno nel manuale — sono il
   confine del possibile: sotto zero non si scende, e una frequenza a quattro
   cifre vuol dire che la proiezione è scappata di mano.

   I pavimenti stanno a zero di proposito: l'arresto è uno stato legittimo del
   paziente, deve poterci arrivare. Un caso che vuole limiti più stretti li
   dichiara in `decorso.limiti` e quelli hanno la precedenza. */
const LIMITI_FISIOLOGICI = {
  fc: [0, 220],
  pas: [0, 300],
  pad: [0, 200],
  spo2: [0, 100],
  fr: [0, 60],
  temp: [20, 43],
  glicemia: [5, 700],
  dolore: [0, 10],
};

const arrotonda = (v, cifre = 4) => {
  const k = 10 ** cifre;
  return Math.round(v * k) / k;
};

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

/**
 * @param {object} caso        definizione dello scenario (formato motore 2)
 * @param {object} opzioni     { azioni: catalogo }
 */
export function creaIntervento(caso, opzioni = {}) {
  const catalogo = opzioni.azioni || {};
  const membri = opzioni.membri || ['tu', 'autista', 'infermiere'];
  const COSTO_DELEGA = opzioni.costoDelega ?? 5;

  /* Voltarsi verso un'altra persona costa quanto voltarsi. */
  const COSTO_VOLTARSI = opzioni.costoVoltarsi ?? 10;

  /* ------------------------------ stato ---------------------------- */
  /* Un caso di formato 3 porta le sue riserve: da lì escono i parametri.
     I casi vecchi non hanno il blocco `fisiologia` e continuano a
     derivare per rette, finché non saranno convertiti tutti. */
  const fis = caso.fisiologia || null;
  let riserve = fis ? riserveIniziali(fis.riserve) : null;

  /* `gia` sono i millilitri già persi quando la squadra arriva: è così
     che si sceglie la gravità all'arrivo, invece di scrivere a mano i
     parametri. */
  if (fis) {
    const giaPersi = (fis.offese || []).reduce((s, o) => s + (o.gia || 0), 0);
    riserve = { ...riserve, volemia: riserve.volemia - giaPersi };
  }

  const modFis = fis
    ? { ...fis.modificatori, compensoBloccato: compensoBloccato(fis.offese, fis.modificatori) }
    : null;

  const statoIniziale = normalizza(caso.iniziale || contornoFisiologico());
  let ancora = statoIniziale;
  let ancoraT = 0;
  let t = 0;

  let diario = [];
  let letture = {};                 // { chiave: { t, val } }
  let fatte = [];                   // { id, chi, t }
  let pendenti = [];                // { fineA, id, chi }
  let squadra = Object.fromEntries(membri.map((m) => [m, { liberoA: 0, azione: null }]));
  let eventiScattati = [];
  let sogliePassate = [];
  let decisionePendente = null;
  let arrestoA = null;
  let storico = [];                 // { t, pas, fc, spo2 } per il grafico finale

  /* Con chi stai parlando adesso. Ti giri una volta e da lì tutte le
     domande vanno a lui, finché non ti giri di nuovo. */
  let interlocutore = PAZIENTE.id;
  let raccolte = [];                // { domanda, interlocutore, qualita, rivela, ripiego, t }
  let saputo = {};                  // { chiave: { da, t } } — quello che hai scoperto
  const ascoltatori = new Set();

  /* Il paziente di formato 3 non dichiara i parametri: all'arrivo si
     calcolano dalle riserve che le offese hanno già consumato. Quello
     che resta — le vie aeree, la temperatura — è il contorno che la
     fisiologia non modella, e un caso può sempre dichiararlo a parte
     con un suo `iniziale`. */
  function contornoFisiologico() {
    const p = parametriVisibili(riserve, fis.base, modFis);
    return {
      ...p,
      viePervie: true,
      respiro: { tipo: 'normale', fr: p.fr },
      ritmo: ritmoDa(p),
      temp: fis.base.temp ?? 36.5,
      esito: 'in-corso',
      tag: [],
    };
  }

  /* Il monitor non sa perché il cuore corre: mostra quello che vede. */
  function ritmoDa(p) {
    return p.fc > 100 ? 'tachicardia' : 'sinusale';
  }

  function normalizza(src) {
    const s = { ...src, tag: [...(src.tag || [])], esito: src.esito || 'in-corso' };
    s.respiro = { ...(src.respiro || { tipo: 'normale', fr: 16 }) };
    s.fr = s.respiro.fr;
    return s;
  }

  /* ------------------------- decorso nel tempo --------------------- */
  function ritmiAttivi() {
    const base = caso.decorso?.base || {};
    const freni = caso.decorso?.freni || {};
    const somma = { ...base };
    ancora.tag.forEach((tag) => {
      const f = freni[tag];
      if (!f) return;
      Object.entries(f).forEach(([k, v]) => { somma[k] = (somma[k] || 0) + v; });
    });
    return somma;
  }

  function limita(chiave, valore) {
    const l = caso.decorso?.limiti?.[chiave] || LIMITI_FISIOLOGICI[chiave];
    if (!l) return valore;
    return Math.min(l[1], Math.max(l[0], valore));
  }

  /** Stato proiettato all'istante corrente, senza toccare l'ancora. */
  function proietta() {
    if (fis) return proiettaFisiologico(t - ancoraT);

    const minuti = (t - ancoraT) / 60;
    const ritmi = ritmiAttivi();
    const s = { ...ancora, tag: [...ancora.tag], respiro: { ...ancora.respiro } };
    if (minuti > 0) {
      DERIVATE.forEach((k) => {
        const r = ritmi[k];
        if (!r || typeof ancora[k] !== 'number') return;
        s[k] = limita(k, arrotonda(ancora[k] + r * minuti));
      });
      s.respiro.fr = s.fr;
    }
    return s;
  }

  /* Il paziente di formato 3 non ha parametri memorizzati: si calcolano
     dalle riserve, che nel frattempo le offese hanno consumato. */
  function proiettaFisiologico(dt) {
    const base = { ...ancora, tag: [...ancora.tag], respiro: { ...ancora.respiro } };

    /* A cuore fermo non si proietta più niente: i parametri sono quelli
       che `entraInArresto` ha scritto, e restano lì finché non torna un
       circolo. Ricalcolarli dalle riserve rimetterebbe in piedi una
       frequenza che il paziente non ha. */
    if (ancora.tag.includes('arresto')) return { ...base, riserve };

    /* Prima quello che consuma, poi quello che rimette: l'ordine conta
       solo per il tetto del riempimento, ma è anche il modo in cui
       vanno le cose sul mezzo. */
    const consumate = dt > 0 ? applicaOffese(riserve, fis.offese, dt, ancora.tag) : riserve;
    const r = dt > 0 ? applicaTerapie(consumate, dt, ancora.tag) : consumate;

    /* La posizione del paziente non consuma riserve: cambia quanto
       sangue torna al cuore, cioè quanto la pressione tiene. */
    const p = parametriVisibili(r, fis.base, { ...modFis, ritornoVenoso: ritornoVenoso(ancora.tag) });
    return {
      ...base,
      ...p,
      respiro: { ...ancora.respiro, fr: p.fr },
      ritmo: ritmoDa(p),
      riserve: r,
    };
  }

  /** Fissa l'ancora al valore proiettato adesso: da qui riparte il calcolo. */
  function ancoraOra() {
    const s = proietta();
    if (fis && s.riserve) riserve = s.riserve;
    ancora = s;
    ancoraT = t;
  }

  /* ------------------------------ diario --------------------------- */
  function scrivi(tipo, testo, id) {
    if (!testo) return;
    diario = [...diario, { t, tipo, testo, id }];
  }

  function notifica() {
    ascoltatori.forEach((fn) => {
      try { fn(api); } catch (err) { console.error('[sim] ascoltatore in errore', err); }
    });
  }

  /* --------------------------- effetti ----------------------------- */
  /* Le grandezze che nel formato 3 stanno nelle riserve e non nei
     parametri: un'azione che dice `dolore: -2` deve toglierlo davvero al
     paziente, non al numero scritto sul monitor — che tanto al calcolo
     successivo tornerebbe com'era. */
  const RISERVE = ['volemia', 'ossigenazione', 'glicemia', 'contrattilita', 'tonoVascolare', 'dolore'];

  /** Applica un oggetto-effetto: delta numerici, campi diretti, tag, arresto. */
  function applicaEffetto(eff) {
    if (!eff) return;
    ancoraOra();
    const s = { ...ancora, tag: [...ancora.tag], respiro: { ...ancora.respiro } };

    Object.entries(eff).forEach(([k, v]) => {
      if (k === 'tag') { if (!s.tag.includes(v)) s.tag = [...s.tag, v]; return; }
      if (fis && RISERVE.includes(k) && typeof v === 'number') {
        riserve = { ...riserve, [k]: riserve[k] + v };
        return;
      }
      if (k === 'togliTag') { s.tag = s.tag.filter((x) => x !== v); return; }
      if (k === 'arresto') return;                     // gestito sotto
      if (k === 'respiro') { s.respiro = { ...s.respiro, ...v }; s.fr = s.respiro.fr; return; }
      if (typeof v === 'number' && typeof s[k] === 'number') {
        s[k] = limita(k, arrotonda(s[k] + v));         // delta
      } else {
        s[k] = v;                                       // valore assoluto
      }
    });
    ancora = s;
    /* Se l'effetto ha toccato le riserve, i parametri che si vedono sono
       già cambiati: si rifà l'ancora perché la lettura successiva li
       trovi aggiornati. */
    if (fis) ancora = proietta();

    if (eff.arresto) entraInArresto();
  }

  function entraInArresto(ritmoDellaCausa) {
    const conf = caso.arresto || {};
    ancoraOra();
    ancora = {
      ...ancora,
      coscienza: 'U',
      polsoRadiale: false,
      fc: 0, pas: 0, pad: 0,
      /* Il saturimetro legge il polso: senza circolo non legge niente, e
         il riquadro va a trattini invece di mostrare l'ultimo numero
         buono come se il paziente stesse ancora respirando. */
      spo2: null,
      /* nel formato 3 il ritmo lo decide la causa, non il copione */
      ritmo: ritmoDellaCausa || conf.ritmo || 'fv',
      respiro: { tipo: 'gasping', fr: 4 },
      fr: 4,
      tag: ancora.tag.includes('arresto') ? ancora.tag : [...ancora.tag, 'arresto'],
    };
    arrestoA = t;
    scrivi('allarme', 'Il paziente non risponde e non ha polso: arresto cardiocircolatorio.', 'arresto');
  }

  /* ---------------------- eventi, soglie, arresto ------------------- */
  function scattaEventi() {
    (caso.eventi || []).forEach((ev) => {
      if (eventiScattati.includes(ev.id)) return;
      if (t < (ev.t ?? 0)) return;
      const s = proietta();
      if (ev.se && !ev.se(s)) return;

      eventiScattati = [...eventiScattati, ev.id];
      scrivi('evento', ev.testo, ev.id);
      if (ev.effetto) applicaEffetto(ev.effetto);
      if (ev.decisione) decisionePendente = { evento: ev, ...ev.decisione };
    });
  }

  function verificaSoglie() {
    const s = proietta();
    (caso.soglie || []).forEach((sg, idx) => {
      const chiave = sg.id || `soglia-${idx}`;
      if (sg.unaVolta !== false && sogliePassate.includes(chiave)) return;
      if (!sg.se(s)) return;
      sogliePassate = [...sogliePassate, chiave];
      scrivi('osservazione', sg.testo, chiave);
    });
  }

  /* Nei casi di formato 3 all'arresto ci si arriva consumando le
     riserve, non per evento scritto a mano: è il paziente che muore
     perché nessuno ha fatto la cosa giusta in tempo. */
  function verificaArrestoFisiologico() {
    if (!fis || arrestoA !== null || ancora.esito !== 'in-corso') return;
    const s = proietta();
    /* Gli stessi modificatori con cui si calcolano i parametri che si
       vedono: se il compenso è bloccato lo è anche qui, altrimenti il
       motore dichiarerebbe l'arresto a una pressione diversa da quella
       che ha appena mostrato sul monitor. */
    const a = arrestoDaRiserve(s.riserve, fis.base,
      { ...modFis, ritornoVenoso: ritornoVenoso(ancora.tag) }, fis.offese);
    if (!a) return;
    ancoraOra();
    ancora = { ...ancora, arrestoDefibrillabile: a.defibrillabile };
    entraInArresto(a.ritmo);
  }

  function verificaArresto() {
    if (arrestoA === null || ancora.esito !== 'in-corso') return;
    const finestra = caso.arresto?.finestraRcp ?? 60;
    if (ancora.tag.includes('rcp')) return;
    if (t - arrestoA >= finestra) {
      ancoraOra();
      ancora = { ...ancora, esito: 'morto' };
      scrivi('allarme', 'Nessuna compressione toracica: il paziente muore.', 'morte');
    }
  }

  /* ------------------------- orologio a turni ---------------------- */
  function completaPendenti() {
    const dovute = pendenti.filter((p) => p.fineA <= t).sort((a, b) => a.fineA - b.fineA);
    if (!dovute.length) return;
    pendenti = pendenti.filter((p) => p.fineA > t);
    dovute.forEach((p) => completa(p));
  }

  function completa({ id, chi }) {
    const az = catalogo[id];
    if (!az) return;
    squadra = { ...squadra, [chi]: { ...squadra[chi], azione: null } };
    fatte = [...fatte, { id, chi, t }];

    if (az.applica) applicaEffetto(az.applica(proietta(), contesto()));
    // un caso può dare a un'azione generica un effetto tutto suo:
    // la posizione seduta fa bene al dispnoico e male allo shockato
    const extra = caso.effettiAzioni?.[id];
    if (extra) applicaEffetto(typeof extra === 'function' ? extra(proietta()) : extra);

    if (az.rileva) {
      const s = proietta();
      letture = { ...letture, [az.rileva]: { t, val: valoreGrezzo(az.rileva, s) } };
    }

    /* Il catalogo dice cosa fai, il caso può dire cosa trovi: cercare i
       documenti è la stessa azione dappertutto, ma la tessera di
       diabetico nel portafogli sta solo in questo scenario. Stessa
       impostazione di `effettiAzioni`, applicata al testo. */
    const suo = caso.diarioAzioni?.[id];
    const testo = suo
      ? (typeof suo === 'function' ? suo(proietta()) : suo)
      : (typeof az.diario === 'function' ? az.diario(proietta()) : (az.diario || az.label));
    scrivi(chi === 'tu' ? 'azione' : 'squadra', chi === 'tu' ? testo : `${etichettaMembro(chi)}: ${testo}`, id);
  }

  const etichettaMembro = (chi) => ({ tu: 'Tu', autista: 'Autista', infermiere: 'Infermiere' }[chi] || chi);

  /* Le grandezze si leggono come le legge un soccorritore: la frequenza
     è un numero intero, la temperatura ha un decimale. */
  const DECIMALI = { temp: 1 };
  function valoreGrezzo(chiave, s) {
    if (chiave === 'pa') return `${Math.round(s.pas)}/${Math.round(s.pad)}`;
    if (chiave === 'avpu') return s.coscienza;
    if (chiave === 'ritmo') return s.ritmo;
    if (chiave === 'polso') return s.polsoRadiale ? 'presente' : 'assente';
    if (chiave === 'refill') return `${s.refill} s`;
    if (chiave === 'cute') return ({
      normale: 'normale', pallida: 'pallida',
      'pallida-fredda-sudata': 'pallida, fredda, sudata',
    })[s.cute] || s.cute;
    if (chiave === 'sete') return s.sete ? 'ha sete' : 'no';
    const v = s[chiave];
    if (typeof v !== 'number') return v;
    const d = DECIMALI[chiave] ?? 0;
    return d ? Number(v.toFixed(d)) : Math.round(v);
  }

  /** Fa scorrere il tempo di `dt` secondi, un secondo per volta. */
  function avanza(dt) {
    let restanti = Math.max(0, Math.round(dt));
    while (restanti > 0) {
      if (decisionePendente || ancora.esito !== 'in-corso') break;
      t += 1;
      restanti -= 1;
      completaPendenti();
      verificaArrestoFisiologico();
      verificaArresto();
      verificaSoglie();
      scattaEventi();
      if (t % 15 === 0) campiona();
    }
    return t;
  }

  function campiona() {
    const s = proietta();
    storico = [...storico, { t, pas: s.pas, fc: s.fc, spo2: s.spo2 }];
  }

  /* ------------------------------ azioni --------------------------- */
  /* Contesto passato ai prerequisiti: serve per le azioni che dipendono
     da cosa hai gia' rilevato o riferito, non solo dallo stato clinico.
     E' cosi' che l'infermiere puo' rispondere "prima misurale la glicemia". */
  function contesto() {
    return {
      t,
      letture,
      fatte,
      haFatto: (id) => fatte.some((f) => f.id === id),
      haLettura: (chiave) => Boolean(letture[chiave]) && !letturaScaduta(chiave),
    };
  }

  function azioniDisponibili() {
    const s = proietta();
    const ctx = contesto();
    return Object.values(catalogo).filter((az) => {
      if (az.unaVolta && fatte.some((f) => f.id === az.id)) return false;
      if (az.richiede && !az.richiede(s, ctx)) return false;
      return true;
    });
  }

  function membriLiberi(az) {
    return (az.chi || []).filter((m) => squadra[m] && squadra[m].liberoA <= t);
  }

  function esegui(id, chi = 'tu') {
    const az = catalogo[id];
    if (!az) return { ok: false, motivo: 'Azione sconosciuta.' };
    if (decisionePendente) return { ok: false, motivo: 'Prima rispondi a quello che sta succedendo.' };
    if (ancora.esito !== 'in-corso') return { ok: false, motivo: 'L\'intervento è chiuso.' };
    if (!az.chi?.includes(chi)) return { ok: false, motivo: `${etichettaMembro(chi)} non può eseguire questa azione.` };
    if (!squadra[chi] || squadra[chi].liberoA > t) return { ok: false, motivo: `${etichettaMembro(chi)} è occupato.` };
    if (az.unaVolta && fatte.some((f) => f.id === az.id)) return { ok: false, motivo: 'Già fatto.' };
    if (az.richiede && !az.richiede(proietta(), contesto())) {
      const motivo = typeof az.motivoBloccato === 'function'
        ? az.motivoBloccato(proietta(), contesto())
        : az.motivoBloccato;
      return { ok: false, motivo: motivo || 'Non è possibile adesso.' };
    }

    const fineA = t + az.durata;
    squadra = { ...squadra, [chi]: { liberoA: fineA, azione: az.id } };
    pendenti = [...pendenti, { fineA, id, chi }];

    if (chi === 'tu') {
      avanza(az.durata);
    } else {
      scrivi('azione', `Chiedi a ${etichettaMembro(chi).toLowerCase()}: ${az.label.toLowerCase()}.`);
      avanza(COSTO_DELEGA);
    }
    notifica();
    return { ok: true };
  }

  function rispondiDecisione(indice) {
    if (!decisionePendente) return { ok: false, motivo: 'Nessuna decisione in sospeso.' };
    const opzione = decisionePendente.opzioni[indice];
    if (!opzione) return { ok: false, motivo: 'Opzione inesistente.' };
    const evento = decisionePendente.evento;
    decisionePendente = null;
    scrivi('azione', opzione.t);
    if (opzione.effetto) applicaEffetto(opzione.effetto);
    fatte = [...fatte, { id: `decisione:${evento.id}`, chi: 'tu', t, ok: opzione.ok, opzione }];

    // Se l'evento ti aveva interrotto mentre facevi qualcosa, quel
    // qualcosa va portato a termine: l'orologio riprende da dove si era
    // fermato fino a quando sei di nuovo libero.
    const restaDaFare = (squadra.tu?.liberoA ?? 0) - t;
    if (restaDaFare > 0) avanza(restaDaFare);

    notifica();
    return { ok: true, opzione };
  }

  /* ------------------------------ letture -------------------------- */
  const haMonitor = () => proietta().tag.includes('monitor');

  function letturaScaduta(chiave) {
    if (CONTINUE.includes(chiave) && haMonitor()) return false;
    const l = letture[chiave];
    if (!l) return true;
    return (t - l.t) > VALIDITA_LETTURA;
  }

  function valore(chiave) {
    const s = proietta();
    if (CONTINUE.includes(chiave) && haMonitor()) return valoreGrezzo(chiave, s);
    return letture[chiave]?.val;
  }

  function etaLettura(chiave) {
    if (CONTINUE.includes(chiave) && haMonitor()) return 0;
    const l = letture[chiave];
    return l ? t - l.t : null;
  }

  /* ----------------------------- anamnesi -------------------------- */
  const etichettaInterlocutore = (id) => interlocutoriDi(caso).find((i) => i.id === id)?.label || id;

  /** Ti giri verso un'altra persona presente sulla scena. */
  function rivolgitiA(id) {
    if (decisionePendente) return { ok: false, motivo: 'Prima rispondi a quello che sta succedendo.' };
    if (ancora.esito !== 'in-corso') return { ok: false, motivo: 'L\'intervento è chiuso.' };
    if (!interlocutoriDi(caso).some((i) => i.id === id)) {
      return { ok: false, motivo: 'Qui non c\'è nessuno con cui parlare.' };
    }
    if (id === interlocutore) return { ok: true };
    if (squadra.tu?.liberoA > t) return { ok: false, motivo: 'Sei occupato.' };

    interlocutore = id;
    avanza(COSTO_VOLTARSI);
    scrivi('azione', `Ti giri verso ${etichettaInterlocutore(id)}.`, `interlocutore:${id}`);
    notifica();
    return { ok: true };
  }

  /**
   * Fai una domanda a chi hai davanti. La risposta arriva alla fine
   * della domanda, non all'inizio: se nel frattempo il paziente
   * peggiora, ti risponde com'è adesso.
   */
  function chiedi(idDomanda) {
    const d = DOMANDE[idDomanda];
    if (!d) return { ok: false, motivo: 'Domanda sconosciuta.' };
    if (decisionePendente) return { ok: false, motivo: 'Prima rispondi a quello che sta succedendo.' };
    if (ancora.esito !== 'in-corso') return { ok: false, motivo: 'L\'intervento è chiuso.' };
    if (squadra.tu?.liberoA > t) return { ok: false, motivo: 'Sei occupato.' };
    if (!domandeDisponibili(proietta()).some((x) => x.id === d.id)) {
      return { ok: false, motivo: 'Non è una domanda che ha senso adesso.' };
    }
    const permesso = puoRispondere(interlocutore, proietta().coscienza);
    if (!permesso.ok) return { ok: false, motivo: permesso.motivo };

    squadra = { ...squadra, tu: { liberoA: t + d.durata, azione: `domanda:${d.id}` } };
    scrivi('azione', `Chiedi ${aChi(etichettaInterlocutore(interlocutore))}: ${d.testo}`, `domanda:${d.id}`);
    avanza(d.durata);

    const r = rispostaA({
      domanda: d,
      anamnesi: caso.anamnesi,
      interlocutore,
      coscienza: proietta().coscienza,
    });

    fatte = [...fatte, { id: `domanda:${d.id}`, chi: 'tu', t }];
    raccolte = [...raccolte, { domanda: d.id, interlocutore, qualita: r.qualita, rivela: r.rivela, ripiego: r.ripiego, t }];
    r.rivela.forEach((chiave) => { saputo = { ...saputo, [chiave]: { da: interlocutore, t } }; });

    scrivi('risposta', r.testo, `risposta:${d.id}`);
    squadra = { ...squadra, tu: { ...squadra.tu, azione: null } };
    notifica();
    return { ok: true, risposta: r };
  }

  /* ------------------------------ pagella -------------------------- */
  function pagella() {
    const s = proietta();
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
      gravitaIniziale: gIniziale,
      gravitaFinale: gFinale,
      secondi: t,
      punti: Math.max(0, puntiAzioni - penalita),
      max,
      percentuale: Math.round((Math.max(0, puntiAzioni - penalita) / max) * 100),
      storico: [...storico, { t, pas: s.pas, fc: s.fc, spo2: s.spo2 }],
    };
  }

  function chiudi() {
    if (ancora.esito === 'in-corso') {
      ancoraOra();
      ancora = { ...ancora, esito: 'consegnato' };
    }
    return pagella();
  }

  /* ------------------------------- API ----------------------------- */
  const api = {
    caso,
    get t() { return t; },
    get stato() { return proietta(); },
    get diario() { return diario; },
    get letture() { return letture; },
    get fatte() { return fatte; },
    get squadra() { return squadra; },
    get decisionePendente() { return decisionePendente; },
    get storico() { return storico; },
    get interlocutore() { return interlocutore; },
    get interlocutori() { return interlocutoriDi(caso); },
    get saputo() { return saputo; },
    get raccolte() { return raccolte; },
    domandeDisponibili: () => domandeDisponibili(proietta()),
    chiedi,
    rivolgitiA,
    avanza,
    esegui,
    azioniDisponibili,
    membriLiberi,
    contesto,
    rispondiDecisione,
    letturaScaduta,
    etaLettura,
    valore,
    pagella,
    chiudi,
    on(fn) { ascoltatori.add(fn); return () => ascoltatori.delete(fn); },
  };

  scrivi('osservazione', caso.colpoOcchio?.testo);
  campiona();
  return api;
}
