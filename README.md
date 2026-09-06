# cth-design

The shared design system for **tanghoong.com** and every sub-domain, published at
[design.tanghoong.com](https://design.tanghoong.com).

Extracted from [cv.tanghoong.com](https://cv.tanghoong.com/) and normalised into a token
set, a component library and an agent prompt, so every new sub-domain, page or repo starts
from the same place.

## What is in here

```
favicon.svg     the site mark — the master every icon is generated from
llms.txt        the whole system as one plain-text spec, for agents
assets/css/     the design system — this is the artefact other repos consume
assets/js/      theme toggle, nav sheet, docs-site chrome
pages/          the reference pages
index.html      overview and install instructions
```

### The CSS layers

Link them in this order. Order matters: tokens must resolve before anything references
them, and utilities come last so they can win.

| File | What it holds |
| --- | --- |
| `tokens.css` | Every colour, size, radius, shadow and duration. The single source of truth. |
| `base.css` | Reset and element defaults. Unclassed HTML already looks right. |
| `layout.css` | Container, sections, header, footer, grids, sidebars. |
| `components.css` | Buttons, chips, badges, cards, panels, notes, stats, rows, tables, tabs. |
| `forms.css` | Fields, labels, validation, checkboxes, radios, switches. |
| `overlays.css` | Modal, drawer, menu, tooltip, toast, accordion, nav sheet. |
| `content.css` | Long-form prose, quotes, code, steps, print. |
| `utilities.css` | Small single-purpose classes. |
| `docs.css` | **This site only.** Specimen frames and swatches. Never ship it. |

The brand mark, its colour rules and the favicon set are documented on
[/pages/brand.html](pages/brand.html). Regenerate the raster icons from
`favicon.svg` with the ImageMagick commands listed there — never hand-edit one.

## Using it in a new project

1. Copy `assets/css/` into the new repo — everything except `docs.css`.
2. Link the files in the order above.
3. Put this inline in `<head>`, **before** the stylesheet, or the page paints the wrong
   theme for a frame:

   ```html
   <script>try{var t=localStorage.getItem('th');
   if(t==='light'||t==='dark')document.documentElement.dataset.theme=t;}catch(e){}</script>
   ```

4. Paste the block from [/pages/prompt.html](pages/prompt.html) into the repo's
   `CLAUDE.md` so generated code lands on-system first time.

## Running locally

No build step — the CSS files *are* the artefact. Serve the folder with anything:

```bash
npx http-server -p 8099
```

## Deploying

Static hosting, no build command, output directory `/`. `_headers` sets the cache policy
for Cloudflare Pages and allows cross-origin reads of `assets/` so another sub-domain can
link the stylesheets directly rather than vendoring them.

## Editing the system

- A colour, size or duration change goes in `tokens.css` and nowhere else.
- A new component goes in the layer file it belongs to, with a comment saying what it is
  for and when *not* to use it.
- Update the prompt block on `pages/prompt.html` in the same commit as any token change —
  it is a description of the CSS, not a second source of truth.
- Every page's header and footer are inlined rather than templated. That is deliberate:
  the chrome is itself a specimen, and a reference site should show its own markup in
  source. If you change the header, change it in all nine pages.
