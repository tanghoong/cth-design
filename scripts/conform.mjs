#!/usr/bin/env node
/**
 * conform.mjs — check an HTML page against the design system.
 *
 *   node scripts/conform.mjs index.html
 *   node scripts/conform.mjs "pages/*.html"
 *   node scripts/conform.mjs --fail path/to/page.html     exit 1 on any error
 *
 * This is the other half of pointing an agent at llms.txt: it writes a page,
 * this tells you whether the page actually follows the system. Every rule here
 * corresponds to something written down in llms.txt or on a reference page —
 * if a rule is not documented, it does not belong in this file.
 *
 * Deliberately regex-based and dependency-free, so it runs anywhere Node runs
 * and can be dropped into a repo that has no build. It reads text, not a DOM,
 * so it will not catch everything — see the caveat at the bottom of the output.
 */

import fs from 'node:fs';
import path from 'node:path';

/* --- Rules ---------------------------------------------------------------
   Each rule gets the file's text and returns an array of findings.
   level: 'error'   breaks the system — a value or a11y rule
          'warn'    almost always wrong, occasionally justified
          'info'    worth a look, not a defect
*/

const lineOf = (text, index) => text.slice(0, index).split('\n').length;

/* Every class the stylesheets define, built once and handed to the rules.
   Without this, a class no stylesheet declares just silently does nothing —
   which is exactly what a missing utility step does, and it is invisible to
   every other check in this file. */
function definedClasses(root) {
  const dir = path.join(root, 'assets/css');
  if (!fs.existsSync(dir)) return null;
  const css = fs.readdirSync(dir)
    .filter(f => f.endsWith('.css'))
    .map(f => fs.readFileSync(path.join(dir, f), 'utf8'))
    .join('\n');
  return new Set([...css.matchAll(/\.(-?[_a-zA-Z][\w-]*)/g)].map(m => m[1]));
}

