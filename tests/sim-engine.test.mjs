/* =====================================================================
   Collaudo del motore di intervento.
   Il motore è logica pura: gira in Node senza browser.
   Esecuzione:  node --test tests/
   ===================================================================== */

import test from 'node:test';
import assert from 'node:assert/strict';

import { creaIntervento, gravita } from '../assets/js/core/sim-engine.js';
import { AZIONI } from '../assets/js/data/azioni.js';

/* ------------------- caso di prova, minimo ma completo --------------- */
const AZIONI_PROVA = {
  'misura-pa': {
    id: 'misura-pa', cat: 'valutazione', label: 'Misura la pressione',
    durata: 40, chi: ['tu', 'autista'], rileva: 'pa',
    spiega: 'prova',
  },
  'misura-glicemia': {
    id: 'misura-glicemia', cat: 'D', label: 'Misura la glicemia',
    durata: 30, chi: ['tu'], rileva: 'glicemia', unaVolta: false,
    spiega: 'prova',
  },
  monitor: {
    id: 'monitor', cat: 'C', label: 'Collega il monitor',
    durata: 30, chi: ['tu', 'autista'], unaVolta: true,
    applica: () => ({ tag: 'monitor' }),
    spiega: 'prova',
  },
  antishock: {
    id: 'antishock', cat: 'C', label: 'Posizione antishock',
    durata: 30, chi: ['tu', 'autista'], unaVolta: true,
    applica: () => ({ tag: 'antishock' }),
    spiega: 'prova',
  },
  seduta: {
    id: 'seduta', cat: 'B', label: 'Posizione seduta',
    durata: 20, chi: ['tu'], unaVolta: true,
    applica: () => ({ pas: -10, tag: 'seduta' }),
    spiega: 'prova',
  },
  rcp: {
    id: 'rcp', cat: 'C', label: 'Inizia la RCP',
    durata: 30, chi: ['tu', 'autista'], unaVolta: true,
    applica: () => ({ tag: 'rcp' }),
    spiega: 'prova',
  },
  'ossigeno-solo-se-pervie': {
    id: 'ossigeno-solo-se-pervie', cat: 'B', label: 'Ossigeno',
    durata: 20, chi: ['tu'], richiede: (p) => p.viePervie,
    applica: () => ({ spo2: +4, tag: 'o2' }),
    spiega: 'prova',
  },
};

function casoProva(extra = {}) {
  return {
    id: 'prova', titolo: 'Caso di prova', motore: 2,
    iniziale: {
      coscienza: 'A', viePervie: true,
      respiro: { tipo: 'normale', fr: 24 },
      fc: 125, pas: 100, pad: 60, ritmo: 'tachicardia',
      polsoRadiale: true, spo2: 97, glicemia: 96, temp: 36.1,
      cute: 'pallida-fredda', dolore: 0,
    },
    decorso: {
      base: { pas: -3, fc: +2, spo2: -0.6 },
      freni: { antishock: { pas: +1.5, fc: -1 } },
      limiti: { pas: [40, 220], fc: [20, 220], spo2: [55, 100] },
    },
    eventi: [],
    soglie: [],
    azioni: { necessarie: [], utili: [], dannose: [] },
    ...extra,
  };
}

const avvia = (caso, azioni = AZIONI_PROVA) => creaIntervento(caso, { azioni });

/* ========================= Task 1 — stato e tempo ==================== */

test('lo stato iniziale rispecchia il caso', () => {
  const i = avvia(casoProva());
  assert.equal(i.t, 0);
  assert.equal(i.stato.esito, 'in-corso');
  assert.equal(i.stato.pas, 100);
  assert.equal(i.stato.fc, 125);
  assert.deepEqual(i.letture, {});
});

test('un minuto applica il decorso una volta', () => {
  const i = avvia(casoProva());
  i.avanza(60);
  assert.equal(i.stato.pas, 97);
  assert.equal(i.stato.fc, 127);
});

test('mezzo minuto applica mezzo decorso', () => {
  const i = avvia(casoProva());
  i.avanza(30);
  assert.equal(i.stato.pas, 98.5);
});

test('i valori restano dentro i limiti', () => {
  const i = avvia(casoProva());
  i.avanza(60 * 90);                 // novanta minuti: entrambi toccano il fondo
  assert.equal(i.stato.pas, 40);
  assert.equal(i.stato.spo2, 55);
});

/* Un caso può scordarsi di dichiarare `limiti`: prima bastava questo per
   vedere una frequenza a quattro cifre sul monitor. I limiti fisiologici
   non sono più facoltativi. */
test('senza limiti dichiarati valgono comunque quelli fisiologici', () => {
  const i = avvia(casoProva({
    decorso: { base: { fc: +60, pas: -20, spo2: -3, temp: +1, glicemia: -20 } },
  }));
  i.avanza(60 * 600);                // dieci ore: la scheda lasciata aperta
  assert.ok(i.stato.fc <= 220, `frequenza fuori scala: ${i.stato.fc}`);
  assert.ok(i.stato.pas >= 0, `pressione negativa: ${i.stato.pas}`);
  assert.ok(i.stato.spo2 >= 0 && i.stato.spo2 <= 100, `saturazione impossibile: ${i.stato.spo2}`);
  assert.ok(i.stato.temp <= 43, `temperatura fuori scala: ${i.stato.temp}`);
  assert.ok(i.stato.glicemia >= 0, `glicemia negativa: ${i.stato.glicemia}`);
});

