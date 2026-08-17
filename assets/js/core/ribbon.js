/* =====================================================================
   ribbon.js — la striscia ECG in cima all'applicazione.
   Vive per tutta la sessione: i moduli possono cambiarne il ritmo per
   accompagnare quello che stanno mostrando.
   ===================================================================== */

import { createScope, RHYTHMS } from './waveform.js';
import { $ } from './dom.js';

let scope = null;
let tagEl = null;

export function initRibbon(canvas, tag) {
  tagEl = tag;
  scope = createScope(canvas, { kind: 'sinusale', speed: 165, amp: 0.72, grid: false });
  setRibbonRhythm('sinusale');
  return scope;
}

export function setRibbonRhythm(key) {
  if (!scope || !RHYTHMS[key]) return;
  scope.setRhythm(key);
  if (tagEl) {
    const b = $('b', tagEl);
    if (b) b.textContent = RHYTHMS[key].short.toLowerCase();
  }
}

export const ribbonRhythm = () => scope?.kind || 'sinusale';