const RULES = [

  /* ---- Tokens ---------------------------------------------------------- */
  {
    id: 'literal-colour',
    level: 'error',
    why: 'Colours come from tokens.css. A literal hex cannot follow the theme.',
    run(text) {
      const out = [];
      // Inline styles and <style> blocks only. Ignore SVG fill/stroke on the
      // brand mark, which is documented as the one fixed-colour exception.
      for (const m of text.matchAll(/style="([^"]*)"/g)) {
        if (!/#[0-9a-fA-F]{3,8}\b/.test(m[1])) continue;
        if (/brand__mark|favicon/.test(text.slice(Math.max(0, m.index - 260), m.index))) continue;
        out.push({ line: lineOf(text, m.index), text: m[1].trim().slice(0, 68) });
      }
      return out;
    },
  },
  {
    id: 'literal-size',
    level: 'warn',
    why: 'Font sizes, radii and durations come from tokens. Raw px in an inline style bypasses the scale.',
    run(text) {
      const out = [];
      for (const m of text.matchAll(/style="([^"]*)"/g)) {
        const s = m[1];
        if (/(?:font-size|border-radius|transition-duration|animation-duration)\s*:\s*[\d.]+(?:px|ms|s)\b/.test(s)) {
          out.push({ line: lineOf(text, m.index), text: s.trim().slice(0, 68) });
        }
      }
      return out;
    },
  },

  {
    id: 'unknown-class',
    level: 'error',
    why: 'A class no stylesheet defines does nothing. It does not error — the styling it was meant to apply is simply absent.',
    run(text, ctx) {
      if (!ctx || !ctx.defined) return [];
      const out = [];
      // Escaped code samples are illustrations, not live markup.
      const live = text.replace(/<pre>[\s\S]*?<\/pre>/g, m => ' '.repeat(m.length));
      for (const m of live.matchAll(/class="([^"]+)"/g)) {
        // SVG <g> groups carry structural labels with no styling. Legitimate.
        const tag = live.slice(Math.max(0, m.index - 40), m.index).match(/<([a-z]+)[^<]*$/);
        if (tag && tag[1] === 'g') continue;
        for (const cls of m[1].split(/\s+/).filter(Boolean)) {
          if (ctx.defined.has(cls)) continue;
          out.push({ line: lineOf(text, m.index), text: '.' + cls });
        }
      }
      return out;
    },
  },

  /* ---- Stylesheet wiring ------------------------------------------------ */
  {
    id: 'docs-css-shipped',
    level: 'error',
    why: 'docs.css styles the reference site only. Shipping it leaks specimen chrome into a product.',
    run(text) {
      const out = [];
      for (const m of text.matchAll(/<link[^>]+href="[^"]*docs\.css"[^>]*>/g)) {
        out.push({ line: lineOf(text, m.index), text: m[0].slice(0, 68) });
      }
      return out;
    },
  },
  {
    id: 'css-order',
    level: 'error',
    why: 'tokens.css must load first or every var() falls back; utilities.css must load last or it cannot win.',
    run(text) {
      const links = [...text.matchAll(/<link[^>]+href="[^"]*\/([a-z]+)\.css"/g)].map(m => m[1]);
      const known = links.filter(n =>
        ['tokens', 'base', 'layout', 'components', 'forms', 'overlays', 'content', 'utilities'].includes(n));
      if (!known.length) return [];
      const out = [];
      if (known[0] !== 'tokens') out.push({ line: 0, text: `first stylesheet is ${known[0]}.css, expected tokens.css` });
      const last = known[known.length - 1];
      if (known.includes('utilities') && last !== 'utilities') {
        out.push({ line: 0, text: `last stylesheet is ${last}.css, expected utilities.css` });
      }
      return out;
    },
  },
  {
    id: 'theme-init',
    level: 'error',
    why: 'Without the inline init before the stylesheet, the page paints the wrong theme for a frame.',
    run(text) {
      if (!/<html/i.test(text)) return [];
      const init = text.indexOf("localStorage.getItem('th')");
      if (init < 0) return [{ line: 0, text: 'no theme-init script found in <head>' }];
      const firstCss = text.search(/<link[^>]+rel="stylesheet"/);
      if (firstCss >= 0 && init > firstCss) {
        return [{ line: lineOf(text, init), text: 'theme-init runs after the first stylesheet' }];
      }
      return [];
    },
  },

  /* ---- Structure and a11y ---------------------------------------------- */
  {
    id: 'h1-count',
    level: 'error',
    why: 'Exactly one h1 per page. Style a <p> if you need heading-sized text that is not a heading.',
    run(text) {
      const n = (text.match(/<h1[\s>]/g) || []).length;
      if (!/<html/i.test(text)) return [];
      return n === 1 ? [] : [{ line: 0, text: `${n} <h1> elements` }];
    },
  },
  {
    id: 'heading-skip',
    level: 'warn',
    why: 'A skipped level breaks the document outline for anyone navigating by headings.',
    run(text) {
      const levels = [...text.matchAll(/<h([1-6])[\s>]/g)].map(m => +m[1]);
      const out = [];
      for (let i = 1; i < levels.length; i++) {
        if (levels[i] > levels[i - 1] + 1) {
          out.push({ line: 0, text: `h${levels[i - 1]} followed by h${levels[i]}` });
        }
      }
      return out;
    },
  },
  {
    id: 'one-primary',
    level: 'warn',
    why: 'One .btn--filled per view. Two primaries means neither is.',
    run(text) {
      const n = (text.match(/class="[^"]*\bbtn--filled\b/g) || []).length;
      return n > 1 ? [{ line: 0, text: `${n} .btn--filled on the page` }] : [];
    },
  },
  {
    id: 'input-label',
    level: 'error',
    why: 'Every field needs a real label. A placeholder is not a label.',
    run(text) {
      const out = [];
      for (const m of text.matchAll(/<(input|textarea|select)\b([^>]*)>/g)) {
        const attrs = m[2];
        if (/type="(hidden|submit|button|reset|image)"/.test(attrs)) continue;
        const id = attrs.match(/\bid="([^"]+)"/);
        // Wrapping the input in a <label> is implicit labelling — valid HTML,
        // and exactly what .check and .switch rely on. Detect it by looking
        // back for a <label> that has not been closed yet.
        const before = text.slice(0, m.index);
        const wrapped = before.lastIndexOf('<label') > before.lastIndexOf('</label>');
        const labelled =
          wrapped ||
          /aria-label=|aria-labelledby=/.test(attrs) ||
          (id && new RegExp(`<label[^>]+for="${id[1]}"`).test(text));
        if (!labelled) out.push({ line: lineOf(text, m.index), text: m[0].slice(0, 68) });
      }
      return out;
    },
  },
  {
    id: 'icon-button-name',
    level: 'error',
    why: 'A button whose only content is an SVG has no accessible name without aria-label.',
    run(text) {
      const out = [];
      for (const m of text.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/g)) {
        const [, attrs, inner] = m;
        const visibleText = inner.replace(/<svg[\s\S]*?<\/svg>/g, '').replace(/<[^>]+>/g, '').trim();
        if (visibleText) continue;
        if (/aria-label=|aria-labelledby=/.test(attrs)) continue;
        out.push({ line: lineOf(text, m.index), text: m[0].slice(0, 68).replace(/\s+/g, ' ') });
      }
      return out;
    },
  },
  {
    id: 'svg-role',
    level: 'warn',
    why: 'An SVG is either decorative (aria-hidden) or content (role="img" + a name). It must declare which.',
    run(text) {
      const out = [];
      for (const m of text.matchAll(/<svg\b([^>]*)>/g)) {
        if (/aria-hidden=|role="img"|role="presentation"/.test(m[1])) continue;
        out.push({ line: lineOf(text, m.index), text: m[0].slice(0, 68) });
      }
      return out;
    },
  },
  {
    id: 'img-alt',
    level: 'error',
    why: 'Every <img> needs alt. Empty alt="" is correct for decoration; omitting it is not.',
    run(text) {
      const out = [];
      for (const m of text.matchAll(/<img\b([^>]*)>/g)) {
        if (/\balt=/.test(m[1])) continue;
        out.push({ line: lineOf(text, m.index), text: m[0].slice(0, 68) });
      }
      return out;
    },
  },
  {
    id: 'table-wrap',
    level: 'warn',
    why: 'A table must scroll inside .table-wrap. Unwrapped, it makes the whole page scroll sideways on a phone.',
    run(text) {
      const out = [];
      for (const m of text.matchAll(/<table\b[^>]*>/g)) {
        // .prose gives its tables display:block + overflow-x:auto in
        // content.css, so they already scroll. Search back for an unclosed
        // prose wrapper rather than a fixed window.
        const before = text.slice(0, m.index);
        if (/table-wrap/.test(before.slice(-220)) || /<pre/.test(before.slice(-220))) continue;
        const proseOpen = before.lastIndexOf('class="prose"');
        if (proseOpen > -1 && proseOpen > before.lastIndexOf('</article>')) continue;
        out.push({ line: lineOf(text, m.index), text: m[0].slice(0, 68) });
      }
      return out;
    },
  },
  {
    id: 'outline-none',
    level: 'error',
    why: 'Removing the focus outline without replacing it makes the page unusable by keyboard.',
    run(text) {
      const out = [];
      for (const m of text.matchAll(/outline\s*:\s*(none|0)\b/g)) {
        const ctx = text.slice(Math.max(0, m.index - 160), m.index + 160);
        if (/:focus-visible|focus-visible\)/.test(ctx)) continue;
        out.push({ line: lineOf(text, m.index), text: ctx.split('\n').find(l => l.includes('outline'))?.trim().slice(0, 68) ?? m[0] });
      }
      return out;
    },
  },
  {
    id: 'navsheet-in-header',
    level: 'error',
    why: '.site-head sets backdrop-filter, which traps position:fixed descendants. The sheet must be a sibling.',
    run(text) {
      const h = text.indexOf('<header class="site-head"');
      if (h < 0) return [];
      const end = text.indexOf('</header>', h);
      const inner = text.slice(h, end);
      const m = inner.match(/<dialog[^>]*class="[^"]*navsheet/);
      return m ? [{ line: lineOf(text, h + inner.indexOf(m[0])), text: 'nav sheet <dialog> is inside <header>' }] : [];
    },
  },
  {
    id: 'aria-busy-static',
    level: 'info',
    why: 'aria-busy left set in static markup means the region is permanently "updating" to a screen reader.',
    run(text) {
      const out = [];
      for (const m of text.matchAll(/aria-busy="true"/g)) {
        out.push({ line: lineOf(text, m.index), text: 'aria-busy="true" in static markup — is it cleared on load?' });
      }
      return out;
    },
  },

  /* ---- Meta ------------------------------------------------------------- */
  {
    id: 'meta',
    level: 'warn',
    why: 'Title, description and og:image decide how the page appears in a tab, a search result and a shared link.',
    run(text) {
      if (!/<html/i.test(text)) return [];
      const out = [];
      const title = text.match(/<title>([^<]*)<\/title>/);
      if (!title) out.push({ line: 0, text: 'no <title>' });
      else {
        if (title[1].length > 60) out.push({ line: lineOf(text, title.index), text: `title is ${title[1].length} chars, over 60` });
        if (!title[1].includes('—') && !/^(tanghoong|Charlie)/.test(title[1])) {
          out.push({ line: lineOf(text, title.index), text: 'title should be "Page name — Site name"' });
        }
      }
      const desc = text.match(/<meta name="description" content="([^"]*)"/);
      if (!desc) out.push({ line: 0, text: 'no meta description' });
      else if (desc[1].length > 160) out.push({ line: lineOf(text, desc.index), text: `description is ${desc[1].length} chars, over 160` });
      if (!/property="og:image"/.test(text)) out.push({ line: 0, text: 'no og:image — shared links will preview blank' });
      return out;
    },
  },
];