test('i limiti del caso hanno la meglio su quelli fisiologici', () => {
  const i = avvia(casoProva({
    decorso: { base: { fc: +60 }, limiti: { fc: [20, 150] } },
  }));
  i.avanza(60 * 60);
  assert.equal(i.stato.fc, 150);
});

test('un freno attivo somma il suo delta alla base', () => {
  const i = avvia(casoProva());
  i.esegui('antishock', 'tu');      // 30 s: mezzo decorso, poi il freno è attivo
  const pasDopoAzione = i.stato.pas;
  i.avanza(60);
  // base -3 piu' freno +1.5 = -1.5 al minuto
  assert.equal(i.stato.pas, pasDopoAzione - 1.5);
});

/* ==================== Task 2 — azioni, squadra, letture ============== */

test('eseguire di persona consuma tutta la durata', () => {
  const i = avvia(casoProva());
  const esito = i.esegui('misura-pa', 'tu');
  assert.equal(esito.ok, true);
  assert.equal(i.t, 40);
  assert.ok(i.letture.pa);
  assert.equal(i.letture.pa.t, 40);
});

test('delegare costa cinque secondi e il risultato arriva dopo', () => {
  const i = avvia(casoProva());
  i.esegui('misura-pa', 'autista');
  assert.equal(i.t, 5);
  assert.equal(i.letture.pa, undefined, 'la lettura non è ancora pronta');
  i.avanza(40);
  assert.ok(i.letture.pa, 'la lettura arriva quando il collega finisce');
  assert.equal(i.letture.pa.t, 40);
});

test('la lettura conserva il valore del momento, non quello attuale', () => {
  const i = avvia(casoProva());
  i.esegui('misura-pa', 'tu');
  const rilevata = i.letture.pa.val;
  i.avanza(120);
  assert.equal(i.letture.pa.val, rilevata);
  assert.notEqual(i.stato.pas, rilevata);
});

test('un membro occupato non accetta una seconda azione', () => {
  const i = avvia(casoProva());
  i.esegui('misura-pa', 'autista');           // autista occupato fino a 45
  const esito = i.esegui('monitor', 'autista');
  assert.equal(esito.ok, false);
  assert.match(esito.motivo, /occupat/i);
});

test('una lettura singola scade dopo due minuti', () => {
  const i = avvia(casoProva());
  i.esegui('misura-glicemia', 'tu');
  assert.equal(i.letturaScaduta('glicemia'), false);
  i.avanza(130);
  assert.equal(i.letturaScaduta('glicemia'), true);
});

test('col monitor collegato FC e SpO2 restano sempre fresche', () => {
  const i = avvia(casoProva());
  assert.equal(i.letturaScaduta('fc'), true, 'senza monitor non si sa nulla');
  i.esegui('monitor', 'tu');
  i.avanza(600);
  assert.equal(i.letturaScaduta('fc'), false);
  assert.equal(i.valore('fc'), i.stato.fc, 'il monitor mostra il valore vivo');
});

test('unaVolta e richiede filtrano le azioni disponibili', () => {
  const i = avvia(casoProva());
  assert.ok(i.azioniDisponibili().some((a) => a.id === 'monitor'));
  i.esegui('monitor', 'tu');
  assert.equal(i.azioniDisponibili().some((a) => a.id === 'monitor'), false);

  const j = avvia(casoProva({ iniziale: { ...casoProva().iniziale, viePervie: false } }));
  assert.equal(
    j.azioniDisponibili().some((a) => a.id === 'ossigeno-solo-se-pervie'),
    false,
  );
});

/* =================== Task 3 — eventi, soglie, arresto ================ */

test('un evento a tempo scatta una volta sola', () => {
  const caso = casoProva({
    eventi: [{ id: 'e1', t: 120, testo: 'Prova ad alzarsi.' }],
  });
  const i = avvia(caso);
  i.avanza(119);
  assert.equal(i.diario.filter((r) => r.id === 'e1').length, 0);
  i.avanza(10);
  assert.equal(i.diario.filter((r) => r.id === 'e1').length, 1);
  i.avanza(300);
  assert.equal(i.diario.filter((r) => r.id === 'e1').length, 1);
});

test('un evento condizionato aspetta che la condizione sia vera', () => {
  const caso = casoProva({
    eventi: [{ id: 'e2', t: 60, se: (p) => p.pas < 90, testo: 'Si fa pallido.' }],
  });
  const i = avvia(caso);
  i.avanza(60);
  assert.equal(i.diario.some((r) => r.id === 'e2'), false, 'pas ancora 97');
  i.avanza(180);   // pas scende sotto 90
  assert.equal(i.diario.some((r) => r.id === 'e2'), true);
});

