#!/usr/bin/env node
/**
 * drift.mjs — find consuming repos that have gone stale.
 *
 *   node scripts/drift.mjs                  scan every sibling directory
 *   node scripts/drift.mjs ../links.tanghoong.com ../mini-web-app
 *   node scripts/drift.mjs --fail           exit 1 if anything drifted (CI)
 *   node scripts/drift.mjs --tokens=<path>  point at a tokens.css elsewhere
 *
 * contrast.mjs and conform.mjs check THIS repo. Nothing checked the repos that
 * consume it, and that is where the system actually decays: a value gets
 * copied into another repo's own document, the system moves on, and the copy
 * keeps being read as authoritative. It looks verified. Nothing verifies it.
 *
 * 🔴 This is not hypothetical. On 2026-09-06 five repos were carrying the same
 * three stale contrast figures — 17.4:1 for `--text`, 4.8:1 for `--text-3`,
 * 6.4:1 for the accent — none of which had been true for weeks, all copied
 * from one document that was wrong before it was duplicated. Separately, the
 * pre-1.3.0 ramp put `#03724d` into a card generator, one digit off `--accent`
 * and invisible to every reader.
 *
 * Three checks, in descending order of certainty:
 *
 *   stale      an exact hit on a value this system used to ship. Certain.
 *   near-miss  a hex within ΔE 0.02 of a live token but not equal to it. This
 *              is the #03724d class: close enough that nobody sees it, far
 *              enough that a chart and a button are different greens.
 *   claim      a line asserting "#aaa on #bbb is N:1" where N is not what the
 *              arithmetic says. Recomputed, not trusted.
 *
 * No dependencies. Reads files, does arithmetic, prints what to fix.
 */

import { readdir, readFile, stat } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const argv = process.argv.slice(2);
const flag = (name) => {
  const hit = argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : null;
};
const FAIL = argv.includes('--fail');
const VERBOSE = argv.includes('--verbose');
const targets = argv.filter((a) => !a.startsWith('--'));

/* ------------------------------------------------------------------ colour */

const parseHex = (h) => {
  let s = h.replace('#', '').toLowerCase();
  if (s.length === 3) s = [...s].map((c) => c + c).join('');
  return [0, 2, 4].map((i) => parseInt(s.slice(i, i + 2), 16));
};
const toLinear = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const oklab = (h) => {
  const [r, g, b] = parseHex(h).map((v) => toLinear(v / 255));
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
};
const deltaE = (a, b) => {
  const [x, y] = [oklab(a), oklab(b)];
  return Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]);
};
const luminance = (h) =>
  parseHex(h)
    .map((v) => toLinear(v / 255))
    .reduce((acc, c, i) => acc + c * [0.2126, 0.7152, 0.0722][i], 0);
const ratio = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

/* ------------------------------------------------------------------ tokens */

const tokensPath = flag('tokens') || join(ROOT, 'assets/css/tokens.css');
const css = await readFile(tokensPath, 'utf8');

/** Every `--name: light-dark(a, b)` pair. Runtime values (color-mix, var())
    cannot be resolved statically and are deliberately skipped, not guessed. */
