# Changelog

Token and API changes for anything consuming `assets/css/`. A change here means
other repos may need to look; anything not listed is a documentation or
reference-site change with no effect on consumers.

Versions match the `Version:` line at the top of [`llms.txt`](llms.txt).
Semver, read as: **major** removes or renames a token or class, **minor** adds
one, **patch** changes a value without changing the shape.

## [1.3.2] — 2026-09-06

### Fixed

- **The nav sheet trigger never went away on a wide screen.** The hamburger sat
  next to the full header nav at every width, on every property using the
  system, including this reference site. Two rules, both `0,1,0`, both losing
  to source order: `layout.css` hid `.navsheet__trigger` at 900px, then
  `components.css` set `.iconbtn { display: inline-flex }` and `overlays.css`
  set `.navsheet__trigger { display: grid }` — and both of those files load
  after `layout.css`. A media query contributes nothing to specificity, so the
  hide rule could not win from where it was written.

  The hide rule now lives in `overlays.css`, after `components.css`, and the
  redundant `display: grid` is gone — the trigger takes its display from
  `.iconbtn` like every other icon button. `layout.css` keeps a comment at the
  900px block saying where its other half went and why.

  **What consumers must do:** nothing, if you link the CSS from
  `design.tanghoong.com` — the fix arrives when this deploys. **If you added a
  local `@media (width >= 900px) { .navsheet__trigger { display: none } }` to
  work around this, delete it.** It is now a duplicate of the system rule, and
  a local copy of a rule is the thing that drifts. Known instances:
  `cj-knob/index.html` and `cj-knob/lab/index.html`.

  If you vendored `assets/css/`, re-copy `layout.css` and `overlays.css`.

- `llms.txt` gains a third entry in the overlay traps list: anything that hides
  or shows an element `.iconbtn` also styles has to sit after `components.css`.
  The link order is load-bearing, and nothing said so.

## [1.3.1] — 2026-09-06

### Added

- `scripts/drift.mjs` — checks the repos that **consume** this system, which
  the other two scripts cannot see. Reports values retired by an earlier
  version, hexes sitting within ΔE 0.02 of a live token without being it, and
  contrast figures that do not survive being recomputed. `--fail` for CI.

  It stays quiet about intermediate ramp samples (a ten-series card
  legitimately uses colours that are in no token) and about repos that never
  adopted the system, both of which made an earlier version unreadable: 320
  findings across 19 repos, against 68 across 5 once gated.

- `llms.txt` now carries the rule that script enforces: **link this file, do
  not copy it.** A consuming repo may keep its own decisions; it may not keep
  a copy of the spec. The same line is in the pasteable `CLAUDE.md` block on
  `pages/prompt.html`, which is how it reaches the repos that need it.

### Fixed

- `CLAUDE.md` still listed the accent drift and the ramp spacing as open
  decisions. Both closed on 2026-09-06 — the card generator in
  `tanghoong/tanghoong` now samples `--c-from → --c-to` in OKLab at whatever
  count each card needs, and its six-sample case reproduces `--c-1`…`--c-6`
  exactly, asserted in that repo's CI. The section quoted `#03724d` / `#4dff9a`
  as live values a version after they were retired.

### Known drift in consuming repos

Not a change here, recorded so it is not rediscovered. Five repos carry a copy
of `03-DESIGN-SYSTEM.md` whose closing paragraph states six contrast figures
that were never correct for this palette — 17.4 / 18.1 for `--text`, 4.8 / 5.2
for `--text-3`, 6.4 / 7.1 for `--accent`, against 16.28 / 19.29, 4.91 / 5.80
and 5.63 / 16.09:

- `2027.tanghoong.com` (`docs/03-DESIGN-SYSTEM.md`)
- `demo-controller`
- `github-markdown-blog`
- `links.tanghoong.com`
- `mini-web-app`

`node scripts/drift.mjs` lists them with line numbers. The durable fix is to
delete the duplicated spec from each and link `llms.txt`: a consuming repo may
keep its own decisions, but a copy of the spec will drift again once corrected.

## [1.3.0] — 2026-09-06

### Changed — action required in consuming repos

- **The chart ramp is regenerated.** `--c-1`…`--c-6` were sRGB-interpolated
  and perceptually uneven: adjacent steps ran 0.122, 0.110, 0.098, **0.027,
  0.039** ΔE. Three of six series were effectively indistinguishable. They are
  now OKLab-interpolated and even at ~0.072 throughout.
