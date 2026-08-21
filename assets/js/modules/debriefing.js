/* =====================================================================
   debriefing.js — la schermata di fine intervento.

   Stava dentro `intervento.js`, che era arrivato a 852 righe contro le
   800 che il progetto si è dato come massimo. Si stacca bene perché è
   una vista sola: si disegna una volta a partita finita, non condivide
   stato con la simulazione in corso e legge soltanto l'oggetto che
   `sim.chiudi()` restituisce.
   ===================================================================== */

import { el, mount, $, formatSeconds, clamp } from '../core/dom.js';
import { icon, scoreRing } from '../core/ui.js';
import { navigate } from '../core/router.js';
import { setRibbonRhythm } from '../core/ribbon.js';
import { saveRun } from '../core/store.js';
import { daChi } from '../core/anamnesi.js';
import { DOMANDE } from '../data/domande.js';

/* Il diario si disegna in due posti — quello che scorre nel vivo e
   quello fermo del debriefing — e le icone devono essere le stesse.
   Sta qui e non in `intervento.js` perché così la dipendenza va in una
   direzione sola: intervento importa dal debriefing, mai il contrario. */
export const ICONA_RIGA = {
  osservazione: '👁', azione: '›', squadra: '»', evento: '!', allarme: '⚠', esito: '■',
  risposta: '“',
};

/* ============================ DEBRIEFING ============================ */
const ESITO_TESTO = {
  migliorato: { t: 'Paziente migliorato', cls: 'b-ok' },
  stabile: { t: 'Paziente stabile', cls: 'b-warn' },
  peggiorato: { t: 'Paziente peggiorato', cls: 'b-shock' },
  morto: { t: 'Paziente deceduto', cls: 'b-shock' },
};

/* Tre riquadri separati invece di un grafico solo: pressione, frequenza e
   saturazione hanno scale diverse, e sovrapporle su due assi è il modo
   più rapido per far leggere una cosa per un'altra. */
const SERIE = [
  { k: 'pas', label: 'Pressione sistolica', unita: 'mmHg', normale: [100, 180], fondo: [40, 200] },
  { k: 'fc', label: 'Frequenza cardiaca', unita: 'bpm', normale: [60, 100], fondo: [30, 190] },
  { k: 'spo2', label: 'Saturazione', unita: '%', normale: [94, 100], fondo: [70, 100] },
];

