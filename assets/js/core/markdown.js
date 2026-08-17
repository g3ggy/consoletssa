/* =====================================================================
   markdown.js — renderer minimale, tarato sul markdown del manuale.
   Supporta: heading, paragrafi, liste (anche annidate), tabelle,
   citazioni, righe orizzontali, grassetto/corsivo/codice, link.
   Nessuna dipendenza esterna: l'HTML in ingresso viene sempre escapato.
   ===================================================================== */

import { escapeHtml, fold } from './dom.js';

/* ------------------------------ inline ------------------------------ */
function inline(src) {
  let s = escapeHtml(src);

  // codice inline: protetto per primo, così non viene toccato dal resto
  const codes = [];
  s = s.replace(/`([^`]+)`/g, (_, c) => {
    codes.push(c);
    return `\u0001${codes.length - 1}\u0001`;
  });

  s = s
    .replace(/\*\*\*([^*]+)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[\s(])\*([^*\n]+)\*/g, '$1<em>$2</em>')
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, text, href) => {
      const safe = /^(https?:|#|\.\/|\/)/.test(href) ? href : '#';
      const ext = /^https?:/.test(safe);
      return `<a href="${safe}"${ext ? ' target="_blank" rel="noopener"' : ''}>${text}</a>`;
    });

  return s.replace(/\u0001(\d+)\u0001/g, (_, i) => `<code>${codes[+i]}</code>`);
}

/* --------------------------- helper di blocco ----------------------- */
const isTableRow = (l) => /^\s*\|.*\|\s*$/.test(l);
const isTableSep = (l) => /^\s*\|[\s:|-]+\|\s*$/.test(l);

function renderTable(lines) {
  const cells = (l) => l.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
  const head = cells(lines[0]);
  const body = lines.slice(2).map(cells);
  const th = head.map((c) => `<th>${inline(c)}</th>`).join('');
  const rows = body
    .map((r) => `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join('')}</tr>`)
    .join('');
  return `<div class="table-wrap"><table><thead><tr>${th}</tr></thead><tbody>${rows}</tbody></table></div>`;
}

function quoteClass(text) {
  const t = fold(text);
  if (/attenzione|errore|mai |non si |pericolo|trappola/.test(t)) return ' class="is-warn"';
  if (/collegamento|nota|ricorda|come usare|in pratica/.test(t)) return ' class="is-tip"';
  return '';
}

/** Converte un blocco markdown in HTML. */
export function renderMarkdown(src) {
  const lines = String(src).replace(/\r\n?/g, '\n').split('\n');
  const out = [];
  let i = 0;

  const flushList = (ordered, items) => {
    const tag = ordered ? 'ol' : 'ul';
    out.push(`<${tag}>${items.map((it) => `<li>${it}</li>`).join('')}</${tag}>`);
  };

  while (i < lines.length) {
    let line = lines[i];

    // ancore html del manuale: <a name="12"></a>
    const anchor = line.match(/^<a\s+name="([^"]+)"\s*><\/a>\s*$/);
    if (anchor) { out.push(`<span id="anchor-${anchor[1]}"></span>`); i += 1; continue; }

    if (!line.trim()) { i += 1; continue; }

    // riga orizzontale
    if (/^\s*(---|\*\*\*|___)\s*$/.test(line)) { out.push('<hr>'); i += 1; continue; }

    // heading
    const h = line.match(/^(#{1,6})\s+(.*)$/);
    if (h) {
      const lvl = h[1].length;
      const text = h[2].trim();
      const id = slugify(text);
      out.push(`<h${lvl} id="${id}">${inline(text)}</h${lvl}>`);
      i += 1;
      continue;
    }

    // blocco di codice
    if (/^```/.test(line)) {
      const buf = [];
      i += 1;
      while (i < lines.length && !/^```/.test(lines[i])) { buf.push(lines[i]); i += 1; }
      i += 1;
      out.push(`<pre><code>${escapeHtml(buf.join('\n'))}</code></pre>`);
      continue;
    }

    // tabella
    if (isTableRow(line) && isTableSep(lines[i + 1] || '')) {
      const buf = [];
      while (i < lines.length && isTableRow(lines[i])) { buf.push(lines[i]); i += 1; }
      out.push(renderTable(buf));
      continue;
    }

    // citazione
    if (/^\s*>/.test(line)) {
      const buf = [];
      while (i < lines.length && /^\s*>/.test(lines[i])) {
        buf.push(lines[i].replace(/^\s*>\s?/, ''));
        i += 1;
      }
      const inner = renderMarkdown(buf.join('\n'));
      out.push(`<blockquote${quoteClass(buf.join(' '))}>${inner}</blockquote>`);
      continue;
    }

    // liste
    const li = line.match(/^(\s*)([-*+]|\d+[.)])\s+(.*)$/);
    if (li) {
      const ordered = /\d/.test(li[2]);
      const items = [];
      let current = null;
      while (i < lines.length) {
        const m = lines[i].match(/^(\s*)([-*+]|\d+[.)])\s+(.*)$/);
        if (m) {
          if (m[1].length >= 2 && current !== null) {
            // voce annidata: la accodiamo come sotto-lista testuale
            items[current] += `<br><span class="sub">— ${inline(m[3])}</span>`;
          } else {
            items.push(inline(m[3]));
            current = items.length - 1;
          }
          i += 1;
        } else if (lines[i].trim() && /^\s{2,}\S/.test(lines[i]) && current !== null) {
          items[current] += ` ${inline(lines[i].trim())}`;
          i += 1;
        } else break;
      }
      flushList(ordered, items);
      continue;
    }

    // paragrafo
    const buf = [];
    while (i < lines.length && lines[i].trim()
      && !/^(#{1,6}\s|>|\s*([-*+]|\d+[.)])\s|```|\s*\|)/.test(lines[i])
      && !/^\s*(---|\*\*\*|___)\s*$/.test(lines[i])
      && !/^<a\s+name=/.test(lines[i])) {
      buf.push(lines[i].trim());
      i += 1;
    }
    if (buf.length) out.push(`<p>${inline(buf.join(' '))}</p>`);
    else i += 1;
  }

  return out.join('\n');
}

