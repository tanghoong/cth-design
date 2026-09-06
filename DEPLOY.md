# Deploying to design.tanghoong.com

Static files, no build step. The repo root **is** the output directory.

## Cloudflare Pages — first time

### 1. Push to GitHub

```bash
git remote add origin git@github.com:tanghoong/cth-design.git
git push -u origin main --tags
```

### 2. Create the Pages project

Cloudflare dashboard → **Workers & Pages** → **Create** → **Pages** →
**Connect to Git** → pick `cth-design`.

| Setting | Value |
| --- | --- |
| Production branch | `main` |
| Framework preset | **None** |
| Build command | *(leave empty)* |
| Build output directory | `/` |
| Root directory | `/` |

There is no build. If Cloudflare asks for a command, leaving it blank is
correct — filling one in is how a static site starts failing to deploy.

### 3. Custom domain

Project → **Custom domains** → **Set up a custom domain** →
`design.tanghoong.com`.

If `tanghoong.com` is already on Cloudflare DNS, the `CNAME` is created for
you and the certificate issues in a few minutes. If it is not, add:

```
CNAME  design  <project-name>.pages.dev  (proxied)
```

### 4. Check it landed

```bash
curl -sI https://design.tanghoong.com/ | head -1
curl -s  https://design.tanghoong.com/llms.txt | head -3
curl -sI https://design.tanghoong.com/assets/css/tokens.css | grep -i 'access-control'
```

The last one matters: `_headers` sets `Access-Control-Allow-Origin: *` on
`assets/` and `llms.txt` so another sub-domain can link the stylesheets
directly instead of vendoring a copy that will drift.

## Every deploy after that

`git push` to `main`. Pages rebuilds and publishes. A pull request gets its own
preview URL, which is the right place to look at a design change before it is
live.

## Before you push

```bash
node scripts/conform.mjs index.html 404.html template/index.html pages --fail
node scripts/contrast.mjs
```

Both are dependency-free. `contrast.mjs` currently reports 4 failures — those
are the known chart-ramp spacing finding recorded in `CHANGELOG.md`, not a
regression. Run it without `--fail` until that decision is made.

## What `_headers` does

- `assets/*` and `llms.txt` — 1 hour cache, must-revalidate, CORS open. Short
  on purpose: a token change has to reach every consuming property quickly.
- `og.png` — 1 day.
- Everything — `X-Content-Type-Options: nosniff`,
  `Referrer-Policy: strict-origin-when-cross-origin`.

## Rolling back

Pages keeps every deployment. Project → **Deployments** → find the good one →
**Rollback**. Faster than a revert commit when something is visibly wrong in
production.
