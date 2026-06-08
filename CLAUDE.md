# ProFlow Plumbing — Website

Static HTML marketing site + quote/booking system for a San Antonio plumbing
company. 4 pages. Lead capture via GoHighLevel (GHL) CRM webhook.

## Pages

| File | Purpose |
|------|---------|
| `index.html` | Main landing page — hero, services, why us, how it works, reviews, areas, CTA, 3-step quote modal |
| `faq.html` | FAQ accordion page — 12+ plumbing questions |
| `privacy.html` | Privacy policy with SMS consent language |
| `thank-you.html` | Post-submission confirmation page |

## Business Info (update before going live)

- **Phone:** (210) 555-0100 — replace with real number
- **Email:** info@proflowplumbing.com — replace with real email
- **Company:** ProFlow Plumbing
- **Schema.org type:** Plumber

To update contact info, search all HTML files for `555-0100` and `proflowplumbing.com`.

## Booking / Quote Flow

1. Customer opens quote modal (3-step)
2. Step 1: Select service type (6 options) + type of issue + urgency → dynamic price estimate
3. Step 2: Pick date/time, enter address, describe the problem
4. Step 3: Enter contact info → submit fires GHL webhook
5. On success: inline success state shown inside modal

## GHL Webhook

The webhook POST URL is set in `index.html` in the `<script>` block:

```js
var WEBHOOK = 'YOUR_GHL_WEBHOOK_URL';
```

Replace `YOUR_GHL_WEBHOOK_URL` with your actual GoHighLevel webhook trigger URL.

Payload sent on submission:
```json
{
  "firstName": "...",
  "lastName": "...",
  "phone": "...",
  "email": "...",
  "service": "...",
  "issueType": "...",
  "urgency": "...",
  "date": "...",
  "time": "...",
  "address": "...",
  "notes": "...",
  "estimatedPrice": "...",
  "source": "website-quote-form",
  "submittedAt": "..."
}
```

## Estimate Logic

Estimate is calculated in `updateEstimate()` in `index.html`:
- Base price per service: Emergency $150, Drain $99, Water Heater $200, Pipe $175, Bath/Kitchen $200, Commercial = custom
- Emergency urgency adds ~30% to the base
- High end of range is ~40% above the adjusted base

## Color Palette

```css
--navy: #0b1a2e
--navy-mid: #132740
--navy-light: #1a3554
--copper: #c47c1e        /* primary accent */
--copper-light: #df9b3a
--copper-pale: rgba(196,124,30,.12)
```

## Anti-Spam (implemented)

- **Honeypot field** (`#website` input, hidden via CSS) — bots fill it, form rejects submission
- **localStorage rate limiting** — prevents re-submission within 60 seconds from same browser (key: `pf_last_submit`)

## Analytics

No analytics tag included by default. Add Google Analytics 4 or Meta Pixel in the `<head>` of `index.html` before going live.

## SEO

Schema.org `Plumber` JSON-LD is in `index.html`. Update before launch:
- `telephone` — real business phone
- `email` — real business email
- `url` — real deployed domain
- `aggregateRating.reviewCount` — real review count

## Deployment

Static files — deploy to GitHub Pages, Netlify, or Vercel. No build step required.

```
Root files:
  index.html
  faq.html
  privacy.html
  thank-you.html
  CLAUDE.md
```

## Known Remaining Items (post-launch)

- Replace placeholder phone/email throughout
- Set real GHL webhook URL in index.html
- Add GA4 measurement ID
- Testimonials are hardcoded — consider embedding Google Reviews
- Stats (1,200+ jobs, 4.9★, 8+ years) are hardcoded — update with real data
- No professional photography
- No real-time availability / scheduling calendar
- No payment/deposit collection
- Consider Netlify/Vercel function to proxy webhook for URL security
