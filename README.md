# Console TSSA

Banco di addestramento per il corso **TSSA / soccorritore volontario CRI**: il manuale di appunti
da leggere, un paziente 3D da esplorare, i ritmi cardiaci dal vivo, un simulatore di intervento con
debriefing e un mazzo di ripasso a ripetizione dilazionata.

Tutto gira nel browser, senza account e senza server: i progressi restano sul dispositivo.

👉 **[Apri la Console](https://g3ggy.github.io/consoletssa/)**

---

## Cosa contiene

| Modulo | A cosa serve |
|---|---|
| **Studio** | Il manuale completo, capitolo per capitolo, con indice, ricerca e avanzamento di lettura. |
| **Corpo** | Modello umano 3D reale: organi in trasparenza, irradiazione del dolore cardiaco, segni della scarica adrenergica, posizioni di trasporto. |
| **Monitor** | Otto ritmi cardiaci che scorrono come su un monitor vero, quiz di riconoscimento, curva di efficacia della defibrillazione, pattern respiratori. |
| **Simulazioni** | Dodici interventi da condurre dalla chiamata al ragguaglio: scena, colpo d'occhio, azione immediata, parametri a tempo, SAMPLE, codice, sospetto, debriefing. |
| **Ripasso** | Quaranta carte con sistema di Leitner a cinque scatole (0 · 1 · 3 · 7 · 21 giorni). |
| **Progressi** | Capitoli letti, carte in scadenza, storico delle simulazioni e — soprattutto — i passi che sbagli più spesso. |

Scorciatoie da tastiera: `1`-`6` per i moduli, `/` o `Cmd/Ctrl+K` per la ricerca globale, `T` per
cambiare tema.

## Da telefono

È pensata prima di tutto per il telefono: barra dei moduli in basso, monitor del paziente che resta
appiccicato in alto durante le simulazioni, indice del manuale richiudibile, bersagli da toccare
grandi almeno 42 px, e nel modulo Corpo lo scorrimento verticale della pagina resta al browser
(si ruota il modello trascinando in orizzontale, si ingrandisce con i pulsanti + e −).

Sui telefoni la resa 3D scende a risoluzione ridotta e senza ombre, e il modello pesa 1,4 MB
(circa metà dell'originale, dopo semplificazione e quantizzazione della mesh).

Si può installare come applicazione: da iPhone *Condividi › Aggiungi alla schermata Home*, da
Android *Menu › Installa app*. Dopo la prima visita funziona anche senza rete.

---

## Come si aggiorna il contenuto

Non serve toccare il codice per cambiare quello che si studia.

- **Il manuale** è un normale file markdown: [`content/manuale.md`](content/manuale.md).
  I capitoli vengono riconosciuti dai titoli nella forma `## 12. Titolo del capitolo`, e le parti
  dai titoli `# PARTE 2`. Aggiungi un capitolo e comparirà nell'indice, nella ricerca e nei link.
- **Gli scenari** stanno in [`assets/js/data/scenari.js`](assets/js/data/scenari.js): ogni caso porta
  con sé dispatch, scena, parametri, SAMPLE, codice corretto, chiave di lettura, trappola e modello
  di ragguaglio.
- **Le carte di ripasso** stanno in [`assets/js/data/carte.js`](assets/js/data/carte.js).
- **I contenuti del modello 3D** stanno in [`assets/js/data/anatomy.js`](assets/js/data/anatomy.js):
  ogni punto è ancorato a un osso dello scheletro, quindi resta al suo posto anche cambiando modello.

---

## Come si prova in locale

I moduli JavaScript e il manuale vengono caricati via `fetch`: aprire `index.html` con un doppio
clic **non funziona** (il browser blocca il protocollo `file://`). Serve un piccolo server:

```bash
python3 -m http.server 8000
# poi apri http://localhost:8000
```

Nessuna dipendenza da installare, nessun passaggio di build: le librerie sono già in `vendor/`.

---

## Struttura

```
index.html               guscio dell'applicazione (import map + fogli di stile)
sw.js                    service worker: il sito resta consultabile offline
content/manuale.md       il testo degli appunti
assets/css/              tokens · base · guscio · moduli · telefono
assets/js/core/          dom, store, router, markdown, tracciati, ricerca
assets/js/data/          anatomia, scenari, carte
assets/js/modules/       studio, corpo, monitor, simulazioni, ripasso, progressi
assets/models/           modello 3D del paziente (glTF binario)
vendor/                  three.js e GLTFLoader
```

Il codice non usa framework né passaggi di compilazione: sono moduli ES nativi, così il progetto
resta leggibile e modificabile anche fra due anni.

---

## Pubblicazione

Il sito è servito da GitHub Pages sul ramo `main`, cartella radice. Ogni `git push` aggiorna la
versione online nel giro di un minuto. Il file `.nojekyll` impedisce a Jekyll di ignorare le
cartelle che iniziano per underscore.

Dopo un aggiornamento conviene alzare il numero di versione della cache in `sw.js`
(`const CACHE = 'consoletssa-v3'`), altrimenti i visitatori abituali continuano a vedere la
versione precedente finché non chiudono tutte le schede.

---

## Avvertenza

Questi materiali sono **appunti di studio personali**, non un protocollo operativo. I protocolli
locali — regione, convenzione 118/112, Comitato di appartenenza — prevalgono sempre. I tracciati
del monitor sono didattici e non hanno alcun valore diagnostico.

Sul soccorso non si fa diagnosi: si formula un sospetto.

## Crediti

Vedi [ATTRIBUTIONS.md](ATTRIBUTIONS.md) per il modello 3D e le librerie di terze parti.
