/* =====================================================================
   azioni.js — catalogo delle azioni, condiviso da tutti gli scenari.

   Ogni azione dichiara: quanto dura, chi la può eseguire, che cosa
   richiede, che effetto ha e perché si fa. Gli scenari non ridefiniscono
   le azioni: si limitano a dire quali sono necessarie, quali utili e
   quali dannose per quel caso.

   Sul ruolo: il giocatore è un soccorritore TSSA. I farmaci li fa
   l'infermiere di bordo, e li fa sulla base di quello che gli riferisci.
   Le azioni marcate `chi: ['infermiere']` si possono solo richiedere.
   ===================================================================== */

export const CATEGORIE = [
  { id: 'scena', label: 'Scena', desc: 'Sicurezza, persone, richieste di supporto' },
  { id: 'A', label: 'A — vie aeree', desc: 'Pervietà e rachide cervicale' },
  { id: 'B', label: 'B — respiro', desc: 'Ossigeno, ventilazione, posizione' },
  { id: 'C', label: 'C — circolo', desc: 'Emorragie, monitor, RCP, DAE' },
  { id: 'D', label: 'D — coscienza', desc: 'AVPU, pupille, glicemia' },
  { id: 'E', label: 'E — esposizione', desc: 'Lesioni e temperatura' },
  { id: 'valutazione', label: 'Parametri', desc: 'Rilevazioni' },
  { id: 'immobilizzo', label: 'Immobilizzo', desc: 'Presidi e trasporto' },
  { id: 'comunicazione', label: 'Comunicazione', desc: 'Centrale, infermiere, paziente' },
  { id: 'infermiere', label: 'Infermiere', desc: 'Da richiedere: li esegue lui' },
];

