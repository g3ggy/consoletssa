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

export const VERSIONE = '1.9.1';
export const DATA_VERSIONE = '21 agosto 2026';

/** Cosa è cambiato, dalla più recente. Le prime tre finiscono nel pannello. */
export const NOVITA = [
  { v: '1.9.1', t: 'Auto contro palo passa al motore a tempo. Il volante ferma il tronco ma non gli organi: arriva con ottocento millilitri già persi dentro l\'addome e la pressione che non lo dice — anzi sale, perché il dolore la spinge, mentre il differenziale si stringe e la frequenza corre. Poi il compenso cede di colpo. La dinamica non gliela chiedi a lui, che era dentro l\'urto: la sa chi ha visto. E se lo esponi, quella dinamica ce l\'ha scritta addosso.' },
  { v: '1.9.0', t: 'L\'ipoglicemico in strada passa al motore a tempo, ed è il primo caso in cui una finestra si chiude da sola: arriva a 55 di glicemia, ancora vigile, e lo zucchero per bocca si può ancora dare. Fra tre minuti no. I passanti dicono che è ubriaco — è la risposta sbagliata, e niente te lo segnala: la verità ce l\'ha lui in tasca, o nel glucometro. Gli scenari già convertiti non compaiono più due volte nella lista.' },
  { v: '1.8.1', t: 'Il monitor mostra i tre parametri che misura davvero: frequenza, saturazione e pressione. CO2 e temperatura erano due riquadri fermi a trattini — la temperatura si prende col timpanico e sta fra le rilevazioni, insieme a FR e glicemia. Ogni rilevazione ripetuta lampeggia e dice da quanto ce l\'hai, anche quando il numero non è cambiato: glicemia e temperatura si rifanno quando vuoi.' },
  { v: '1.8.0', t: 'L\'anamnesi si fa a domande. Le sei del SAMPLE si chiedono sempre, le sei dell\'OPQRST quando il paziente ha dolore, e ognuna costa il suo tempo. La stessa domanda dà risposte diverse a seconda di chi la riceve: il paziente confuso non è attendibile e nessuno te lo dice, e c\'è chi sa cose che lui non ricorda. È così che si scopre il betabloccante che teneva nascosto il compenso.' },
  { v: '1.7.0', t: 'Il paziente ha una fisiologia. Non peggiora più a ritmo fisso: compensa finché può — la pressione tiene mentre la cute impallidisce e il riempimento capillare si allunga — e poi scompensa. Se nessuno interviene arriva all\'arresto, e il ritmo con cui il cuore si ferma dipende dal perché si è fermato. I segni del compenso non compaiono da soli: vanno cercati, e ci sono tre azioni nuove per farlo.' },
  { v: '1.6.1', t: 'Il monitor non impazzisce più. L\'orologio dello scenario si ferma quando lasci la console in secondo piano, e i parametri non possono uscire dai valori compatibili con la vita: niente più frequenze a quattro cifre se ti dimentichi la scheda aperta.' },
  { v: '1.6.0', t: 'Monitor a cinque parametri come il LIFEPAK 15. Frequenza e saturazione non stanno più ferme: oscillano e derivano nel tempo, gli allarmi scattano da soli quando il valore esce dalle soglie. La pressione mostra da quanto è stata rilevata e va ripetuta.' },
  { v: '1.5.1', t: 'Toni del monitor tarati sulle frequenze reali, con banco di prova nel Monitor: battito, allarmi, carica, metronomo a 104.' },
  { v: '1.4.0', t: 'Monitor in stile LIFEPAK 15, ECG a 12 derivazioni stampabile, ragguaglio per esteso.' },
  { v: '1.3.0', t: 'Cinquanta domande del manuale nel ripasso, cartellino CO118, modello 3D fermo con viste comandate.' },
  { v: '1.2.0', t: 'Arrivo sul posto e inquadramento diversi per ogni scenario.' },
  { v: '1.1.0', t: 'Motore di intervento a turni: il paziente peggiora se non intervieni.' },
  { v: '1.0.0', t: 'Prima versione: manuale, corpo 3D, monitor, simulazioni, ripasso, progressi.' },
];
