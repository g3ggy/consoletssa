/* Collaudo dei casi: due partite automatiche per ciascuno, quella in cui
   il soccorritore non fa nulla e quella in cui fa le cose giuste. */

import test from 'node:test';
import assert from 'node:assert/strict';

import { creaIntervento } from '../assets/js/core/sim-engine.js';
import { AZIONI } from '../assets/js/data/azioni.js';
import { CASI } from '../assets/js/data/casi.js';
import { DOMANDE } from '../assets/js/data/domande.js';

const avvia = (caso) => creaIntervento(caso, { azioni: AZIONI });

/* Una voce della pagella può essere un'azione della palette o una
   domanda dell'anamnesi: si riconoscono dal prefisso, e vivono in due
   cataloghi diversi. */
const PREFISSO_DOMANDA = 'domanda:';
const eUnaDomanda = (id) => String(id).startsWith(PREFISSO_DOMANDA);
const idDomanda = (id) => String(id).slice(PREFISSO_DOMANDA.length);

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
      [].concat(n.id).forEach((id) => {
        if (eUnaDomanda(id)) {
          assert.ok(DOMANDE[idDomanda(id)], `${c.id}: domanda necessaria sconosciuta ${id}`);
          return;
        }
        assert.ok(AZIONI[id], `${c.id}: azione necessaria sconosciuta ${id}`);
      });
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

/* Un caso senza offese non ha niente che consumi le riserve: il paziente
   resta com'è, e deve restarci senza che il motore inventi nulla. */
const puoPeggiorare = (c) => c.motore !== 3 || (c.fisiologia.offese || []).length > 0;

test('senza fare nulla il paziente peggiora, e nessun caso esplode', () => {
  CASI.forEach((c) => {
    const i = avvia(c);
    for (let giro = 0; giro < 20; giro += 1) {
      i.avanza(60);
      rispondiSeServe(i);
    }
    const p = i.chiudi();
    if (puoPeggiorare(c)) {
      assert.ok(['peggiorato', 'morto'].includes(p.esitoPaziente),
        `${c.id}: senza far nulla dovrebbe peggiorare, invece è ${p.esitoPaziente}`);
    } else {
      assert.equal(p.esitoPaziente, 'stabile',
        `${c.id}: non ha offese, quindi non deve peggiorare da solo`);
    }
    assert.equal(p.punti, 0, `${c.id}: senza far nulla il punteggio deve essere zero`);
  });
});

