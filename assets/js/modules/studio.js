/* =====================================================================
   studio.js — lettura del manuale: indice, capitolo, avanzamento.
   ===================================================================== */

import { el, mount, $, fold } from '../core/dom.js';
import { renderMarkdown } from '../core/markdown.js';
import { loadManual } from '../core/manual.js';
import { getState, markRead, isRead, update } from '../core/store.js';
import { icon } from '../core/ui.js';
import { navigate } from '../core/router.js';

let manual = null;
let ui = null;

/* ------------------------------ indice ------------------------------ */
function buildToc(chapters, activeSlug, filter) {
  const term = fold(filter || '');
  const wrap = el('div.toc-body');
  let lastPart = null;

  const visible = term
    ? chapters.filter((c) => fold(c.title).includes(term) || c.plain.includes(term))
    : chapters;

  if (!visible.length) {
    wrap.append(el('p', { class: 'study-empty', text: 'Nessun capitolo trovato.' }));
    return wrap;
  }

  visible.forEach((c) => {
    if (c.part !== lastPart) {
      lastPart = c.part;
      wrap.append(el('p.toc-part', { text: c.part }));
    }
    wrap.append(el('a', {
      href: `#/studio/${c.slug}`,
      class: [c.slug === activeSlug ? 'active' : '', isRead(c.slug) ? 'done' : ''].filter(Boolean).join(' '),
    }, [
      el('span.n', { text: String(c.n) }),
      el('span', { text: c.title }),
    ]));
  });
  return wrap;
}

/* ----------------------------- capitolo ----------------------------- */
function chapterView(chapter) {
  const body = el('article.prose');
  body.innerHTML = renderMarkdown(chapter.markdown);

  const idx = manual.chapters.indexOf(chapter);
  const prev = manual.chapters[idx - 1];
  const next = manual.chapters[idx + 1];

  const readBtn = el('button.btn', { type: 'button' });
  const syncReadBtn = () => {
    const done = isRead(chapter.slug);
    readBtn.replaceChildren(icon('check'), document.createTextNode(done ? 'Letto' : 'Segna come letto'));
    readBtn.setAttribute('aria-pressed', String(done));
  };
  readBtn.addEventListener('click', () => {
    markRead(chapter.slug, !isRead(chapter.slug));
    syncReadBtn();
    ui?.refreshToc();
    ui?.refreshProgress();
  });
  syncReadBtn();

  const nav = el('div.chapter-nav', {}, [
    prev
      ? el('button.btn', { type: 'button', onclick: () => navigate('studio', prev.slug) },
        [icon('prev'), `${prev.n}. ${prev.title}`])
      : el('span', { style: { flex: '1' } }),
    next
      ? el('button.btn.pri', { type: 'button', onclick: () => {
        if (!isRead(chapter.slug)) { markRead(chapter.slug, true); ui?.refreshToc(); ui?.refreshProgress(); }
        navigate('studio', next.slug);
      } }, [`${next.n}. ${next.title}`, icon('next')])
      : el('button.btn.pri', { type: 'button', onclick: () => navigate('ripasso') },
        ['Vai al ripasso', icon('next')]),
  ]);

  return el('div.chapter', {}, [
    el('div.row', { style: { marginBottom: '10px' } }, [
      el('span.lbl', { style: { margin: '0' }, text: `${chapter.part} · capitolo ${chapter.n}` }),
      el('span.spacer'),
      readBtn,
    ]),
    el('h2', { text: chapter.title }),
    body,
    nav,
  ]);
}

/* ------------------------------ vista ------------------------------- */
export async function render(params) {
  manual = await loadManual();

  const slug = params?.[0] || getState().lastChapter || manual.chapters[0].slug;
  const chapter = manual.chapters.find((c) => c.slug === slug) || manual.chapters[0];
  update({ lastChapter: chapter.slug });

  const search = el('input.toc-search', {
    type: 'search', placeholder: 'Filtra i capitoli…', 'aria-label': 'Filtra i capitoli',
  });
  // Su schermo stretto l'indice parte chiuso: senza questo pulsante
  // resterebbe irraggiungibile.
  const tocToggle = el('button.btn.sm.toc-toggle', {
    type: 'button', 'aria-expanded': 'false',
  }, ['Indice dei capitoli', icon('next')]);
  const tocHost = el('nav.toc', { 'aria-label': 'Indice del manuale' }, [
    tocToggle, search, buildToc(manual.chapters, chapter.slug, ''),
  ]);
  tocToggle.addEventListener('click', () => {
    const open = tocHost.classList.toggle('open');
    tocToggle.setAttribute('aria-expanded', String(open));
  });
  search.addEventListener('input', () => {
    const old = $('.toc-body', tocHost);
    old.replaceWith(buildToc(manual.chapters, chapter.slug, search.value));
  });

  const progressMeter = el('div.meter', {}, [el('i')]);
  const progressTxt = el('span.num', { style: { fontSize: '13px' } });
  const main = el('div.study-main');

  const bar = el('div.study-bar', {}, [
    el('div.prog', {}, [
      el('span.lbl', { style: { margin: '0' }, text: 'Avanzamento sul manuale' }),
      progressMeter,
    ]),
    progressTxt,
    el('span.spacer'),
    el('button.btn.sm', { type: 'button', onclick: () => navigate('simulazioni') },
      [icon('sim'), 'Metti alla prova']),
  ]);

  function refreshProgress() {
    const read = manual.chapters.filter((c) => isRead(c.slug)).length;
    const pct = Math.round((read / manual.chapters.length) * 100);
    $('i', progressMeter).style.width = `${pct}%`;
    progressTxt.textContent = `${read}/${manual.chapters.length} · ${pct}%`;
  }

  ui = {
    refreshToc() {
      const old = $('.toc-body', tocHost);
      old.replaceWith(buildToc(manual.chapters, chapter.slug, search.value));
    },
    refreshProgress,
  };

  mount(main, bar, chapterView(chapter));
  refreshProgress();

  return el('div.view', {}, [
    el('div.study', {}, [tocHost, main]),
  ]);
}

export function destroy() {
  ui = null;
}
