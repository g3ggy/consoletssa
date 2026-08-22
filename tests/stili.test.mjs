/* Controlli sui fogli di stile.

   I test di questo progetto girano senza DOM, quindi qui non si misura
   davvero un rendering: si legge il CSS come testo e si controlla che
   certe regole ci siano o non ci siano. È un controllo indiretto, e va
   preso per quello che è — ma le due cose che guarda sono difetti veri,
   trovati su un iPad da 11 pollici, e un test testuale basta a impedire
   che tornino.

   Il primo è il numero di versione sparito da telefono. Il secondo è
   l'iPad in verticale — 834 punti — che finiva sotto la soglia dei 900
   e prendeva il layout pensato per il telefono: tutto in colonna, e
   pagine da tremila pixel su uno schermo grande. */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = (nome) => readFileSync(new URL(`../assets/css/${nome}`, import.meta.url), 'utf8');

/** I blocchi `@media` di un foglio, col loro contenuto. */
function blocchiMedia(testo) {
  const blocchi = [];
  const re = /@media([^{]+)\{/g;
  let m = re.exec(testo);
  while (m) {
    // si conta a graffe per prendere il blocco intero, annidati compresi
    let profondita = 1;
    let i = m.index + m[0].length;
    while (i < testo.length && profondita > 0) {
      if (testo[i] === '{') profondita += 1;
      if (testo[i] === '}') profondita -= 1;
      i += 1;
    }
    blocchi.push({ condizione: m[1].trim(), corpo: testo.slice(m.index + m[0].length, i - 1) });
    re.lastIndex = i;
    m = re.exec(testo);
  }
  return blocchi;
}

test('il numero di versione non si nasconde sugli schermi piccoli', () => {
  /* Serve proprio a chi legge da telefono: è così che un collega capisce
     se ha la copia aggiornata o una vecchia rimasta nella cache. Se una
     media query lo manda in `display: none`, il numero non lo vede
     nessuno di quelli a cui serve. */
  const testo = css('app.css');
  blocchiMedia(testo)
    .filter((b) => /max-width/.test(b.condizione))
    .forEach((b) => {
      b.corpo
        .split('\n')
        .filter((r) => /display:\s*none/.test(r))
        .forEach((r) => {
          /* Conta solo se a sparire è il contenitore intero. Nascondere
             un pezzo interno — la data accanto al numero, che su una riga
             sottile non ci sta — è un'altra cosa, e va bene. */
          const selettori = r.split('{')[0].split(',').map((x) => x.trim());
          const spariti = selettori.filter((x) => ['.rail-foot', '.versione', '.rail-foot .versione'].includes(x));
          assert.equal(spariti.length, 0,
            `«${b.condizione}» nasconde la versione: ${spariti.join(', ')}`);
        });
    });
});

test('il tablet in verticale non prende il layout del telefono', () => {
  /* Un iPad da 11 pollici in verticale è largo 834 punti. Finché le due
     colonne dell'intervento partivano da 1080, lì dentro finiva tutto in
     una colonna sola: il monitor largo quanto lo schermo, il diario sotto
     la piega, e una pagina da tremila pixel da scorrere. */
  const testo = css('intervento.css');
  const dueColonne = blocchiMedia(testo)
    .filter((b) => /min-width/.test(b.condizione))
    .filter((b) => /\.int-corpo\s*\{[^}]*grid-template-columns/.test(b.corpo));

  assert.ok(dueColonne.length, 'nessuna media query mette l\'intervento a due colonne');

  const soglie = dueColonne.map((b) => Number(/min-width:\s*(\d+)px/.exec(b.condizione)?.[1]));
  const minima = Math.min(...soglie);
  assert.ok(minima <= 834,
    `le due colonne partono da ${minima}px: un iPad in verticale (834) resta in colonna singola`);
});
