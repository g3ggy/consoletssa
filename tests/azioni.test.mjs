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

test('ogni categoria ha almeno un\'azione', () => {
  CATEGORIE.forEach((c) => {
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
