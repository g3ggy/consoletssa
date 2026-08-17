/* =====================================================================
   manual.js — caricamento e cache del manuale in markdown.
   Il testo resta un file .md modificabile a mano: il sito lo legge a
   runtime, quindi aggiornare gli appunti non richiede toccare il codice.
   ===================================================================== */

import { parseManual } from './markdown.js';

const URL_MD = new URL('../../../content/manuale.md', import.meta.url).href;

let cache = null;
let pending = null;

export function loadManual() {
  if (cache) return Promise.resolve(cache);
  if (pending) return pending;

  pending = fetch(URL_MD)
    .then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status} sul file del manuale`);
      return res.text();
    })
    .then((text) => {
      cache = parseManual(text);
      return cache;
    })
    .catch((err) => {
      pending = null;
      throw new Error(
        `Non riesco a leggere content/manuale.md (${err.message}). `
        + 'Se stai aprendo i file con doppio clic, serve un server locale.',
      );
    });

  return pending;
}

export const manualCache = () => cache;
