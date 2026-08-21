/* =====================================================================
   Collaudo del modello fisiologico.
   Logica pura: gira in Node senza browser.
   Esecuzione:  node --test tests/
   ===================================================================== */

import test from 'node:test';
import assert from 'node:assert/strict';

import { RISERVE_ADULTO, riserveIniziali, perditaVolemica } from '../assets/js/core/fisiologia.js';

test('un adulto sano parte dalle riserve predefinite', () => {
  const r = riserveIniziali({});
  assert.equal(r.volemia, RISERVE_ADULTO.volemia);
  assert.equal(r.ossigenazione, RISERVE_ADULTO.ossigenazione);
  assert.equal(r.dolore, 0);
});

test('il caso può dichiarare solo le riserve che gli interessano', () => {
  const r = riserveIniziali({ volemia: 4800 });
  assert.equal(r.volemia, 4800);
  assert.equal(r.glicemia, RISERVE_ADULTO.glicemia, 'le altre restano ai predefiniti');
});

test('la volemia di partenza resta memorizzata per calcolare la perdita', () => {
  const r = riserveIniziali({ volemia: 5000 });
  assert.equal(r.volemiaIniziale, 5000);
});

test('la perdita si legge come frazione della volemia di partenza', () => {
  const r = { ...riserveIniziali({ volemia: 5000 }), volemia: 4000 };
  assert.equal(perditaVolemica(r), 0.2);
});

test('la perdita non va sotto zero se qualcuno riempie più del dovuto', () => {
  const r = { ...riserveIniziali({ volemia: 5000 }), volemia: 5600 };
  assert.equal(perditaVolemica(r), 0);
});

/* ==================== le fasi del compenso ========================== */

import { faseCompenso, SOGLIE_PERDITA } from '../assets/js/core/fisiologia.js';

test('sotto il quindici per cento non si vede niente', () => {
  assert.equal(faseCompenso(0.10), 'nessuna');
  assert.equal(faseCompenso(0.149), 'nessuna');
});

test('fra il quindici e il trenta il corpo compensa', () => {
  assert.equal(faseCompenso(0.15), 'compenso');
  assert.equal(faseCompenso(0.29), 'compenso');
});

test('oltre il trenta scompensa', () => {
  assert.equal(faseCompenso(0.30), 'scompenso');
  assert.equal(faseCompenso(0.39), 'scompenso');
});

test('oltre il quaranta crolla', () => {
  assert.equal(faseCompenso(0.40), 'crollo');
  assert.equal(faseCompenso(0.80), 'crollo');
});

test('le soglie sono dichiarate, non sparse nel codice', () => {
  assert.deepEqual(SOGLIE_PERDITA, { compenso: 0.15, scompenso: 0.30, crollo: 0.40 });
});

/* ==================== i parametri del circolo ======================= */

import { circolo } from '../assets/js/core/fisiologia.js';

const BASE = { fc: 72, pas: 135, pad: 82, spo2: 98, fr: 14 };

test('senza perdita i parametri sono quelli suoi', () => {
  const c = circolo(riserveIniziali({ volemia: 5000 }), BASE, {});
  assert.equal(c.fc, 72);
  assert.equal(c.pas, 135);
});

test('al venti per cento la pressione TIENE e la frequenza è già salita', () => {
  const r = { ...riserveIniziali({ volemia: 5000 }), volemia: 4000 };
  const c = circolo(r, BASE, {});
  assert.equal(c.pas, 135, 'la sistolica non si muove: è questo che inganna');
  assert.ok(c.fc > 95, `la frequenza doveva salire, invece è ${c.fc}`);
  assert.ok(c.pad > BASE.pad, 'la diastolica sale: il differenziale si stringe');
});

test('al trentacinque per cento la pressione cede', () => {
  const r = { ...riserveIniziali({ volemia: 5000 }), volemia: 3250 };
  const c = circolo(r, BASE, {});
  assert.ok(c.pas < 110, `la sistolica doveva cedere, invece è ${c.pas}`);
  assert.ok(c.fc > 110, 'la frequenza è al massimo dello sforzo');
});

test('il polso radiale sparisce sotto gli ottanta di sistolica', () => {
  // Bolognin :8650 — polso radiale presente ⇒ PAS ≥ 80
  const r = { ...riserveIniziali({ volemia: 5000 }), volemia: 2900 };
  const c = circolo(r, BASE, {});
  assert.equal(c.polsoRadiale, c.pas >= 80);
});