test('un evento con decisione ferma il tempo finché non rispondi', () => {
  const caso = casoProva({
    eventi: [{
      id: 'e3', t: 60, testo: 'Prova ad alzarsi.',
      decisione: {
        domanda: 'Cosa fai?',
        opzioni: [
          { t: 'Lo fermo', ok: true, w: 'giusto' },
          { t: 'Lo accompagno', ok: false, effetto: { pas: -15 }, w: 'sbagliato' },
        ],
      },
    }],
  });
  const i = avvia(caso);
  i.avanza(300);
  assert.equal(i.t, 60, 'il tempo si è fermato sull\'evento');
  assert.ok(i.decisionePendente);

  const pasPrima = i.stato.pas;
  i.rispondiDecisione(1);
  assert.equal(i.stato.pas, pasPrima - 15);
  assert.equal(i.decisionePendente, null);
  i.avanza(60);
  assert.equal(i.t, 120);
});

test('una soglia con unaVolta parla una volta sola', () => {
  const caso = casoProva({
    soglie: [{ se: (p) => p.pas < 95, testo: 'Impallidisce.', unaVolta: true }],
  });
  const i = avvia(caso);
  i.avanza(600);
  assert.equal(i.diario.filter((r) => r.testo === 'Impallidisce.').length, 1);
});

test('senza RCP l\'arresto porta alla morte, con la RCP no', () => {
  const caso = casoProva({
    eventi: [{ id: 'arresto', t: 60, testo: 'Si accascia.', effetto: { arresto: true } }],
    arresto: { ritmo: 'fv', finestraRcp: 60 },
  });

  const morte = avvia(caso);
  morte.avanza(200);
  assert.equal(morte.stato.esito, 'morto');
  assert.equal(morte.stato.coscienza, 'U');
  assert.equal(morte.stato.polsoRadiale, false);

  const salvo = avvia(caso);
  salvo.avanza(65);                 // arresto appena avvenuto
  salvo.esegui('rcp', 'tu');
  salvo.avanza(300);
  assert.equal(salvo.stato.esito, 'in-corso');
});

/* ======================== Task 4 — pagella ========================== */

test('la pagella pesa necessarie, ritardi e dannose', () => {
  const caso = casoProva({
    azioni: {
      necessarie: [{ id: 'antishock', entro: 120, peso: 3 }, { id: 'monitor', entro: 120, peso: 2 }],
      utili: [],
      dannose: [{ id: 'seduta', perche: 'peggiora il ritorno venoso' }],
    },
  });
  const i = avvia(caso);
  i.esegui('antishock', 'tu');       // entro il tempo -> peso pieno
  i.avanza(200);
  i.esegui('monitor', 'tu');         // in ritardo -> meta'
  i.esegui('seduta', 'tu');          // dannosa

  const p = i.chiudi();
  const anti = p.necessarie.find((r) => r.id === 'antishock');
  const mon = p.necessarie.find((r) => r.id === 'monitor');
  assert.equal(anti.punti, 3);
  assert.equal(mon.punti, 1);
  assert.equal(p.dannose.length, 1);
  assert.match(p.dannose[0].perche, /ritorno venoso/);
});

test('una necessaria mai eseguita vale zero', () => {
  const caso = casoProva({
    azioni: { necessarie: [{ id: 'antishock', entro: 120, peso: 3 }], utili: [], dannose: [] },
  });
  const i = avvia(caso);
  i.avanza(300);
  const p = i.chiudi();
  assert.equal(p.necessarie[0].punti, 0);
  assert.equal(p.necessarie[0].fatta, false);
});

test('l\'esito del paziente confronta la gravità di partenza e di arrivo', () => {
  const peggiora = avvia(casoProva());
  peggiora.avanza(600);
  assert.equal(peggiora.chiudi().esitoPaziente, 'peggiorato');

  const fermo = avvia(casoProva({ decorso: { base: {}, freni: {}, limiti: {} } }));
  fermo.avanza(120);
  assert.equal(fermo.chiudi().esitoPaziente, 'stabile');
});

test('la gravità cresce con ipotensione, ipossia e coscienza alterata', () => {
  const base = { pas: 130, spo2: 98, coscienza: 'A', fc: 80, esito: 'in-corso' };
  assert.equal(gravita(base), 0);
  assert.ok(gravita({ ...base, pas: 80 }) > 0);
  assert.ok(gravita({ ...base, spo2: 85 }) > 0);
  assert.ok(gravita({ ...base, coscienza: 'U' }) > gravita({ ...base, coscienza: 'V' }));
});

/* ============= il motore col modello fisiologico ==================== */

function casoFisiologico(extra = {}) {
  return {
    id: 'prova-fis', titolo: 'Caso fisiologico', motore: 3,
    fisiologia: {
      base: { fc: 72, pas: 135, pad: 82, spo2: 98, fr: 14, glicemia: 96 },
      riserve: { volemia: 5000 },
      offese: [{ tipo: 'emorragia', sede: 'interna', portata: 60 }],
      modificatori: {},
    },
    eventi: [], soglie: [],
    azioni: { necessarie: [], utili: [], dannose: [] },
    ...extra,
  };
}

test('un caso fisiologico parte dai parametri derivati, non dichiarati', () => {
  const i = avvia(casoFisiologico());
  assert.equal(i.stato.pas, 135);
  assert.equal(i.stato.fc, 72);
});