const LIVE = new Map(); // hex -> ['--accent (light)', ...]
for (const m of css.matchAll(/--([a-z0-9-]+):\s*light-dark\(\s*([^,]+?)\s*,\s*([^)]+?)\s*\)/g)) {
  for (const [i, mode] of ['light', 'dark'].entries()) {
    const value = [m[2], m[3]][i].trim().toLowerCase();
    if (!/^#[0-9a-f]{3,8}$/.test(value)) continue;
    if (!LIVE.has(value)) LIVE.set(value, []);
    LIVE.get(value).push(`--${m[1]} (${mode})`);
  }
}
if (!LIVE.size) {
  console.error(`No light-dark() tokens found in ${tokensPath}`);
  process.exit(1);
}

/**
 * Values this system used to ship. An exact hit is certain drift, so it earns
 * a stronger message than a near-miss. Add a line whenever a token changes
 * value — that is the whole maintenance burden of this script.
 */
const RETIRED = new Map(
  Object.entries({
    // 1.3.0 — the sRGB ramp, replaced by the OKLab one.
    '#03724d': '--c-from / --c-1 (light), before 1.3.0 — now #03744e',
    '#4dff9a': '--c-from / --c-1 (dark), before 1.3.0 — now #4dff9b',
    '#089a6a': '--c-2 (light), before 1.3.0 — now #268a64',
    '#10c085': '--c-3 (light), before 1.3.0 — now #3da07b',
    '#1ae3a0': '--c-4 (light), before 1.3.0 — now #53b792',
    '#47e3af': '--c-5 (light), before 1.3.0 — now #69ceaa',
    '#73e5bf': '--c-6 (light), before 1.3.0 — now #7ee6c3',
    '#2dfa86': '--c-2 (dark), before 1.3.0 — now #41e488',
    '#10f473': '--c-3 (dark), before 1.3.0 — now #35ca75',
    '#0fd163': '--c-4 (dark), before 1.3.0 — now #29b063',
    '#10ac54': '--c-5 (dark), before 1.3.0 — now #1d9751',
    '#118844': '--c-6 (dark), before 1.3.0 — now #107f40',
  }),
);

/* Figures that were quoted in prose, were never right, and were copied into
   several repos. Keyed by the exact claim text so the report can name it. */
const STALE_CLAIMS = [
  { pattern: /17\.4:1\s*light/i, says: '`--text` on `--bg` is 17.4:1 light', truth: '16.28' },
  { pattern: /18\.1:1\s*dark/i, says: '`--text` on `--bg` is 18.1:1 dark', truth: '19.29' },
  { pattern: /4\.8:1\s*light/i, says: '`--text-3` on `--bg` is 4.8:1 light', truth: '4.91' },
  { pattern: /5\.2:1\s*dark/i, says: '`--text-3` on `--bg` is 5.2:1 dark', truth: '5.80' },
  { pattern: /6\.4:1\s*light/i, says: '`--accent` on `--bg` is 6.4:1 light', truth: '5.63' },
  { pattern: /7\.1:1\s*dark/i, says: '`--accent` on `--bg` is 7.1:1 dark', truth: '16.09' },
];

const NEAR = 0.02; // ΔE below which two colours read as the same one.
const ON_RAMP = 0.006; // ΔE within which a colour IS a point on the ramp.

/**
 * The ramp is a function, so a chart with ten series legitimately uses nine
 * colours that appear in no token. Without this, every honest 10- or 16-sample
 * card reads as drift — the checker would fire loudest on the code that is
 * most correct, which is the fastest way to get a checker switched off.
 *
 * Projects the colour onto the --c-from → --c-to segment in OKLab and asks how
 * far off the line it sits.
 */
const SEGMENTS = ['light', 'dark']
  .map((mode, i) => {
    const grab = (name) => {
      const m = css.match(
        new RegExp(`--${name}:\\s*light-dark\\(\\s*(#[0-9a-fA-F]{6})\\s*,\\s*(#[0-9a-fA-F]{6})\\s*\\)`),
      );
      return m ? m[i + 1].toLowerCase() : null;
    };
    const from = grab('c-from');
    const to = grab('c-to');
    return from && to ? [oklab(from), oklab(to)] : null;
  })
  .filter(Boolean);

const onRamp = (hex) => {
  const p = oklab(hex);
  return SEGMENTS.some(([a, b]) => {
    const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    const len = d[0] ** 2 + d[1] ** 2 + d[2] ** 2;
    if (!len) return false;
    const raw = ((p[0] - a[0]) * d[0] + (p[1] - a[1]) * d[1] + (p[2] - a[2]) * d[2]) / len;
    const t = Math.min(1, Math.max(0, raw));
    return Math.hypot(p[0] - (a[0] + d[0] * t), p[1] - (a[1] + d[1] * t), p[2] - (a[2] + d[2] * t)) <= ON_RAMP;
  });
};

/* ------------------------------------------------------------------- scan  */

const SKIP_DIR = new Set([
  'node_modules', '.git', 'dist', 'build', 'out', '_next', '.next', '.astro',
  '.wrangler', 'coverage', 'Trash', 'vendor', '.venv', '__pycache__',
]);
const EXT = /\.(md|css|mjs|cjs|js|jsx|ts|tsx|astro|vue|svelte|html|json|txt|yml|yaml)$/i;
const MAX_BYTES = 512 * 1024;

const walk = async (dir, out = []) => {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    if (entry.name.startsWith('.') && entry.name !== '.github') continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!SKIP_DIR.has(entry.name)) await walk(full, out);
    } else if (EXT.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
};

const findings = [];
const record = (repo, file, line, kind, message) =>
  findings.push({ repo, file, line, kind, message });

/**
 * 🔴 Near-miss only applies to repos that actually consume this system.
 *
 * A repo with its own palette legitimately holds colours that sit near ours —
 * every Tailwind grey is within ΔE 0.02 of something. Run across everything in
 * c:\claudedev unfiltered and this reported 320 findings over 19 repos, the
 * overwhelming majority of them correct code in projects that never adopted
 * the system. Nobody reads a 320-line report twice.
 *
 * `stale` and `claim` still fire everywhere, because both are unambiguous: an
 * exact hit on a value we retired, or a contrast figure that does not survive
 * being recomputed, is wrong in any repo. Pass --near to force the third check
 * on somewhere that has not declared itself.
 */
const NEAR_EVERYWHERE = argv.includes('--near');
const consumes = async (repo, files) => {
  if (NEAR_EVERYWHERE) return true;
  for (const file of files) {
    if (/03-DESIGN-SYSTEM\.md$/i.test(file)) return true;
    if (/\.(md|html|css|astro)$/i.test(file)) {
      try {
        const info = await stat(file);
        if (info.size > MAX_BYTES) continue;
        if ((await readFile(file, 'utf8')).includes('design.tanghoong.com')) return true;
      } catch {
        /* unreadable is not evidence either way */
      }
    }
  }
  return false;
};