test('la diastolica non scavalca mai la sistolica', () => {
  for (const volemia of [5000, 4200, 3500, 3000, 2600, 2200]) {
    const c = circolo({ ...riserveIniziali({ volemia: 5000 }), volemia }, BASE, {});
    assert.ok(c.pad < c.pas, `a ${volemia} ml esce ${c.pas}/${c.pad}`);
  }
});

/* ==================== quando il compenso non c'è ==================== */

/* Bolognin :6487 — «In caso di lesione mielica lo shock non presenta la
   compensazione tachicardica: si avrà un paziente ipoteso con frequenza
   nella norma o anche bradicardico». Stesso quadro col betabloccante.
   Un modello che fa SEMPRE salire la frequenza quando la pressione
   scende è un modello che non ha capito niente. */

test('col compenso bloccato la frequenza non sale', () => {
  const r = { ...riserveIniziali({ volemia: 5000 }), volemia: 4000 };
  const libero = circolo(r, BASE, {});
  const bloccato = circolo(r, BASE, { compensoBloccato: true });
  assert.ok(libero.fc > 95, 'controllo: senza blocco la frequenza sale');
  assert.equal(bloccato.fc, BASE.fc, 'col blocco resta la sua');
});

test('col compenso bloccato la pressione cede prima', () => {
  const r = { ...riserveIniziali({ volemia: 5000 }), volemia: 4000 };  // 20%
  const libero = circolo(r, BASE, {});
  const bloccato = circolo(r, BASE, { compensoBloccato: true });
  assert.equal(libero.pas, BASE.pas, 'controllo: senza blocco la sistolica tiene');
  assert.ok(bloccato.pas < BASE.pas, `col blocco doveva cedere, invece è ${bloccato.pas}`);
});

test('il quadro ingannevole: ipoteso senza tachicardia', () => {
  const r = { ...riserveIniziali({ volemia: 5000 }), volemia: 3800 };
  const c = circolo(r, BASE, { compensoBloccato: true });
  assert.ok(c.pas < 110, 'è ipoteso');
  assert.ok(c.fc < 90, 'e non ha tachicardia: chi si fida della frequenza sbaglia');
});

/* ==================== i segni del compenso ========================== */

import { segni } from '../assets/js/core/fisiologia.js';

test('senza perdita la cute è normale e il refill veloce', () => {
  const s = segni(riserveIniziali({ volemia: 5000 }), BASE, {});
  assert.equal(s.cute, 'normale');
  assert.ok(s.refill < 2, 'Bolognin :6489 — il refill normale sta sotto i due secondi');
  assert.equal(s.sete, false);
});

test('in compenso la cute è pallida fredda e sudata, il refill oltre i due secondi', () => {
  const r = { ...riserveIniziali({ volemia: 5000 }), volemia: 3900 };   // 22%
  const s = segni(r, BASE, {});
  assert.equal(s.cute, 'pallida-fredda-sudata');
  assert.ok(s.refill > 2, `il refill doveva allungarsi, invece è ${s.refill}`);
  assert.equal(s.sete, true, 'Bolognin :6485 — il senso di sete è un segno di shock');
});

test('i segni arrivano PRIMA che la pressione si muova', () => {
  const r = { ...riserveIniziali({ volemia: 5000 }), volemia: 4000 };   // 20%
  const c = circolo(r, BASE, {});
  const s = segni(r, BASE, {});
  assert.equal(c.pas, BASE.pas, 'la pressione è ancora quella di prima');
  assert.notEqual(s.cute, 'normale', 'ma la cute lo dice già');
  assert.ok(s.refill > 2, 'e il refill pure');
});

test('la coscienza si altera solo quando il compenso non basta più', () => {
  const compensato = { ...riserveIniziali({ volemia: 5000 }), volemia: 4000 };
  const scompensato = { ...riserveIniziali({ volemia: 5000 }), volemia: 3200 };
  assert.equal(segni(compensato, BASE, {}).coscienza, 'A');
  assert.notEqual(segni(scompensato, BASE, {}).coscienza, 'A');
});

/* ==================== i parametri visibili ========================== */

import { parametriVisibili } from '../assets/js/core/fisiologia.js';

test('i parametri visibili mettono insieme circolo, respiro e segni', () => {
  const p = parametriVisibili(riserveIniziali({ volemia: 5000 }), BASE, {});
  for (const k of ['fc', 'pas', 'pad', 'spo2', 'fr', 'coscienza', 'cute', 'refill', 'polsoRadiale']) {
    assert.ok(k in p, `manca ${k}`);
  }
});