test('col passare del tempo l\'emorragia si fa sentire', () => {
  const i = avvia(casoFisiologico());
  i.avanza(60 * 15);                       // quindici minuti, 900 ml
  assert.ok(i.stato.fc > 90, `la frequenza doveva salire, invece è ${i.stato.fc}`);
  assert.equal(i.stato.pas, 135, 'ma la pressione tiene ancora: è il compenso');
});

test('passato il ginocchio la pressione cede', () => {
  const i = avvia(casoFisiologico());
  i.avanza(60 * 28);                       // 1680 ml, oltre il 30%
  assert.ok(i.stato.pas < 130, `la pressione doveva cedere, invece è ${i.stato.pas}`);
});

test('senza nessuno che intervenga il paziente arresta', () => {
  const i = avvia(casoFisiologico());
  i.avanza(60 * 50);
  assert.equal(i.stato.esito === 'morto' || i.stato.tag.includes('arresto'), true,
    'dopo cinquanta minuti di emorragia non trattata non si sta bene');
});

test('nell\'arresto i parametri restano fermi a zero', () => {
  const i = avvia(casoFisiologico());
  i.avanza(60 * 50);
  assert.equal(i.stato.fc, 0, 'un paziente in arresto non ha frequenza');
  assert.equal(i.stato.pas, 0);
  assert.equal(i.stato.polsoRadiale, false);
});

test('l\'arresto da emorragia non è defibrillabile', () => {
  const i = avvia(casoFisiologico());
  i.avanza(60 * 50);
  assert.equal(i.stato.ritmo, 'pea', 'il DAE non risolve un esanguinamento');
});

test('il vecchio formato con decorso continua a funzionare', () => {
  const i = avvia(casoProva());
  i.avanza(60);
  assert.equal(i.stato.pas, 97, 'i casi senza blocco fisiologia non cambiano');
});

/* Nel formato 3 un provvedimento non muove un numero: mette un tag, e
   sono le riserve a cambiare strada. */
const AZIONI_FIS = {
  ...AZIONI_PROVA,
  liquidi: {
    id: 'liquidi', cat: 'C', label: 'Infusione di liquidi',
    durata: 30, chi: ['tu'], unaVolta: true,
    applica: () => ({ tag: 'liquidi' }),
    spiega: 'prova',
  },
};

test('la posizione antishock tiene su la pressione anche nel formato 3', () => {
  const senza = avvia(casoFisiologico(), AZIONI_FIS);
  senza.avanza(60 * 32);
  const con = avvia(casoFisiologico(), AZIONI_FIS);
  con.esegui('antishock', 'tu');
  con.avanza(60 * 32 - con.t);
  assert.ok(con.stato.pas > senza.stato.pas,
    `in antishock ${con.stato.pas}, senza ${senza.stato.pas}`);
});

test('i liquidi comprano tempo, e si vede nei parametri', () => {
  const senza = avvia(casoFisiologico(), AZIONI_FIS);
  senza.avanza(60 * 30);
  const con = avvia(casoFisiologico(), AZIONI_FIS);
  con.esegui('liquidi', 'tu');
  con.avanza(60 * 30 - con.t);
  assert.ok(con.stato.pas > senza.stato.pas,
    `con la flebo ${con.stato.pas}, senza ${senza.stato.pas}`);
});

test('i segni del compenso si leggono solo se qualcuno li va a cercare', () => {
  const AZIONI_SEGNI = {
    ...AZIONI_FIS,
    refill: { id: 'refill', cat: 'valutazione', label: 'Refill', durata: 15, chi: ['tu'], rileva: 'refill', spiega: 'prova' },
    colorito: { id: 'colorito', cat: 'valutazione', label: 'Colorito', durata: 10, chi: ['tu'], rileva: 'cute', spiega: 'prova' },
    'chiedi-sete': { id: 'chiedi-sete', cat: 'valutazione', label: 'Sete', durata: 10, chi: ['tu'], rileva: 'sete', spiega: 'prova' },
  };
  const i = avvia(casoFisiologico(), AZIONI_SEGNI);
  i.avanza(60 * 18);                       // 1080 ml, in pieno compenso
  assert.equal(i.valore('refill'), undefined, 'finché non lo fai non sai niente');

  i.esegui('refill', 'tu');
  i.esegui('colorito', 'tu');
  i.esegui('chiedi-sete', 'tu');
  assert.match(String(i.valore('refill')), /^[2-9](\.\d)? s$/, 'il refill è allungato');
  assert.equal(i.valore('cute'), 'pallida, fredda, sudata');
  assert.equal(i.valore('sete'), 'ha sete');
});

test('in arresto il saturimetro non legge più niente', () => {
  const i = avvia(casoFisiologico(), AZIONI_FIS);
  i.avanza(60 * 50);
  assert.equal(i.stato.spo2, null,
    'senza circolo la sonda al dito non ha niente da misurare: il riquadro resta a trattini');
});

