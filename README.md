# cth-design

The shared visual identity for **tanghoong.com** and every sub-domain, published at
[design.tanghoong.com](https://design.tanghoong.com).

One green, one typeface, one set of rules — the mark, the colour, the spacing and the motion,
decided once and reused everywhere. The CSS files in `assets/css/` are the artefact other
repos consume; the pages are live specimens of them.

## Quick reference

| I want to… | Go to |
| --- | --- |
| Start a new sub-domain | [`template/`](template/) — copy `index.html`, it is already wired |
| Point an agent at the system | [`llms.txt`](llms.txt) — the whole spec, one fetch |
| Pin the rules inside a repo | [`pages/prompt.html`](pages/prompt.html) — a `CLAUDE.md` block |
| Change a colour or a size | [`assets/css/tokens.css`](assets/css/tokens.css) — and nowhere else |
| Use the mark correctly | [`pages/brand.html`](pages/brand.html) |
| Check a page follows the system | `node scripts/conform.mjs <file>` |
| See what changed | [`CHANGELOG.md`](CHANGELOG.md) |

## Layout of the repo

```text
llms.txt          the whole system as one plain-text spec, for agents
template/         a working starter page for a new sub-domain
favicon.svg       the site mark — the master every icon is generated from
assets/css/       the design system — this is what other repos consume
assets/js/        theme toggle, nav sheet and menus, docs-site chrome
pages/            the reference pages
index.html        overview, the agent path, and the reference index
404.html          not-found page
_headers          cache and CORS policy (both Cloudflare flows)
wrangler.jsonc    Workers Builds config — only used if asked for a deploy command
```

### The CSS layers

Link them in this order. Order matters: tokens must resolve before anything references them,
and utilities come last so they can win.

| File | What it holds |
| --- | --- |
| `tokens.css` | Every colour, size, radius, shadow and duration. The single source of truth. |
| `base.css` | Reset and element defaults. Unclassed HTML already looks right. |
| `layout.css` | Container, sections, header, footer, grids, sidebars, hero. |
| `components.css` | Buttons, chips, badges, cards, panels, notes, stats, rows, tables, tabs. |
| `forms.css` | Fields, labels, validation, checkboxes, radios, switches. |
| `overlays.css` | Modal, drawer, menu, tooltip, toast, accordion, nav sheet. |
| `content.css` | Long-form prose, quotes, code, steps, print. |
| `utilities.css` | Small single-purpose classes. |
| `docs.css` | **This site only.** Specimen frames and swatches. Never ship it. |

### The reference pages

| # | Page | Covers |
| --- | --- | --- |
| 01 | [Logo & identity](pages/brand.html) | Construction geometry, the fixed colour pair, sizes, clear space, favicon set |
| 02 | [Foundations](pages/foundations.html) | Surfaces, ink, accent, status, type, space, radius, shadow, motion, focus, themes |
| 03 | [Layout](pages/layout.html) | Container, section banding, header, footer, grids, sidebars, breakpoints |
| 04 | [Components](pages/components.html) | Buttons, chips, badges, cards, panels, notes, stats, rows, tables, lists, tabs |
| 05 | [Forms](pages/forms.html) | Inputs, validation, choices, switches, file drops, form layout |
| 06 | [Overlays](pages/overlays.html) | Modals, drawers, menus, nav sheet, tooltips, toasts, accordions |
| 07 | [Loading & motion](pages/loading.html) | Skeletons, spinners, async states, the sanctioned animation list, title convention |
| 08 | [Content & prose](pages/content.html) | Article typography, leads, quotes, code, steps, measure, print |
| 09 | [SVG & data](pages/svg.html) | Icons, the chart ramp, and seven charting idioms with live specimens |
| 10 | [Patterns](pages/patterns.html) | Whole page compositions — hero, work index, case study, CTA band |
| 11 | [Agent prompt](pages/prompt.html) | The block to paste into a repo's `CLAUDE.md` |

## Starting a new sub-domain

See [`template/README.md`](template/README.md) for the full walkthrough. In short: copy
`assets/css/` (minus `docs.css`), the icon set, and `template/index.html`; then change the
meta block, the wordmark and the nav links.

## Running locally

No build step — the CSS files *are* the artefact. Serve the folder with anything:

```bash
npx http-server -p 8099 -c-1
```

`-c-1` disables caching, so edits show on refresh.

## Deploying

Static hosting, no build step. Cloudflare now has two flows — classic Pages, and Workers
Builds which asks for a **deploy command** (`npx wrangler deploy`). Both are covered in
[`DEPLOY.md`](DEPLOY.md), and `wrangler.jsonc` for the second is committed. `_headers` sets the cache policy for Cloudflare Pages and allows
cross-origin reads of `assets/` and `llms.txt`, so another sub-domain can link the
stylesheets directly rather than vendoring a copy that will drift.

## Checking your work

Two dependency-free scripts. Full notes in [`scripts/README.md`](scripts/README.md).

```bash
node scripts/conform.mjs index.html pages --fail   # does the page follow the system?
node scripts/contrast.mjs --fail                   # do the tokens still pass WCAG?
```

This is how you check an agent's output: point it at `llms.txt`, let it write the
page, then run `conform.mjs` over the result. It enforces only what is documented —
if a rule is not in `llms.txt` or on a reference page, it does not belong in the
script. Neither script can see computed styles or runtime behaviour, so they are a
first pass, not a substitute for opening the page in both themes and tabbing through it.

## Editing the system

- A colour, size or duration change goes in `tokens.css` and nowhere else.
- A new component goes in the layer file it belongs to, with a comment saying what it is for
  and when *not* to use it.
- Update `llms.txt` in the same commit as any token or class change — it is a description of
  the CSS, not a second source of truth, and agents read it instead of the pages. Bump the
  version line at the top.
- Regenerate the raster icons from `favicon.svg` with the ImageMagick commands on
  [the brand page](pages/brand.html). Never hand-edit a generated file.
- Every page's header and footer are inlined rather than templated. That is deliberate: the
  chrome is itself a specimen, and a reference site should show its own markup in source. If
  you change the header, change it in all eleven files and in `template/index.html`.

## Known drift

Both recorded rather than silently reconciled, because each is a decision rather than a
cleanup. See [`CHANGELOG.md`](CHANGELOG.md) for the detail.

1. **Accent.** The generated SVG cards on
   [github.com/tanghoong](https://github.com/tanghoong/tanghoong) use `#03724d` /
   `#4dff9a`; `tokens.css` and cv.tanghoong.com use `#03744e` / `#4dff9b`.
2. **Chart ramp spacing.** `scripts/contrast.mjs` reports adjacent steps at the pale end
   of the light ramp are perceptually close — ΔE 0.027 where evenly spaced would be
   0.071. Interpolating in OKLab rather than sRGB would fix it, in both the tokens and
   the card generator.
