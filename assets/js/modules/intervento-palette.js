/* =====================================================================
   intervento-palette.js — la palette delle azioni.

   Sta fuori da `intervento.js` per una ragione pratica: quel file era
   arrivato a 796 righe contro le 800 che il progetto si è dato come
   massimo, e la palette è il pezzo che si stacca meglio — parla col
   motore solo attraverso `sim` e non sa niente del monitor, del diario
   né del debriefing.

   Non tiene stato suo: riceve tutto in `ctx` e restituisce nodi.
   ===================================================================== */

import { el, fold } from '../core/dom.js';
import { CATEGORIE, azioniDi } from '../data/azioni.js';
import { FAMIGLIE_META } from '../data/presidi.js';
import { NOMI_MEMBRO, versoIlMembro } from '../core/squadra.js';

/* `ctx` è quello che la palette ha bisogno di sapere dal modulo:
   { sim, esegui, chiedi, rivolgitiA, categoriaAperta, famigliaAperta,
     membroFamiglia, ricercaTesto, apriFamiglia, apriCategoria } */

/* La riga di una domanda: usata sia nel pannello dell'anamnesi sia nei
   risultati della ricerca, che possono incrociarla con azioni di
   qualunque categoria. */
function rigaDomanda(ctx, d) {
  const { sim } = ctx;
  const gia = sim.raccolte.some((r) => r.domanda === d.id && r.interlocutore === sim.interlocutore);
  return el(`div.pal-riga${gia ? '.gia-chiesta' : ''}`, {}, [
    el('div.az-testo', {}, [
      el('b', {}, [el('span.anam-lettera', { text: d.lettera }), d.testo]),
      el('span', { text: gia ? 'Gliel\'hai già chiesto' : `Schema ${d.schema}` }),
    ]),
    el('div.az-meta', {}, [el('span.durata', { text: `${d.durata}s` })]),
    el('div.az-btn', {}, [
      el('button.btn.sm.pri', {
        type: 'button',
        onclick: () => ctx.chiedi(d.id),
      }, ['Chiedi']),
    ]),
  ]);
}

/* La barra di chi hai davanti, e sotto le domande che gli puoi fare.
   Un tocco per domanda: chi si è girato verso la moglie continua a
   parlare con lei finché non si gira di nuovo. */
function pannelloAnamnesi(ctx) {
  const { sim } = ctx;
  const barra = el('div.anam-chi', {}, sim.interlocutori.map((persona) => el('button.anam-p', {
    type: 'button',
    'aria-pressed': String(persona.id === sim.interlocutore),
    onclick: () => ctx.rivolgitiA(persona.id),
  }, [persona.label])));

  const righe = sim.domandeDisponibili().map((d) => rigaDomanda(ctx, d));

  return el('div.anam', {}, [
    el('div.anam-head', {}, [el('span', { text: 'parli con' }), barra]),
    ...righe,
  ]);
}

/* La riga di un'azione singola: è quella che c'è sempre stata. */
function rigaAzione(ctx, az, onScegli) {
  const { sim } = ctx;
  const liberi = sim.membriLiberi(az);
  const principale = liberi.includes('tu') ? 'tu' : liberi[0];
  const riga = el('div.pal-riga', {}, [
    el('div.az-testo', {}, [
      el('b', { text: az.label }),
      el('span', { text: az.spiega }),
    ]),
    el('div.az-meta', {}, [
      el('span.durata', { text: `${az.durata}s` }),
    ]),
  ]);

  const bottoni = el('div.az-btn');
  const agisci = onScegli || ((id, chi) => ctx.esegui(id, chi));
  const servono = az.tuttaLaSquadra ? liberi.length : (az.servono || 1);
  /* Un sanitario non lo comandi: gli riferisci un quadro e decide lui.
     Il vincolo tecnico è lo stesso di prima — `richiede` pretende il
     ragguaglio — ma chiamarlo «chiedi a» insegnava che dai ordini a un
     infermiere, che è la cosa sbagliata. */
  const etichettaPrincipale = az.cat === 'infermiere'
    ? 'Riferisci e assisti'
    : (principale === 'tu' ? 'Fallo tu' : `Chiedi ${versoIlMembro(principale)}`);
  const soloUno = (testo) => bottoni.append(el('button.btn.sm.pri', {
    type: 'button',
    onclick: () => agisci(az.id, principale),
  }, [testo]));

  if (!principale) {
    bottoni.append(el('span.badge.b-no', { text: 'occupati' }));
  } else if (servono > 1 || az.tuttaLaSquadra) {
    /* Quando la manovra prende più di una persona non c'è niente da
       scegliere: si fa in due, o la fa la squadra. Il bottone dice
       quello che succede. */
    soloUno(az.tuttaLaSquadra ? 'Tutta la squadra' : 'Fatelo in due');
  } else if (az.chi.length === 1 || liberi.length === 1) {
    /* Un solo candidato libero: nessuna scelta da fare. */
    soloUno(etichettaPrincipale);
  } else {
    /* Qui la scelta è vera: puoi farlo tu, o chiederlo mentre fai altro. */
    soloUno(etichettaPrincipale);
    liberi.filter((m) => m !== principale).forEach((m) => {
      bottoni.append(el('button.btn.sm', {
        type: 'button',
        onclick: () => agisci(az.id, m),
      }, [NOMI_MEMBRO[m]]));
    });
  }
  riga.append(bottoni);
  return riga;
}

/* La riga di una famiglia: un capofamiglia solo, e sotto — quando la
   apri — le misure vere. Sul telefono è la differenza fra sei righe e
   quindici. Aprirla non costa tempo: è un pensiero, non un gesto. */