test('nel formato 3 un effetto su una riserva agisce sulla riserva, non sul numero', () => {
  const AZIONI_DOLORE = {
    ...AZIONI_FIS,
    calma: {
      id: 'calma', cat: 'comunicazione', label: 'Rassicura', durata: 30, chi: ['tu'],
      applica: () => ({ dolore: -3 }),
      spiega: 'prova',
    },
  };
  const caso = casoFisiologico({
    fisiologia: {
      base: { fc: 72, pas: 135, pad: 82, spo2: 98, fr: 14, glicemia: 96 },
      riserve: { volemia: 5000, dolore: 8 },
      offese: [],
      modificatori: {},
    },
  });
  const i = avvia(caso, AZIONI_DOLORE);
  const prima = i.stato.fc;
  i.esegui('calma', 'tu');
  assert.equal(i.stato.dolore, 5, 'il dolore è sceso davvero, non per finta');
  assert.ok(i.stato.fc < prima, 'e con lui la frequenza, perché la spinta adrenergica cala');
});

/* ============= l'anamnesi dentro il motore ========================== */

function casoConAnamnesi(extra = {}) {
  return {
    id: 'prova-anamnesi', titolo: 'Caso con anamnesi', motore: 3,
    fisiologia: {
      base: { fc: 72, pas: 135, pad: 82, spo2: 98, fr: 14, glicemia: 96 },
      riserve: { volemia: 5000 },
      offese: [],
      modificatori: {},
    },
    anamnesi: {
      interlocutori: [{ id: 'moglie', label: 'la moglie' }],
      risposte: {
        terapia: {
          paziente: { t: '«Quella per la pressione, mi pare.»', qualita: 'vaga' },
          moglie: { t: '«Il Cardicor.»', qualita: 'buona', rivela: ['betabloccante'] },
        },
      },
    },
    eventi: [], soglie: [],
    azioni: { necessarie: [], utili: [], dannose: [] },
    ...extra,
  };
}

test('si parte parlando col paziente', () => {
  const i = avvia(casoConAnamnesi());
  assert.equal(i.interlocutore, 'paziente');
  assert.deepEqual(i.interlocutori.map((x) => x.id), ['paziente', 'moglie']);
});

test('la domanda costa il suo tempo e finisce nel diario', () => {
  const i = avvia(casoConAnamnesi());
  const esito = i.chiedi('terapia');
  assert.equal(esito.ok, true);
  assert.equal(i.t, 25, 'venticinque secondi, quelli del catalogo');
  const testi = i.diario.map((r) => r.testo);
  assert.ok(testi.some((t) => /Quali farmaci/.test(t)), 'la domanda si legge nel diario');
  assert.ok(testi.some((t) => /Quella per la pressione/.test(t)), 'e la risposta pure');
});

test('la domanda si registra fra le cose fatte, per la pagella', () => {
  const i = avvia(casoConAnamnesi());
  i.chiedi('terapia');
  assert.ok(i.fatte.some((f) => f.id === 'domanda:terapia'));
});

test('voltarsi verso un altro costa dieci secondi', () => {
  const i = avvia(casoConAnamnesi());
  const esito = i.rivolgitiA('moglie');
  assert.equal(esito.ok, true);
  assert.equal(i.interlocutore, 'moglie');
  assert.equal(i.t, 10);
});

test('la stessa domanda a due persone dà due risposte diverse', () => {
  const i = avvia(casoConAnamnesi());
  i.chiedi('terapia');
  i.rivolgitiA('moglie');
  i.chiedi('terapia');
  const testi = i.diario.map((r) => r.testo);
  assert.ok(testi.some((t) => /Quella per la pressione/.test(t)));
  assert.ok(testi.some((t) => /Cardicor/.test(t)));
});

test('non si può parlare con chi non c\'è', () => {
  const i = avvia(casoConAnamnesi());
  const esito = i.rivolgitiA('cugino');
  assert.equal(esito.ok, false);
  assert.equal(i.interlocutore, 'paziente');
});

test('a coscienza P il paziente non risponde e la domanda è rifiutata', () => {
  const i = avvia(casoConAnamnesi({
    fisiologia: {
      base: { fc: 72, pas: 135, pad: 82, spo2: 98, fr: 14, glicemia: 96 },
      riserve: { volemia: 5000, glicemia: 25 },      // ipoglicemia: coscienza a terra
      offese: [],
      modificatori: {},
    },
  }));
  assert.equal(i.stato.coscienza, 'P', 'controllo: il caso parte con la coscienza alterata');
  const esito = i.chiedi('terapia');
  assert.equal(esito.ok, false);
  assert.match(esito.motivo, /chiedi a chi c/i);
  assert.equal(i.t, 0, 'una domanda rifiutata non consuma tempo');
});

test('le domande sul dolore non si possono fare a chi non ha male', () => {
  const i = avvia(casoConAnamnesi());
  const esito = i.chiedi('irradiazione');
  assert.equal(esito.ok, false);
});

test('una domanda necessaria si conta come le altre cose da fare', () => {
  const i = avvia(casoConAnamnesi({
    azioni: {
      necessarie: [{ id: 'domanda:terapia', entro: 120, peso: 2 }],
      utili: [], dannose: [],
    },
  }));
  i.chiedi('terapia');
  const p = i.chiudi();
  assert.equal(p.punti, 2, 'fatta in tempo, punteggio pieno');
  assert.match(p.necessarie[0].label, /farmaci/i, 'l\'etichetta viene dal catalogo delle domande');
});