export function grafico(storico, eventi) {
  const wrap = el('div.grafico');
  if (storico.length < 2) return el('p', { text: 'Intervento troppo breve per un grafico.' });

  const tMax = storico[storico.length - 1].t || 1;

  SERIE.forEach((serie) => {
    const canvas = el('canvas.gcanvas', { 'aria-label': `${serie.label} nel tempo` });
    const legenda = el('div.glegenda', {}, [
      el('b', { text: serie.label }),
      el('span', { text: `${serie.unita} · fascia di normalità evidenziata` }),
      el('span.gvalore'),
    ]);
    const box = el('div.gserie', {}, [legenda, canvas]);
    wrap.append(box);

    const disegna = (evidenziaT = null) => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = canvas.clientWidth || 320;
      const h = canvas.clientHeight || 90;
      canvas.width = w * dpr; canvas.height = h * dpr;
      const c = canvas.getContext('2d');
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      c.clearRect(0, 0, w, h);

      const stile = getComputedStyle(document.documentElement);
      const inchiostro = stile.getPropertyValue('--ink-3').trim() || '#7B8D9B';
      const linea = stile.getPropertyValue('--phos').trim() || '#34D399';
      const bordo = stile.getPropertyValue('--line').trim() || '#24313B';

      /* Il dominio segue i dati, non il fondo scala: una pressione che
         scende da 96 a 84 su un asse 40-200 sarebbe una riga piatta.
         La fascia di normalità entra comunque nel dominio, così resta
         il riferimento visivo. */
      /* Un parametro può smettere di esistere: in arresto il saturimetro
         non legge più niente. Quei punti si saltano, invece di disegnare
         una caduta a zero che il paziente non ha mai avuto. */
      const punti = storico.filter((p2) => typeof p2[serie.k] === 'number');
      if (!punti.length) { $('.gvalore', legenda).textContent = 'non rilevata'; return; }
      const valori = punti.map((p2) => p2[serie.k]);
      let min = Math.min(...valori, serie.normale[0]);
      let max = Math.max(...valori, serie.normale[1]);
      const margine = Math.max((max - min) * 0.18, 4);
      min = Math.max(serie.fondo[0], min - margine);
      max = Math.min(serie.fondo[1], max + margine);
      if (max - min < 1) max = min + 1;
      const y = (v) => h - 6 - ((clamp(v, min, max) - min) / (max - min)) * (h - 12);
      const x = (t) => 4 + (t / tMax) * (w - 8);

      // fascia di normalità: uno sfondo, non una linea in più
      c.fillStyle = 'rgba(52,211,153,.08)';
      c.fillRect(0, y(serie.normale[1]), w, y(serie.normale[0]) - y(serie.normale[1]));

      // assi discreti
      c.strokeStyle = bordo; c.lineWidth = 1;
      c.beginPath(); c.moveTo(0, h - 0.5); c.lineTo(w, h - 0.5); c.stroke();

      // eventi
      eventi.forEach((ev) => {
        c.strokeStyle = ev.tipo === 'allarme' ? 'rgba(224,36,60,.55)' : 'rgba(242,180,65,.4)';
        c.setLineDash([3, 3]);
        c.beginPath(); c.moveTo(x(ev.t), 0); c.lineTo(x(ev.t), h); c.stroke();
        c.setLineDash([]);
      });

      // la traccia
      c.strokeStyle = linea; c.lineWidth = 2; c.lineJoin = 'round'; c.lineCap = 'round';
      c.beginPath();
      punti.forEach((p, i) => {
        const px = x(p.t); const py = y(p[serie.k]);
        if (i) c.lineTo(px, py); else c.moveTo(px, py);
      });
      c.stroke();

      // punto finale, sempre etichettato
      const ultimo = punti[punti.length - 1];
      c.fillStyle = linea;
      c.beginPath(); c.arc(x(ultimo.t), y(ultimo[serie.k]), 3.5, 0, Math.PI * 2); c.fill();

      if (evidenziaT !== null) {
        const vicino = punti.reduce((a, b) => (Math.abs(b.t - evidenziaT) < Math.abs(a.t - evidenziaT) ? b : a));
        c.strokeStyle = inchiostro; c.lineWidth = 1;
        c.beginPath(); c.moveTo(x(vicino.t), 0); c.lineTo(x(vicino.t), h); c.stroke();
        c.fillStyle = linea;
        c.beginPath(); c.arc(x(vicino.t), y(vicino[serie.k]), 4.5, 0, Math.PI * 2); c.fill();
        $('.gvalore', legenda).textContent = `${formatSeconds(vicino.t)} · ${Math.round(vicino[serie.k])} ${serie.unita}`;
      } else {
        const finale = storico[storico.length - 1];
        $('.gvalore', legenda).textContent = typeof finale[serie.k] === 'number'
          ? `${Math.round(ultimo[serie.k])} ${serie.unita} alla consegna`
          : 'alla fine non si leggeva più';
      }
    };

    const posizione = (e) => {
      const r = canvas.getBoundingClientRect();
      const frazione = clamp((e.clientX - r.left) / r.width, 0, 1);
      disegna(frazione * tMax);
    };
    canvas.addEventListener('pointermove', posizione);
    canvas.addEventListener('pointerleave', () => disegna(null));

    requestAnimationFrame(() => disegna(null));
    new ResizeObserver(() => disegna(null)).observe(canvas);
  });

  // versione leggibile senza grafico
  const tabella = el('details.gtabella', {}, [
    el('summary', { text: 'Vedi i valori in tabella' }),
  ]);
  const t = el('table');
  t.innerHTML = `<thead><tr><th>Tempo</th>${SERIE.map((s) => `<th>${s.label}</th>`).join('')}</tr></thead>
    <tbody>${storico.map((p) => `<tr><td>${formatSeconds(p.t)}</td>${SERIE.map((s) => `<td>${typeof p[s.k] === 'number' ? Math.round(p[s.k]) : '&mdash;'}</td>`).join('')}</tr>`).join('')}</tbody>`;
  tabella.append(el('div.table-wrap', {}, [t]));
  wrap.append(tabella);

  return wrap;
}

