/* =====================================================================
   cartellini.js — il cartellino che arriva dalla centrale sul tablet.

   La struttura ricalca il CARTELLINO DI CO118 che vedete sul Toughbook:
   criticità in alto a destra, i campi in colonna, e in fondo il riquadro
   SCENARIO con il proprio codice.

   ⚠ Sui CODICI: criticità (R/G/V/B) è quella che conoscete. I codici di
   patologia e di scenario cambiano da centrale a centrale, quindi qui
   sono scritti in chiaro invece di essere inventati. Se la vostra CO usa
   sigle vere (C20, SC20R e simili), basta sostituirle in questo file:
   il resto dell'applicazione non cambia.
   ===================================================================== */

const CRITICITA_DA_CODICE = { ROSSO: 'R', GIALLO: 'G', VERDE: 'V', BIANCO: 'B' };

/* Quello che cambia da caso a caso. Il resto viene ricavato dallo
   scenario stesso: indirizzo, testo della chiamata, criticità. */
const DETTAGLI = {
  toracico: {
    patologia: 'CARDIOCIRCOLATORIA', luogo: 'ABITAZIONE',
    giudizio: 'DOLORE TORACICO DA 40 MIN', collaborativo: 'SI',
    note: 'SECONDO PIANO, SCALE STRETTE, NO ASCENSORE',
    coordinate: '[41.9027 12.4963]', operatore: '50412',
    data: '18/08/2026 07:42:11', persone: 'SOLA',
  },
  bpco: {
    patologia: 'RESPIRATORIA', luogo: 'ABITAZIONE',
    giudizio: 'DIFFICOLTA RESPIRATORIA IN BPCO NOTA', collaborativo: 'SI',
    note: 'OSSIGENOTERAPIA DOMICILIARE — APRE LA BADANTE',
    coordinate: '[41.8894 12.5021]', operatore: '50388',
    data: '18/08/2026 05:14:03', persone: 'SOLA',
  },
  arresto: {
    patologia: 'CARDIOCIRCOLATORIA', luogo: 'LUOGO DI LAVORO',
    giudizio: 'CADUTO A TERRA — RESPIRA STRANO', collaborativo: '-',
    note: 'OPEN SPACE AL PIANO TERRA, ACCESSO DA VIA PRINCIPALE',
    coordinate: '[41.8719 12.4801]', operatore: '50401',
    data: '18/08/2026 10:42:55', persone: 'SOLA',
  },
  shock: {
    patologia: 'ALTRA PATOLOGIA', luogo: 'ABITAZIONE',
    giudizio: 'SI SENTE FIACCO', collaborativo: 'SI',
    note: 'CHIAMA LA MOGLIE — NIENTE ALTRO RIFERITO',
    coordinate: '[41.8567 12.5334]', operatore: '50377',
    data: '18/08/2026 11:07:20', persone: 'SOLA',
  },
  ipoglicemia: {
    patologia: 'NEUROLOGICA', luogo: 'STRADA',
    giudizio: 'UOMO CONFUSO E AGGRESSIVO SU MARCIAPIEDE', collaborativo: 'NO',
    note: 'PASSANTI RIFERISCONO STATO DI EBBREZZA — VALUTARE FF.OO.',
    coordinate: '[41.9012 12.4877]', operatore: '50366',
    data: '18/08/2026 14:31:09', persone: 'SOLA',
  },
  incidente: {
    patologia: 'TRAUMATICA', luogo: 'STRADA',
    giudizio: 'INCIDENTE STRADALE AUTO CONTRO PALO', collaborativo: 'SI',
    note: 'UN OCCUPANTE ANCORA IN VETTURA — LIQUIDI A TERRA — VVF NON SUL POSTO',
    coordinate: '[41.9231 12.4402]', operatore: '50415',
    data: '18/08/2026 21:58:44', persone: 'SOLA',
  },
  anticoagulante: {
    patologia: 'TRAUMATICA', luogo: 'ABITAZIONE',
    giudizio: 'CADUTA ACCIDENTALE CON TRAUMA CRANICO', collaborativo: 'SI',
    note: 'PAZIENTE COSCIENTE — PRESENTE LA FIGLIA',
    coordinate: '[41.8802 12.5119]', operatore: '50392',
    data: '18/08/2026 17:22:36', persone: 'SOLA',
  },
  anafilassi: {
    patologia: 'ALLERGICA', luogo: 'ABITAZIONE',
    giudizio: 'PUNTURA DI IMENOTTERO — SI STA GONFIANDO', collaborativo: 'SI',
    note: 'NIDO DI CALABRONI SEGNALATO NEL GIARDINO',
    coordinate: '[41.9455 12.5688]', operatore: '50404',
    data: '18/08/2026 16:05:12', persone: 'SOLA',
  },
  cocaina: {
    patologia: 'CARDIOCIRCOLATORIA', luogo: 'ABITAZIONE',
    giudizio: 'FREQUENZA CARDIACA ELEVATA — MALESSERE', collaborativo: 'SI',
    note: 'CHIAMA UN AMICO — RETICENTE AL TELEFONO',
    coordinate: '[41.8988 12.4712]', operatore: '50381',
    data: '18/08/2026 04:47:58', persone: 'SOLA',
  },
  ictus: {
    patologia: 'NEUROLOGICA', luogo: 'ABITAZIONE',
    giudizio: 'NON PARLA BENE E NON MUOVE IL BRACCIO DESTRO', collaborativo: 'SI',
    note: 'MARITO RIFERISCE ESORDIO ORE 09:40 — PREALLERTA STROKE',
    coordinate: '[41.8641 12.5203]', operatore: '50399',
    data: '18/08/2026 10:15:02', persone: 'SOLA',
  },
  sincope: {
    patologia: 'NEUROLOGICA', luogo: 'ESERCIZIO PUBBLICO',
    giudizio: 'LIPOTIMIA IN FILA — ORA COSCIENTE', collaborativo: 'SI',
    note: 'UFFICIO POSTALE, SALA AFFOLLATA',
    coordinate: '[41.8925 12.4998]', operatore: '50370',
    data: '18/08/2026 09:53:41', persone: 'SOLA',
  },
  schiacciamento: {
    patologia: 'TRAUMATICA', luogo: 'LUOGO DI LAVORO',
    giudizio: 'INFORTUNIO SUL LAVORO — ARTI INTRAPPOLATI', collaborativo: 'SI',
    note: 'VVF GIA SUL POSTO — DPI E CASCO OBBLIGATORI — SCHIACCIAMENTO DA OLTRE 60 MIN',
    coordinate: '[41.9310 12.4155]', operatore: '50408',
    data: '18/08/2026 15:36:27', persone: 'SOLA',
  },
  /* casi del motore in tempo simulato */
  'toracico-v2': {
    patologia: 'CARDIOCIRCOLATORIA', luogo: 'ABITAZIONE',
    giudizio: 'DOLORE TORACICO DA 40 MIN', collaborativo: 'SI',
    note: 'SECONDO PIANO, SCALE STRETTE, NO ASCENSORE',
    coordinate: '[41.9027 12.4963]', operatore: '50412',
    data: '18/08/2026 07:42:11', persone: 'SOLA',
  },
  'shock-v2': {
    patologia: 'ALTRA PATOLOGIA', luogo: 'ABITAZIONE',
    giudizio: 'SI SENTE FIACCO', collaborativo: 'SI',
    note: 'CHIAMA LA MOGLIE — NIENTE ALTRO RIFERITO',
    coordinate: '[41.8567 12.5334]', operatore: '50377',
    data: '18/08/2026 11:07:20', persone: 'SOLA',
  },
};

/** Costruisce i dati del cartellino di uno scenario, senza inventare
    nulla: quello che non è dichiarato viene dal caso stesso. */
export function cartellinoDi(caso) {
  const d = DETTAGLI[caso.id] || {};
  const codice = (caso.dispatch?.codice || '').toUpperCase();
  return {
    criticita: d.criticita || CRITICITA_DA_CODICE[codice] || 'V',
    codiceEsteso: codice || 'VERDE',
    patologia: d.patologia || '-',
    luogo: d.luogo || '-',
    collaborativo: d.collaborativo || '-',
    giudizio: d.giudizio || (caso.dispatch?.testo || '').toUpperCase(),
    note: d.note || '-',
    indirizzo: (caso.dispatch?.luogo || '-').toUpperCase(),
    coordinate: d.coordinate || '-',
    categoria: d.categoria || 'ORDINARIO',
    operatore: d.operatore || '-',
    data: d.data || '-',
    accaduto: (caso.dispatch?.testo || '').toUpperCase(),
    persone: d.persone || 'SOLA',
  };
}

export const CRITICITA_ESTESA = { R: 'ROSSO', G: 'GIALLO', V: 'VERDE', B: 'BIANCO' };