let nearHere = true;

const scanFile = async (repo, file) => {
  // This file carries the retired values in its own table, and a changelog
  // legitimately records what a token used to be. Neither is drift.
  if (/(^|[\\/])drift\.mjs$/.test(file) || /CHANGELOG\.md$/i.test(file)) return;
  const info = await stat(file);
  if (info.size > MAX_BYTES) return;
  const text = await readFile(file, 'utf8');
  // A file that never mentions a colour or a ratio cannot have drifted.
  if (!/#[0-9a-f]{3,8}\b/i.test(text) && !/\d:1\b/.test(text)) return;

  const lines = text.split(/\r?\n/);
  for (const [i, line] of lines.entries()) {
    const at = i + 1;

    // Same convention as conform.mjs: the exception lives where it is made,
    // with its reason attached, rather than the rule being weakened.
    //   <!-- drift:allow — this quotes the OLD value on purpose -->
    if (/drift:allow/.test(line) || (i > 0 && /drift:allow/.test(lines[i - 1]))) continue;

    for (const raw of line.match(/#[0-9a-fA-F]{6}\b/g) || []) {
      const hex = raw.toLowerCase();
      if (RETIRED.has(hex)) {
        record(repo, file, at, 'stale', `${raw} — ${RETIRED.get(hex)}`);
        continue;
      }
      if (!nearHere || LIVE.has(hex) || onRamp(hex)) continue;
      for (const [live, names] of LIVE) {
        if (live.length !== 7) continue;
        if (deltaE(hex, live) <= NEAR) {
          record(
            repo, file, at, 'near-miss',
            `${raw} is ΔE ${deltaE(hex, live).toFixed(3)} from ${names[0]} ${live} — almost certainly meant to be that token`,
          );
          break;
        }
      }
    }

    for (const claim of STALE_CLAIMS) {
      if (claim.pattern.test(line)) {
        record(repo, file, at, 'claim', `${claim.says} — it is ${claim.truth}`);
      }
    }

    // "#4dff9b on #1d1d1f is 12.9:1" — recompute rather than trust.
    //
    // The windows are deliberately tight. A loose version paired the first hex
    // on the line with a ratio belonging to a different sentence — it read
    // "takes dark ink (#04140b), not white. White on #4dff9b is 1.3:1" as a
    // claim about #04140b, and reported a true sentence as wrong. A checker
    // that cries wolf gets switched off, so it only fires on the tight shape.
    const pair = line.match(
      /(#[0-9a-fA-F]{6})\b[^#\n.;:]{0,8}\b(?:on|over|against)\b[^#\n.;]{0,6}(#[0-9a-fA-F]{6})\b[^\n.;]{0,24}?(\d+(?:\.\d+)?):1/,
    );
    if (pair) {
      const got = ratio(pair[1], pair[2]);
      const said = Number(pair[3]);
      if (Math.abs(got - said) > Math.max(0.06, said * 0.02)) {
        record(
          repo, file, at, 'claim',
          `says ${pair[1]} on ${pair[2]} is ${said}:1 — it is ${got.toFixed(2)}:1`,
        );
      }
    }
  }
};

const repos = targets.length
  ? targets.map((t) => resolve(t))
  : (await readdir(resolve(ROOT, '..'), { withFileTypes: true }))
      .filter((e) => e.isDirectory() && !e.name.startsWith('.') && !SKIP_DIR.has(e.name))
      .map((e) => resolve(ROOT, '..', e.name))
      .filter((p) => p !== ROOT);

for (const repo of repos) {
  const files = await walk(repo);
  nearHere = await consumes(repo, files);
  for (const file of files) await scanFile(repo, file);
}

/* ------------------------------------------------------------------ report */

const byRepo = new Map();
for (const f of findings) {
  if (!byRepo.has(f.repo)) byRepo.set(f.repo, []);
  byRepo.get(f.repo).push(f);
}

const ICON = { stale: '🔴 stale    ', 'near-miss': '⚠️  near-miss', claim: '⚠️  claim    ' };

for (const [repo, list] of [...byRepo].sort()) {
  console.log(`\n${repo}  —  ${list.length} finding${list.length === 1 ? '' : 's'}`);
  const seen = new Set();
  for (const f of list) {
    const key = VERBOSE ? `${f.file}:${f.line}` : `${f.file}:${f.message}`;
    if (seen.has(key)) continue;
    seen.add(key);
    console.log(`  ${ICON[f.kind]} ${relative(repo, f.file)}:${f.line}  ${f.message}`);
  }
}

const repoCount = byRepo.size;
console.log(
  findings.length
    ? `\n${findings.length} findings across ${repoCount} repo${repoCount === 1 ? '' : 's'} ` +
        `(${repos.length} scanned). Fix the copy, or delete it and link llms.txt.`
    : `\nNo drift. ${repos.length} repos scanned.`,
);

if (findings.length && FAIL) process.exit(1);