- **`--c-from` now equals `--accent`** (`#03744e` / `#4dff9b`). It was
  `#03724d` / `#4dff9a`, one digit off in each. A one-series chart and a
  primary button are now the same green, which they always should have been.
- Anything that hard-codes the old ramp — notably the SVG card generator in
  `tanghoong/tanghoong` — should regenerate from
  `node scripts/ramp.mjs <n> --json`.

### Added

- `scripts/ramp.mjs` — generates the ramp at any sample count, reading the
  endpoints from `tokens.css` so it cannot drift. `--json` for machines.

### Resolved

Both entries previously under "Known, unreconciled" are closed. The accent
drift is closed by `tokens.css` being the source and the other repo following
it; the ramp spacing is closed by the regeneration above.

## [1.2.0] — 2026-09-06

Studied tanghoong.com, which runs this token set and then re-skins it. Adopted
the parts that generalise; declined the parts that are that page's signature.

### Added

- `--text-hi` — one step above `--text`, for display type only.
- `--accent-2`, `--accent-2-ink`, `--accent-2-wash` — an optional second
  voice. tanghoong.com uses a gold beside the green.
- `--fs-read`, and `.read` / `.read-body` / `.meta-mono` in `content.css` —
  the editorial scale for a landing page whose lead carries the weight.
- **The property-skin contract**, documented at the foot of `tokens.css`:
  what a skin may redefine, what it must not, and the two rules for writing
  one. This is the strongest evidence the system works, and it was undocumented.

### Not adopted

- The serif display face for a single hero word. Beautiful, and it is that
  page's signature rather than a system component.
- Forced dark with no toggle — right for a single-purpose landing page, wrong
  for documentation and apps.
- The 3D portrait card. Bespoke, and correctly so.

## [1.1.0] — 2026-09-06

### Added

- **Loading and async state** in `components.css`: `.skel` and its variants
  (`--text --title --chip --avatar --btn --media`), `.spinner` (`--sm --lg`),
  `.progress` (`--top`), and `.async` with `.async__content`. Documented on
  [Loading & motion](pages/loading.html).
- `--c-from` and `--c-to` in `tokens.css` — the chart ramp endpoints. The ramp
  is a function sampled at N, and `--c-1`…`--c-6` are the six-sample case.
- `scripts/contrast.mjs` — checks every permitted colour pairing against WCAG
  in both themes, plus perceptual spacing of adjacent ramp steps.
- `scripts/conform.mjs` — checks an HTML page against the system's documented
  rules. Supports `<!-- conform:allow rule-id reason -->` for exceptions.
- `template/` — a working starter page for a new sub-domain.

### Changed

- `.chips` and `.cluster` now reset `list-style` and child margins, so they can
  be a real `<ul>` without `base.css`'s `li + li` rule breaking the flex row.
  **This fixes a visible misalignment** anywhere `.chips` wrapped list items.
- The theme toggle button now expects three icons (`.ic--auto`, `.ic--light`,
  `.ic--dark`) with CSS choosing one from `data-theme`. A single-icon button
  still works but will never change appearance.
- `.modal` and `.drawer` set `margin` explicitly. Without it `base.css`'s
  `* { margin: 0 }` overrides the UA `dialog { margin: auto }` and the dialog
  renders in a corner. Modals also use `dvh` and become a bottom sheet under
  480px.
- `.toasts` moved from bottom-centre to top-centre.
- The nav sheet is a `<dialog class="drawer navsheet">` opened with
  `showModal()`, and **must be a sibling of `<header>`** — the header's
  `backdrop-filter` makes it a containing block for `position: fixed`
  descendants. The old `<details>` version trapped inside the header is gone.
- `.head-end` holds exactly two icon buttons. `.head-tools` and `.head-cta`
  were removed.

### Fixed

- Tooltips cap their width and wrap instead of running off the viewport edge.
- Anchor-positioning collision handling for tooltips where supported.

## [1.0.0] — 2026-09-06

First published system, extracted from cv.tanghoong.com and normalised: the
token set, eight CSS layers, the reference pages, `llms.txt`, and the mark with
its generated icon set.

## Known, unreconciled

Nothing outstanding in this repo.