/* --- Run ----------------------------------------------------------------- */
const args = process.argv.slice(2);
const strict = args.includes('--fail');
const targets = args.filter(a => !a.startsWith('--'));

if (!targets.length) {
  console.error('usage: node scripts/conform.mjs <file.html> [more.html ...] [--fail]');
  process.exit(2);
}

const files = targets.flatMap(t => {
  if (fs.existsSync(t) && fs.statSync(t).isDirectory()) {
    return fs.readdirSync(t).filter(f => f.endsWith('.html')).map(f => path.join(t, f));
  }
  return [t];
});

let errors = 0, warns = 0, infos = 0;

// Resolve the stylesheets relative to the first target, so the check works
// from a consuming repo as well as from this one.
const root = path.resolve(path.dirname(files[0] || '.'), files[0]?.includes('/') ? '..' : '.');
const ctx = { defined: definedClasses(root) || definedClasses(process.cwd()) };
if (!ctx.defined) console.log('  (no assets/css found — unknown-class rule skipped)');

for (const file of files) {
  if (!fs.existsSync(file)) { console.error(`  missing: ${file}`); errors++; continue; }
  const text = fs.readFileSync(file, 'utf8');

  // A page can waive a rule with <!-- conform:allow rule-id reason -->.
  // Deliberate exceptions belong in the page that makes them, not in a
  // weakened rule that stops catching the case everywhere else.
  const waived = new Set(
    [...text.matchAll(/<!--\s*conform:allow\s+([a-z-]+)/g)].map(m => m[1]));

  const found = [];
  for (const rule of RULES) {
    if (waived.has(rule.id)) continue;
    for (const hit of rule.run(text, ctx)) found.push({ rule, ...hit });
  }
  if (!found.length) { console.log(`\n  ✓ ${file}`); continue; }

  console.log(`\n  ${file}`);
  console.log(`  ${'─'.repeat(72)}`);
  for (const f of found.sort((a, b) => a.line - b.line)) {
    if (f.rule.level === 'error') errors++;
    else if (f.rule.level === 'warn') warns++;
    else infos++;
    const loc = f.line ? `:${f.line}` : '';
    console.log(`  ${f.rule.level.toUpperCase().padEnd(6)} ${(f.rule.id + loc).padEnd(28)} ${f.text}`);
    console.log(`  ${''.padEnd(6)} ${''.padEnd(28)} ↳ ${f.rule.why}`);
  }
}

console.log(`\n  ${files.length} file(s): ${errors} error, ${warns} warn, ${infos} info.`);
console.log(`  Text-based, so it cannot see computed styles or runtime behaviour —`);
console.log(`  it is a first pass, not a substitute for opening the page.\n`);

if (errors && strict) process.exit(1);
