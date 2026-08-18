/* =====================================================================
   carte.js — mazzo di ripasso. Ogni carta rimanda al capitolo che la
   spiega, così dal ripasso si torna sempre al testo.

   Il mazzo è la somma di due gruppi: le carte scritte qui sotto, che
   battono sui punti chiave, e le cinquanta domande di autoverifica dei
   capitoli 17 e 36 del manuale, che stanno in carte-autoverifica.js.
   ===================================================================== */

import { CARTE_AUTOVERIFICA } from './carte-autoverifica.js';

const CARTE_CHIAVE = [
  { id: 'c01', tema: 'Emergenza e urgenza', cap: 'cap-3',
    q: 'Qual è la differenza fra emergenza e urgenza? E fra urgenza differibile e indifferibile?',
    a: 'Emergenza = immediato pericolo di vita, almeno una funzione vitale compromessa → codice rosso. Urgenza = nessun pericolo immediato: indifferibile (giallo) se il quadro può evolvere, differibile (verde) se non cambia nell\'arco di qualche ora.' },

  { id: 'c02', tema: 'Segno e sintomo', cap: 'cap-6',
    q: 'Classifica in segni e sintomi: dolore toracico, cute sudata, nausea, SpO₂ 88%, vertigine, cianosi.',
    a: 'Segni (li rilevo io): cute sudata, SpO₂ 88%, cianosi. Sintomi (me li riferisce il paziente): dolore toracico, nausea, vertigine.' },

  { id: 'c03', tema: 'Omeostasi', cap: 'cap-4',
    q: 'Che cos\'è l\'omeostasi e che cosa si intende per "insulto"?',
    a: 'Omeostasi = equilibrio interno dinamico, non un valore fisso. Insulto = evento esterno o interno che aggredisce quell\'equilibrio (trauma, infezione, emorragia, ischemia, tossico). L\'organismo compensa fino all\'ultima risorsa, poi crolla di colpo.' },

  { id: 'c04', tema: 'Parametri vitali', cap: 'cap-5',
    q: 'Elenca i valori normali dell\'adulto.',
    a: 'FC 60-100 bpm · FR 12-16 atti/min · PA circa 120/80 mmHg · SpO₂ 95-100% · T 36-37 °C · glicemia 70-110 mg/dl.' },

  { id: 'c05', tema: 'Mentalità gerarchica', cap: 'cap-7',
    q: 'Applica la mentalità gerarchica al dolore toracico.',
    a: 'Si parte dalle ipotesi peggiori e si scende: infarto, embolia polmonare, dissezione aortica, tamponamento cardiaco, pneumotorace iperteso, rottura esofagea. Solo dopo le cause benigne.' },

  { id: 'c06', tema: 'Mentalità chirurgica', cap: 'cap-7',
    q: 'Che cosa significa "mentalità chirurgica" in pratica?',
    a: 'Sapere abbastanza per capire, ma soprattutto FARE. Valutazioni mirate e rapide, domande chiuse e utili. Se non respira bene: ossigeno subito, poi si parla. La primaria sta sotto i 90 secondi.' },

  { id: 'c07', tema: 'Colpo d\'occhio', cap: 'cap-10',
    q: 'Che cosa valuti prima ancora dell\'ABCDE?',
    a: 'Accessibilità (incarcerato? prono? casco?), vitalità (parla, si muove, reagisce?), emorragie massive, aspetto della cute (pallore, cianosi), necessità di altre squadre.' },

  { id: 'c08', tema: 'Paziente non vitale', cap: 'cap-11',
    q: 'In quali condizioni puoi trovare un paziente non vitale?',
    a: 'Morte biologica, paziente moribondo in fase agonica, arresto cardiocircolatorio, arresto respiratorio, coma, ipotermia grave, sincope psicogena o simulazione.' },

  { id: 'c09', tema: 'Arresto', cap: 'cap-11',
    q: 'Perché si dice arresto CARDIOCIRCOLATORIO e non solo cardiaco?',
    a: 'Perché ciò che si arresta è la funzione di pompa, non necessariamente l\'attività elettrica. In FV l\'attività elettrica c\'è, ma è caotica e non produce gittata.' },

  { id: 'c10', tema: 'Ritmi defibrillabili', cap: 'cap-11',
    q: 'Quali ritmi sono defibrillabili e perché la prognosi è diversa dall\'asistolia?',
    a: 'FV e TV senza polso sono defibrillabili e sono i ritmi iniziali dell\'arresto: se li trovi, l\'arresto è recente. L\'asistolia non è defibrillabile e indica in genere un arresto da oltre 4-5 minuti. Il successo cala del 7-10% al minuto.' },

  { id: 'c11', tema: 'Gasping', cap: 'cap-11',
    q: 'Che cos\'è il gasping e come si tratta?',
    a: 'Respiro agonico: il paziente boccheggia senza movimenti toracici efficaci e senza flusso d\'aria. NON è respiro: è un arresto cardiaco, si inizia la RCP.' },

  { id: 'c12', tema: 'X-ABCDE', cap: 'cap-13',
    q: 'Che cosa rappresenta la X e perché viene prima della A?',
    a: 'Il controllo delle emorragie massive. Un\'emorragia catastrofica svuota il paziente in pochi minuti: va bloccata prima di ogni altra manovra, compresa la gestione delle vie aeree.' },

  { id: 'c13', tema: 'AVPU', cap: 'cap-22',
    q: 'Che cosa significano le quattro lettere di AVPU?',
    a: 'A Alert (vigile, anche se confuso) · V Vocal (risponde alla voce) · P Painful (risponde solo allo stimolo doloroso) · U Unresponsive (nessuna risposta).' },

  { id: 'c14', tema: 'Coscienza', cap: 'cap-22',
    q: 'Quali sono le due componenti della coscienza?',
    a: 'Vigilanza (occhi aperti, stato di veglia) e contenuto o consapevolezza (orientamento su tempo, spazio e persona). Si può essere vigili e non consapevoli: è una condizione grave.' },

  { id: 'c15', tema: 'Afasia', cap: 'cap-22',
    q: 'Come distingui un\'afasia produttiva da una comprensiva?',
    a: 'Produttiva: capisce ma non riesce a parlare. Comprensiva: parla ma non ha capito la domanda. Il test è verificare se ha compreso ciò che gli hai chiesto, non se emette parole.' },

  { id: 'c16', tema: 'Morte certa', cap: 'cap-23',
    q: 'Quali segni impediscono di iniziare le manovre rianimatorie?',
    a: 'Rigor mortis, macchie ipostatiche, decomposizione, lesioni palesemente incompatibili con la vita, decapitazione, carbonizzazione. Attenzione all\'ipotermia: nessuno è morto finché non è caldo e morto.' },

  { id: 'c17', tema: 'SAMPLE', cap: 'cap-24',
    q: 'Che cosa raccogli con lo schema SAMPLE?',
    a: 'Segni e sintomi · Allergie · Medicine (anticoagulanti per primi) · Patologie pregresse · Last meal, l\'ultimo pasto · Eventi, cioè la dinamica di quanto accaduto.' },

  { id: 'c18', tema: 'OPQRST', cap: 'cap-24',
    q: 'Che cosa indaghi con OPQRST?',
    a: 'Onset (insorgenza) · Provocation/Palliation (cosa lo peggiora o allevia) · Quality (che tipo di dolore) · Radiation (dove si irradia) · Severity (da 1 a 10) · Time (da quanto dura).' },

  { id: 'c19', tema: 'Anticoagulanti', cap: 'cap-24',
    q: 'Perché gli anticoagulanti contano tanto in un trauma cranico?',
    a: 'Il paziente scoagulato sanguina molto più a lungo: un ematoma intracranico può espandersi lentamente e dare sintomi anche ore dopo. È il dato che cambia il codice, e nel ragguaglio va detto per primo.' },

  { id: 'c20', tema: 'Dolore viscerale', cap: 'cap-26',
    q: 'Perché il dolore viscerale si irradia?',
    a: 'Negli organi interni i recettori sono pochi e le vie nervose convergono con quelle della cute: il segnale arriva grossolano e il cervello lo attribuisce alla sede sbagliata.' },

  { id: 'c21', tema: 'Epigastrio', cap: 'cap-26',
    q: 'Un dolore alla bocca dello stomaco: che cosa consideri?',
    a: 'Possibile origine cardiaca fino a prova contraria: è la presentazione classica dell\'infarto inferiore. "Avrà mangiato male" è l\'errore che costa più caro.' },

  { id: 'c22', tema: 'Scarica adrenergica', cap: 'cap-27',
    q: 'Elenca i segni della scarica adrenergica e spiegane uno.',
    a: 'Pallore (vasocostrizione cutanea), sudorazione algida, tachicardia, respiro profondo (broncodilatazione), bocca secca, tremori, midriasi. Sono aspecifici: dicono che c\'è un problema, non quale.' },

  { id: 'c23', tema: 'Nervo vago', cap: 'cap-28',
    q: 'Che effetti produce la stimolazione vagale e perché si sviene?',
    a: 'Bradicardia, ipotensione, nausea e vomito, rilascio degli sfinteri. Il calo di frequenza e pressione riduce la perfusione cerebrale: è la sincope vasovagale. Non è un ormone: è un nervo che viene stimolato.' },

  { id: 'c24', tema: 'Sudorazione', cap: 'cap-27',
    q: 'Come distingui una sudorazione algida da una da sforzo?',
    a: 'Algida: cute fredda e umida, spesso con pallore, a riposo → segno d\'allarme. Da sforzo o da calore: cute calda. Chiedi "ha fatto uno sforzo o era fermo?" e tocca la schiena, non il torace.' },

  { id: 'c25', tema: 'Lettura dei parametri', cap: 'cap-29',
    q: 'FC 125 con PA 80/50, oppure FC 62 con PA 180/100: quale paziente è più grave?',
    a: 'Il primo: la tachicardia è il compenso alla pressione crollata, cioè shock. Sarebbe ancora più grave 80/50 con 60 di frequenza, perché significherebbe compenso assente o esaurito.' },

  { id: 'c26', tema: 'Shock', cap: 'cap-29',
    q: 'Qual è il segno più indicativo di shock e quando allerti la centrale?',
    a: 'PA sistolica sotto 100 mmHg orienta, sotto 90 è conclamata. Allerti per PA sotto 90, FC sopra 120, alterazioni della coscienza, segni di shock conclamato o causa non dominabile.' },

  { id: 'c27', tema: 'Anafilassi', cap: 'cap-35',
    q: 'Perché nello shock anafilattico la cute è diversa dagli altri shock?',
    a: 'È calda, arrossata ed edematosa invece che pallida e fredda, perché il meccanismo è vasodilatazione massiva e non vasocostrizione. Serve adrenalina: il cortisone agisce troppo tardi per l\'acuto.' },

  { id: 'c28', tema: 'Sincope', cap: 'cap-25',
    q: 'Definizione di sincope, e quando NON è una sincope?',
    a: 'Perdita di coscienza transitoria a risoluzione spontanea e completa. Se all\'arrivo del mezzo il paziente è ancora alterato, non è una sincope: è un\'altra cosa e va cercata.' },

  { id: 'c29', tema: 'Ipoglicemia', cap: 'cap-33',
    q: 'Perché al paziente etilista si misura sempre la glicemia?',
    a: 'Confusione, aggressività, sudorazione e incoordinazione sono identiche a un\'ubriacatura. E l\'etilista cronico tende all\'ipoglicemia, perché l\'alcol inibisce la gluconeogenesi: le due condizioni convivono spesso.' },

  { id: 'c30', tema: 'Agitazione', cap: 'cap-25',
    q: 'Un paziente agitato: qual è la prima ipotesi?',
    a: 'Ipossia fino a prova contraria. Non va calmato: va ossigenato. Vale anche nel trauma cranico, dove è la lesione a parlare, non il carattere del paziente.' },

  { id: 'c31', tema: 'Ragguaglio', cap: 'cap-30',
    q: 'Quali sono i quattro punti del ragguaglio?',
    a: 'Età e sesso · patologie rilevanti (anticoagulanti!) · evento e parametri salienti · prestazioni eseguite. Poi ti fermi: il resto è nella scheda.' },

  { id: 'c32', tema: 'Scheda di soccorso', cap: 'cap-31',
    q: 'Perché sulla scheda non si scrive "frattura"?',
    a: 'Perché il soccorritore non fa diagnosi. Si descrive quello che si vede: "deformità anatomica dell\'arto superiore destro con limitazione funzionale". Lo stesso vale per "sospetto" al posto di "infarto".' },

  { id: 'c33', tema: 'Crush syndrome', cap: 'cap-35',
    q: 'Perché togliere il peso a un paziente schiacciato può ucciderlo?',
    a: 'Il muscolo compresso va in rabdomiolisi. Alla rimozione, potassio e mioglobina entrano in circolo insieme: iperkaliemia con aritmie fatali e insufficienza renale acuta. Si stabilizza e si infonde prima di estricare.' },

  { id: 'c34', tema: 'Sicurezza della scena', cap: 'cap-14',
    q: 'Che cosa comprende la sicurezza della scena, oltre ai pericoli evidenti?',
    a: 'Rischi chimici e gassosi, animali, insetti, persone aggressive, rischio infettivo, instabilità dei materiali. Mai da soli, sempre con un mezzo di comunicazione e con le vie di uscita sotto controllo.' },

  { id: 'c35', tema: 'Etica sulla scena', cap: 'cap-15',
    q: 'Perché non si commenta mai sulla scena?',
    a: 'Perché l\'udito è l\'ultimo senso che se ne va: il paziente incosciente o in fase terminale sente. Non si commenta neanche appena chiusa la porta, né vicino ai citofoni o in ascensore.' },

  { id: 'c36', tema: 'Dinamica', cap: 'cap-24',
    q: 'Che cosa osservi nella dinamica di un incidente stradale?',
    a: 'Deformazione del volante, del parabrezza e della lamiera, intrusione nell\'abitacolo, casco e cinture, airbag esploso, proiezione fuori dal veicolo. Sospetti lesioni interne anche se in superficie vedi poco.' },

  { id: 'c37', tema: 'Tre fasi del soccorso', cap: 'cap-18',
    q: 'Quali sono le tre fasi in cui si articola l\'intervento?',
    a: 'Valutazione iniziale (il "triage sulla porta": scena, colpo d\'occhio, azioni salvavita) · valutazione secondaria e rivalutazione continua · ragguaglio, cioè la consegna al Pronto Soccorso.' },

  { id: 'c38', tema: 'ABCDE', cap: 'cap-21',
    q: 'Perché si dice che l\'ABCDE non è una scaletta rigida?',
    a: 'Perché non si passa oltre finché il problema individuato non è risolto, e perché nella realtà si torna indietro di continuo: è un cerchio attorno al paziente, non una linea retta. Spesso è implicito e simultaneo.' },

  { id: 'c39', tema: 'Posizione', cap: 'cap-19',
    q: 'Come si trasporta un paziente con dolore toracico, e quando fai eccezione?',
    a: 'Seduto o semiseduto, per alleggerire il lavoro del cuore. Eccezione: se è pallido e ipoteso, cioè in shock, va supino con gli arti inferiori sollevati.' },

  { id: 'c40', tema: 'Proattività', cap: 'cap-34',
    q: 'Che cosa significa essere proattivi in squadra, e qual è il rovescio della medaglia?',
    a: 'Anticipare: preparare il materiale prima che venga chiesto, riferire ciò che si è visto senza aspettare la domanda. Il rovescio è agire fuori dal proprio ruolo o dal protocollo: la catena di responsabilità esiste e va rispettata.' },
];

export const CARTE = [...CARTE_CHIAVE, ...CARTE_AUTOVERIFICA];
export const CARTE_IDS = CARTE.map((c) => c.id);

/** Sottoinsiemi utili: il mazzo intero, oppure solo le domande d'esame. */
export const GRUPPI = [
  { id: 'tutte', label: 'Tutto il mazzo', filtro: () => true },
  { id: 'chiave', label: 'Punti chiave', filtro: (c) => !c.parte },
  { id: 'esame', label: 'Domande di autoverifica', filtro: (c) => Boolean(c.parte) },
];
