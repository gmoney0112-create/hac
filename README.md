# Heavenly Arbor Care

Static marketing site for Heavenly Arbor Care (tree services, San Antonio / Bexar County), hosted on GitHub Pages. The site is pure static HTML/CSS — there is no backend, no build step, and no JavaScript bundler. Lead capture is delegated to a GoHighLevel / LeadConnector hosted form loaded via an external link.

## Deployment

- **Host:** GitHub Pages
- **Current canonical URL:** `https://gmoney0112-create.github.io/hac/`
- Pushing to `main` deploys automatically.
- Files served directly: `index.html`, `privacy.html`.

### Switching to a custom domain later

If/when a custom domain (e.g. `heavenlyarborcare.com`) is pointed at this repo:

1. Add a `CNAME` file at the repo root containing only the bare domain (e.g. `heavenlyarborcare.com`).
2. Configure the domain's DNS per GitHub Pages docs and enable "Enforce HTTPS" in repo Settings → Pages.
3. Update the following references in `index.html` to the new canonical URL:
   - `<link rel="canonical" href="...">`
   - `<meta property="og:url" content="...">`

Until a `CNAME` exists, keep the GitHub Pages URL above as canonical so social unfurls and SEO don't point at a domain that doesn't resolve.

## Production Readiness & GHL Handoff

The website itself is production-ready. The remaining items are **configured inside GoHighLevel / LeadConnector**, not in this repo, and must be fixed manually by whoever owns the GHL sub-account before launch:

- [ ] **Submit button label** — currently renders as the literal text `Button`. Rename to something action-oriented (e.g. `Get My Free Estimate`) in the form builder.
- [ ] **SMS consent copy** — contains unresolved placeholders that must be replaced with real values:
  - `[BUSINESS NAME]` → `Heavenly Arbor Care`
  - `[USE_CASE_FROM_CAMPAIGN_DESCRIPTION]` → the approved A2P 10DLC campaign use case (e.g. "appointment scheduling and estimate follow-ups for tree service customers"). Must match exactly what was registered with the carrier.
- [ ] **End-to-end test** — after the two items above are fixed, submit a real test lead through the live form and confirm:
  1. The lead appears in GHL (Contacts / Opportunities).
  2. Any configured notifications fire (email / SMS to Ricardo).
  3. Any configured automations / workflows trigger as expected.

The form is embedded via a link to `https://api.leadconnectorhq.com/widget/form/tO1CQEoKcm56IsYYboAq`. Changes to labels, consent text, fields, and automations happen in GHL; no code change in this repo is required.

## Other known follow-ups

- **GA4** — a commented placeholder for Google Analytics 4 exists near the top of `index.html`. When Ricardo provides the Measurement ID (`G-XXXXXXXXXX`), uncomment the two lines and substitute the real ID.