test('la domanda non fatta pesa come un\'azione non fatta', () => {
  const i = avvia(casoConAnamnesi({
    azioni: {
      necessarie: [{ id: 'domanda:terapia', entro: 120, peso: 2 }],
      utili: [], dannose: [],
    },
  }));
  const p = i.chiudi();
  assert.equal(p.punti, 0);
  assert.equal(p.necessarie[0].fatta, false);
});

test('la pagella porta quello che hai raccolto e cosa ti sei perso', () => {
  const i = avvia(casoConAnamnesi());
  i.chiedi('terapia');                       // al paziente: vaga
  const p = i.chiudi();
  assert.equal(p.anamnesi.voci.length, 1);
  assert.equal(p.anamnesi.voci[0].da, 'il paziente');
  assert.equal(p.anamnesi.avvisi.length, 1, 'la moglie sapeva il nome del farmaco');
});

/* ============= il diario che il caso riscrive ======================= */

test('un caso può dire lui cosa trovi facendo un\'azione generica', () => {
  const i = avvia({
    ...casoConAnamnesi(),
    diarioAzioni: {
      'misura-glicemia': 'Il glucometro segna un numero che non ti aspettavi.',
    },
  });
  i.esegui('misura-glicemia', 'tu');
  const testi = i.diario.map((r) => r.testo);
  assert.ok(testi.some((t) => /non ti aspettavi/.test(t)), 'il testo del caso ha la precedenza');
  assert.ok(!testi.some((t) => /^Glicemia \d/.test(t)), 'e sostituisce quello del catalogo');
});

test('il testo del caso può essere una funzione dello stato', () => {
  const i = avvia({
    ...casoConAnamnesi(),
    diarioAzioni: {
      'misura-glicemia': (p) => `Nel portafogli, e il glucometro segna ${Math.round(p.glicemia)}.`,
    },
  });
  i.esegui('misura-glicemia', 'tu');
  assert.ok(i.diario.some((r) => /Nel portafogli, e il glucometro segna \d+\./.test(r.testo)));
});

test('senza diarioAzioni resta il testo del catalogo', () => {
  const i = avvia(casoConAnamnesi());
  i.esegui('misura-glicemia', 'tu');
  /* Il catalogo di prova non dà un `diario` a questa azione: senza
     override si ripiega sull'etichetta, ed è quella che deve comparire. */
  assert.ok(i.diario.some((r) => r.testo === 'Misura la glicemia'));
});

/* ============= il tempo dall'esordio ================================ */

test('un caso che dichiara l\'esordio porta il conto nella pagella', () => {
  const i = avvia({ ...casoConAnamnesi(), esordio: 35 });
  i.avanza(120);
  const p = i.chiudi();
  assert.equal(p.esordio.primaDiVoi, 35 * 60, 'i minuti dichiarati, in secondi');
  assert.equal(p.esordio.vostro, 120, 'quanto ci avete messo voi');
  assert.equal(p.esordio.allaPartenza, 35 * 60 + 120, 'la somma è quello che porti in ospedale');
});

test('un caso che non lo dichiara non ha il conto, e non rompe', () => {
  const i = avvia(casoConAnamnesi());
  const p = i.chiudi();
  assert.equal(p.esordio, null);
});

/* ============= il ragguaglio a confronto ============================ */

function casoConRagguaglio() {
  return {
    ...casoConAnamnesi(),
    ragguaglioVoci: [
      { t: 'Prende il Cardicor', da: 'sapere:betabloccante' },
      { t: 'Glicemia rilevata', da: 'lettura:glicemia' },
      { t: 'Trasportato', da: 'azione:misura-pa' },
      { t: 'Uomo adulto' },
    ],
  };
}

test('chi non fa niente ha solo la voce che non dipende da niente', () => {
  const i = avvia(casoConRagguaglio());
  const p = i.chiudi();
  assert.equal(p.ragguaglio.totale, 4);
  assert.equal(p.ragguaglio.tue, 1);
});

test('quello che raccogli si vede nel confronto', () => {
  const i = avvia(casoConRagguaglio());
  i.rivolgitiA('moglie');
  i.chiedi('terapia');                 // rivela 'betabloccante'
  i.esegui('misura-glicemia', 'tu');   // lettura glicemia
  i.esegui('misura-pa', 'tu');         // azione misura-pa
  const p = i.chiudi();
  assert.equal(p.ragguaglio.tue, 4, 'adesso il ragguaglio è tutto tuo');
});

test('un caso senza voci ha un confronto vuoto, non un errore', () => {
  const i = avvia(casoConAnamnesi());
  const p = i.chiudi();
  assert.equal(p.ragguaglio.totale, 0);
  assert.deepEqual(p.ragguaglio.voci, []);
});

test('un effetto sul tono autonomo va nelle riserve, non sui parametri', () => {
  const i = avvia({
    ...casoConAnamnesi(),
    eventi: [{ id: 'scarica', t: 30, effetto: { tonoAutonomo: 1.4 } }],
  });
  const prima = i.stato.fc;
  i.avanza(60);
  assert.ok(i.stato.fc > prima + 40, `la frequenza deve seguire il tono: era ${prima}, è ${i.stato.fc}`);
});

