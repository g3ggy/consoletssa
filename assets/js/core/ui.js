/* =====================================================================
   ui.js — icone inline, notifiche, palette di ricerca globale.
   ===================================================================== */

import { el, $, fold, escapeHtml } from './dom.js';

/* ------------------------------ icone ------------------------------- */
const PATHS = {
  studio: '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H19v14H6.5A2.5 2.5 0 0 0 4 19.5V5.5Z"/><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H19v4H6.5A2.5 2.5 0 0 1 4 19.5Z"/>',
  corpo: '<circle cx="12" cy="5" r="2.6"/><path d="M12 7.8v7.4M12 15.2 8.6 21M12 15.2 15.4 21M5.6 10.2 12 9.2l6.4 1"/>',
  monitor: '<rect x="2.5" y="4.5" width="19" height="13" rx="2"/><path d="M5.5 11.5h3l1.4-3 2.2 6 1.6-3h3.8"/><path d="M8 21h8"/>',
  sim: '<path d="M12 3v18M3 12h18"/><circle cx="12" cy="12" r="9"/>',
  ripasso: '<rect x="3" y="6" width="14" height="13" rx="2"/><path d="M7 3h11a2 2 0 0 1 2 2v11"/><path d="M7 11h6M7 15h4"/>',
  progressi: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.6-3.6"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4"/>',
  moon: '<path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z"/>',
  next: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  prev: '<path d="M19 12H5M11 18l-6-6 6-6"/>',
  check: '<path d="m4 12.5 5 5L20 6.5"/>',
  refresh: '<path d="M20 11A8 8 0 1 0 18 16"/><path d="M20 5v6h-6"/>',
  play: '<path d="M7 4.5v15l13-7.5Z"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 7.6v.6"/>',
  layers: '<path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 13 9 5 9-5"/>',
  alert: '<path d="M12 3.5 22 20H2L12 3.5Z"/><path d="M12 10v4.5M12 17.4v.6"/>',
};

export function icon(name, cls = '') {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', 'true');
  if (cls) svg.setAttribute('class', cls);
  svg.innerHTML = PATHS[name] || PATHS.info;
  return svg;
}

/* ---------------------------- notifiche ----------------------------- */
let toastHost = null;

export function toast(title, message = '', kind = '') {
  if (!toastHost) {
    toastHost = el('div.toasts', { role: 'status', 'aria-live': 'polite' });
    document.body.append(toastHost);
  }
  const node = el(`div.toast${kind ? ` ${kind}` : ''}`, {}, [
    el('b', { text: title }),
    message ? el('span', { text: message }) : null,
  ]);
  toastHost.append(node);
  setTimeout(() => {
    node.style.opacity = '0';
    node.style.transition = 'opacity .3s';
    setTimeout(() => node.remove(), 320);
  }, 3600);
}

/* ------------------------- palette di ricerca ----------------------- */
/**
 * @param {() => Array<{group,title,subtitle,run}>} provider
 */
export function createPalette(provider) {
  let back = null;
  let items = [];
  let sel = 0;

  function close() {
    back?.remove();
    back = null;
    document.removeEventListener('keydown', onKey, true);
  }

  function onKey(e) {
    if (!back) return;
    if (e.key === 'Escape') { e.preventDefault(); close(); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); move(1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); move(-1); }
    else if (e.key === 'Enter') {
      e.preventDefault();
      const it = items[sel];
      if (it) { close(); it.run(); }
    }
  }

  function move(delta) {
    const list = $('.palette-list', back);
    if (!items.length) return;
    sel = (sel + delta + items.length) % items.length;
    Array.from(list.children).forEach((c, i) => c.classList.toggle('sel', i === sel));
    list.children[sel]?.scrollIntoView({ block: 'nearest' });
  }

  function highlight(text, term) {
    if (!term) return escapeHtml(text);
    const f = fold(text);
    const idx = f.indexOf(fold(term));
    if (idx < 0) return escapeHtml(text);
    return `${escapeHtml(text.slice(0, idx))}<mark>${escapeHtml(text.slice(idx, idx + term.length))}</mark>${escapeHtml(text.slice(idx + term.length))}`;
  }

  function refresh(term) {
    const list = $('.palette-list', back);
    items = provider(term).slice(0, 40);
    sel = 0;
    if (!items.length) {
      list.replaceChildren(el('div.palette-empty', { text: 'Nessun risultato.' }));
      return;
    }
    list.replaceChildren(...items.map((it, i) => el('button.palette-item', {
      type: 'button',
      class: i === 0 ? 'sel' : '',
      onclick: () => { close(); it.run(); },
      html: `<span class="k">${escapeHtml(it.group)}</span>${highlight(it.title, term)}${
        it.subtitle ? `<em> — ${escapeHtml(it.subtitle)}</em>` : ''}`,
    })));
  }

  function open() {
    if (back) return;
    const input = el('input', {
      type: 'search', placeholder: 'Cerca un capitolo, un concetto, una carta…',
      'aria-label': 'Ricerca globale', autocomplete: 'off',
      oninput: (e) => refresh(e.target.value.trim()),
    });
    back = el('div.palette-back', {
      onclick: (e) => { if (e.target === back) close(); },
    }, [el('div.palette', { role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Ricerca' }, [
      input, el('div.palette-list'),
    ])]);
    document.body.append(back);
    document.addEventListener('keydown', onKey, true);
    refresh('');
    input.focus();
  }

  return { open, close, get isOpen() { return Boolean(back); } };
}

/* --------------------------- anello punteggio ----------------------- */
export function scoreRing(value, max) {
  const pct = max ? Math.round((value / max) * 100) : 0;
  const r = 50, c = 2 * Math.PI * r;
  const tone = pct >= 80 ? 'var(--phos)' : pct >= 55 ? 'var(--amber)' : 'var(--cri)';
  const wrap = el('div.score-ring');
  wrap.innerHTML = `
    <svg viewBox="0 0 116 116" width="116" height="116">
      <circle cx="58" cy="58" r="${r}" fill="none" stroke="var(--surface-3)" stroke-width="8"/>
      <circle cx="58" cy="58" r="${r}" fill="none" stroke="${tone}" stroke-width="8"
        stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${c - (c * pct) / 100}"/>
    </svg>
    <div class="val"><b style="color:${tone}">${value}<span style="opacity:.45">/${max}</span></b>
      <span>${pct}%</span></div>`;
  return wrap;
}
