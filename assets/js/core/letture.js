/* =====================================================================
   letture.js — quello che hai misurato, com'è scritto e da quanto.

   Logica pura: riceve le letture, il tempo e lo stato, e non tocca
   niente. Il monitor cambia le regole — quello che tiene sotto controllo
   di continuo non scade e non invecchia — ma «c'è il monitor?» lo decide
   il motore e lo passa come argomento: qui dentro non si sa cosa siano i
   tag.

   Stava dentro `sim-engine.js` insieme alla squadra, per la stessa
   ragione: quel file era a 855 righe contro le 800 del progetto.
   ===================================================================== */

/* Grandezze che il monitor tiene sotto controllo di continuo. */
export const CONTINUE = ['fc', 'spo2', 'ritmo'];

/* Quanto resta valida una rilevazione singola prima di essere rifatta. */
export const VALIDITA_LETTURA = 120;

/* Quante cifre dopo la virgola. Tutto il resto si arrotonda all'intero:
   una saturazione a 94,4 non esiste, sul display c'è 94. */
const DECIMALI = { temp: 1 };

/** Come si scrive un valore quando lo rilevi.

    La pressione è una STRINGA, `'128/78'`, e non un numero: è la
    trappola già pagata: un predicato che scrive `letture.pa < 90`
    confronta una stringa con un numero, non fallisce, e restituisce
    `false` per sempre in silenzio. Nel contesto del giudizio c'è `pas`
    come numero, ed è quello che i predicati usano. */
export function valoreGrezzo(chiave, s) {
  if (chiave === 'pa') return `${Math.round(s.pas)}/${Math.round(s.pad)}`;
  if (chiave === 'avpu') return s.coscienza;
  if (chiave === 'ritmo') return s.ritmo;
  if (chiave === 'polso') return s.polsoRadiale ? 'presente' : 'assente';
  if (chiave === 'refill') return `${s.refill} s`;
  if (chiave === 'cute') return ({
    normale: 'normale', pallida: 'pallida',
    'pallida-fredda-sudata': 'pallida, fredda, sudata',
  })[s.cute] || s.cute;
  if (chiave === 'sete') return s.sete ? 'ha sete' : 'no';
  const v = s[chiave];
  if (typeof v !== 'number') return v;
  const d = DECIMALI[chiave] ?? 0;
  return d ? Number(v.toFixed(d)) : Math.round(v);
}

const daMonitor = (chiave, conMonitor) => conMonitor && CONTINUE.includes(chiave);

/** Va rifatta? Quello che non hai mai misurato è scaduto per definizione. */
export function scaduta(chiave, letture = {}, t = 0, conMonitor = false) {
  if (daMonitor(chiave, conMonitor)) return false;
  const l = letture[chiave];
  if (!l) return true;
  return (t - l.t) > VALIDITA_LETTURA;
}

/** Il numero che leggi adesso. Col monitor attaccato le grandezze
    continue sono quelle di questo istante, non quelle che avevi scritto. */
export function valore(chiave, letture = {}, stato = {}, conMonitor = false) {
  if (daMonitor(chiave, conMonitor)) return valoreGrezzo(chiave, stato);
  return letture[chiave]?.val;
}

/** Da quanti secondi ce l'hai. `null` se non l'hai mai misurata, `0` se
    è il monitor a dirtela — quella è di adesso. */
export function eta(chiave, letture = {}, t = 0, conMonitor = false) {
  if (daMonitor(chiave, conMonitor)) return 0;
  const l = letture[chiave];
  return l ? t - l.t : null;
}
