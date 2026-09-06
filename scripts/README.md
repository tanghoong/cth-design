# scripts

Two checks, no dependencies. Both run on plain Node and can be copied into any
repo that consumes the system.

```bash
node scripts/contrast.mjs              # colour report, both themes
node scripts/conform.mjs <files…>      # check pages against the system
```

Add `--fail` to either for CI: it exits 1 when something breaks.

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

## Checking an agent's output

The workflow these two are built for:

1. Point the agent at `https://design.tanghoong.com/llms.txt`.
2. It writes the page.
3. `node scripts/conform.mjs <the page> --fail` — structural conformance.
4. `node scripts/contrast.mjs --fail` — only if it touched `tokens.css`.
5. Open it. Toggle the theme both directions. Tab through it. Resize to 320px.

Steps 3 and 4 are cheap and catch most of what goes wrong. **Step 5 is the one
that catches what matters**, and nothing here replaces it.
