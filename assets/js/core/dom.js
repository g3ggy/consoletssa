/* =====================================================================
   dom.js — micro-helper DOM. Nessuna dipendenza.
   ===================================================================== */

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

/** Crea un elemento. el('div.card', {id:'x'}, [child, 'testo']) */
export function el(spec, attrs = {}, children = []) {
  const [tagPart, ...classes] = String(spec).split('.');
  const node = document.createElement(tagPart || 'div');
  if (classes.length) node.className = classes.join(' ');
  for (const [k, v] of Object.entries(attrs)) {
    if (v === null || v === undefined || v === false) continue;
    if (k === 'class') node.className = [node.className, v].filter(Boolean).join(' ');
    else if (k === 'html') node.innerHTML = v;
    else if (k === 'text') node.textContent = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(node.style, v);
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
    else if (k === 'dataset') Object.assign(node.dataset, v);
    else node.setAttribute(k, v === true ? '' : v);
  }
  for (const c of [].concat(children)) {
    if (c === null || c === undefined || c === false) continue;
    node.append(c.nodeType ? c : document.createTextNode(String(c)));
  }
  return node;
}

/** Sostituisce il contenuto di un nodo. */
export function mount(host, ...children) {
  host.replaceChildren(...children.flat().filter(Boolean));
  return host;
}

export function on(target, type, handler, opts) {
  target.addEventListener(type, handler, opts);
  return () => target.removeEventListener(type, handler, opts);
}

/** Delegation: on(root, 'click', '.opt', fn) */
export function delegate(root, type, selector, handler) {
  return on(root, type, (e) => {
    const hit = e.target.closest(selector);
    if (hit && root.contains(hit)) handler(e, hit);
  });
}

export const escapeHtml = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

export const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

export function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

/** Rimuove accenti e minuscolizza — per ricerche e confronti. */
export const fold = (s) => String(s)
  .toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

export function formatSeconds(sec) {
  const s = Math.max(0, Math.round(sec));
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/* --------------------------------------------------------------------
   CanvasHost — risolve il bug dei grafici che non compaiono subito.

   Il problema originale: i canvas venivano dimensionati una sola volta,
   all'avvio, mentre la loro sezione era `hidden`. clientWidth valeva 0,
   quindi il canvas restava largo 0 finché non arrivava un `resize` della
   finestra. Qui il dimensionamento è guidato da ResizeObserver (scatta
   appena l'elemento riceve una dimensione reale) e il loop di disegno è
   sospeso quando il canvas non è visibile.
   -------------------------------------------------------------------- */
export function createCanvasHost(canvas, { onResize, onFrame, autoStop = true } = {}) {
  const ctx = canvas.getContext('2d');
  let w = 0, h = 0, dpr = 1, raf = null, running = false, prev = 0, visible = true;

  function measure() {
    const rect = canvas.getBoundingClientRect();
    const nw = Math.max(1, Math.round(rect.width));
    const nh = Math.max(1, Math.round(rect.height));
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (nw === w && nh === h && canvas.width === Math.round(nw * dpr)) return false;
    w = nw; h = nh;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    onResize?.({ ctx, w, h, dpr });
    return true;
  }

  const ro = new ResizeObserver(() => { if (measure()) frame(0, true); });
  ro.observe(canvas);

  let io = null;
  if (autoStop && 'IntersectionObserver' in window) {
    io = new IntersectionObserver((entries) => {
      visible = entries.some((e) => e.isIntersecting);
      if (visible) { measure(); start(); } else stop();
    }, { threshold: 0 });
    io.observe(canvas);
  }

  function frame(dt, forced) {
    if (!w || !h) return;
    onFrame?.({ ctx, w, h, dt, forced });
  }

  function loop(now) {
    if (!running) return;
    const dt = prev ? Math.min((now - prev) / 1000, 0.05) : 0.016;
    prev = now;
    frame(dt, false);
    raf = requestAnimationFrame(loop);
  }

  function start() {
    if (running) return;
    running = true; prev = 0;
    raf = requestAnimationFrame(loop);
  }
  function stop() {
    running = false;
    if (raf) cancelAnimationFrame(raf);
    raf = null;
  }

  // primo dimensionamento: subito, e di nuovo appena il layout si assesta
  measure();
  requestAnimationFrame(() => { measure(); frame(0, true); });

  return {
    get ctx() { return ctx; },
    get width() { return w; },
    get height() { return h; },
    start, stop, measure,
    redraw: () => frame(0, true),
    destroy() { stop(); ro.disconnect(); io?.disconnect(); },
  };
}