test('la saturazione viene dall\'ossigenazione, non dalla volemia', () => {
  const sanguinante = { ...riserveIniziali({ volemia: 5000 }), volemia: 3500 };
  const ipossico = { ...riserveIniziali({}), ossigenazione: 0.85 };
  assert.ok(parametriVisibili(sanguinante, BASE, {}).spo2 > 94, 'chi sanguina satura ancora bene');
  assert.ok(parametriVisibili(ipossico, BASE, {}).spo2 < 92, 'chi non ventila no');
});

test('il dolore alza frequenza e pressione', () => {
  const calmo = riserveIniziali({});
  const dolorante = { ...riserveIniziali({}), dolore: 9 };
  const a = parametriVisibili(calmo, BASE, {});
  const b = parametriVisibili(dolorante, BASE, {});
  assert.ok(b.fc > a.fc, 'il dolore fa battere il cuore più forte');
  assert.ok(b.pas > a.pas, 'e alza la pressione');
});

test('la glicemia bassa altera la coscienza anche senza perdita di sangue', () => {
  const r = { ...riserveIniziali({}), glicemia: 35 };
  assert.notEqual(parametriVisibili(r, BASE, {}).coscienza, 'A');
});

/* ==================== arresto e sopravvivenza ======================= */

import { verificaArresto, RITMO_PER_CAUSA } from '../assets/js/core/fisiologia.js';

test('non c\'è arresto finché il circolo regge', () => {
  const r = { ...riserveIniziali({ volemia: 5000 }), volemia: 4000 };
  assert.equal(verificaArresto(r, BASE, {}, []), null);
});

test('sotto i quaranta di sistolica il paziente arresta', () => {
  const r = { ...riserveIniziali({ volemia: 5000 }), volemia: 2200 };
  const a = verificaArresto(r, BASE, {}, [{ tipo: 'emorragia', portata: 60 }]);
  assert.ok(a, 'doveva arrestare');
  assert.equal(a.causa, 'emorragia');
});

test('l\'arresto da emorragia NON è defibrillabile', () => {
  const r = { ...riserveIniziali({ volemia: 5000 }), volemia: 2200 };
  const a = verificaArresto(r, BASE, {}, [{ tipo: 'emorragia', portata: 60 }]);
  assert.equal(a.ritmo, 'pea');
  assert.equal(a.defibrillabile, false, 'il DAE non risolve un esanguinamento');
});

test('l\'arresto da ischemia È defibrillabile', () => {
  const r = { ...riserveIniziali({}), contrattilita: 0.05 };
  const a = verificaArresto(r, BASE, {}, [{ tipo: 'ischemia-miocardica', intensita: 0.3 }]);
  assert.ok(a, 'doveva arrestare');
  assert.equal(a.ritmo, 'fv');
  assert.equal(a.defibrillabile, true);
});

test('l\'arresto da ipossia non è defibrillabile', () => {
  const r = { ...riserveIniziali({}), ossigenazione: 0.30 };
  const a = verificaArresto(r, BASE, {}, [{ tipo: 'ipossia-ventilatoria', intensita: 0.05 }]);
  assert.ok(a, 'doveva arrestare');
  assert.equal(a.defibrillabile, false, 'nell\'asfittico servono ventilazione e compressioni');
});

test('la tabella dei ritmi copre tutte le offese che possono uccidere', () => {
  for (const causa of ['emorragia', 'ipossia-ventilatoria', 'ischemia-miocardica',
    'vasodilatazione', 'ipoglicemia']) {
    assert.ok(RITMO_PER_CAUSA[causa], `manca il ritmo per ${causa}`);
  }
});

import { sopravvivenza } from '../assets/js/core/fisiologia.js';

test('al momento dell\'arresto la probabilità è piena', () => {
  assert.equal(sopravvivenza(0, []), 1);
});

test('senza RCP crolla del sei per cento al minuto', () => {
  // ERC 2025 cap. 4 :961
  assert.ok(Math.abs(sopravvivenza(60, []) - 0.94) < 0.005, 'un minuto: 94%');
  assert.ok(Math.abs(sopravvivenza(300, []) - 0.94 ** 5) < 0.01, 'cinque minuti');
});

/* Quanti minuti passano prima che la probabilità scenda sotto la soglia. */
function minutiUtili(soglia, tag) {
  let m = 0;
  while (m < 120 && sopravvivenza(m * 60, tag) > soglia) m += 1;
  return m;
}

test('con la RCP in corso la curva è più piatta', () => {
  const senza = sopravvivenza(300, []);
  const con = sopravvivenza(300, ['rcp']);
  assert.ok(con > senza, `la RCP deve contare: ${con} contro ${senza}`);
  assert.ok(minutiUtili(0.5, ['rcp']) > 2 * minutiUtili(0.5, []),
    'chi comprime raddoppia abbondantemente il tempo che resta agli altri per arrivare');
});

