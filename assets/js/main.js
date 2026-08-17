/* =====================================================================
   main.js — avvio dell'applicazione: guscio, navigazione, ricerca.
   ===================================================================== */

import { el, $$, fold, on } from './core/dom.js';
import { icon, createPalette } from './core/ui.js';
import { defineRoute, startRouter, navigate } from './core/router.js';
import { initRibbon } from './core/ribbon.js';
import { getState, setTheme, subscribe, touchStreak, dueCards } from './core/store.js';
import { loadManual, manualCache } from './core/manual.js';
import { CARTE, CARTE_IDS } from './data/carte.js';
import { SCENARI } from './data/scenari.js';
import { CASI } from './data/casi.js';
import { RHYTHMS } from './core/waveform.js';
import { snippet } from './core/markdown.js';

/* --------------------------- moduli/rotte --------------------------- */
const MODULI = [
  { key: 'studio', label: 'Studio', hint: 'Il manuale, capitolo per capitolo', ic: 'studio' },
  { key: 'corpo', label: 'Corpo', hint: 'Modello 3D e mappe', ic: 'corpo' },
  { key: 'monitor', label: 'Monitor', hint: 'Ritmi e respiro dal vivo', ic: 'monitor' },
  { key: 'simulazioni', label: 'Simulazioni', hint: 'Interventi da condurre', ic: 'sim' },
  { key: 'ripasso', label: 'Ripasso', hint: 'Carte a ripetizione dilazionata', ic: 'ripasso' },
  { key: 'progressi', label: 'Progressi', hint: 'Dove stai e dove sbagli', ic: 'progressi' },
];

defineRoute('studio', () => import('./modules/studio.js'));
defineRoute('corpo', () => import('./modules/corpo.js'));
defineRoute('monitor', () => import('./modules/monitor.js'));
defineRoute('simulazioni', () => import('./modules/simulazioni.js'));
defineRoute('intervento', () => import('./modules/intervento.js'));
defineRoute('ripasso', () => import('./modules/ripasso.js'));
defineRoute('progressi', () => import('./modules/progressi.js'));

/* ------------------------------ guscio ------------------------------ */
function buildRail() {
  const nav = el('nav.rail-nav', { role: 'navigation', 'aria-label': 'Moduli' });
  const links = MODULI.map((m, i) => {
    const a = el('button.navlink', {
      type: 'button', 'data-nav': m.key,
      onclick: () => navigate(m.key),
    }, [
      icon(m.ic),
      el('span', {}, [m.label, el('small', { text: m.hint })]),
      el('span.kbd', { text: String(i + 1) }),
    ]);
    return a;
  });
  nav.append(...links);

  const dueBadge = el('div.railstat');
  const syncDue = () => {
    const { total } = dueCards(CARTE_IDS);
    const { streak } = getState();
    dueBadge.replaceChildren(
      el('b', { text: String(total) }),
      el('span', { text: total === 1 ? 'carta da ripassare' : 'carte da ripassare' }),
      el('span', { style: { flex: '1' } }),
      el('b', { text: String(streak.days || 0) }),
      el('span', { text: 'gg' }),
    );
  };
  syncDue();
  subscribe(syncDue);

  return el('aside.rail', {}, [
    el('div.brand', {}, [
      el('div.cross', { 'aria-hidden': 'true' }),
      el('div.brand-txt', {}, [
        el('b', {}, ['Console ', el('i', { text: 'TSSA' })]),
        el('span', { text: 'addestramento soccorritore' }),
      ]),
    ]),
    nav,
    el('div.rail-foot', {}, [dueBadge]),
  ]);
}

function buildTopbar(palette) {
  const canvas = el('canvas', { 'aria-hidden': 'true' });
  const tag = el('div.ribbon-tag', {}, [document.createTextNode('traccia '), el('b', { text: 'sinusale' })]);

  const themeBtn = el('button.iconbtn', {
    type: 'button', title: 'Cambia tema (T)', 'aria-label': 'Cambia tema',
  });
  const syncTheme = () => {
    const carta = document.documentElement.dataset.theme === 'carta';
    themeBtn.replaceChildren(icon(carta ? 'moon' : 'sun'));
  };
  themeBtn.addEventListener('click', () => {
    const carta = document.documentElement.dataset.theme === 'carta';
    setTheme(carta ? 'monitor' : 'carta');
    syncTheme();
  });
  syncTheme();

  const searchBtn = el('button.iconbtn', {
    type: 'button', onclick: () => palette.open(), title: 'Cerca ovunque',
  }, [icon('search'), el('span.kbd', { text: '/' })]);

  const bar = el('header.topbar', {}, [
    el('div.ribbon', {}, [canvas, tag]),
    el('div.topbar-actions', {}, [searchBtn, themeBtn]),
  ]);

  setTimeout(() => initRibbon(canvas, tag), 0);
  return bar;
}

