/* =====================================================================
   lifepak.js — monitor/defibrillatore in stile LIFEPAK 15.

   Ricalca la schermata iniziale del manuale d'uso: fondo nero, riquadri
   dei parametri sulla sinistra colorati come la propria traccia, canali
   d'onda sulla destra, barra in alto con ora, batterie ed energia
   selezionata, area messaggi in basso.

   Comportamenti presi dal dispositivo vero:
   · finché il cavo non è collegato il parametro mostra trattini;
   · ogni parametro porta i propri limiti di allarme;
   · la NIBP mostra l'ora della misurazione accanto al valore, ed è per
     questo che una pressione "vecchia" si riconosce a colpo d'occhio;
   · quando un valore esce dai limiti il riquadro va in allarme.

   Non è un simulatore del dispositivo: è una riproduzione didattica
   dell'aspetto e delle logiche di lettura.
   ===================================================================== */

import { el, $, formatSeconds } from './dom.js';
import { createScope, createPlethScope } from './waveform.js';
import { battito, allarme, fermaAllarme, nibpConclusa, setMuto, conferma } from './suoni.js';
import { getState } from './store.js';

/* Colori del dispositivo: ogni parametro ha il colore della sua traccia. */
export const LP_COLORI = {
  hr: '#3BD44A',
  spo2: '#41A9F0',
  co2: '#F2A03D',
  nibp: '#FFFFFF',
};

const LIMITI = {
  hr: [50, 150],
  spo2: [90, 100],
  nibp: [90, 160],
  co2: [30, 45],
};

const trattini = '- - -';

function riquadro(chiave, etichetta, unita) {
  const valore = el('span.lp-num', { text: trattini });
  const extra = el('span.lp-extra');
  const ora = el('span.lp-ora');
  const box = el(`div.lp-box.lp-${chiave}`, { 'data-k': chiave }, [
    el('div.lp-testa', {}, [
      el('span.lp-nome', { text: etichetta }),
      el('span.lp-unita', { text: unita }),
    ]),
    el('div.lp-riga', {}, [
      el('span.lp-allarme', { text: '▲' }),
      valore,
      el('div.lp-limiti', {}, [
        el('span', { text: String(LIMITI[chiave]?.[1] ?? '') }),
        el('span', { text: String(LIMITI[chiave]?.[0] ?? '') }),
      ]),
    ]),
    el('div.lp-piede', {}, [extra, ora]),
  ]);
  return { box, valore, extra, ora };
}

/**
 * @param {object} opzioni  { canali: 2, energia: 200 }
 */
