/* Controlli di integrità sul catalogo delle azioni. */

import test from 'node:test';
import assert from 'node:assert/strict';

import { AZIONI, AZIONI_ELENCO, CATEGORIE, azioniDi } from '../assets/js/data/azioni.js';

const MEMBRI = ['tu', 'autista', 'infermiere'];
const CAT_VALIDE = CATEGORIE.map((c) => c.id);

test('ogni azione ha id unico', () => {
  const ids = AZIONI_ELENCO.map((a) => a.id);
  assert.equal(new Set(ids).size, ids.length, 'ci sono id ripetuti');
});

test('ogni azione è completa e coerente', () => {
  AZIONI_ELENCO.forEach((a) => {
    assert.ok(a.label, `${a.id}: manca l'etichetta`);
    assert.ok(CAT_VALIDE.includes(a.cat), `${a.id}: categoria "${a.cat}" sconosciuta`);
    assert.ok(a.durata > 0, `${a.id}: durata non valida`);
    assert.ok(Array.isArray(a.chi) && a.chi.length, `${a.id}: nessun esecutore`);
    a.chi.forEach((m) => assert.ok(MEMBRI.includes(m), `${a.id}: esecutore "${m}" sconosciuto`));
    assert.ok(a.spiega && a.spiega.length > 20, `${a.id}: spiegazione troppo corta`);
  });
});

test('le azioni dei farmaci sono solo dell\'infermiere', () => {
  ['inf-accesso', 'inf-liquidi', 'inf-adrenalina', 'inf-naloxone', 'inf-glucosata']
    .forEach((id) => {
      assert.ok(AZIONI[id], `manca ${id}`);
      assert.deepEqual(AZIONI[id].chi, ['infermiere'], `${id} non deve essere eseguibile dal soccorritore`);
    });
});

test('ogni categoria di azioni ha almeno un\'azione', () => {
  /* L'anamnesi non ha azioni: ha domande, e stanno in domande.js. */
  CATEGORIE.filter((c) => c.id !== 'anamnesi').forEach((c) => {
    assert.ok(azioniDi(c.id).length > 0, `categoria vuota: ${c.id}`);
  });
});

test('i prerequisiti non esplodono su uno stato qualunque', () => {
  const stato = {
    coscienza: 'A', viePervie: true, respiro: { tipo: 'normale', fr: 16 },
    fc: 80, pas: 120, pad: 80, spo2: 98, glicemia: 100, temp: 36.5,
    polsoRadiale: true, tag: [], dolore: 0, esito: 'in-corso',
  };
  const ctx = { t: 0, letture: {}, fatte: [], haFatto: () => false, haLettura: () => false };
  AZIONI_ELENCO.forEach((a) => {
    if (a.richiede) assert.doesNotThrow(() => a.richiede(stato, ctx), `${a.id}: richiede in errore`);
    if (a.applica) assert.doesNotThrow(() => a.applica(stato, ctx), `${a.id}: applica in errore`);
    if (typeof a.diario === 'function') assert.doesNotThrow(() => a.diario(stato), `${a.id}: diario in errore`);
    if (typeof a.motivoBloccato === 'function') {
      assert.doesNotThrow(() => a.motivoBloccato(stato, ctx), `${a.id}: motivoBloccato in errore`);
    }
  });
});

/* Le offese leggono i tag: se un'azione non mette il tag giusto, il
   provvedimento non ha alcun effetto sul paziente. */
const TAG_ATTESI = {
  compressione: 'compressione',
  laccio: 'laccio',
  'o2-reservoir': 'o2',
  'o2-maschera': 'o2',
  'o2-occhialini': 'o2',
  pallone: 'pallone',
  'inf-liquidi': 'liquidi',
  'zucchero-os': 'zucchero',
  'inf-glucosata': 'glucosata',
  'inf-adrenalina': 'adrenalina',
};

test('le azioni che curano mettono il tag che le offese leggono', () => {
  Object.entries(TAG_ATTESI).forEach(([id, tag]) => {
    const az = AZIONI[id];
    assert.ok(az, `manca l'azione ${id}`);
    assert.ok(az.applica, `${id}: manca applica()`);
    const eff = az.applica({ viePervie: true, tag: [] }, {});
    assert.equal(eff.tag, tag, `${id} doveva mettere il tag "${tag}"`);
  });
});

test('le azioni non decidono più di quanto migliora un parametro', () => {
  Object.keys(TAG_ATTESI).forEach((id) => {
    const eff = AZIONI[id].applica({ viePervie: true, tag: [] }, {});
    Object.entries(eff).forEach(([k, v]) => {
      assert.ok(typeof v !== 'number',
        `${id}: dichiara ancora ${k}: ${v}, ma i parametri li calcola la fisiologia`);
    });
  });
});

test('la posizione del paziente mette il tag che il ritorno venoso legge', () => {
  assert.equal(AZIONI.antishock.applica({ tag: [] }, {}).tag, 'antishock');
  assert.equal(AZIONI['posizione-seduta'].applica({ tag: [] }, {}).tag, 'seduta');
});

test('ci sono le azioni per cercare i segni del compenso', () => {
  for (const id of ['refill', 'colorito', 'chiedi-sete']) {
    const az = AZIONI[id];
    assert.ok(az, `manca l'azione ${id}`);
    assert.ok(az.rileva, `${id}: deve rilevare qualcosa`);
    assert.ok(az.durata > 0 && az.durata <= 30, `${id}: deve costare poco tempo`);
  }
});

test('il refill è più veloce di una pressione: è per questo che si fa prima', () => {
  assert.ok(AZIONI.refill.durata < AZIONI['misura-pa'].durata);
});
