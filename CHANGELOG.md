# Changelog

Token and API changes for anything consuming `assets/css/`. A change here means
other repos may need to look; anything not listed is a documentation or
reference-site change with no effect on consumers.

Versions match the `Version:` line at the top of [`llms.txt`](llms.txt).
Semver, read as: **major** removes or renames a token or class, **minor** adds
one, **patch** changes a value without changing the shape.

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

- **Accent drift.** The generated SVG cards on github.com/tanghoong use
  `#03724d` / `#4dff9a`; `tokens.css` uses `#03744e` / `#4dff9b`. One digit
  apart in each. Recorded rather than fixed, because which direction to align
  is a decision.
- **Chart ramp spacing.** `scripts/contrast.mjs` reports that adjacent steps at
  the pale end of the light ramp (and the bright end of the dark one) are
  perceptually close: ΔE 0.027 where evenly-spaced would be 0.071. The ramp is
  recorded as it ships in the cards. Interpolating in OKLab instead of sRGB
  would give `#03724d #258863 #3d9f7a #53b692 #68ceaa #7ee6c3` with a minimum
  ΔE of 0.072 — a change to both the tokens and the card generator.