test('i tag arrivano fino alla risposta: in disparte si racconta di più', () => {
  const caso = {
    ...casoConAnamnesi(),
    anamnesi: {
      interlocutori: [{ id: 'amico', label: 'l\'amico' }],
      risposte: {
        evento: {
          paziente: [
            { se: (tag) => tag.includes('in-disparte'), t: '«Ho tirato.»', qualita: 'buona', rivela: ['cocaina'] },
            { t: '«Eravamo a una festa.»', qualita: 'vaga' },
          ],
        },
      },
    },
  };
  const azioni = {
    ...AZIONI_PROVA,
    'parla-in-disparte': {
      id: 'parla-in-disparte', cat: 'comunicazione', label: 'In disparte',
      durata: 40, chi: ['tu'], unaVolta: true,
      applica: () => ({ tag: 'in-disparte' }), spiega: 'prova',
    },
  };

  const davanti = avvia(caso, azioni);
  davanti.chiedi('evento');
  assert.deepEqual(davanti.saputo, {}, 'davanti all\'amico non lo dice');

  const soli = avvia(caso, azioni);
  soli.esegui('parla-in-disparte', 'tu');
  soli.chiedi('evento');
  assert.ok(soli.saputo.cocaina, 'in disparte sì');
});

/* ==================== il giudizio dei gesti ========================= */

test('un gesto senza indicazione non porta nessun verdetto', () => {
  /* `monitor` non compare in `indicazioni.js`: collegare il monitor non
     ha una controindicazione, e non c'è niente da insegnare. */
  const i = avvia(casoConAnamnesi());
  i.esegui('monitor', 'tu');
  const f = i.fatte.find((x) => x.id === 'monitor');
  assert.ok(f, 'l\'azione di prova deve essere stata fatta');
  assert.equal(f.giudizio.ok, true);
});

test('il verdetto si dà quando l\'azione PARTE, non quando finisce', () => {
  /* È la ragione per cui il giudizio non sta dentro `completa`: se una
     manovra dura tre minuti e nel frattempo scopri qualcosa, il gesto
     che hai deciso resta quello che hai deciso. */
  const catalogo = {
    lunga: {
      id: 'lunga', cat: 'C', label: 'Manovra lunga', durata: 180, chi: ['tu'],
      diario: 'lunga', spiega: 'prova',
    },
  };
  const indicazioni = {
    lunga: { quando: (c) => c.t >= 100, perche: 'serve solo dopo i cento secondi di prova', fonte: 'p' },
  };
  const i = creaIntervento(casoConAnamnesi(), { azioni: catalogo, indicazioni });
  i.esegui('lunga', 'tu');
  const f = i.fatte.find((x) => x.id === 'lunga');
  assert.equal(f.giudizio.ok, false,
    'partita a t=0 il verdetto è no, anche se finisce a 180');
});

test('il giudizio guarda solo quello che hai misurato davvero', () => {
  const catalogo = {
    ...AZIONI_PROVA,
    prova: {
      id: 'prova', cat: 'C', label: 'Prova', durata: 10, chi: ['tu'],
      diario: 'prova', spiega: 'prova',
    },
  };
  const indicazioni = {
    prova: { quando: (c) => c.letture.pas !== undefined, perche: 'serve la pressione presa', fonte: 'p' },
  };
  const i = creaIntervento(casoConAnamnesi(), { azioni: catalogo, indicazioni });
  i.esegui('prova', 'tu');
  assert.equal(i.fatte.find((x) => x.id === 'prova').giudizio.ok, false,
    'senza aver misurato la pressione il contesto non ce l\'ha');
});

test('il diario scrive una riga di tipo giudizio, che la UI potrà nascondere', () => {
  const catalogo = {
    prova: { id: 'prova', cat: 'C', label: 'Prova', durata: 10, chi: ['tu'], diario: 'prova', spiega: 'p' },
  };
  const indicazioni = { prova: { quando: () => false, perche: 'non serviva proprio', fonte: 'p' } };
  const i = creaIntervento(casoConAnamnesi(), { azioni: catalogo, indicazioni });
  i.esegui('prova', 'tu');
  const riga = i.diario.find((r) => r.tipo === 'giudizio');
  assert.ok(riga, 'manca la riga del giudizio');
  assert.match(riga.testo, /non serviva proprio/);
});

test('la pagella conta i secondi buttati', () => {
  const catalogo = {
    prova: { id: 'prova', cat: 'C', label: 'Prova', durata: 40, chi: ['tu'], diario: 'prova', spiega: 'p' },
  };
  const indicazioni = { prova: { quando: () => false, perche: 'non serviva proprio', fonte: 'p' } };
  const i = creaIntervento(casoConAnamnesi(), { azioni: catalogo, indicazioni });
  i.esegui('prova', 'tu');
  const p = i.chiudi();
  assert.equal(p.tempoButtato.secondi, 40);
  assert.equal(p.tempoButtato.voci[0].label, 'Prova');
});

/* ==================== il sospetto =================================== */

const casoConClasse = (extra = {}) => ({
  ...casoConAnamnesi(),
  classe: 'C08',
  sospettiPlausibili: ['C02', 'C07', 'C08'],
  ...extra,
});

test('all\'inizio il banco aspetta la prima impressione', () => {
  const i = avvia(casoConClasse());
  assert.ok(i.primaImpressione, 'deve essere in attesa');
  assert.deepEqual(i.primaImpressione.opzioni, ['C02', 'C07', 'C08', 'C20'],
    '«non lo so» sta sempre in fondo ed è una risposta legittima');
});

