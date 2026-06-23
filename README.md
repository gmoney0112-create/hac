# Broken Branch SA

Static marketing site for Broken Branch SA (tree services, San Antonio / Bexar County), hosted on GitHub Pages. The site is pure static HTML/CSS — there is no backend, no build step, and no JavaScript bundler. Lead capture is delegated to a GoHighLevel / LeadConnector hosted form loaded via an external link.

## Deployment

- **Host:** GitHub Pages
- **Current canonical URL:** `https://gmoney0112-create.github.io/hac/`
- Pushing to `main` deploys automatically.
- Files served directly: `index.html`, `privacy.html`, `terms.html`.

### Switching to a custom domain later

If/when a custom domain (e.g. `brokenbranchsa.com`) is pointed at this repo:

1. Add a `CNAME` file at the repo root containing only the bare domain (e.g. `brokenbranchsa.com`).
2. Configure the domain's DNS per GitHub Pages docs and enable "Enforce HTTPS" in repo Settings → Pages.
3. Update the following references in `index.html` to the new canonical URL:
   - `<link rel="canonical" href="...">`
   - `<meta property="og:url" content="...">`

Until a `CNAME` exists, keep the GitHub Pages URL above as canonical so social unfurls and SEO don't point at a domain that doesn't resolve.

## Production Readiness & GHL Handoff

The website itself is production-ready. The remaining items are **configured inside GoHighLevel / LeadConnector**, not in this repo, and must be fixed manually by whoever owns the GHL sub-account before launch:

- [ ] **Submit button label** — currently renders as the literal text `Button`. Rename to something action-oriented (e.g. `Get My Free Estimate`) in the form builder.
- [ ] **SMS consent copy** — contains unresolved placeholders that must be replaced with real values:
  - `[BUSINESS NAME]` → `Broken Branch SA`
  - `[USE_CASE_FROM_CAMPAIGN_DESCRIPTION]` → the approved A2P 10DLC campaign use case (e.g. "appointment scheduling and estimate follow-ups for tree service customers"). Must match exactly what was registered with the carrier.
- [ ] **End-to-end test** — after the two items above are fixed, submit a real test lead through the live form and confirm:
  1. The lead appears in GHL (Contacts / Opportunities).
  2. Any configured notifications fire (email / SMS to Ricardo).
  3. Any configured automations / workflows trigger as expected.

The form is embedded via a link to `https://api.leadconnectorhq.com/widget/form/tO1CQEoKcm56IsYYboAq`. Changes to labels, consent text, fields, and automations happen in GHL; no code change in this repo is required.

### Legal URLs for the GHL form

Set the form's legal links to the canonical GitHub Pages URLs:

- **Privacy Policy:** `https://gmoney0112-create.github.io/hac/privacy.html`
- **Terms of Service:** `https://gmoney0112-create.github.io/hac/terms.html`

As a launch-safe temporary setup, the GHL form's Terms link currently points to the Privacy Policy URL. Once the dedicated Terms page is live (it now is — `terms.html` in this repo), update the Terms link inside GoHighLevel to `https://gmoney0112-create.github.io/hac/terms.html`. The live smoke check (`npm run smoke:live`) will emit a warning until this is updated.

## Other known follow-ups

- **GA4** — a commented placeholder for Google Analytics 4 exists near the top of `index.html`. When Ricardo provides the Measurement ID (`G-XXXXXXXXXX`), uncomment the two lines and substitute the real ID.

## Launch Gate

Two scripts guard launch readiness. Node 18+ required.

```
npm run check       # offline static validation (also runs in CI on push/PR to main)
npm run smoke:live  # optional network smoke check of the live deployment + GHL form
```

### What `npm run check` verifies (offline, no network)

- `index.html`, `privacy.html`, and `terms.html` exist
- `index.html` has the expected `<title>`, `<link rel="canonical">`, and `og:url` — all pinned to `https://gmoney0112-create.github.io/hac/`
- All `<meta>` tags are closed on the same line (guards the previously-seen malformed `twitter:description` bug)
- Every absolute local `href` starts with `/hac/` (GitHub Pages project path) and resolves to a real file
- `privacy.html` and `terms.html` back links route to `/hac/`, all absolute local `href`s under `/hac/` resolve, and both have well-formed `<meta>` tags
- `index.html` footer links to both `/hac/privacy.html` and `/hac/terms.html`
- Every LeadConnector CTA uses the exact form URL `https://api.leadconnectorhq.com/widget/form/tO1CQEoKcm56IsYYboAq`, including the nav "Free Estimate" button, `#heroBook`, and `#mainBook`
- No `localStorage`, `sessionStorage`, `indexedDB`, or `document.cookie` usage anywhere in the site
- No unresolved `[PLACEHOLDER]` or `G-XXXXXXXXXX` strings outside the documented spots (commented GA4 block in `index.html`, GHL checklist section in this README)

CI: `.github/workflows/check.yml` runs `npm run check` on every push and PR to `main`.

### What `npm run smoke:live` verifies (network)

- `https://gmoney0112-create.github.io/hac/` returns 200 and contains the brand name and form URL
- `https://gmoney0112-create.github.io/hac/privacy.html` returns 200 and contains the SMS privacy section
- `https://gmoney0112-create.github.io/hac/terms.html` returns 200 and contains the Terms of Service heading
- `https://api.leadconnectorhq.com/widget/form/tO1CQEoKcm56IsYYboAq` returns 200 with non-empty HTML
- Warns (does not fail) when the live GHL form still contains `[BUSINESS NAME]`, `[USE_CASE_FROM_CAMPAIGN_DESCRIPTION]`, or a literal `Button` submit label, or when its Terms link still points to `/hac/privacy.html` instead of `/hac/terms.html` — these are all fixed inside GoHighLevel, not in this repo. Smoke exits non-zero only for broken endpoints or empty/missing form HTML. It is intentionally not run in CI.

### What still has to be checked manually inside GHL

The checks above cannot touch the form builder. Before launch, an operator must log into GoHighLevel and confirm the items in "Production Readiness & GHL Handoff" above — specifically: rename the submit button, replace the SMS consent placeholders with the real business name and A2P 10DLC use case, then submit a real test lead and confirm notifications and workflows fire.
