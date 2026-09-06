#!/usr/bin/env node
/**
 * ramp.mjs — generate the chart ramp.
 *
 *   node scripts/ramp.mjs            the 6 steps that live in tokens.css
 *   node scripts/ramp.mjs 10         any sample count
 *   node scripts/ramp.mjs 16 --json  machine-readable, for a card generator
 *
 * The ramp is a FUNCTION, not a palette: interpolate the accent out to a pale
 * end and sample it at however many series you have.
 *
 * 🔴 Interpolate in OKLab, not sRGB. sRGB looks like the obvious choice and it
 * is wrong: the steps come out perceptually uneven, bunching at one end. The
 * first version of this ramp was sRGB-interpolated and its last three steps sat
 * at ΔE 0.027 apart where the first three were 0.11 — three series you could
 * not tell apart, in a chart whose whole job is telling series apart.
 * scripts/contrast.mjs is what caught it.
 *
 * Endpoints are read from tokens.css, so this cannot drift from the system.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/* --- Colour space --------------------------------------------------------  */
const hex = h => { h = h.replace('#', ''); return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16)); };
const lin = c => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const unlin = c => (c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055);

const toLab = h => {
  const [r, g, b] = hex(h).map(v => v / 255).map(lin);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s,
  ];
};

const toHex = ([L, A, B]) => {
  const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3;
  const m = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3;
  const s = (L - 0.0894841775 * A - 1.2914855480 * B) ** 3;
  const rgb = [
    +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s,
  ];
  return '#' + rgb.map(v =>
    Math.round(Math.max(0, Math.min(1, unlin(v))) * 255).toString(16).padStart(2, '0')).join('');
};

const deltaE = (a, b) => {
  const [l1, a1, b1] = toLab(a), [l2, a2, b2] = toLab(b);
  return Math.hypot(l1 - l2, a1 - a2, b1 - b2);
};

/* --- The ramp ------------------------------------------------------------  */
export function ramp(from, to, n) {
  if (n < 2) return [from];
  const A = toLab(from), B = toLab(to);
  return Array.from({ length: n }, (_, i) =>
    toHex(A.map((v, k) => v + (B[k] - v) * (i / (n - 1)))));
}

/* --- Endpoints, read from the system -------------------------------------  */
const css = fs.readFileSync(path.join(ROOT, 'assets/css/tokens.css'), 'utf8');
const token = name => {
  const m = css.match(new RegExp('--' + name + ':\\s*light-dark\\(\\s*(#[0-9a-fA-F]+)\\s*,\\s*(#[0-9a-fA-F]+)\\s*\\)'));
  return m ? { light: m[1], dark: m[2] } : null;
};
const from = token('c-from'), to = token('c-to');
if (!from || !to) { console.error('could not read --c-from / --c-to from tokens.css'); process.exit(1); }

/* --- Output --------------------------------------------------------------  */
const n = Number(process.argv.find(a => /^\d+$/.test(a)) || 6);
const asJson = process.argv.includes('--json');

const out = {
  light: ramp(from.light, to.light, n),
  dark: ramp(from.dark, to.dark, n),
};

if (asJson) { console.log(JSON.stringify(out, null, 2)); process.exit(0); }

for (const theme of ['light', 'dark']) {
  const r = out[theme];
  let min = Infinity;
  for (let i = 0; i < r.length - 1; i++) min = Math.min(min, deltaE(r[i], r[i + 1]));
  console.log(`\n  ${theme.toUpperCase()}  ${n} steps, smallest adjacent ΔE ${min.toFixed(3)}`);
  console.log('  ' + r.join(' '));
  if (n === 6) {
    console.log('\n  For tokens.css:');
    r.forEach((c, i) => console.log(`  --c-${i + 1}: light-dark(${out.light[i]}, ${out.dark[i]});`));
  }
}
console.log(`
  ΔE 0.045 is the floor for a chart with a legend. Higher sample counts
  necessarily fall below it — at 10 or 16 series you label each block in
  place and there is no legend to match a colour back to.
`);
