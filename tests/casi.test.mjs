/* Collaudo dei casi: due partite automatiche per ciascuno, quella in cui
   il soccorritore non fa nulla e quella in cui fa le cose giuste. */

import test from 'node:test';
import assert from 'node:assert/strict';

import { creaIntervento } from '../assets/js/core/sim-engine.js';
import { AZIONI } from '../assets/js/data/azioni.js';
import { CASI } from '../assets/js/data/casi.js';

const avvia = (caso) => creaIntervento(caso, { azioni: AZIONI });

/** Risponde sempre alla prima opzione corretta, se c'è una decisione aperta. */
function rispondiSeServe(i) {
  while (i.decisionePendente) {
    const idx = i.decisionePendente.opzioni.findIndex((o) => o.ok);
    i.rispondiDecisione(idx >= 0 ? idx : 0);
  }
}

test('ogni caso dichiara le chiavi che il motore si aspetta', () => {
  CASI.forEach((c) => {
    assert.ok([2, 3].includes(c.motore), `${c.id}: motore ${c.motore} sconosciuto`);
    if (c.motore === 2) {
      assert.ok(c.iniziale && typeof c.iniziale.pas === 'number', `${c.id}: iniziale incompleto`);
      assert.ok(c.decorso?.base, `${c.id}: manca il decorso`);
    }
    assert.ok(c.azioni?.necessarie?.length, `${c.id}: nessuna azione necessaria`);
    assert.ok(c.chiave && c.trappola && c.ragguaglio, `${c.id}: manca il testo del debriefing`);
    (c.azioni.necessarie || []).forEach((n) => {
      [].concat(n.id).forEach((id) => assert.ok(AZIONI[id], `${c.id}: azione necessaria sconosciuta ${id}`));
    });
    (c.azioni.dannose || []).forEach((d) => {
      [].concat(d.id).forEach((id) => assert.ok(AZIONI[id], `${c.id}: azione dannosa sconosciuta ${id}`));
      assert.ok(d.perche, `${c.id}: la dannosa ${d.id} non spiega perché`);
    });
    Object.keys(c.effettiAzioni || {}).forEach((id) => {
      assert.ok(AZIONI[id], `${c.id}: effetto su azione sconosciuta ${id}`);
    });
  });
});

test('senza fare nulla il paziente peggiora, e nessun caso esplode', () => {
  CASI.forEach((c) => {
    const i = avvia(c);
    for (let giro = 0; giro < 20; giro += 1) {
      i.avanza(60);
      rispondiSeServe(i);
    }
    const p = i.chiudi();
    assert.ok(['peggiorato', 'morto'].includes(p.esitoPaziente),
      `${c.id}: senza far nulla dovrebbe peggiorare, invece è ${p.esitoPaziente}`);
    assert.equal(p.punti, 0, `${c.id}: senza far nulla il punteggio deve essere zero`);
  });
});

test('facendo le azioni necessarie il paziente non peggiora e il punteggio è pieno', () => {
  CASI.forEach((c) => {
    const i = avvia(c);
    c.azioni.necessarie.forEach((n) => {
      rispondiSeServe(i);
      const id = [].concat(n.id)[0];
      const az = AZIONI[id];
      const chi = az.chi.includes('tu') ? 'tu' : az.chi[0];
      // aspetta che chi deve eseguire sia libero: le azioni delegate
      // corrono in parallelo, ma una alla volta per persona
      const attesa = i.squadra[chi].liberoA - i.t;
      if (attesa > 0) { i.avanza(attesa); rispondiSeServe(i); }
      const esito = i.esegui(id, chi);
      assert.ok(esito.ok, `${c.id}: ${id} rifiutata (${esito.motivo})`);
      rispondiSeServe(i);
    });
    const p = i.chiudi();
    assert.equal(p.dannose.length, 0, `${c.id}: nessuna dannosa eseguita`);
    assert.equal(p.punti, p.max, `${c.id}: atteso punteggio pieno`);
    assert.notEqual(p.esitoPaziente, 'morto', `${c.id}: il paziente non deve morire`);
  });
});

test('nello shock la posizione seduta fa scendere ancora la pressione', () => {
  const caso = CASI.find((c) => c.id === 'shock-v3');
  const i = avvia(caso);
  const prima = i.stato.pas;
  i.esegui('posizione-seduta', 'tu');
  assert.ok(i.stato.pas < prima, 'togliere ritorno venoso a un ipoteso si paga in fisiologia');
  assert.equal(i.chiudi().dannose.length, 1);
});

test('nel dolore toracico chi non trasporta arriva all\'arresto', () => {
  const caso = CASI.find((c) => c.id === 'toracico-v2');
  const i = avvia(caso);
  for (let giro = 0; giro < 13; giro += 1) {
    i.avanza(60);
    rispondiSeServe(i);
  }
  assert.ok(i.stato.tag.includes('arresto'), 'a dodici minuti senza trasporto ci si aspetta l\'arresto');
});

test('l\'infermiere non somministra finché non gli hai riferito il quadro', () => {
  const caso = CASI.find((c) => c.id === 'shock-v3');
  const i = avvia(caso);
  const rifiuto = i.esegui('inf-adrenalina', 'infermiere');
  assert.equal(rifiuto.ok, false);
  assert.match(rifiuto.motivo, /riferis/i);

  i.esegui('riferisci-infermiere', 'tu');
  rispondiSeServe(i);
  const ora = i.esegui('inf-adrenalina', 'infermiere');
  assert.equal(ora.ok, true, 'dopo il ragguaglio l\'infermiere procede');
});

/* ==================== i casi di formato 3 =========================== */

test('i casi di formato 3 dichiarano offese, non derive', () => {
  CASI.filter((c) => c.motore === 3).forEach((c) => {
    assert.ok(c.fisiologia, `${c.id}: manca il blocco fisiologia`);
    assert.ok(c.fisiologia.base, `${c.id}: manca la base`);
    assert.ok(c.fisiologia.offese?.length, `${c.id}: nessuna offesa dichiarata`);
    assert.ok(!c.decorso, `${c.id}: ha ancora il decorso vecchio`);
    assert.ok(!c.iniziale, `${c.id}: ha ancora i parametri iniziali scritti a mano`);
  });
});

/* Il piano chiedeva qui una frequenza sopra 100. Non può esserci: il
   caso dichiara un betabloccante, e il betabloccante il compenso lo
   blocca. La trappola è esattamente questa — ipoteso, freddo, e con una
   frequenza che sembra tranquilla. */
test('shock-v3 arriva già scompensato, ma senza tachicardia', () => {
  const caso = CASI.find((c) => c.id === 'shock-v3');
  assert.ok(caso, 'manca shock-v3');
  const i = avvia(caso);
  assert.ok(i.stato.pas < 100, `la pressione ha già ceduto, invece è ${i.stato.pas}`);
  assert.ok(i.stato.fc < 90, `e la frequenza non sale: invece è ${i.stato.fc}`);
  assert.notEqual(i.stato.cute, 'normale', 'ma la cute lo dice');
  assert.ok(i.stato.refill > 2, 'e il refill pure');
});
