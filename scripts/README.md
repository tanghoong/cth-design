# scripts

Three checks, no dependencies. All run on plain Node. The first two can be
copied into any repo that consumes the system; the third is run *from* here,
against those repos.

```bash
node scripts/contrast.mjs              # colour report, both themes
node scripts/conform.mjs <files…>      # check pages against the system
node scripts/drift.mjs                 # check the repos that consume it
```

Add `--fail` to any of them for CI: it exits 1 when something breaks.

## contrast.mjs

Parses the `light-dark()` values straight out of `tokens.css`, so it cannot
drift from the system — change a token and the next run tells you what it broke.

It checks two different things, because they are two different questions:

- **Text and UI contrast** — WCAG luminance ratio. 4.5:1 for body text, 3:1 for
  the focus ring and other non-text boundaries.
- **Adjacent chart steps** — perceptual distance in OKLab, not a luminance
  ratio. Two greens can differ obviously in hue at nearly identical luminance;
  WCAG would score that 1.03:1 while the eye says "clearly different". For
  telling one chart series from the next, ΔE is the honest measure.

Anything passing with under 10% headroom is marked `tight` — it is one token
tweak away from failing, and worth knowing before that tweak happens.

## conform.mjs

The other half of pointing an agent at `llms.txt`. The agent writes a page;
this says whether the page actually follows the system.

Every rule corresponds to something written down in `llms.txt` or on a
reference page. **If a rule is not documented, it does not belong in this
file** — the script enforces the system, it does not invent it.

```bash
node scripts/conform.mjs new-site/index.html
node scripts/conform.mjs pages              # a directory works too
node scripts/conform.mjs --fail index.html  # CI
```

Levels: `error` breaks the system (a token or accessibility rule), `warn` is
almost always wrong, `info` is worth a look.

### Waiving a rule

A page can waive a rule it deliberately breaks:

```html
<!-- conform:allow literal-colour — this page documents the mark, whose two
     colours are fixed by design and must be shown as literal values. -->
```

The exception then lives in the page that makes it, with its reason attached,
rather than the rule being weakened so it stops catching the case everywhere
else. If you find yourself waiving the same rule on many pages, the rule is
probably wrong — fix the rule.

### What it cannot see

It reads text, not a DOM. It will not catch computed styles, anything injected
at runtime, contrast of a colour set in JavaScript, or whether the page actually
looks right. It is a first pass, not a substitute for opening the page in both
themes and tabbing through it.

## drift.mjs

The other two check this repo. This one checks the repos that consume it, which
is where the system actually decays — a value gets copied into another repo's
document, the system moves on, and the copy keeps being read as authoritative.
It looks verified. Nothing verifies it.

```bash
node scripts/drift.mjs                     # every sibling directory
node scripts/drift.mjs ../links.tanghoong.com ../mini-web-app
node scripts/drift.mjs --fail              # exit 1 if anything drifted
node scripts/drift.mjs --tokens=<path>     # point at a tokens.css elsewhere
node scripts/drift.mjs --near              # force near-miss everywhere
```

Three checks, in descending order of certainty:

- **stale** — an exact hit on a value this system used to ship. Certain. The
  `RETIRED` table at the top of the file is the list; add a line whenever a
  token changes value, which is the script's entire maintenance burden.
- **near-miss** — a hex within ΔE 0.02 of a live token but not equal to it.
  This is the `#03724d` class: close enough that nobody sees it, far enough  <!-- drift:allow — quotes a retired value on purpose -->
  that a chart and a button end up different greens.
- **claim** — a line asserting `#aaa on #bbb is N:1`, recomputed rather than
  trusted, plus the specific figures known to have been copied wrong.

### What it deliberately stays quiet about

Each of these was a false positive first, and each one matters more than the
finding it suppresses — a checker that cries wolf gets switched off.

- **Intermediate ramp samples.** The ramp is a function, so a ten-series card
  legitimately uses nine colours that appear in no token. Each colour is
  projected onto the `--c-from → --c-to` segment in OKLab; anything sitting on
  the line is a sample, not drift. Without this the script fired loudest on the
  most correct code in the fleet.
- **Repos with their own palette.** `near-miss` runs only where a repo shows it
  consumes the system — a `03-DESIGN-SYSTEM.md`, or a mention of
  `design.tanghoong.com`. Every Tailwind grey is within ΔE 0.02 of something of
  ours. Unfiltered: 320 findings across 19 repos, nearly all correct code in
  projects that never adopted the system. Gated: 68 across 5.
- **A hex and a ratio in different sentences.** *"takes dark ink (`#04140b`),
  not white. White on `#4dff9b` is 1.3:1"* is a true sentence; a looser pattern
  read it as a claim about `#04140b`.
- **`CHANGELOG.md` and the script itself.** A changelog recording what a token
  used to be is doing its job.

### Waiving a finding

Same convention as `conform.mjs` — the exception lives where it is made, with
its reason attached:

```html
<!-- drift:allow — this quotes the pre-1.3.0 value on purpose -->
```

### What it cannot see

It reads text. A colour computed at runtime, assembled from parts, or living in
a binary asset is invisible to it. And it cannot tell a deliberate skin from a
mistake — `#f5fafb` as a property's own background is a decision, not drift, and  <!-- drift:allow — quotes a retired value on purpose -->
wants a `drift:allow` saying so.

## Checking an agent's output

The workflow these two are built for:

1. Point the agent at `https://design.tanghoong.com/llms.txt`.
2. It writes the page.
3. `node scripts/conform.mjs <the page> --fail` — structural conformance.
4. `node scripts/contrast.mjs --fail` — only if it touched `tokens.css`.
5. Open it. Toggle the theme both directions. Tab through it. Resize to 320px.

Steps 3 and 4 are cheap and catch most of what goes wrong. **Step 5 is the one
that catches what matters**, and nothing here replaces it.