export function slugify(text) {
  return fold(text)
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 60) || 'sez';
}

/* =====================================================================
   Struttura del manuale: lo spezziamo in capitoli (heading `##` numerati)
   raggruppati per parte (heading `# PARTE n`).
   ===================================================================== */
export function parseManual(src) {
  const lines = String(src).replace(/\r\n?/g, '\n').split('\n');
  const chapters = [];
  let part = 'Introduzione';
  let current = null;
  const intro = [];

  const push = () => {
    if (current) {
      current.markdown = current.buf.join('\n').trim();
      delete current.buf;
      chapters.push(current);
    }
  };

  for (const line of lines) {
    const partMatch = line.match(/^#\s+PARTE\s+(\d+)\s*$/i);
    if (partMatch) { part = `Parte ${partMatch[1]}`; continue; }

    const chapMatch = line.match(/^##\s+(\d+)\.\s+(.*)$/);
    if (chapMatch) {
      push();
      current = {
        n: Number(chapMatch[1]),
        title: chapMatch[2].trim(),
        slug: `cap-${chapMatch[1]}`,
        part,
        buf: [],
      };
      continue;
    }

    // titolo di parte descrittivo subito dopo `# PARTE n`
    if (/^#\s+/.test(line) && current === null) { intro.push(line); continue; }

    if (current) current.buf.push(line);
    else intro.push(line);
  }
  push();

  // testo semplice per la ricerca
  chapters.forEach((c) => {
    c.plain = fold(c.markdown.replace(/[#*`>|_-]/g, ' ').replace(/\s+/g, ' '));
  });

  return { chapters, intro: intro.join('\n') };
}

/** Estrae uno snippet attorno alla prima occorrenza del termine. */
export function snippet(plain, term, len = 130) {
  const idx = plain.indexOf(fold(term));
  if (idx < 0) return plain.slice(0, len) + '…';
  const start = Math.max(0, idx - 40);
  const raw = plain.slice(start, start + len);
  return (start > 0 ? '…' : '') + raw + '…';
}