test('facendo le azioni necessarie il paziente non peggiora e il punteggio è pieno', () => {
  CASI.forEach((c) => {
    const i = avvia(c);
    c.azioni.necessarie.forEach((n) => {
      rispondiSeServe(i);
      const id = [].concat(n.id)[0];

      /* Le domande le fai sempre tu, e non si delegano: basta aspettare
         di essere libero. */
      if (eUnaDomanda(id)) {
        const attesaTua = i.squadra.tu.liberoA - i.t;
        if (attesaTua > 0) { i.avanza(attesaTua); rispondiSeServe(i); }
        const risposta = i.chiedi(idDomanda(id));
        assert.ok(risposta.ok, `${c.id}: ${id} rifiutata (${risposta.motivo})`);
        rispondiSeServe(i);
        return;
      }

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
  const caso = CASI.find((c) => c.id === 'toracico-v3');
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
    /* Un caso di formato 3 dichiara il blocco `fisiologia`, non per
       forza un'offesa: l'ictus non ha niente che consuma riserve, e un
       paziente che non peggiora è legittimo. */
    assert.ok(Array.isArray(c.fisiologia.offese), `${c.id}: le offese devono essere un elenco, anche vuoto`);
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

test('toracico-v3 ha dolore e miocardio che soffre', () => {
  const caso = CASI.find((c) => c.id === 'toracico-v3');
  assert.ok(caso, 'manca toracico-v3');
  const tipi = caso.fisiologia.offese.map((o) => o.tipo);
  assert.ok(tipi.includes('ischemia-miocardica'), 'deve avere l\'ischemia');
  const i = avvia(caso);
  assert.ok(i.stato.dolore >= 6, `arriva che ha male: invece è ${i.stato.dolore}`);
  assert.ok(i.stato.pas > 130, 'e con la pressione alta: è la scarica adrenergica');
  /* Con l'asse dell'allarme la scarica adrenergica si vede anche
     addosso, e non solo sul monitor: il quadro classico dell'infarto è
     pallido e sudato (Bolognin :6481). Prima aveva cute normale. */
  assert.equal(i.stato.cute, 'pallida-fredda-sudata');
  assert.ok(i.stato.fr > 20, 'e respira corto');
});

test('nel toracico il dolore sale e si porta dietro la frequenza', () => {
  const i = avvia(CASI.find((c) => c.id === 'toracico-v3'));
  const prima = { dolore: i.stato.dolore, fc: i.stato.fc };
  i.avanza(60 * 6);
  while (i.decisionePendente) i.rispondiDecisione(0);
  assert.ok(i.stato.dolore > prima.dolore, 'il dolore non trattato sale da solo');
  assert.ok(i.stato.fc > prima.fc, 'e il cuore va più in fretta proprio mentre soffre');
});

test('toracico-v3 non trattato arresta in fibrillazione, e il DAE serve', () => {
  const i = avvia(CASI.find((c) => c.id === 'toracico-v3'));
  for (let giro = 0; giro < 45; giro += 1) {
    i.avanza(60);
    rispondiSeServe(i);
    if (i.stato.esito !== 'in-corso') break;
  }
  assert.ok(i.stato.tag.includes('arresto') || i.stato.esito === 'morto',
    'quarantacinque minuti di infarto non trattato finiscono male');
  assert.equal(i.stato.ritmo, 'fv', 'il cuore ischemico fibrilla: la scarica ha senso');
});

/* ==================== l'anamnesi nei casi =========================== */

test('shock-v3 ha qualcuno a cui chiedere, oltre al paziente', () => {
  const caso = CASI.find((c) => c.id === 'shock-v3');
  assert.ok(caso.anamnesi, 'manca il blocco anamnesi');
  assert.ok(caso.anamnesi.interlocutori.some((i) => i.id === 'moglie'));
});

test('in shock-v3 il betabloccante lo sa solo la moglie', () => {
  const caso = CASI.find((c) => c.id === 'shock-v3');
  const i = avvia(caso);

  i.chiedi('terapia');
  assert.deepEqual(i.saputo, {}, 'dal paziente non cavi il nome del farmaco');

  i.rivolgitiA('moglie');
  i.chiedi('terapia');
  assert.ok(i.saputo.betabloccante, 'la moglie sa cosa prende, ed è la chiave del caso');
});

test('quello che la moglie rivela è la stessa chiave che agisce sul paziente', () => {
  const caso = CASI.find((c) => c.id === 'shock-v3');
  const rivelate = Object.values(caso.anamnesi.risposte)
    .flatMap((perInterlocutore) => Object.values(perInterlocutore))
    .flatMap((r) => r.rivela || []);
  caso.fisiologia.modificatori.terapia.forEach((farmaco) => {
    assert.ok(rivelate.includes(farmaco),
      `${farmaco} agisce sul paziente ma nessuno può dirtelo: l'anamnesi non lo copre`);
  });
});

test('toracico-v3 ha il figlio sulla scena e le domande sul dolore', () => {
  const caso = CASI.find((c) => c.id === 'toracico-v3');
  assert.ok(caso.anamnesi, 'manca il blocco anamnesi');
  assert.ok(caso.anamnesi.interlocutori.some((i) => i.id === 'figlio'));

  const i = avvia(caso);
  assert.ok(i.domandeDisponibili().some((d) => d.id === 'irradiazione'),
    'ha dolore: l\'OPQRST deve essere disponibile');
  assert.equal(i.chiedi('irradiazione').ok, true);
});

test('nel toracico l\'irradiazione la sa solo il paziente', () => {
  const caso = CASI.find((c) => c.id === 'toracico-v3');
  const i = avvia(caso);
  i.rivolgitiA('figlio');
  const esito = i.chiedi('irradiazione');
  assert.equal(esito.ok, true);
  assert.equal(esito.risposta.ripiego, 'nonSo', 'il dolore lo sente lui, non il figlio');
});

/* ==================== ipoglicemia-v3 ================================ */

const ipo = () => CASI.find((c) => c.id === 'ipoglicemia-v3');

/* Il tempo si ferma su una decisione aperta: per farne passare davvero
   bisogna rispondere man mano, non alla fine. */
function lasciaPassare(i, minuti) {
  for (let giro = 0; giro < minuti; giro += 1) {
    i.avanza(60);
    rispondiSeServe(i);
  }
}

test('ipoglicemia-v3 arriva sotto la soglia ERC ma ancora vigile', () => {
  const caso = ipo();
  assert.ok(caso, 'manca ipoglicemia-v3');
  const i = avvia(caso);
  /* Sotto i 70 mg/dl è ipoglicemia — ERC 2025 cap. 12 :1125. Ma finché
     sta sopra i 50 è vigile, e finché è vigile può deglutire. */
  assert.ok(i.stato.glicemia < 70, `deve essere ipoglicemico: invece è ${i.stato.glicemia}`);
  assert.ok(i.stato.glicemia >= 50, `ma non ancora crollato: invece è ${i.stato.glicemia}`);
  assert.equal(i.stato.coscienza, 'A', 'arriva vigile: è la finestra che si può ancora usare');
  /* Bolognin :4287: «la cute appare umida e sudata». Prima nel motore
     era un ipoglicemico con cute normale e frequenza da riposo. */
  assert.notEqual(i.stato.cute, 'normale', `deve essere sudato: è ${i.stato.cute}`);
  assert.ok(i.stato.fc > caso.fisiologia.base.fc, 'e tachicardico');
});

test('la finestra dello zucchero per bocca si chiude da sola', () => {
  const i = avvia(ipo());
  i.esegui('misura-glicemia', 'tu');
  assert.equal(i.esegui('zucchero-os', 'tu').ok, true, 'misurata subito, si può ancora dare');

  const tardi = avvia(ipo());
  lasciaPassare(tardi, 8);
  tardi.esegui('misura-glicemia', 'tu');
  const esito = tardi.esegui('zucchero-os', 'tu');
  assert.equal(esito.ok, false, 'otto minuti dopo non è più in grado di deglutire');
  assert.match(esito.motivo, /deglutire/i);
});

test('lo zucchero lo tira su, e con lui la coscienza', () => {
  const i = avvia(ipo());
  i.esegui('misura-glicemia', 'tu');
  i.esegui('zucchero-os', 'tu');
  const prima = i.stato.glicemia;
  lasciaPassare(i, 5);
  assert.ok(i.stato.glicemia > prima, 'la glicemia risale');
  assert.equal(i.stato.coscienza, 'A');
});

test('senza far niente scivola nel coma ipoglicemico', () => {
  const i = avvia(ipo());
  lasciaPassare(i, 20);
  assert.ok(['P', 'U'].includes(i.stato.coscienza),
    `venti minuti senza zucchero e non risponde più: invece è ${i.stato.coscienza}`);
});

test('i passanti dicono la cosa sbagliata, e nessuno te lo segnala', () => {
  const caso = ipo();
  assert.ok(caso.anamnesi.interlocutori.some((x) => x.id === 'passanti'));
  const risposta = caso.anamnesi.risposte.patologie.passanti;
  assert.equal(risposta.qualita, 'sbagliata', 'l\'ubriachezza è una risposta sbagliata, non vaga');
  const i = avvia(caso);
  i.rivolgitiA('passanti');
  const esito = i.chiedi('patologie');
  assert.equal(esito.ok, true);
  assert.deepEqual(esito.risposta.rivela, [], 'una risposta sbagliata non rivela niente');
});

test('quando torna lucido racconta lui cosa è successo', () => {
  const caso = ipo();
  /* Da confuso il paziente non è attendibile: il diabete lo dice solo
     dopo che lo zucchero l'ha rimesso in sesto. */
  assert.ok(caso.anamnesi.risposte.patologie.paziente.rivela?.includes('diabete'));
  const i = avvia(caso);
  lasciaPassare(i, 8);
  const daConfuso = i.chiedi('patologie');
  assert.equal(daConfuso.risposta.ripiego, 'confuso');
  assert.deepEqual(i.saputo, {});
});

test('i documenti dicono quello che il paziente non può dire', () => {
  const caso = ipo();
  assert.ok(caso.diarioAzioni?.['cerca-documenti'], 'il caso deve dire cosa c\'è nel portafogli');
  const i = avvia(caso);
  i.esegui('cerca-documenti', 'tu');
  assert.ok(i.diario.some((r) => /diabet/i.test(r.testo)), 'la tessera dice che è diabetico');
});

/* ==================== incidente-v3 ================================== */

const inc = () => CASI.find((c) => c.id === 'incidente-v3');

test('incidente-v3 arriva compensato: i numeri non dicono ancora niente', () => {
  const caso = inc();
  assert.ok(caso, 'manca incidente-v3');
  const i = avvia(caso);
  assert.ok(i.stato.pas > 110, `la sistolica tiene ancora: invece è ${i.stato.pas}`);
  assert.ok(i.stato.fc > 100, `ma il cuore corre: invece è ${i.stato.fc}`);
  /* Il differenziale che si stringe è il segno precoce: si legge prima
     che la sistolica si muova. */
  assert.ok(i.stato.pas - i.stato.pad < 42, 'il differenziale si è già stretto');
  assert.equal(i.stato.coscienza, 'A');
});

test('la pressione non ti avvisa: mentre sanguina sale', () => {
  const i = avvia(inc());
  const allArrivo = i.stato.pas;
  lasciaPassare(i, 15);
  /* Il dolore spinge, i vasi stringono: la sistolica sale mentre il
     sangue se ne va. È il motivo per cui chi guarda solo la pressione
     si accorge di tutto quando è tardi. */
  assert.ok(i.stato.pas >= allArrivo, `dopo un quarto d'ora è ${i.stato.pas}, era ${allArrivo}`);
  assert.ok(i.stato.perdita > 0.25, 'e intanto ha perso più di un quarto del sangue');
  assert.ok(i.stato.fc > 125, 'quello che si è mosso è la frequenza');
});

test('e quando il compenso cede, cede di colpo', () => {
  const i = avvia(inc());
  lasciaPassare(i, 20);
  const prima = i.stato.pas;
  lasciaPassare(i, 10);
  assert.ok(i.stato.pas < 90, `mezz'ora e la pressione è a ${i.stato.pas}`);
  assert.ok(prima - i.stato.pas > 40, 'non scende piano: crolla');
  assert.notEqual(i.stato.coscienza, 'A');
});

test('la dinamica la sa il testimone, non il paziente', () => {
  const caso = inc();
  assert.ok(caso.anamnesi.interlocutori.some((x) => x.id === 'testimone'));
  const i = avvia(caso);

  const daLui = i.chiedi('evento');
  assert.equal(daLui.risposta.qualita, 'vaga', 'lui ricorda poco: è stato un attimo');
  assert.deepEqual(i.saputo, {});

  i.rivolgitiA('testimone');
  i.chiedi('evento');
  assert.ok(i.saputo['dinamica-maggiore'], 'il testimone ti dà la velocità e la frenata che non c\'è');
});

test('ha male, quindi l\'OPQRST si può fare', () => {
  const i = avvia(inc());
  assert.ok(i.stato.dolore > 0);
  assert.ok(i.domandeDisponibili().some((d) => d.id === 'irradiazione'));
});

test('la dinamica è scritta anche addosso, se lo guardi', () => {
  const caso = inc();
  assert.ok(caso.diarioAzioni?.esposizione, 'esporre il paziente deve dire cosa si vede');
  const i = avvia(caso);
  i.esegui('esposizione', 'tu');
  assert.ok(i.diario.some((r) => /cintura|volante/i.test(r.testo)));
});

test('tirarlo fuori di peso è un errore, e il debriefing lo dice', () => {
  const caso = inc();
  const nomi = caso.azioni.dannose.map((d) => d.id);
  assert.ok(nomi.includes('sposta-sicurezza'), 'l\'estricazione rapida qui non è giustificata');
  const i = avvia(caso);
  i.esegui('sposta-sicurezza', 'tu');
  const p = i.chiudi();
  assert.equal(p.dannose.length, 1);
  assert.match(p.dannose[0].perche, /rachide|estricazione/i);
});

/* ==================== sincope-v3 ==================================== */

const sinc = () => CASI.find((c) => c.id === 'sincope-v3');

test('sincope-v3 arriva già ripresa, come dice la definizione', () => {
  const caso = sinc();
  assert.ok(caso, 'manca sincope-v3');
  const i = avvia(caso);
  /* «Un paziente ancora con alterazione della coscienza all'arrivo del
     mezzo non va mai considerato una sincope» — Bolognin :4314. */
  assert.equal(i.stato.coscienza, 'A');
  assert.equal(i.stato.pas, 90, 'ipotensione transitoria, non shock');
  assert.equal(i.stato.glicemia, 84, 'la glicemia va nelle riserve, non nella base');
  assert.equal(i.stato.spo2, 99);
});

test('supina resta bene anche se non fai niente', () => {
  const i = avvia(sinc());
  lasciaPassare(i, 15);
  assert.equal(i.stato.coscienza, 'A');
  assert.equal(i.chiudi().esitoPaziente, 'stabile');
});

test('se la tiri su risviene, e non per copione', () => {
  const i = avvia(sinc());
  assert.equal(i.stato.coscienza, 'A');
  i.esegui('posizione-seduta', 'tu');
  assert.ok(i.stato.pas < 75, `seduta la pressione cede: invece è ${i.stato.pas}`);
  assert.equal(i.stato.coscienza, 'V', 'ed è la seconda sincope che il manuale annuncia');
});

test('la posizione seduta è fra le dannose, col perché', () => {
  const caso = sinc();
  const d = caso.azioni.dannose.find((x) => x.id === 'posizione-seduta');
  assert.ok(d, 'la posizione seduta deve contare come errore');
  assert.match(d.perche, /supin|antishock|risven/i);
});

test('l\'impiegata sa quanto è durata, lei no', () => {
  const caso = sinc();
  assert.ok(caso.anamnesi.interlocutori.some((x) => x.id === 'impiegata'));
  const i = avvia(caso);
  i.rivolgitiA('impiegata');
  i.chiedi('evento');
  assert.ok(i.saputo['durata-breve'], 'chi ha visto sa quanto è durata');
});

test('le domande che escludono il quadro grave sono nel caso', () => {
  const caso = sinc();
  const disturbi = caso.anamnesi.risposte.disturbi.paziente;
  /* «La concomitanza con dolore toracico, dispnea, dolore addominale
     deve suggerire sempre una patologia maggiore» — Bolognin :4324. */
  assert.match(disturbi.t, /male|dolore|respir/i);
  assert.ok(disturbi.rivela?.includes('nessun-segno-grave'));
});

/* ==================== ictus-v3 ====================================== */

const ict = () => CASI.find((c) => c.id === 'ictus-v3');

test('ictus-v3 ha i parametri quasi normali, e non peggiora', () => {
  const caso = ict();
  assert.ok(caso, 'manca ictus-v3');
  const i = avvia(caso);
  assert.equal(i.stato.pas, 178, 'l\'ipertensione in fase acuta è attesa');
  assert.equal(i.stato.fc, 88);
  assert.equal(i.stato.glicemia, 118, 'la glicemia va nelle riserve');
  assert.equal(i.stato.spo2, 96, 'e la saturazione pure');
  assert.equal(i.stato.coscienza, 'A');

  lasciaPassare(i, 20);
  assert.equal(i.stato.pas, 178, 'venti minuti dopo è tutto uguale: il danno corre in ospedale');
  assert.equal(i.stato.coscienza, 'A');
});

test('è afasica, non confusa: capisce e risponde giusto', () => {
  const caso = ict();
  const i = avvia(caso);
  const r = i.chiedi('disturbi');
  assert.equal(r.ok, true);
  assert.equal(r.risposta.ripiego, null, 'la coscienza è A: niente ripiego da confuso');
  assert.equal(r.risposta.qualita, 'buona', 'fatica a dirlo, ma quello che dice è giusto');
});

test('l\'ora la sa il marito, lei no', () => {
  const caso = ict();
  assert.ok(caso.anamnesi.interlocutori.some((x) => x.id === 'marito'));
  const i = avvia(caso);

  i.chiedi('evento');
  assert.deepEqual(i.saputo, {}, 'lei non è in grado di dirti l\'ora');

  i.rivolgitiA('marito');
  i.chiedi('evento');
  assert.ok(i.saputo['esordio-9-40'], 'lui l\'ha vista bene alle 9:40');
});

test('l\'esame neurologico trova i tre segni', () => {
  const caso = ict();
  assert.ok(caso.diarioAzioni?.['esame-neurologico'], 'il caso deve dire cosa trovi');
  const i = avvia(caso);
  i.esegui('esame-neurologico', 'tu');
  assert.ok(i.diario.some((r) => /braccio|sorrid|parola/i.test(r.testo)));
});

test('il conto del tempo parte da trentacinque minuti', () => {
  const i = avvia(ict());
  i.avanza(300);
  const p = i.chiudi();
  assert.equal(p.esordio.primaDiVoi, 2100);
  assert.equal(p.esordio.allaPartenza, 2100 + p.esordio.vostro);
});

test('senza chiedere l\'ora il ragguaglio non è tuo', () => {
  const i = avvia(ict());
  const p = i.chiudi();
  const ora = p.ragguaglio.voci.find((v) => /9:40|vista bene/i.test(v.t));
  assert.ok(ora, 'l\'ora deve essere una voce del ragguaglio');
  assert.equal(ora.tuo, false);
});

test('chiedendola al marito, quella voce diventa tua', () => {
  const i = avvia(ict());
  i.rivolgitiA('marito');
  i.chiedi('evento');
  const p = i.chiudi();
  const ora = p.ragguaglio.voci.find((v) => /9:40|vista bene/i.test(v.t));
  assert.equal(ora.tuo, true);
});

test('dare zucchero per bocca a un\'afasica è un errore', () => {
  const caso = ict();
  assert.ok(caso.azioni.dannose.some((d) => d.id === 'zucchero-os'));
});

/* ============ quello che l'asse dell'allarme non deve muovere ========
   `shock-v3` ha il compenso bloccato dal betabloccante e nessun dolore;
   `ictus-v3` non ha niente che allarmi. Sono i due casi che devono
   restare identici al mmHg quando la frequenza passa sull'asse: se si
   muovono, l'asse ha un peso sbagliato e non è una scelta, è un errore. */

test('shock-v3 e ictus-v3 restano identici al mmHg', () => {
  const atteso = {
    'shock-v3': { fc: 72, pas: 84, pad: 58, fr: 24, spo2: 98, cute: 'pallida-fredda-sudata', refill: 2.9 },
    'ictus-v3': { fc: 88, pas: 178, pad: 95, fr: 16, spo2: 96, cute: 'normale', refill: 1.4 },
  };
  Object.entries(atteso).forEach(([id, v]) => {
    const s = avvia(CASI.find((c) => c.id === id)).stato;
    Object.entries(v).forEach(([k, valore]) => {
      assert.equal(s[k], valore, `${id}: ${k} è ${s[k]}, era ${valore}`);
    });
  });
});

test('shock-v3 non si muove nemmeno dopo cinque minuti', () => {
  const i = avvia(CASI.find((c) => c.id === 'shock-v3'));
  lasciaPassare(i, 5);
  assert.equal(i.stato.fc, 72, 'il betabloccante gli tiene ferma la frequenza');
  assert.equal(i.stato.pas, 69);
  assert.equal(i.stato.cute, 'pallida-fredda-sudata');
});