/** Elenco piatto, poi indicizzato per id in fondo al file. */
const ELENCO = [
  /* ============================== SCENA ============================= */
  {
    id: 'dpi', cat: 'scena', label: 'Indossa i DPI', durata: 20, chi: ['tu', 'autista'],
    unaVolta: true, applica: () => ({ tag: 'dpi' }),
    diario: 'Guanti e occhiali indossati.',
    spiega: 'Prima di toccare chiunque. Il rischio infettivo non si vede.',
  },
  {
    id: 'valuta-scena', cat: 'scena', label: 'Valuta la scena e le vie di uscita',
    durata: 30, chi: ['tu'], unaVolta: true, applica: () => ({ tag: 'scena-valutata' }),
    diario: 'Scena valutata: rischi, accessi e vie di uscita.',
    spiega: 'Il passo zero di ogni intervento: un soccorritore non deve mai finire per essere soccorso.',
  },
  {
    id: 'allontana-curiosi', cat: 'scena', label: 'Allontana i curiosi', durata: 45,
    chi: ['tu', 'autista'], applica: () => ({ tag: 'scena-libera' }),
    diario: 'Curiosi allontanati, spazio liberato attorno al paziente.',
    spiega: 'Servono spazio per lavorare e riservatezza per il paziente.',
  },
  {
    id: 'gestisci-familiari', cat: 'scena', label: 'Prendi da parte i familiari', durata: 60,
    chi: ['tu', 'autista'], applica: () => ({ tag: 'familiari-gestiti' }),
    diario: 'Familiari accompagnati in un\'altra stanza e informati.',
    spiega: 'Toglierli dalla scena serve a loro e a te: si raccolgono meglio le informazioni.',
  },
  {
    id: 'chiedi-ffoo', cat: 'scena', label: 'Richiedi le forze dell\'ordine', durata: 20,
    chi: ['tu', 'autista'], unaVolta: true, applica: () => ({ tag: 'ffoo' }),
    diario: 'Richieste le forze dell\'ordine alla centrale.',
    spiega: 'Persone aggressive, situazioni sospette, sinistri con responsabilità da accertare.',
  },
  {
    id: 'chiedi-vvf', cat: 'scena', label: 'Richiedi i vigili del fuoco', durata: 20,
    chi: ['tu', 'autista'], unaVolta: true, applica: () => ({ tag: 'vvf' }),
    diario: 'Richiesti i vigili del fuoco.',
    spiega: 'Incastro, materiali instabili, rischio incendio o sostanze pericolose.',
  },
  {
    id: 'sposta-sicurezza', cat: 'scena', label: 'Sposta il paziente in zona sicura',
    durata: 90, chi: ['tu', 'autista'], unaVolta: true, applica: () => ({ tag: 'al-sicuro' }),
    diario: 'Paziente spostato lontano dalla fonte di pericolo.',
    spiega: 'Quando la causa continua ad agire, prima si toglie il paziente da lì, poi si tratta.',
  },

  /* ================================ A ============================== */
  {
    id: 'iperestensione', cat: 'A', label: 'Iperestensione del capo', durata: 15,
    chi: ['tu'], unaVolta: true,
    applica: () => ({ viePervie: true, tag: 'vie-aperte' }),
    diario: 'Capo iperesteso, vie aeree pervie.',
    spiega: 'Nel paziente incosciente la lingua cade indietro: è la prima causa di ostruzione.',
  },
  {
    id: 'sublussazione', cat: 'A', label: 'Sublussazione della mandibola', durata: 20,
    chi: ['tu'], unaVolta: true,
    applica: () => ({ viePervie: true, tag: 'vie-aperte' }),
    diario: 'Mandibola sublussata mantenendo l\'allineamento del rachide.',
    spiega: 'La manovra per aprire le vie aeree quando c\'è sospetto di trauma cervicale.',
  },
  {
    id: 'cannula', cat: 'A', label: 'Cannula orofaringea', durata: 25, chi: ['tu'],
    unaVolta: true, richiede: (p) => p.coscienza === 'P' || p.coscienza === 'U',
    motivoBloccato: 'Il paziente ha ancora il riflesso faringeo: la vomiterebbe.',
    applica: () => ({ viePervie: true, tag: 'cannula' }),
    diario: 'Cannula orofaringea posizionata.',
    spiega: 'Solo nel paziente senza riflesso faringeo, misurata dall\'incisivo all\'angolo mandibolare.',
  },
  {
    id: 'aspiratore-prepara', cat: 'A', label: 'Prepara l\'aspiratore', durata: 30,
    chi: ['tu', 'autista'], unaVolta: true, applica: () => ({ tag: 'aspiratore-pronto' }),
    diario: 'Aspiratore montato e pronto.',
    spiega: 'Averlo pronto prima che serva: quando serve, servono secondi.',
  },
  {
    id: 'aspira', cat: 'A', label: 'Aspira le secrezioni', durata: 40, chi: ['tu'],
    richiede: (p) => p.tag.includes('aspiratore-pronto'),
    motivoBloccato: 'L\'aspiratore non è ancora pronto.',
    applica: () => ({ viePervie: true, spo2: +2 }),
    diario: 'Cavo orale aspirato.',
    spiega: 'Gorgoglio uguale liquidi: si aspira in uscita, mai alla cieca in profondità.',
  },
  {
    id: 'collare', cat: 'A', label: 'Applica il collare cervicale', durata: 60,
    chi: ['tu', 'autista'], unaVolta: true, applica: () => ({ tag: 'collare' }),
    diario: 'Collare cervicale applicato, misura verificata.',
    spiega: 'Il rachide si protegge già dalla A. Uno tiene la testa, l\'altro monta il collare.',
  },

  /* ================================ B ============================== */
  {
    id: 'conta-fr', cat: 'B', label: 'Conta gli atti respiratori', durata: 30,
    chi: ['tu', 'autista'], rileva: 'fr',
    diario: (p) => `Frequenza respiratoria ${Math.round(p.fr)} atti/min.`,
    spiega: 'Si conta guardando il torace, senza annunciarlo: se sa di essere contato, cambia ritmo.',
  },
  {
    id: 'o2-occhialini', cat: 'B', label: 'Ossigeno con occhialini, 2-4 l/min', durata: 30,
    chi: ['tu', 'autista'], unaVolta: true,
    applica: () => ({ spo2: +2, tag: 'o2' }),
    diario: 'Ossigeno con occhialini nasali.',
    spiega: 'Flussi bassi quando la saturazione è appena sotto e il paziente respira bene.',
  },
  {
    id: 'o2-maschera', cat: 'B', label: 'Maschera semplice, 6-8 l/min', durata: 30,
    chi: ['tu', 'autista'], unaVolta: true,
    applica: () => ({ spo2: +3, tag: 'o2' }),
    diario: 'Ossigeno con maschera semplice.',
    spiega: 'Via di mezzo. Sotto i 5 l/min la maschera semplice fa rirespirare anidride carbonica.',
  },
  {
    id: 'o2-reservoir', cat: 'B', label: 'Maschera con reservoir, 12-15 l/min', durata: 40,
    chi: ['tu', 'autista'], unaVolta: true,
    applica: () => ({ spo2: +5, tag: 'o2' }),
    diario: 'Ossigeno ad alti flussi con reservoir.',
    spiega: 'Quadro critico o saturazione bassa: si parte alti e si scende, non il contrario.',
  },
  {
    id: 'pallone', cat: 'B', label: 'Ventila con pallone-maschera', durata: 45, chi: ['tu'],
    richiede: (p) => p.coscienza === 'U' || p.respiro.tipo === 'gasping' || p.respiro.tipo === 'assente',
    motivoBloccato: 'Il paziente respira da solo: ventilarlo adesso non serve.',
    applica: () => ({ spo2: +6, tag: 'ventilazione' }),
    diario: 'Ventilazione con pallone-maschera, due operatori.',
    spiega: 'In arresto o in respiro inefficace. Meglio in due: uno tiene la maschera, uno spreme.',
  },
  {
    id: 'posizione-seduta', cat: 'B', label: 'Posizione seduta o semiseduta', durata: 25,
    chi: ['tu', 'autista'], unaVolta: true,
    richiede: (p) => p.coscienza === 'A' || p.coscienza === 'V',
    motivoBloccato: 'Non è cosciente abbastanza per stare seduto.',
    applica: () => ({ spo2: +2, tag: 'seduta' }),
    diario: 'Paziente messo in posizione semiseduta.',
    spiega: 'Alleggerisce il cuore e facilita l\'espansione del torace: dolore toracico e dispnea.',
  },

  /* ================================ C ============================== */
  {
    id: 'monitor', cat: 'C', label: 'Collega il monitor multiparametrico', durata: 45,
    chi: ['tu', 'autista'], unaVolta: true, applica: () => ({ tag: 'monitor' }),
    diario: 'Monitor collegato: traccia, frequenza e saturazione in continuo.',
    spiega: 'Da qui in poi frequenza e saturazione si aggiornano da sole. La pressione no.',
  },
  {
    id: 'misura-pa', cat: 'valutazione', label: 'Misura la pressione', durata: 40,
    chi: ['tu', 'autista'], rileva: 'pa',
    diario: (p) => `Pressione ${Math.round(p.pas)}/${Math.round(p.pad)} mmHg.`,
    spiega: 'La sistolica sotto 100 orienta, sotto 90 è shock conclamato.',
  },
  {
    id: 'polso-radiale', cat: 'valutazione', label: 'Cerca il polso radiale', durata: 15,
    chi: ['tu'], rileva: 'polso',
    diario: (p) => (p.polsoRadiale ? 'Polso radiale presente.' : 'Polso radiale assente: cerco il carotideo.'),
    spiega: 'Radiale assente e carotideo presente: la pressione è già molto bassa.',
  },
  {
    id: 'compressione', cat: 'C', label: 'Compressione diretta dell\'emorragia', durata: 30,
    chi: ['tu'], unaVolta: true, applica: () => ({ tag: 'emostasi' }),
    diario: 'Compressione diretta sulla ferita.',
    spiega: 'La X di X-ABCDE: un\'emorragia massiva si ferma prima di ogni altra cosa.',
  },
  {
    id: 'laccio', cat: 'C', label: 'Applica il laccio emostatico', durata: 60, chi: ['tu'],
    unaVolta: true, applica: () => ({ tag: 'emostasi' }),
    diario: 'Laccio emostatico applicato, ora annotata.',
    spiega: 'Quando la compressione non basta. Si stringe finché smette, e si segna l\'ora.',
  },
  {
    id: 'antishock', cat: 'C', label: 'Posizione antishock', durata: 30, chi: ['tu', 'autista'],
    unaVolta: true,
    richiede: (p) => p.respiro.tipo !== 'dispnea',
    motivoBloccato: 'È dispnoico: sdraiarlo peggiorerebbe il respiro.',
    applica: () => ({ tag: 'antishock' }),
    diario: 'Supino con gli arti inferiori sollevati.',
    spiega: 'Favorisce il ritorno venoso quando la pressione è crollata.',
  },
  {
    id: 'coperta', cat: 'C', label: 'Coperta isotermica', durata: 25, chi: ['tu', 'autista'],
    unaVolta: true, applica: () => ({ tag: 'coperta' }),
    diario: 'Paziente coperto.',
    spiega: 'L\'ipotermia peggiora ogni shock e la coagulazione. Costa venti secondi.',
  },
  {
    id: 'rcp', cat: 'C', label: 'Inizia le compressioni toraciche', durata: 30,
    chi: ['tu', 'autista'], unaVolta: true,
    richiede: (p) => p.tag.includes('arresto'),
    motivoBloccato: 'Il paziente ha polso: non si comprime.',
    applica: () => ({ tag: 'rcp' }),
    diario: 'Compressioni toraciche iniziate, 100-120 al minuto.',
    spiega: 'Subito, forte, al centro del torace. Il cambio ogni due minuti.',
  },
  {
    id: 'dae-piastre', cat: 'C', label: 'Attacca le piastre del DAE', durata: 40,
    chi: ['tu', 'autista'], unaVolta: true,
    applica: () => ({ tag: 'dae' }),
    diario: 'Piastre del DAE applicate.',
    spiega: 'Torace asciutto, niente cerotti né pacemaker sotto le piastre.',
  },
  {
    id: 'dae-scarica', cat: 'C', label: 'Analizza il ritmo ed eroga la scarica', durata: 25,
    chi: ['tu', 'autista'],
    richiede: (p) => p.tag.includes('dae') && p.tag.includes('arresto'),
    motivoBloccato: 'Servono le piastre applicate e un paziente in arresto.',
    diario: 'Analisi in corso, nessuno tocca il paziente, scarica erogata.',
    spiega: 'Ogni minuto senza scarica vale il 7-10% di probabilità in meno.',
  },

  /* -------------------- assistenza all'infermiere ------------------- */
  {
    id: 'accesso-prepara', cat: 'C', label: 'Prepara il materiale per l\'accesso venoso',
    durata: 45, chi: ['tu', 'autista'], unaVolta: true, applica: () => ({ tag: 'ev-pronto' }),
    diario: 'Laccio, agocannula, cerotto e deflussore pronti sul telo.',
    spiega: 'Il soccorritore non punge, ma può far trovare tutto pronto: sono minuti guadagnati.',
  },
  {
    id: 'flebo-monta', cat: 'C', label: 'Monta la flebo', durata: 40, chi: ['tu', 'autista'],
    unaVolta: true, applica: () => ({ tag: 'flebo-pronta' }),
    diario: 'Deflussore innestato e camera riempita.',
    spiega: 'Si monta e si spurga l\'aria prima che serva.',
  },
  {
    id: 'ecg-elettrodi', cat: 'C', label: 'Posiziona gli elettrodi per l\'ECG a 12 derivazioni',
    durata: 60, chi: ['tu', 'autista'], unaVolta: true, applica: () => ({ tag: 'ecg' }),
    diario: 'Elettrodi posizionati per l\'ECG a dodici derivazioni.',
    spiega: 'Nel dolore toracico il tracciato precoce cambia la destinazione del paziente.',
  },

  /* ================================ D ============================== */
  {
    id: 'avpu', cat: 'D', label: 'Valuta lo stato di coscienza (AVPU)', durata: 15,
    chi: ['tu'], rileva: 'avpu',
    diario: (p) => `Stato di coscienza: ${p.coscienza}.`,
    spiega: 'Alert · Vocal · Painful · Unresponsive. Va rivalutato, non fotografato una volta.',
  },
  {
    id: 'pupille', cat: 'D', label: 'Controlla le pupille', durata: 20, chi: ['tu'],
    rileva: 'pupille',
    diario: 'Pupille controllate: dimensione, simmetria e reattività alla luce.',
    spiega: 'Miosi serrata orienta agli oppiacei, midriasi fissa a un danno grave.',
  },
  {
    id: 'misura-glicemia', cat: 'D', label: 'Misura la glicemia', durata: 30, chi: ['tu'],
    rileva: 'glicemia',
    diario: (p) => `Glicemia ${Math.round(p.glicemia)} mg/dl.`,
    spiega: 'Davanti a qualunque alterazione della coscienza, sempre. Costa trenta secondi.',
  },
  {
    id: 'zucchero-os', cat: 'D', label: 'Zucchero per bocca', durata: 40, chi: ['tu'],
    unaVolta: true,
    richiede: (p, ctx) => p.coscienza === 'A' && ctx.haLettura('glicemia'),
    motivoBloccato: (p, ctx) => (ctx.haLettura('glicemia')
      ? 'Non è abbastanza vigile per deglutire in sicurezza.'
      : 'Prima misura la glicemia: senza quel numero non sai cosa stai correggendo.'),
    applica: () => ({ glicemia: +45, tag: 'zucchero' }),
    diario: 'Zucchero somministrato per via orale.',
    spiega: 'Solo al paziente vigile e in grado di deglutire. Mai a chi non è sveglio.',
  },
  {
    id: 'autoiniettore', cat: 'D', label: 'Aiuta il paziente col suo autoiniettore',
    durata: 45, chi: ['tu'], unaVolta: true,
    richiede: (p) => p.tag.includes('ha-autoiniettore'),
    motivoBloccato: 'Il paziente non ha con sé un autoiniettore.',
    applica: () => ({ pas: +25, spo2: +5, tag: 'adrenalina' }),
    diario: 'Autoiniettore di adrenalina somministrato nella faccia laterale della coscia.',
    spiega: 'È il farmaco del paziente: il soccorritore lo assiste nell\'autosomministrazione.',
  },

  /* ================================ E ============================== */
  {
    id: 'esposizione', cat: 'E', label: 'Esponi e cerca le lesioni', durata: 60, chi: ['tu'],
    unaVolta: true, applica: () => ({ tag: 'esposto' }),
    diario: 'Paziente esposto e ispezionato: nessuna lesione sfuggita.',
    spiega: 'Quello che non guardi non lo trovi. Poi lo copri subito.',
  },
  {
    id: 'misura-temp', cat: 'valutazione', label: 'Misura la temperatura', durata: 30,
    chi: ['tu', 'autista'], rileva: 'temp',
    diario: (p) => `Temperatura ${p.temp.toFixed(1)} °C.`,
    spiega: 'Febbre, ipotermia da permanenza a terra, colpo di calore.',
  },
  {
    id: 'copri', cat: 'E', label: 'Copri il paziente', durata: 20, chi: ['tu', 'autista'],
    unaVolta: true, applica: () => ({ tag: 'coperta' }),
    diario: 'Paziente coperto e protetto dal freddo.',
    spiega: 'Dopo l\'esposizione, sempre. Anche d\'estate, anche al chiuso.',
  },

  /* =========================== IMMOBILIZZO ========================== */
  {
    id: 'spinale', cat: 'immobilizzo', label: 'Tavola spinale', durata: 180,
    chi: ['tu', 'autista'], unaVolta: true, applica: () => ({ tag: 'immobilizzato' }),
    diario: 'Paziente immobilizzato su tavola spinale con fermacapo e cinghiaggi.',
    spiega: 'Serve la squadra intera e serve tempo: si decide se farlo, non si fa per abitudine.',
  },
  {
    id: 'ked', cat: 'immobilizzo', label: 'Estricatore KED', durata: 240,
    chi: ['tu', 'autista'], unaVolta: true, applica: () => ({ tag: 'immobilizzato' }),
    diario: 'KED posizionato, paziente estricato dall\'abitacolo.',
    spiega: 'Per l\'estricazione dal veicolo del paziente stabile. Se è instabile, estricazione rapida.',
  },
  {
    id: 'cucchiaio', cat: 'immobilizzo', label: 'Barella a cucchiaio', durata: 120,
    chi: ['tu', 'autista'], unaVolta: true, applica: () => ({ tag: 'caricato' }),
    diario: 'Paziente sollevato con la barella a cucchiaio.',
    spiega: 'Solleva senza far rotolare il paziente: si aggancia sotto, da entrambi i lati.',
  },
  {
    id: 'materassino', cat: 'immobilizzo', label: 'Materassino a depressione', durata: 150,
    chi: ['tu', 'autista'], unaVolta: true, applica: () => ({ tag: 'immobilizzato' }),
    diario: 'Materassino a depressione modellato e aspirato.',
    spiega: 'Più confortevole della tavola per i trasporti lunghi e per gli anziani.',
  },
  {
    id: 'steccobenda', cat: 'immobilizzo', label: 'Steccobenda sull\'arto', durata: 90,
    chi: ['tu', 'autista'], applica: () => ({ dolore: -2 }),
    diario: 'Arto immobilizzato con steccobenda, polso distale ricontrollato.',
    spiega: 'Si immobilizza l\'articolazione sopra e sotto, e si ricontrolla il polso dopo.',
  },
  {
    id: 'fasciatura', cat: 'immobilizzo', label: 'Medica e fascia la ferita', durata: 60,
    chi: ['tu', 'autista'], diario: 'Ferita medicata e fasciata.',
    spiega: 'Copertura sterile, fasciatura non costrittiva.',
  },
  {
    id: 'telo', cat: 'immobilizzo', label: 'Sposta col telo portaferiti', durata: 90,
    chi: ['tu', 'autista'], unaVolta: true, applica: () => ({ tag: 'caricato' }),
    diario: 'Paziente spostato con il telo.',
    spiega: 'Per spazi stretti e scale, quando la barella non passa.',
  },
  {
    id: 'sacchetto-vomito', cat: 'immobilizzo', label: 'Dai il sacchetto per il vomito',
    durata: 15, chi: ['tu', 'autista'], diario: 'Sacchetto consegnato al paziente.',
    spiega: 'Piccolo gesto, grande differenza per il paziente e per il mezzo.',
  },
  {
    id: 'carica', cat: 'immobilizzo', label: 'Carica in ambulanza e parti', durata: 120,
    chi: ['tu', 'autista'], unaVolta: true, applica: () => ({ tag: 'in-viaggio' }),
    diario: 'Paziente caricato, mezzo in movimento verso l\'ospedale.',
    spiega: 'Il trasporto è una terapia: sul territorio non si risolve tutto.',
  },

  /* ========================== COMUNICAZIONE ========================= */
  {
    id: 'rassicura', cat: 'comunicazione', label: 'Parla col paziente e lo rassicuri',
    durata: 30, chi: ['tu'], applica: () => ({ dolore: -1, tag: 'rassicurato' }),
    diario: 'Ti presenti, spieghi cosa stai facendo, resti col paziente.',
    spiega: 'L\'udito è l\'ultimo senso che se ne va. Rassicurare fa parte del soccorso.',
  },
  {
    id: 'allerta-co', cat: 'comunicazione', label: 'Allerta la centrale operativa', durata: 30,
    chi: ['tu', 'autista'], unaVolta: true, applica: () => ({ tag: 'co-allertata' }),
    diario: 'Centrale allertata con il quadro aggiornato.',
    spiega: 'Pressione sotto 90, frequenza sopra 120, coscienza alterata, causa non dominabile.',
  },
  {
    id: 'richiedi-automedica', cat: 'comunicazione', label: 'Richiedi l\'automedica', durata: 25,
    chi: ['tu', 'autista'], unaVolta: true, applica: () => ({ tag: 'als-richiesta' }),
    diario: 'Automedica richiesta e in arrivo.',
    spiega: 'Quando serve un medico o una terapia che a bordo non c\'è.',
  },
  {
    id: 'riferisci-infermiere', cat: 'comunicazione', label: 'Riferisci il quadro all\'infermiere',
    durata: 45, chi: ['tu'], applica: () => ({ tag: 'riferito' }),
    diario: 'Riferisci all\'infermiere: chi è, cosa è successo, parametri e prestazioni.',
    spiega: 'L\'infermiere decide sui dati che gli porti tu. È il ragguaglio, dentro l\'intervento.',
  },

  /* ============================ INFERMIERE ========================== */
  {
    id: 'inf-accesso', cat: 'infermiere', label: 'Accesso venoso', durata: 90,
    chi: ['infermiere'], unaVolta: true,
    richiede: (p, ctx) => ctx.haFatto('accesso-prepara'),
    motivoBloccato: 'L\'infermiere ti chiede il materiale: preparalo prima.',
    applica: () => ({ tag: 'ev' }),
    diario: 'Accesso venoso reperito.',
    spiega: 'Tu prepari e assisti; il gesto è suo.',
  },
  {
    id: 'inf-liquidi', cat: 'infermiere', label: 'Infusione di liquidi', durata: 60,
    chi: ['infermiere'], unaVolta: true,
    richiede: (p) => p.tag.includes('ev'),
    motivoBloccato: 'Serve prima un accesso venoso.',
    applica: () => ({ pas: +18, tag: 'liquidi' }),
    diario: 'Infusione di cristalloidi avviata.',
    spiega: 'Riempie il contenitore quando il problema è volume.',
  },
  {
    id: 'inf-adrenalina', cat: 'infermiere', label: 'Adrenalina intramuscolo', durata: 40,
    chi: ['infermiere'], unaVolta: true,
    richiede: (p, ctx) => ctx.haFatto('riferisci-infermiere'),
    motivoBloccato: 'L\'infermiere non sa ancora cosa ha davanti: riferiscigli il quadro.',
    applica: () => ({ pas: +30, spo2: +6, tag: 'adrenalina' }),
    diario: 'Adrenalina somministrata intramuscolo.',
    spiega: 'Il farmaco dell\'anafilassi. Il cortisone nell\'acuto arriva troppo tardi.',
  },
  {
    id: 'inf-naloxone', cat: 'infermiere', label: 'Naloxone', durata: 40, chi: ['infermiere'],
    unaVolta: true,
    richiede: (p, ctx) => ctx.haFatto('riferisci-infermiere'),
    motivoBloccato: 'Riferisci prima il quadro: pupille, respiro e circostanze.',
    applica: () => ({ coscienza: 'V', respiro: { tipo: 'normale', fr: 14 }, spo2: +8, tag: 'naloxone' }),
    diario: 'Naloxone somministrato: il respiro riprende.',
    spiega: 'Antagonista degli oppiacei. Dura meno dell\'oppiaceo: il paziente va comunque portato.',
  },
  {
    id: 'inf-glucosata', cat: 'infermiere', label: 'Glucosata endovena', durata: 50,
    chi: ['infermiere'], unaVolta: true,
    richiede: (p, ctx) => p.tag.includes('ev') && ctx.haLettura('glicemia'),
    motivoBloccato: (p, ctx) => (ctx.haLettura('glicemia')
      ? 'Serve prima un accesso venoso.'
      : 'L\'infermiere ti chiede la glicemia prima di somministrarla.'),
    applica: () => ({ glicemia: +60, coscienza: 'A', tag: 'glucosata' }),
    diario: 'Glucosata endovena: il paziente si riprende.',
    spiega: 'Per l\'ipoglicemico che non può deglutire.',
  },
];

export const AZIONI = Object.fromEntries(ELENCO.map((a) => [a.id, a]));
export const AZIONI_ELENCO = ELENCO;

/** Azioni di una categoria, nell'ordine in cui sono scritte. */
export const azioniDi = (cat) => ELENCO.filter((a) => a.cat === cat);
