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

import { VOCI_PRESIDI } from './presidi.js';

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
  { id: 'infermiere', label: 'Sanitario', desc: 'Decide lui, sulla base del quadro che gli riferisci' },
  { id: 'anamnesi', label: 'Anamnesi', desc: 'Domande al paziente e a chi c\'è' },
];

/** Elenco piatto, poi indicizzato per id in fondo al file. */
const ELENCO = [
  /* ============================== SCENA ============================= */
  {
    /* Non è una scelta: i DPI li mette tutto l'equipaggio, sempre. Finché
       il banco chiedeva CHI li indossa, insegnava che qualcuno può non
       metterli. */
    id: 'dpi', cat: 'scena', label: 'Indossa i DPI', durata: 20,
    chi: ['tu', 'autista', 'infermiere'], tuttaLaSquadra: true,
    unaVolta: true, applica: () => ({ tag: 'dpi' }),
    diario: 'Guanti e occhiali indossati da tutto l\'equipaggio.',
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
    chi: ['tu', 'autista'],
    /* Una volta liberato lo spazio è liberato: rifarlo non aggiunge
       niente e occupa una persona per quarantacinque secondi. Il
       guardiano è il tag che lascia, come per i presidi. */
    richiede: (p) => !p.tag.includes('scena-libera'),
    motivoBloccato: 'Lo spazio attorno al paziente è già libero.',
    applica: () => ({ tag: 'scena-libera' }),
    diario: 'Curiosi allontanati, spazio liberato attorno al paziente.',
    spiega: 'Servono spazio per lavorare e riservatezza per il paziente.',
  },
  {
    id: 'gestisci-familiari', cat: 'scena', label: 'Prendi da parte i familiari', durata: 60,
    chi: ['tu', 'autista'],
    /* Stesso guardiano dei curiosi: presi da parte una volta, sono presi
       da parte. */
    richiede: (p) => !p.tag.includes('familiari-gestiti'),
    motivoBloccato: 'I familiari sono già stati presi da parte.',
    applica: () => ({ tag: 'familiari-gestiti' }),
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
    /* «Se ci troviamo in strada od in luoghi pubblici, cerchiamo tra i
       documenti della persona targhette o cartellini, medagliette o
       quant'altro che attestino che il paziente soffra di malattia
       cronica» — Bolognin :4299. In casa te lo dicono i familiari; per
       strada te lo dice il portafogli, o non te lo dice nessuno. */
    id: 'cerca-documenti', cat: 'scena', label: 'Cerca documenti e tessere sanitarie',
    durata: 40, chi: ['tu', 'autista'], unaVolta: true,
    diario: 'Cerchi nelle tasche e nel portafogli: documenti, tessere, schemi di terapia.',
    spiega: 'Per strada non c\'è un familiare che risponda. Una tessera di malattia cronica o uno schema di terapia valgono un\'anamnesi, e stanno in tasca al paziente.',
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

  /* Le sei Guedel e i quattro sondini stanno in `presidi.js`: sono
     generati, perché scrivere sei volte la stessa azione con un numero
     diverso è il modo migliore per farne divergere cinque. */
  {
    id: 'aspiratore-prepara', cat: 'A', label: 'Prepara l\'aspiratore', durata: 30,
    chi: ['tu', 'autista'], unaVolta: true, applica: () => ({ tag: 'aspiratore-pronto' }),
    diario: 'Aspiratore montato e pronto.',
    spiega: 'Averlo pronto prima che serva: quando serve, servono secondi.',
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
    /* Il pallone-maschera si fa in due: uno tiene la maschera aderente con
       due mani, l'altro spreme. L'autista deve poter essere il secondo. */
    id: 'pallone', cat: 'B', label: 'Ventila con pallone-maschera', durata: 45,
    chi: ['tu', 'autista'], servono: 2,
    richiede: (p) => p.coscienza === 'U' || p.respiro.tipo === 'gasping' || p.respiro.tipo === 'assente',
    motivoBloccato: 'Il paziente respira da solo: ventilarlo adesso non serve.',
    applica: () => ({ tag: 'pallone' }),
    diario: 'Ventilazione con pallone-maschera, due operatori.',
    spiega: 'In arresto o in respiro inefficace. Meglio in due: uno tiene la maschera, uno spreme.',
  },
  {
    id: 'posizione-seduta', cat: 'B', label: 'Posizione seduta o semiseduta', durata: 25,
    chi: ['tu', 'autista'], unaVolta: true,
    richiede: (p) => p.coscienza === 'A' || p.coscienza === 'V',
    motivoBloccato: 'Non è cosciente abbastanza per stare seduto.',
    applica: () => ({ tag: 'seduta' }),
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
    id: 'refill', cat: 'valutazione', label: 'Test del riempimento capillare',
    durata: 15, chi: ['tu'], rileva: 'refill',
    /* Quindici secondi per un segno che arriva molto prima che la
       pressione si muova. Si preme sull'unghia cinque secondi tenendo
       la mano più in alto del cuore, e si conta quanto ci mette a
       tornare il colore. Normale sotto i due secondi — Bolognin :6489. */
    diario: (p) => `Riempimento capillare ${p.refill} secondi.`,
    spiega: 'Sopra i due secondi la periferia è vasocostretta: il paziente sta compensando, anche se la pressione è ancora buona.',
  },
  {
    id: 'colorito', cat: 'valutazione', label: 'Guarda il colorito e tocca la cute',
    durata: 10, chi: ['tu'], rileva: 'cute',
    diario: 'Guardi il colorito e tocchi la fronte e le mani.',
    spiega: 'Pallore, cute fredda e sudorazione algida sono vasocostrizione: il sangue viene tolto alla pelle per darlo agli organi nobili.',
  },
  {
    id: 'chiedi-sete', cat: 'valutazione', label: 'Chiedigli se ha sete',
    durata: 10, chi: ['tu'], rileva: 'sete',
    diario: (p) => (p.sete ? 'Dice che ha sete.' : 'Dice di no.'),
    spiega: 'Il senso di sete è un segno di shock che il paziente riferisce da solo, se glielo chiedi.',
  },
  {
    id: 'polso-radiale', cat: 'valutazione', label: 'Cerca il polso radiale', durata: 15,
    chi: ['tu'], rileva: 'polso',
    diario: (p) => (p.polsoRadiale ? 'Polso radiale presente.' : 'Polso radiale assente: cerco il carotideo.'),
    spiega: 'Radiale assente e carotideo presente: la pressione è già molto bassa.',
  },
  {
    id: 'compressione', cat: 'C', label: 'Compressione diretta dell\'emorragia', durata: 30,
    chi: ['tu'], unaVolta: true, applica: () => ({ tag: 'compressione' }),
    diario: 'Compressione diretta sulla ferita.',
    spiega: 'La X di X-ABCDE: un\'emorragia massiva si ferma prima di ogni altra cosa.',
  },
  {
    id: 'laccio', cat: 'C', label: 'Applica il laccio emostatico', durata: 60, chi: ['tu'],
    unaVolta: true, applica: () => ({ tag: 'laccio' }),
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
  {
    id: 'ecg-esegui', cat: 'C', label: 'Esegui e stampa l\'ECG a 12 derivazioni',
    durata: 45, chi: ['tu', 'autista'], unaVolta: true,
    richiede: (p) => p.tag.includes('ecg'),
    motivoBloccato: 'Prima vanno posizionati gli elettrodi.',
    applica: () => ({ tag: 'ecg-fatto' }),
    diario: 'Acquisito e stampato il tracciato a dodici derivazioni.',
    spiega: 'Il tracciato si stampa e si porta: in ospedale confrontano il vostro con quello nuovo.',
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
    diario: (p) => (p.pupille === 'midriatiche'
      ? 'Le pupille sono larghe tutte e due e reagiscono poco alla luce: midriasi bilaterale.'
      : 'Pupille isocoriche e normoreagenti alla luce.'),
    spiega: 'Miosi serrata orienta agli oppiacei, midriasi fissa a un danno grave.',
  },
  {
    /* I tre segni sono quelli del Bolognin :4112-4125: far sorridere o
       mostrare i denti, far tenere le braccia estese dieci secondi a
       occhi chiusi, far ripetere una frase. «L'alterazione di ciascuno
       dei tre segni è fortemente suggestiva per un ictus.» In inglese
       lo stesso schema è il FAST, dove la T sta per Time.

       Il catalogo dice cosa fai; cosa trovi lo dice il caso con
       `diarioAzioni`, perché il deficit è di questo paziente e non
       della fisiologia. Non è `unaVolta`: in viaggio si ricontrolla. */
    id: 'esame-neurologico', cat: 'D', label: 'Esame neurologico rapido',
    durata: 30, chi: ['tu'],
    diario: 'Le chiedi di sorridere, di tenere le braccia avanti a occhi chiusi, di ripetere una frase.',
    spiega: 'Faccia, braccia, linguaggio. Basta che uno dei tre sia alterato. E serve anche a escludere: l\'ipoglicemia imita l\'ictus in tutto.',
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
    applica: () => ({ tag: 'zucchero' }),
    diario: 'Zucchero somministrato per via orale.',
    spiega: 'Solo al paziente vigile e in grado di deglutire. Mai a chi non è sveglio.',
  },
  {
    id: 'autoiniettore', cat: 'D', label: 'Aiuta il paziente col suo autoiniettore',
    durata: 45, chi: ['tu'], unaVolta: true,
    richiede: (p) => p.tag.includes('ha-autoiniettore'),
    motivoBloccato: 'Il paziente non ha con sé un autoiniettore.',
    applica: () => ({ tag: 'adrenalina' }),
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
    /* Le manovre che non esistono da soli. `servono` dice quante persone
     occupa il gesto: senza, vale una. Fino a oggi `chi: ['tu','autista']`
     significava «la può fare uno dei due», e la tavola spinale nel banco
     la metteva una persona sola. */
    id: 'spinale', cat: 'immobilizzo', label: 'Tavola spinale', durata: 180,
    chi: ['tu', 'autista'], servono: 2, unaVolta: true, applica: () => ({ tag: 'immobilizzato' }),
    diario: 'Paziente immobilizzato su tavola spinale con fermacapo e cinghiaggi.',
    spiega: 'Serve la squadra intera e serve tempo: si decide se farlo, non si fa per abitudine.',
  },
  {
    id: 'ked', cat: 'immobilizzo', label: 'Estricatore KED', durata: 240,
    chi: ['tu', 'autista'], servono: 2, unaVolta: true, applica: () => ({ tag: 'immobilizzato' }),
    diario: 'KED posizionato, paziente estricato dall\'abitacolo.',
    spiega: 'Per l\'estricazione dal veicolo del paziente stabile. Se è instabile, estricazione rapida.',
  },
  {
    id: 'cucchiaio', cat: 'immobilizzo', label: 'Barella a cucchiaio', durata: 120,
    chi: ['tu', 'autista'], servono: 2, unaVolta: true, applica: () => ({ tag: 'caricato' }),
    diario: 'Paziente sollevato con la barella a cucchiaio.',
    spiega: 'Solleva senza far rotolare il paziente: si aggancia sotto, da entrambi i lati.',
  },
  {
    id: 'materassino', cat: 'immobilizzo', label: 'Materassino a depressione', durata: 150,
    chi: ['tu', 'autista'], servono: 2, unaVolta: true, applica: () => ({ tag: 'immobilizzato' }),
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
    chi: ['tu', 'autista'], servono: 2, unaVolta: true, applica: () => ({ tag: 'caricato' }),
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
    /* Il capitolo 33 non dice cosa chiedere: dice COME, e la differenza
       è tutta lì. «Ascolta, perdonami la domanda. Non sono una guardia,
       a me non interessa. Ma per il tuo bene: hai fatto uso di
       qualcosa?» — e va fatta in disparte, senza amici o familiari
       presenti. A quel punto spesso arriva una verità che il paziente
       non aveva detto a nessun altro. */
    id: 'parla-in-disparte', cat: 'comunicazione',
    label: 'Parla col paziente in disparte', durata: 40, chi: ['tu'],
    unaVolta: true,
    richiede: (p) => p.coscienza === 'A',
    motivoBloccato: 'Non è abbastanza presente per una conversazione riservata.',
    applica: () => ({ tag: 'in-disparte' }),
    diario: 'Ti allontani di qualche passo con lui, fuori dalla portata degli altri.',
    spiega: 'Non siete forze dell\'ordine, e va detto esplicitamente: «non sono una guardia, a me non interessa». Serve a curarlo, non a incastrarlo: in ospedale le analisi lo direbbero comunque, chiederlo adesso guadagna tempo clinico.',
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
    id: 'inf-accesso', cat: 'infermiere', label: 'Fa reperire un accesso venoso', durata: 90,
    chi: ['infermiere'], unaVolta: true,
    /* Non conta quale calibro hai preparato: conta che il materiale sia
       sul telo. Il calibro sbagliato lo dice l'indicazione, non un
       blocco — `richiede` impedisce, e qui non c'è niente da impedire. */
    richiede: (p) => p.tag.includes('ev-pronto'),
    motivoBloccato: 'L\'infermiere ti chiede il materiale: preparalo prima.',
    applica: () => ({ tag: 'ev' }),
    diario: 'Accesso venoso reperito.',
    spiega: 'Tu prepari e assisti; il gesto è suo.',
  },
  {
    id: 'inf-liquidi', cat: 'infermiere', label: 'Avvia l\'infusione di liquidi', durata: 60,
    chi: ['infermiere'], unaVolta: true,
    richiede: (p) => p.tag.includes('ev'),
    motivoBloccato: 'Serve prima un accesso venoso.',
    applica: () => ({ tag: 'liquidi' }),
    diario: 'Infusione di cristalloidi avviata.',
    spiega: 'Riempie il contenitore quando il problema è volume.',
  },
  {
    id: 'inf-adrenalina', cat: 'infermiere', label: 'Somministra adrenalina intramuscolo', durata: 40,
    chi: ['infermiere'], unaVolta: true,
    richiede: (p, ctx) => ctx.haFatto('riferisci-infermiere'),
    motivoBloccato: 'L\'infermiere non sa ancora cosa ha davanti: riferiscigli il quadro.',
    applica: () => ({ tag: 'adrenalina' }),
    diario: 'Adrenalina somministrata intramuscolo.',
    spiega: 'Il farmaco dell\'anafilassi. Il cortisone nell\'acuto arriva troppo tardi.',
  },
  {
    id: 'inf-naloxone', cat: 'infermiere', label: 'Somministra naloxone', durata: 40, chi: ['infermiere'],
    unaVolta: true,
    richiede: (p, ctx) => ctx.haFatto('riferisci-infermiere'),
    motivoBloccato: 'Riferisci prima il quadro: pupille, respiro e circostanze.',
    applica: () => ({ coscienza: 'V', respiro: { tipo: 'normale', fr: 14 }, spo2: +8, tag: 'naloxone' }),
    diario: 'Naloxone somministrato: il respiro riprende.',
    spiega: 'Antagonista degli oppiacei. Dura meno dell\'oppiaceo: il paziente va comunque portato.',
  },
  {
    id: 'inf-glucosata', cat: 'infermiere', label: 'Somministra glucosata endovena', durata: 50,
    chi: ['infermiere'], unaVolta: true,
    richiede: (p, ctx) => p.tag.includes('ev') && ctx.haLettura('glicemia'),
    motivoBloccato: (p, ctx) => (ctx.haLettura('glicemia')
      ? 'Serve prima un accesso venoso.'
      : 'L\'infermiere ti chiede la glicemia prima di somministrarla.'),
    applica: () => ({ tag: 'glucosata' }),
    diario: 'Glucosata endovena: il paziente si riprende.',
    spiega: 'Per l\'ipoglicemico che non può deglutire.',
  },

  /* I presidi con la misura: Guedel, sondini, ossigeno, agocannule.
     Sono azioni come tutte le altre — hanno solo un `famiglia` in più,
     che serve alla palette per raggrupparle. */
  ...VOCI_PRESIDI,
];

export const AZIONI = Object.fromEntries(ELENCO.map((a) => [a.id, a]));
export const AZIONI_ELENCO = ELENCO;

/** Azioni di una categoria, nell'ordine in cui sono scritte. */
export const azioniDi = (cat) => ELENCO.filter((a) => a.cat === cat);
