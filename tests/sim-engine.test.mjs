/* =====================================================================
   Collaudo del motore di intervento.
   Il motore è logica pura: gira in Node senza browser.
   Esecuzione:  node --test tests/
   ===================================================================== */

import test from 'node:test';
import assert from 'node:assert/strict';

import { creaIntervento, gravita } from '../assets/js/core/sim-engine.js';

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