test('la probabilità non va sotto zero per quanto si aspetti', () => {
  assert.ok(sopravvivenza(3600, []) >= 0);
});

/* ==================== il ritorno venoso ============================= */

import { ritornoVenoso } from '../assets/js/core/fisiologia.js';

test('senza far niente il ritorno venoso è quello normale', () => {
  assert.equal(ritornoVenoso([]), 1);
});

test('la posizione antishock aiuta la pressione, la seduta la toglie', () => {
  assert.ok(ritornoVenoso(['antishock']) > 1);
  assert.ok(ritornoVenoso(['seduta']) < 1);
  assert.ok(ritornoVenoso(['in-piedi']) < ritornoVenoso(['seduta']),
    'un ipoteso in piedi sta peggio di un ipoteso seduto');
});

test('il ritorno venoso si vede sulla sistolica, non sulla frequenza', () => {
  const r = { ...riserveIniziali({ volemia: 5000 }), volemia: 3600 };   // 28%
  const piatto = circolo(r, BASE, { ritornoVenoso: ritornoVenoso(['antishock']) });
  const seduto = circolo(r, BASE, { ritornoVenoso: ritornoVenoso(['seduta']) });
  assert.ok(piatto.pas > seduto.pas, 'in antishock la pressione tiene meglio');
  assert.equal(piatto.fc, seduto.fc, 'la frequenza dipende dalla perdita, non dalla posizione');
});

/* ==================== quel che si vede addosso ====================== */

test('il differenziale si STRINGE: la diastolica non si stacca dalla sistolica', () => {
  const sano = circolo(riserveIniziali({ volemia: 5000 }), BASE, {});
  const r = { ...riserveIniziali({ volemia: 5000 }), volemia: 4000 };
  const compensato = circolo(r, BASE, {});
  assert.ok(compensato.pas - compensato.pad < sano.pas - sano.pad,
    'la vasocostrizione avvicina la diastolica alla sistolica');

  /* Anche quando la pressione crolla il rapporto regge: un 40 su 0 non
     è un paziente, è un errore di aritmetica. */
  const crollato = circolo({ ...r, volemia: 3300 }, BASE, { compensoBloccato: true });
  assert.ok(crollato.pad > crollato.pas * 0.4, `esce ${crollato.pas}/${crollato.pad}`);
});

test('il refill si allunga sul serio quando il sangue manca', () => {
  const r = { ...riserveIniziali({ volemia: 5000 }), volemia: 3500 };   // 30%
  assert.ok(segni(r, BASE, {}).refill > 3.5, 'a un terzo di volemia in meno il colore non torna');
});

test('chi non perfonde il cervello non resta vigile, per poco sangue che abbia perso', () => {
  /* Betabloccato: la pressione cade presto, e la coscienza la segue.
     È la perfusione che decide, non i millilitri. */
  const r = { ...riserveIniziali({ volemia: 5000 }), volemia: 3900 };
  const p = parametriVisibili(r, BASE, { compensoBloccato: true });
  assert.ok(p.pas < 75, `controllo: doveva essere ipoteso, è ${p.pas}`);
  assert.notEqual(p.coscienza, 'A', 'con quella pressione non è più vigile');
});

/* ==================== il cuore come pompa =========================== */

test('un cuore che pompa meno fa meno pressione, col sangue tutto dentro', () => {
  const sano = riserveIniziali({});
  const infartuato = { ...riserveIniziali({}), contrattilita: 0.6 };
  const a = circolo(sano, BASE, {});
  const b = circolo(infartuato, BASE, {});
  assert.equal(b.perdita, 0, 'non ha perso una goccia di sangue');
  assert.ok(b.pas < a.pas, `la pressione doveva calare, invece è ${b.pas}`);
});

test('il dolore non supera il dieci della scala', () => {
  const r = { ...riserveIniziali({}), dolore: 14 };
  assert.equal(parametriVisibili(r, BASE, {}).dolore, 10,
    'la scala del dolore arriva a dieci: oltre non c\'è niente da scrivere');
});

test('il dolore alza la pressione senza slargare il differenziale', () => {
  const calmo = riserveIniziali({});
  const dolorante = { ...riserveIniziali({}), dolore: 10 };
  const a = parametriVisibili(calmo, BASE, {});
  const b = parametriVisibili(dolorante, BASE, {});
  assert.ok(b.pas > a.pas, 'la sistolica sale');
  assert.ok(b.pad > a.pad, 'e la diastolica la segue, invece di restare indietro');
  assert.ok(b.pad > b.pas * 0.45, `esce ${b.pas}/${b.pad}`);
});
