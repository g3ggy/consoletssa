/* =====================================================================
   router.js — routing su hash, un modulo alla volta.
   Ogni modulo espone { render(params) -> Node, destroy?() }.
   Il modulo precedente viene sempre distrutto: niente loop di
   animazione orfani che continuano a girare in sottofondo.
   ===================================================================== */

const routes = new Map();
let outlet = null;
let current = null;      // { name, mod, node }
let onChange = () => {};

export function defineRoute(name, loader) {
  routes.set(name, loader);
}

export function parseHash(hash = location.hash) {
  const clean = hash.replace(/^#\/?/, '');
  const [name, ...rest] = clean.split('/').filter(Boolean);
  return { name: name || 'studio', params: rest };
}

export const currentRoute = () => parseHash();

export function navigate(name, ...params) {
  const target = `#/${[name, ...params].filter(Boolean).join('/')}`;
  if (location.hash === target) { resolve(); return; }
  location.hash = target;
}

async function resolve() {
  const { name, params } = parseHash();
  const loader = routes.get(name) || routes.get('studio');
  if (!loader) return;

  if (current && current.name !== name) {
    try { current.mod.destroy?.(); } catch (err) { console.error('[router] destroy fallito', err); }
    current = null;
  }

  try {
    if (current && current.name === name) {
      // stessa vista, parametri diversi: lasciamo aggiornare il modulo
      if (current.mod.update) { current.mod.update(params); onChange(name, params); return; }
      current.mod.destroy?.();
      current = null;
    }
    const mod = await loader();
    const node = await mod.render(params);
    outlet.replaceChildren(node);
    outlet.scrollTop = 0;
    window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
    current = { name, mod, node };
    onChange(name, params);
  } catch (err) {
    console.error('[router] impossibile aprire la vista', name, err);
    outlet.replaceChildren(errorView(name, err));
  }
}

function errorView(name, err) {
  const div = document.createElement('div');
  div.className = 'card';
  div.innerHTML = `<p class="lbl">Errore</p>
    <p>La sezione <b>${name}</b> non si è caricata.</p>
    <p><small>${String(err && err.message ? err.message : err)}</small></p>
    <p><small>Se stai aprendo il file con doppio clic (protocollo <code>file://</code>) il browser
    blocca il caricamento dei moduli e dei contenuti: serve un piccolo server locale
    (<code>python3 -m http.server</code>) oppure la versione pubblicata su GitHub Pages.</small></p>`;
  return div;
}

export function startRouter(outletEl, changeHandler) {
  outlet = outletEl;
  onChange = changeHandler || onChange;
  window.addEventListener('hashchange', resolve);
  resolve();
}
