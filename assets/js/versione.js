/* =====================================================================
   versione.js — un solo posto in cui sta scritto "che versione è".

   Serve a tre cose:
   · si legge in fondo alla barra laterale, così si capisce a colpo
     d'occhio se la console che si ha davanti è aggiornata;
   · il service worker la usa come nome della cache, quindi cambiarla
     butta via la copia vecchia;
   · se il numero mostrato non coincide con quello pubblicato, basta
     ricaricare.

   Quando si pubblica un aggiornamento si cambia SOLO questo file
   (e la stessa stringa in cima a sw.js).
   ===================================================================== */

export const VERSIONE = '1.4.0';
export const DATA_VERSIONE = '18 agosto 2026';

/** Cosa è cambiato, dalla più recente. Le prime tre finiscono nel pannello. */
export const NOVITA = [
  { v: '1.4.0', t: 'Monitor in stile LIFEPAK 15, ECG a 12 derivazioni stampabile, ragguaglio per esteso.' },
  { v: '1.3.0', t: 'Cinquanta domande del manuale nel ripasso, cartellino CO118, modello 3D fermo con viste comandate.' },
  { v: '1.2.0', t: 'Arrivo sul posto e inquadramento diversi per ogni scenario.' },
  { v: '1.1.0', t: 'Motore di intervento a turni: il paziente peggiora se non intervieni.' },
  { v: '1.0.0', t: 'Prima versione: manuale, corpo 3D, monitor, simulazioni, ripasso, progressi.' },
];