/* --------------------------- ricerca globale ------------------------ */
function searchProvider(term) {
  const out = [];
  const t = fold(term || '');

  if (!t) {
    MODULI.forEach((m) => out.push({
      group: 'vai a', title: m.label, subtitle: m.hint, run: () => navigate(m.key),
    }));
    return out;
  }

  const manuale = manualCache();
  if (manuale) {
    manuale.chapters.forEach((c) => {
      const inTitle = fold(c.title).includes(t);
      if (inTitle || c.plain.includes(t)) {
        out.push({
          group: `capitolo ${c.n}`,
          title: c.title,
          subtitle: inTitle ? c.part : snippet(c.plain, t, 90),
          run: () => navigate('studio', c.slug),
        });
      }
    });
  }

  CARTE.forEach((c) => {
    if (fold(`${c.tema} ${c.q} ${c.a}`).includes(t)) {
      out.push({ group: 'carta', title: c.tema, subtitle: c.q, run: () => navigate('ripasso') });
    }
  });

  CASI.forEach((c) => {
    if (fold(`${c.titolo} ${c.dispatch.testo} ${c.chiave}`).includes(t)) {
      out.push({ group: 'intervento', title: c.titolo, subtitle: c.dispatch.testo, run: () => navigate('intervento', c.id) });
    }
  });

  SCENARI.forEach((c) => {
    if (fold(`${c.titolo} ${c.dispatch.testo} ${c.chiave}`).includes(t)) {
      out.push({ group: 'scenario', title: c.titolo, subtitle: c.dispatch.testo, run: () => navigate('simulazioni') });
    }
  });

  Object.entries(RHYTHMS).forEach(([k, r]) => {
    if (fold(`${r.label} ${r.desc}`).includes(t)) {
      out.push({ group: 'ritmo', title: r.label, subtitle: r.desc.slice(0, 90), run: () => navigate('monitor') });
    }
  });

  MODULI.forEach((m) => {
    if (fold(m.label).includes(t)) {
      out.push({ group: 'vai a', title: m.label, subtitle: m.hint, run: () => navigate(m.key) });
    }
  });

  return out;
}

/* ------------------------------- avvio ------------------------------ */
function boot() {
  document.documentElement.dataset.theme = getState().theme || 'monitor';
  touchStreak();

  const palette = createPalette(searchProvider);
  const outlet = el('main.outlet', { id: 'contenuto', tabindex: '-1' });
  const rail = buildRail();

  document.body.append(
    el('a.skip-link', { href: '#contenuto', text: 'Salta al contenuto' }),
    el('div.app', {}, [
      rail,
      el('div', { style: { minWidth: '0' } }, [buildTopbar(palette), outlet]),
    ]),
  );

  startRouter(outlet, (name) => {
    const attiva = name === 'intervento' ? 'simulazioni' : name;
    $$('[data-nav]').forEach((b) => {
      if (b.dataset.nav === attiva) b.setAttribute('aria-current', 'page');
      else b.removeAttribute('aria-current');
    });
    const titolo = MODULI.find((m) => m.key === name)?.label
      || (name === 'intervento' ? 'Intervento' : 'Console');
    document.title = `${titolo} · Console TSSA`;
  });

  // il manuale serve alla ricerca globale: lo carichiamo comunque, senza bloccare
  loadManual().catch((err) => {
    console.warn('[main] manuale non disponibile', err);
  });

  /* ---------------------------- scorciatoie ------------------------- */
  on(document, 'keydown', (e) => {
    const inField = e.target.matches('input, textarea, select, [contenteditable]');
    if (palette.isOpen) return;
    if ((e.key === '/' || (e.key === 'k' && (e.metaKey || e.ctrlKey))) && !inField) {
      e.preventDefault();
      palette.open();
      return;
    }
    if (inField || e.metaKey || e.ctrlKey || e.altKey) return;
    const n = Number(e.key);
    if (n >= 1 && n <= MODULI.length) { navigate(MODULI[n - 1].key); return; }
    if (e.key.toLowerCase() === 't') {
      const carta = document.documentElement.dataset.theme === 'carta';
      setTheme(carta ? 'monitor' : 'carta');
      $$('.iconbtn')[1]?.replaceChildren(icon(carta ? 'sun' : 'moon'));
    }
  });

  /* service worker: rende il sito consultabile anche senza rete */
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register(new URL('../../sw.js', import.meta.url), { scope: './' })
        .catch((err) => console.warn('[main] service worker non registrato', err));
    });
  }
}

boot();