export function mostraDebriefing(sim, n) {
  const p = sim.chiudi();
  const caso = sim.caso;
  n?.mon?.lp?.distruggi();
  setRibbonRhythm('sinusale');

  saveRun({
    id: caso.id,
    titolo: caso.titolo,
    tipo: caso.tipo,
    score: Math.round(p.punti),
    max: p.max,
    seconds: p.secondi,
    errori: [
      ...p.necessarie.filter((r) => !r.fatta).map((r) => r.id),
      ...p.dannose.map((r) => r.id),
    ],
  });

  const esito = ESITO_TESTO[p.esitoPaziente];
  const eventi = sim.diario.filter((r) => r.tipo === 'evento' || r.tipo === 'allarme');

  const vista = el('div.view.debrief', {}, [
    el('div.view-head', {}, [
      el('h2', { text: 'Debriefing' }),
      el('p', { text: caso.titolo }),
    ]),

    el('div.score-hero', {}, [
      scoreRing(Math.round(p.punti), p.max),
      el('div', { style: { flex: '1', minWidth: '240px' } }, [
        el('div.row', {}, [
          el(`span.badge.${esito.cls}`, { text: esito.t }),
          el('span.badge.b-no', { text: `${Math.round(p.secondi / 60)} minuti sul posto` }),
        ]),
        el('p', { style: { margin: '12px 0 0', color: 'var(--ink-2)' }, text: caso.chiave }),
        el('div.row', { style: { marginTop: '14px' } }, [
          el('button.btn.pri', { type: 'button', onclick: () => navigate('intervento', caso.id) },
            [icon('refresh'), 'Ripeti']),
          el('button.btn', { type: 'button', onclick: () => navigate('simulazioni') }, ['Altri scenari']),
        ]),
      ]),
    ]),

    el('div.dbox', {}, [
      el('div.t', { text: 'come è andato il paziente' }),
      grafico(p.storico, eventi),
    ]),

    p.esordio ? el('div.dbox', {}, [
      el('div.t', { text: 'il tempo dall\'esordio' }),
      el('div.tempi', {}, [
        el('div', {}, [
          el('b', { text: formatSeconds(p.esordio.primaDiVoi) }),
          el('span', { text: 'già passati quando siete arrivati' }),
        ]),
        el('div', {}, [
          el('b', { text: formatSeconds(p.esordio.vostro) }),
          el('span', { text: 'spesi da voi sulla scena' }),
        ]),
        el('div.forte', {}, [
          el('b', { text: formatSeconds(p.esordio.allaPartenza) }),
          el('span', { text: 'dall\'esordio quando siete partiti' }),
        ]),
      ]),
    ]) : null,

    el('div.dbox', {}, [
      el('div.t', { text: 'quello che serviva' }),
      el('div.pagella', {}, p.necessarie.map((r) => el(`div.voce.${r.fatta ? (r.ritardo ? 'tardi' : 'ok') : 'no'}`, {}, [
        el('span.m'),
        el('span.l', {}, [
          el('b', { text: r.label }),
          el('span', {
            text: !r.fatta ? 'non fatto'
              : r.ritardo ? `fatto a ${formatSeconds(r.t)}, oltre il tempo utile (${formatSeconds(r.entro)})`
                : `fatto a ${formatSeconds(r.t)}`,
          }),
        ]),
        el('span.p', { text: `${r.punti}/${r.peso}` }),
      ]))),
    ]),

    p.anamnesi.voci.length ? el('div.dbox', {}, [
      el('div.t', { text: 'quello che hai raccolto' }),
      el('div.pagella', {}, p.anamnesi.voci.map((v) => el(`div.voce.${v.qualita === 'buona' ? 'ok' : 'tardi'}`, {}, [
        el('span.m'),
        el('span.l', {}, [
          el('b', { text: DOMANDE[v.domanda]?.testo || v.domanda }),
          el('span', {
            text: v.rivela.length
              ? `${daChi(v.da)}: ${v.rivela.join(', ')}`
              : daChi(v.da),
          }),
        ]),
        el('span.p', { text: formatSeconds(v.t) }),
      ]))),
      ...p.anamnesi.avvisi.map((testo) => el('p', {
        style: { margin: '10px 0 0', color: 'var(--amber)' }, text: testo,
      })),
    ]) : null,

    p.dannose.length ? el('div.dbox.warn', {}, [
      el('div.t', { text: 'quello che ha fatto danno' }),
      ...p.dannose.map((r) => el('p', { style: { margin: '0 0 8px' } }, [
        el('b', { text: `${r.label}. ` }),
        r.perche,
      ])),
    ]) : null,

    el('div.dbox.warn', {}, [
      el('div.t', { text: 'la trappola' }),
      el('p', { style: { margin: '0' }, text: caso.trappola }),
    ]),

    el('div.dbox', {}, [
      el('div.t', { text: 'il ragguaglio, come lo diresti' }),
      el('p.handover', { style: { margin: '0' }, text: caso.ragguaglio }),

      /* Il modello dice come si parla; il confronto dice quanto di quel
         testo sei davvero in grado di sostenere. Le voci che non hai
         non sono un rimprovero sul testo: sono cose che in ospedale
         nessuno potrà più recuperare. */
      p.ragguaglio.totale ? el('div.rag-conf', {}, [
        el('div.lbl', {
          text: `di ${p.ragguaglio.totale} cose che il ragguaglio dice, ${p.ragguaglio.tue} le hai davvero`,
        }),
        ...p.ragguaglio.voci.map((v) => el(`div.rag-voce${v.tuo ? '.tua' : ''}`, {}, [
          el('span.m'),
          el('span', { text: v.t }),
        ])),
      ]) : null,
    ]),

    el('div.dbox', {}, [
      el('div.t', { text: 'da rileggere sul manuale' }),
      el('div.links-out', {}, (caso.capitoli || []).map((slug) => el('button.btn.sm', {
        type: 'button', onclick: () => navigate('studio', slug),
      }, [`Capitolo ${slug.replace('cap-', '')}`]))),
    ]),

    el('div.dbox', {}, [
      el('div.t', { text: 'il diario completo' }),
      el('div.diario.statico', {}, sim.diario.map((r) => el(`div.riga.${r.tipo}`, {}, [
        el('span.ora', { text: formatSeconds(r.t) }),
        el('span.seg', { text: ICONA_RIGA[r.tipo] || '·' }),
        el('span.txt', { text: r.testo }),
      ]))),
    ]),
  ]);

  mount(n.radice, vista);
}
