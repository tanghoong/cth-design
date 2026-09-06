# Starter template

A complete, working page with the header, footer, nav sheet, theme toggle and
section scaffolding already wired. Copy it into a new sub-domain and edit —
don't rebuild the chrome by hand, because the details that go wrong are the ones
you can't see: the theme-init script that has to run before the stylesheet, the
nav sheet that has to be a sibling of `<header>`, the `.ico` that has to be
declared first.

## Setting up a new sub-domain

```bash
# 1. The system itself. These files are the artefact — do not fork them.
mkdir -p new-site/assets
cp -r design.tanghoong.com/assets/css new-site/assets/css
cp -r design.tanghoong.com/assets/js  new-site/assets/js
rm new-site/assets/css/docs.css        # reference site only, never ship it

# 2. The icons and manifest. Same mark on every property.
cp design.tanghoong.com/favicon.{svg,ico} new-site/
cp design.tanghoong.com/apple-touch-icon.png new-site/
cp design.tanghoong.com/icon-{192,512}.png new-site/
cp design.tanghoong.com/site.webmanifest new-site/

# 3. This page as the starting point.
cp template/index.html new-site/index.html
```

Then work through the file top to bottom:

1. **The block marked `▼ CHANGE THESE`** — title, description, canonical, and the
   Open Graph tags. Replace every `SUBDOMAIN`. Generate an `og.png` at
   1200×630 or the link previews render blank.
2. **The wordmark** in `.brand` — `tanghoong <span class="t3">SUBDOMAIN</span>`.
   The mark itself never changes.
3. **The nav links**, in three places: `.head-nav`, the `.sheet-row` list in the
   nav sheet, and `.foot-list`. Keep them in sync — `nav.js` marks the current
   page in all three automatically.
4. **`site.webmanifest`** — `name`, `short_name`, `start_url`.
5. **The page body**, from `<main>` down.

## What not to change

- **`assets/css/`.** If a value you need doesn't exist, add it to `tokens.css`
  and push that change back to the design system, so every property gets it.
  A local override in one repo is how a system stops being one.
- **The mark.** Fixed colours, fixed geometry. See
  [design.tanghoong.com/pages/brand.html](https://design.tanghoong.com/pages/brand.html).
- **The theme-init `<script>` in `<head>`.** It must stay inline and run before
  the stylesheet, or the page paints the wrong theme for a frame.
- **The nav sheet's position in the DOM.** It is a sibling of `<header>`, never a
  child — the header sets `backdrop-filter`, which traps `position: fixed`
  descendants inside it.

## Before you ship

Full checklist at the bottom of
[llms.txt](https://design.tanghoong.com/llms.txt). The short version:

- No literal hex, px font size, radius or duration outside `tokens.css`
- Both themes checked, and the toggle tried in both directions
- Tabbed the whole page — focus ring visible everywhere, nothing trapped
- Every field labelled; errors use `aria-invalid` + `aria-describedby`
- Exactly one `.btn--filled` per view
- No horizontal scroll at 320px
- `docs.css` is not in the build
