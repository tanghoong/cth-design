#!/usr/bin/env node
/**
 * contrast.mjs — check every foreground/background pairing the system permits
 * against WCAG 2.1, in both themes.
 *
 *   node scripts/contrast.mjs          report every pair
 *   node scripts/contrast.mjs --fail   exit 1 if any required pair fails (CI)
 *
 * Values are parsed out of tokens.css, so this cannot drift from the system:
 * change a token and the next run tells you what it broke.
 *
 * No dependencies. Reads one file, does arithmetic, prints a table.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CSS = fs.readFileSync(path.join(ROOT, 'assets/css/tokens.css'), 'utf8');

/* --- Parse ---------------------------------------------------------------
   Only `--name: light-dark(a, b);` declarations. Anything computed at
   runtime (color-mix, var references) cannot be resolved statically and is
   deliberately skipped rather than guessed at. */
const tokens = { light: {}, dark: {} };
for (const m of CSS.matchAll(/--([a-z0-9-]+):\s*light-dark\(\s*([^,]+?)\s*,\s*([^)]+?)\s*\)/g)) {
  tokens.light[m[1]] = m[2].trim();
  tokens.dark[m[1]] = m[3].trim();
}

/* --- Colour maths --------------------------------------------------------  */
const hex = h => {
  h = h.replace('#', '').trim();
  if (h.length === 3) h = [...h].map(c => c + c).join('');
  return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16));
};
const lum = h => {
  const [r, g, b] = hex(h).map(v => v / 255)
    .map(c => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a, b) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

/* --- Perceptual difference -----------------------------------------------
   WCAG contrast is a LUMINANCE ratio, which is the right question for text on
   a background and the wrong one for "can I tell these two chart colours
   apart". Two greens can differ obviously in hue while sitting at nearly
   identical luminance — the ratio says 1.03, the eye says "clearly different".
   For adjacent ramp steps the honest measure is perceptual distance, so this
   converts to OKLab and takes the Euclidean distance. */
const oklab = h => {
  const [r, g, b] = hex(h).map(v => v / 255)
    .map(c => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s,
  ];
};
const deltaE = (a, b) => {
  const [l1, a1, b1] = oklab(a), [l2, a2, b2] = oklab(b);
  return Math.hypot(l1 - l2, a1 - a2, b1 - b2);
};

/* --- What must pass ------------------------------------------------------
   `min` is the threshold this pair has to clear:
     4.5  body text            (WCAG AA normal)
     3.0  large text, and UI component boundaries (AA non-text)
   A pair marked `note` is checked and reported but not enforced, because it
   is documented as decorative or is a known, deliberate exception. */
const PAIRS = [
  // Body and supporting text on each surface
  ['text',   'bg',           4.5, 'Body text on the page'],
  ['text',   'bg-sunken',    4.5, 'Body text on a sunken band'],
  ['text',   'bg-elevated',  4.5, 'Body text in a card'],
  ['text-2', 'bg',           4.5, 'Supporting copy on the page'],
  ['text-2', 'bg-sunken',    4.5, 'Supporting copy on a sunken band'],
  ['text-2', 'bg-elevated',  4.5, 'Supporting copy in a card'],
  ['text-3', 'bg',           4.5, 'Labels and metadata on the page'],
  ['text-3', 'bg-sunken',    4.5, 'Labels on a sunken band'],
  ['text-3', 'bg-elevated',  4.5, 'Labels in a card'],

  // Accent: as a link colour it is body text, so it needs the full 4.5
  ['accent',     'bg',          4.5, 'Link / accent text on the page'],
  ['accent',     'bg-sunken',   4.5, 'Accent text on a sunken band'],
  ['accent',     'bg-elevated', 4.5, 'Accent text in a card'],
  ['accent-ink', 'accent',      4.5, 'Label on a filled accent button'],

  // Status colours are used as text on their own wash and on the surfaces
  ['ok',     'bg',          4.5, 'Success text'],
  ['warn',   'bg',          4.5, 'Warning text'],
  ['danger', 'bg',          4.5, 'Error text'],
  ['info',   'bg',          4.5, 'Info text'],
  ['ok',     'bg-elevated', 4.5, 'Success text in a card'],
  ['warn',   'bg-elevated', 4.5, 'Warning text in a card'],
  ['danger', 'bg-elevated', 4.5, 'Error text in a card'],
  ['info',   'bg-elevated', 4.5, 'Info text in a card'],

  // Non-text: the focus ring must be visible against every surface it can
  // land on. 3:1 is the WCAG 2.1 non-text threshold.
  ['accent', 'bg-sunken',   3.0, 'Focus ring against a sunken surface'],
  ['accent', 'bg-elevated', 3.0, 'Focus ring against an elevated surface'],

  // Chart ramp start, which is also the accent, must hold as a standalone fill.
  ['c-from', 'bg', 3.0, 'Chart ramp start as a fill'],

  // 🔴 --c-to is deliberately NOT held to 3:1 against the page. The pale end of
  // the ramp is only ever a segment adjacent to other segments — a stacked bar,
  // a block in a row — never a lone shape on the background. What it actually
  // has to satisfy is the adjacent-step check below: can you tell it from its
  // neighbour? Enforcing 3:1 here would force the ramp to compress into a range
  // too narrow to distinguish six series, which is the opposite of the goal.
  ['c-to', 'bg', 0, 'Chart ramp end (informational — see adjacent-step check)'],
];

/* Adjacent steps in the ramp must be perceptually distinguishable — the test
   that actually matters for a stacked bar. Measured as OKLab distance, where
   ~0.02 is about the just-noticeable threshold for large flat areas. 0.045
   gives a clear boundary without forcing the ramp to span a range too wide to
   stay on-brand. */
const RAMP_MIN_DELTA = 0.045;

/* --- Run -----------------------------------------------------------------  */
const strict = process.argv.includes('--fail');
let failures = 0, checked = 0;

for (const theme of ['light', 'dark']) {
  console.log(`\n  ${theme.toUpperCase()}\n  ${'─'.repeat(74)}`);
  for (const [fg, bg, min, label] of PAIRS) {
    const f = tokens[theme][fg], b = tokens[theme][bg];
    if (!f || !b || !f.startsWith('#') || !b.startsWith('#')) {
      console.log(`  ${'skip'.padEnd(7)} --${fg} on --${bg}  (not a static hex)`);
      continue;
    }
    const r = ratio(f, b);
    if (min === 0) {
      console.log(
        `  ${'note'.padEnd(7)}${r.toFixed(2).padStart(6)} : 1  ${'(not enforced)'.padEnd(11)}` +
        `--${fg} on --${bg}`.padEnd(34) + `${label}`
      );
      continue;
    }
    checked++;
    const ok = r >= min;
    if (!ok) failures++;
    // Flag anything that passes with under 10% headroom — it is one token
    // tweak away from failing, and worth knowing before that tweak happens.
    const tight = ok && r < min * 1.1;
    const mark = ok ? (tight ? 'tight' : 'pass') : 'FAIL';
    console.log(
      `  ${mark.padEnd(7)}${r.toFixed(2).padStart(6)} : 1  ${`(needs ${min})`.padEnd(11)}` +
      `--${fg} on --${bg}`.padEnd(34) + `${label}`
    );
  }

  // Adjacent ramp steps
  const steps = ['c-1', 'c-2', 'c-3', 'c-4', 'c-5', 'c-6']
    .map(k => tokens[theme][k]).filter(v => v && v.startsWith('#'));
  for (let i = 0; i < steps.length - 1; i++) {
    checked++;
    const d = deltaE(steps[i], steps[i + 1]);
    const ok = d >= RAMP_MIN_DELTA;
    if (!ok) failures++;
    console.log(
      `  ${(ok ? 'pass' : 'FAIL').padEnd(7)}${d.toFixed(3).padStart(6)} ΔE  ` +
      `${`(needs ${RAMP_MIN_DELTA})`.padEnd(11)}` +
      `--c-${i + 1} vs --c-${i + 2}`.padEnd(34) + 'Adjacent chart steps distinguishable'
    );
  }
}

console.log(`\n  ${checked} pairs checked, ${failures} failing.\n`);

if (failures && strict) {
  console.error('  Contrast check failed. Fix the token or document the exception.\n');
  process.exit(1);
}