test('finché non la dai, non puoi fare niente', () => {
  const i = avvia(casoConClasse());
  const r = i.esegui('monitor', 'tu');
  assert.equal(r.ok, false);
  assert.match(r.motivo, /cosa pensi/i);
});

test('un caso che non dichiara i plausibili non ferma nessuno', () => {
  const i = avvia(casoConAnamnesi());
  assert.equal(i.primaImpressione, null);
  assert.equal(i.esegui('monitor', 'tu').ok, true);
});

test('dichiarare il sospetto non costa tempo: è un pensiero, non un gesto', () => {
  const i = avvia(casoConClasse());
  const prima = i.t;
  i.dichiaraSospetto('C02');
  assert.equal(i.sospetto.codice, 'C02');
  assert.equal(i.t, prima, 'il tempo qui scorre solo con le azioni');
});

test('si può cambiare idea, e resta scritto quando', () => {
  const i = avvia(casoConClasse());
  i.dichiaraSospetto('C02');
  i.avanza(120);
  i.dichiaraSospetto('C08');
  const p = i.chiudi();
  assert.equal(p.sospetto.prima.codice, 'C02');
  assert.equal(p.sospetto.finale.codice, 'C08');
  assert.equal(p.sospetto.cambi, 1);
  assert.equal(p.sospetto.giusto, true);
  assert.equal(p.sospetto.azzeccatoA, 120, 'il minuto in cui ci sei arrivato');
});

test('ridichiarare lo stesso sospetto non conta come un cambio', () => {
  const i = avvia(casoConClasse());
  i.dichiaraSospetto('C08');
  i.dichiaraSospetto('C08');
  assert.equal(i.chiudi().sospetto.cambi, 0);
});

test('una classe che non esiste viene rifiutata', () => {
  const i = avvia(casoConClasse());
  assert.equal(i.dichiaraSospetto('C21').ok, false);
});

test('la classe difendibile conta giusta', () => {
  /* La sincope regge sia come cardiocircolatoria sia come neurologica:
     bocciarne una insegnerebbe una cosa falsa. */
  const i = avvia(casoConClasse({ classe: 'C02', classeAnche: ['C04'] }));
  i.dichiaraSospetto('C04');
  assert.equal(i.chiudi().sospetto.giusto, true);
});

test('chi non dichiara mai niente non ha sospetto, e non esplode', () => {
  const i = avvia(casoConAnamnesi());
  const p = i.chiudi();
  assert.equal(p.sospetto, null, 'senza classe dichiarata non c\'è niente da valutare');
});

/* ========================== la bombola ================================ */

test('il reservoir consuma la bombola, e il debriefing lo dice', () => {
  const i = creaIntervento(casoProva(), { azioni: AZIONI });
  i.esegui('o2-reservoir', 'tu');       // 40s di montaggio, poi eroga 15 l/min
  i.avanza(600);
  const p = i.chiudi();
  assert.ok(p.bombola, 'la pagella non racconta la bombola');
  assert.ok(p.bombola.erogati >= 150, `attesi almeno 150 litri, erogati ${p.bombola.erogati}`);
  assert.ok(p.bombola.residui < 400);
});

test('una bombola quasi vuota finisce, e l\'ossigeno se ne va con lei', () => {
  // 2 litri a 20 bar sono 40 litri: meno di tre minuti a 15 l/min
  const i = creaIntervento(casoProva({ bombola: { litri: 2, bar: 20 } }), { azioni: AZIONI });
  i.esegui('o2-reservoir', 'tu');
  i.avanza(600);
  assert.equal(i.stato.tag.includes('o2'), false, 'la maschera eroga ancora da una bombola vuota');
  assert.ok(i.diario.some((r) => /bombola/i.test(r.testo)), 'il diario non avvisa che è finita');
});

/* ===================== le manovre a due mani ======================== */

test('una manovra a due mani occupa due persone', () => {
  const i = creaIntervento(casoProva(), { azioni: AZIONI });
  const esito = i.esegui('spinale', 'tu');
  assert.ok(esito.ok, `rifiutata: ${esito.motivo}`);
  /* La spinale dura tre minuti: mentre è in corso non deve restare
     nessuno libero, perché la stanno facendo in due. */
  const occupati = Object.values(i.squadra).filter((m) => m.liberoA > 0).length;
  assert.equal(occupati, 2, 'la spinale ha occupato una persona sola');
});

test('senza due persone libere la manovra non parte', () => {
  const i = creaIntervento(casoProva(), { azioni: AZIONI, membri: ['tu'] });
  const esito = i.esegui('spinale', 'tu');
  assert.equal(esito.ok, false);
  assert.match(esito.motivo, /due/i, `motivo poco chiaro: ${esito.motivo}`);
});

test('finita la manovra tornano liberi tutti e due', () => {
  const i = creaIntervento(casoProva(), { azioni: AZIONI });
  i.esegui('spinale', 'tu');
  i.avanza(200);
  const liberi = Object.values(i.squadra).filter((m) => m.liberoA <= i.t).length;
  assert.equal(liberi, 3, 'qualcuno è rimasto occupato dopo la fine');
});
