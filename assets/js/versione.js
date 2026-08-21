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

export const VERSIONE = '1.6.1';
export const DATA_VERSIONE = '21 agosto 2026';

/** Cosa è cambiato, dalla più recente. Le prime tre finiscono nel pannello. */
export const NOVITA = [
  { v: '1.6.1', t: 'Il monitor non impazzisce più. L\'orologio dello scenario si ferma quando lasci la console in secondo piano, e i parametri non possono uscire dai valori compatibili con la vita: niente più frequenze a quattro cifre se ti dimentichi la scheda aperta.' },
  { v: '1.6.0', t: 'Monitor a cinque parametri come il LIFEPAK 15. Frequenza e saturazione non stanno più ferme: oscillano e derivano nel tempo, gli allarmi scattano da soli quando il valore esce dalle soglie. La pressione mostra da quanto è stata rilevata e va ripetuta.' },
  { v: '1.5.1', t: 'Toni del monitor tarati sulle frequenze reali, con banco di prova nel Monitor: battito, allarmi, carica, metronomo a 104.' },
  { v: '1.4.0', t: 'Monitor in stile LIFEPAK 15, ECG a 12 derivazioni stampabile, ragguaglio per esteso.' },
  { v: '1.3.0', t: 'Cinquanta domande del manuale nel ripasso, cartellino CO118, modello 3D fermo con viste comandate.' },
  { v: '1.2.0', t: 'Arrivo sul posto e inquadramento diversi per ogni scenario.' },
  { v: '1.1.0', t: 'Motore di intervento a turni: il paziente peggiora se non intervieni.' },
  { v: '1.0.0', t: 'Prima versione: manuale, corpo 3D, monitor, simulazioni, ripasso, progressi.' },
];