function rigaFamiglia(ctx, idFamiglia, voci) {
  const meta = FAMIGLIE_META[idFamiglia];
  const prima = voci[0];
  const aperta = ctx.famigliaAperta === idFamiglia;

  /* Il capofamiglia si comporta come un'azione qualunque — stessi
     bottoni, stessa scelta di chi lo fa — solo che invece di partire
     apre le misure. */
  const finto = { ...prima, label: meta.label, spiega: meta.spiega, durata: prima.durata };
  const riga = rigaAzione(ctx, finto, (_id, chi) => {
    ctx.apriFamiglia(aperta ? null : idFamiglia, chi);
  });
  riga.classList.add('pal-fam');
  /* Sul capofamiglia la durata non si scrive: le misure di una famiglia
     non costano tutte uguale — montare un reservoir non è mettere due
     occhialini — e il secondo giusto sta scritto sul bottone di ognuna. */
  const meta2 = riga.querySelector('.az-meta');
  meta2.replaceChildren(el('span.pal-quante', { text: `${voci.length} misure` }));

  if (!aperta) return riga;

  const misure = el('div.pal-misure', {}, [
    el('p.pal-come', {}, [
      meta.comeSiMisura,
      el('small', { text: meta.fonteMisura }),
    ]),
    el('div.pal-scelte', {}, voci.map((v) => {
      const b = el('button.pal-mis', {
        type: 'button',
        onclick: () => ctx.esegui(v.id, ctx.membroFamiglia),
      }, [
        v.colore ? el('i.pal-colore', { style: { background: v.colore } }) : null,
        el('b', { text: v.etichettaMisura }),
        el('span', { text: `${v.durata}s` }),
      ].filter(Boolean));
      return b;
    })),
  ]);
  riga.append(misure);
  return riga;
}

/* Le azioni della categoria, con le famiglie compattate in una riga
   sola. L'ordine è quello del catalogo: la prima voce di una famiglia
   tiene il posto di tutte. */
function righeDellaCategoria(ctx, inCategoria) {
  const viste = new Set();
  return inCategoria.map((az) => {
    if (!az.famiglia) return rigaAzione(ctx, az);
    if (viste.has(az.famiglia)) return null;
    viste.add(az.famiglia);
    return rigaFamiglia(ctx, az.famiglia, inCategoria.filter((x) => x.famiglia === az.famiglia));
  }).filter(Boolean);
}

/* ============================== RICERCA ============================= */
/* Con sessanta azioni in undici categorie il problema vero è ricordarsi
   dove sta un gesto, non eseguirlo: la ricerca guarda tutte le
   categorie insieme, non solo quella aperta.

   Le famiglie di presidi (Guedel, sondini, ossigeno, agocannule) qui si
   DISTENDONO invece di restare compattate in una riga: ogni misura ha
   già un'etichetta e una spiegazione proprie (`data/presidi.js`, es.
   «Cannula orofaringea — mis. 3 gialla»), quindi `rigaAzione` le mostra
   bene una per una. Chi cerca «guedel» sta già scegliendo, e vuole
   vedere le sei misure. Sotto una categoria restano compattate perché
   lì il problema è l'opposto: non farsi sommergere da righe che quasi
   mai servono tutte insieme. */
function conCategoria(riga, etichetta) {
  const label = riga.querySelector('.az-testo b');
  if (label) label.prepend(el('span.pal-cat', { text: etichetta }));
  return riga;
}

function risultatiRicerca(ctx, testo, disponibili) {
  const azioni = disponibili
    .filter((az) => fold(az.label).includes(testo) || fold(az.spiega || '').includes(testo))
    .map((az) => conCategoria(rigaAzione(ctx, az), CATEGORIE.find((c) => c.id === az.cat)?.label || az.cat));

  const domande = ctx.sim.domandeDisponibili()
    .filter((d) => fold(d.testo).includes(testo))
    .map((d) => conCategoria(rigaDomanda(ctx, d), 'Anamnesi'));

  return [...azioni, ...domande];
}

/* ============================ I DUE NODI =========================== */
/** I bottoni delle categorie, col contatore di quanto c'è dentro. */
export function costruisciTabs(ctx) {
  const disponibili = ctx.sim.azioniDisponibili();
  return CATEGORIE.map((c) => {
    const quante = c.id === 'anamnesi'
      ? ctx.sim.domandeDisponibili().length
      : azioniDi(c.id).filter((a) => disponibili.some((d) => d.id === a.id)).length;
    return el('button.pcat', {
      type: 'button',
      'aria-pressed': String(c.id === ctx.categoriaAperta),
      // toccare una categoria è "sfoglio questa": la ricerca si esce
      onclick: () => ctx.apriCategoria(c.id),
      title: c.desc,
    }, [c.label, el('i', { text: String(quante) })]);
  });
}

/** Le righe della categoria aperta, o i risultati della ricerca. */
export function costruisciLista(ctx) {
  const disponibili = ctx.sim.azioniDisponibili();

  const testo = fold(ctx.ricercaTesto.trim());
  if (testo) {
    const righe = risultatiRicerca(ctx, testo, disponibili);
    return righe.length ? righe
      : [el('p.palette-vuota', { text: `Nessun gesto trovato per «${ctx.ricercaTesto.trim()}».` })];
  }

  /* L'anamnesi non è fatta di azioni: è fatta di domande, e prima delle
     domande c'è la persona a cui le fai. */
  if (ctx.categoriaAperta === 'anamnesi') return [pannelloAnamnesi(ctx)];

  const inCategoria = azioniDi(ctx.categoriaAperta)
    .filter((a) => disponibili.some((d) => d.id === a.id));

  if (!inCategoria.length) {
    return [el('p.palette-vuota', { text: 'Niente da fare in questa categoria, adesso.' })];
  }

  return righeDellaCategoria(ctx, inCategoria);
}
