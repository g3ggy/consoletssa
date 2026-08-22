/* =====================================================================
   sw.js — service worker: il sito resta consultabile anche senza rete.

   Strategia: rete prima per ciò che cambia (pagina, codice, stili,
   testi), cache prima per ciò che pesa e non cambia (modello 3D,
   librerie, icone). Chi ha già visitato il sito vede la versione nuova
   al primo caricamento, non al secondo.
   Per pubblicare una nuova versione basta cambiare CACHE.
   ===================================================================== */

const CACHE = 'consoletssa-1.14.0';

const PRECACHE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './assets/css/tokens.css',
  './assets/css/base.css',
  './assets/css/app.css',
  './assets/css/modules.css',
  './assets/css/lifepak.css',
  './assets/css/intervento.css',
  './assets/css/mobile.css',
  './assets/js/main.js',
  './assets/js/core/dom.js',
  './assets/js/core/store.js',
  './assets/js/core/router.js',
  './assets/js/core/ui.js',
  './assets/js/core/markdown.js',
  './assets/js/core/manual.js',
  './assets/js/core/waveform.js',
  './assets/js/core/ribbon.js',
  './assets/js/core/sim-engine.js',
  './assets/js/core/bombola.js',
  './assets/js/core/cartellino.js',
  './assets/js/core/lifepak.js',
  './assets/js/core/ecg12.js',
  './assets/js/versione.js',
  './assets/js/core/suoni.js',
  './assets/js/data/anatomy.js',
  './assets/js/data/scenari.js',
  './assets/js/data/scenari-arrivo.js',
  './assets/js/data/azioni.js',
  './assets/js/data/presidi.js',
  './assets/js/data/casi.js',
  './assets/js/data/cartellini.js',
  './assets/js/data/carte.js',
  './assets/js/data/carte-autoverifica.js',
  './assets/js/modules/studio.js',
  './assets/js/modules/corpo.js',
  './assets/js/modules/monitor.js',
  './assets/js/modules/simulazioni.js',
  './assets/js/modules/intervento.js',
  './assets/js/modules/ripasso.js',
  './assets/js/modules/progressi.js',
  './content/manuale.md',
  './vendor/three.module.js',
  './vendor/GLTFLoader.js',
  './vendor/BufferGeometryUtils.js',
  './assets/models/patient.glb',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(PRECACHE).catch((err) => {
        // se una risorsa manca non blocchiamo l'installazione
        console.warn('[sw] precache parziale', err);
      }))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // font e CDN esterni: al browser

  /* Il codice dell'applicazione e i contenuti si chiedono prima alla rete:
     altrimenti chi ha già visitato il sito vede la versione precedente
     fino al secondo caricamento, che durante una raccolta di pareri è
     esattamente il modo per ricevere pareri su una versione vecchia.
     Le risorse pesanti che non cambiano (modello 3D, librerie, icone)
     restano servite dalla cache: sono quelle che costano banda. */
  const fresco = request.mode === 'navigate'
    || /\.(?:js|css|md|webmanifest)$/.test(url.pathname)
    || url.pathname.endsWith('/');

  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(request, { ignoreSearch: true });

    /* `cache: 'reload'` scavalca la cache HTTP del browser: senza questo
       si può ritrovare un file nuovo accanto a uno vecchio ancora dentro
       i dieci minuti di validità, e l'applicazione si rompe con un
       errore di import. Meglio una richiesta in più che due versioni
       mescolate. */
    const network = fetch(request, fresco ? { cache: 'reload' } : undefined)
      .then((res) => {
        if (res && res.ok) cache.put(request, res.clone());
        return res;
      })
      .catch(() => null);

    if (fresco) return (await network) || cached || Response.error();
    if (cached) { network.catch(() => {}); return cached; }

    const res = await network;
    if (res) return res;

    // navigazione offline senza cache puntuale: serviamo la shell
    if (request.mode === 'navigate') {
      const shell = await cache.match('./index.html');
      if (shell) return shell;
    }
    return Response.error();
  })());
});