export function creaLifepak(opzioni = {}) {
  const canvasEcg = el('canvas.lp-onda', { 'aria-label': 'Tracciato ECG' });
  const canvasPleth = el('canvas.lp-onda.lp-pleth', { 'aria-label': 'Pletismografia' });

  const hr = riquadro('hr', 'HR', '');
  const spo2 = riquadro('spo2', 'SPO2', '%');
  const nibp = riquadro('nibp', 'NIBP', 'mmHg');

  const orologio = el('span.lp-clock', { text: '--:--:--' });
  const tastoAudio = el('button.lp-audio', {
    type: 'button',
    'aria-label': 'Attiva o disattiva i toni del monitor',
    title: 'Toni del monitor',
  });
  const derivazione = el('span.lp-deriv', { text: 'II  x1.0' });
  const energia = el('span.lp-energia', { text: `${opzioni.energia ?? 200}J` });
  const messaggio = el('div.lp-msg', { text: 'COLLEGARE GLI ELETTRODI' });

  const schermo = el('div.lp15', {}, [
    el('div.lp-top', {}, [
      tastoAudio,
      el('span.lp-bt', { text: '✦' }),
      el('span', { style: { flex: '1' } }),
      orologio,
      el('span', { style: { flex: '1' } }),
      el('span.lp-batt', {}, [el('i'), el('i')]),
      energia,
      derivazione,
    ]),
    el('div.lp-corpo', {}, [
      el('div.lp-parametri', {}, [hr.box, spo2.box, nibp.box]),
      el('div.lp-canali', {}, [canvasEcg, canvasPleth]),
    ]),
    messaggio,
  ]);

  let scope = null;
  let plethScope = null;
  let collegato = false;
  let spo2Corrente = 100;
  let inAllarme = false;

  /* ------------------------------- audio ---------------------------- */
  const sincronizzaTastoAudio = () => {
    const muto = Boolean(getState().audio?.muto);
    tastoAudio.textContent = muto ? '🔇' : '🔊';
    tastoAudio.classList.toggle('muto', muto);
    tastoAudio.setAttribute('aria-pressed', String(!muto));
  };
  tastoAudio.addEventListener('click', () => {
    const muto = !getState().audio?.muto;
    setMuto(muto);
    sincronizzaTastoAudio();
    if (!muto) conferma();
    if (muto) fermaAllarme();
  });
  sincronizzaTastoAudio();

  /* --------------------------- aggiornamento ------------------------ */
  function fuoriLimiti(chiave, v) {
    const l = LIMITI[chiave];
    if (!l || typeof v !== 'number' || Number.isNaN(v)) return false;
    return v < l[0] || v > l[1];
  }

  function scriviRiquadro(r, chiave, valore, { extra, ora, attivo } = {}) {
    const noto = valore !== undefined && valore !== null && valore !== '';
    const testo = noto ? String(valore) : trattini;
    /* "assente", "non rilevabile", "gasping": un valore a parole non sta
       nello spazio di un numero a tre cifre, quindi il riquadro cambia
       corpo invece di sbordare. */
    r.box.dataset.lungo = testo.length > 12 ? '2' : (testo.length > 6 ? '1' : '0');
    r.valore.textContent = testo;
    r.extra.textContent = extra || '';
    r.ora.textContent = ora || '';
    r.box.classList.toggle('lp-spento', !attivo || !noto);
    const num = parseFloat(String(valore));
    r.box.classList.toggle('lp-allarmato', noto && attivo && fuoriLimiti(chiave, num));
  }

  return {
    schermo,

    /** Il riquadro di un parametro, per renderlo toccabile dall'esterno. */
    riquadro(chiave) { return $(`.lp-${chiave}`, schermo); },

    /** Collega il monitor: da qui in poi la traccia scorre. */
    collega(ritmo) {
      if (collegato) return;
      collegato = true;
      scope = createScope(canvasEcg, {
        kind: ritmo, speed: 130, amp: 0.85, grid: false, color: LP_COLORI.hr,
        /* niente tono su fibrillazione e asistolia: là non c'è un QRS
           da segnalare, ed è proprio quello che deve saltare all'occhio */
        onBeat: (k) => { if (k !== 'fv' && k !== 'asistolia') battito(spo2Corrente); },
      });
      messaggio.textContent = '';
      schermo.classList.add('lp-acceso');
    },

    /** Attiva la pletismografia quando il saturimetro è al dito. */
    collegaSpo2(frequenza) {
      if (plethScope) return;
      plethScope = createPlethScope(canvasPleth, {
        rate: frequenza || 75, color: LP_COLORI.spo2,
      });
      canvasPleth.classList.add('attiva');
    },

    setRitmo(ritmo, frequenza) {
      scope?.setRhythm(ritmo, LP_COLORI.hr);
      if (frequenza) plethScope?.setRate(frequenza);
    },

    setDerivazione(testo) { derivazione.textContent = testo; },
    setEnergia(j) { energia.textContent = `${j}J`; },
    setMessaggio(testo) { messaggio.textContent = testo || ''; },

    /**
     * @param {object} d  { t, hr, spo2, pa, paOra, paMedia, ritmo }
     */
    aggiorna(d) {
      orologio.textContent = d.orologio || formatSeconds(d.t || 0);
      if (typeof d.spo2 === 'number') spo2Corrente = d.spo2;
      scriviRiquadro(hr, 'hr', d.hr, { attivo: collegato });
      scriviRiquadro(spo2, 'spo2', d.spo2, { attivo: Boolean(plethScope) });
      /* Sul dispositivo la sistolica è grande e la diastolica sta sotto:
         "92/56" su una riga sola non ci sta e veniva tagliato. */
      const [sist, dia] = String(d.pa || '').split('/');
      scriviRiquadro(nibp, 'nibp', d.pa ? sist : undefined, {
        attivo: Boolean(d.pa),
        ora: d.paOra || '',
        extra: dia ? `/ ${dia}` : '',
      });
      if (d.ritmo) this.setRitmo(d.ritmo, Number(d.hr) || undefined);

      /* l'allarme sonoro segue quello visivo: parte quando un riquadro
         va fuori limiti e tace appena rientra */
      const allarmato = Boolean(schermo.querySelector('.lp-allarmato'));
      if (allarmato && !inAllarme) { inAllarme = true; allarme('alta'); }
      else if (!allarmato && inAllarme) { inAllarme = false; fermaAllarme(); }
    },

    /** Da chiamare quando la misurazione della pressione si conclude. */
    segnalaNibp() { nibpConclusa(); },

    /** Segnala che un valore è appena cambiato: il riquadro lampeggia. */
    evidenzia(chiave) {
      const box = $(`.lp-${chiave}`, schermo);
      if (!box) return;
      box.classList.remove('lp-cambiato');
      // riavvia l'animazione
      void box.offsetWidth;
      box.classList.add('lp-cambiato');
    },

    distruggi() {
      fermaAllarme();
      inAllarme = false;
      scope?.destroy();
      plethScope?.destroy();
      scope = null; plethScope = null;
    },
  };
}
