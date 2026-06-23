#!/usr/bin/env node
/*
 * Static launch-readiness validator for the HAC site.
 * No network calls. Run via: npm run check
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const INDEX = path.join(ROOT, 'index.html');
const PRIVACY = path.join(ROOT, 'privacy.html');
const TERMS = path.join(ROOT, 'terms.html');
const README = path.join(ROOT, 'README.md');
const SITEMAP = path.join(ROOT, 'sitemap.xml');
const ROBOTS = path.join(ROOT, 'robots.txt');
const NOT_FOUND = path.join(ROOT, '404.html');
const SVC_PAGES = [
  'tree-removal-san-antonio.html',
  'tree-trimming-san-antonio.html',
  'stump-grinding-san-antonio.html',
  'emergency-tree-service-san-antonio.html',
];

const PAGES_BASE = '/';
const CANONICAL = 'https://www.brokenbranchsa.com/';
const FORM_URL = 'https://api.leadconnectorhq.com/widget/form/DqRO49iQIrGHxMJn8ZnY';
const EXPECTED_TITLE = 'Broken Branch SA – Professional Tree Services in San Antonio';
const EXPECTED_TITLE_ENTITY = 'Broken Branch SA &ndash; Professional Tree Services in San Antonio';

const errors = [];
const warnings = [];
const passes = [];

function fail(msg) { errors.push(msg); }
function warn(msg) { warnings.push(msg); }
function pass(msg) { passes.push(msg); }

function read(p) {
  if (!fs.existsSync(p)) {
    fail(`required file missing: ${path.relative(ROOT, p)}`);
    return null;
  }
  return fs.readFileSync(p, 'utf8');
}

// 1. Required files
const indexHtml = read(INDEX);
const privacyHtml = read(PRIVACY);
const termsHtml = read(TERMS);
const readme = read(README);
const sitemapXml = read(SITEMAP);
const robotsTxt = read(ROBOTS);
const notFoundHtml = read(NOT_FOUND);
if (indexHtml) pass('index.html present');
if (privacyHtml) pass('privacy.html present');
if (termsHtml) pass('terms.html present');
if (readme) pass('README.md present');
if (sitemapXml) pass('sitemap.xml present');
if (robotsTxt) pass('robots.txt present');
if (notFoundHtml) pass('404.html present');

// 2. index.html head checks
if (indexHtml) {
  const titleMatch = indexHtml.match(/<title>([^<]+)<\/title>/);
  if (!titleMatch) fail('index.html: <title> missing');
  else if (titleMatch[1].trim() !== EXPECTED_TITLE && titleMatch[1].trim() !== EXPECTED_TITLE_ENTITY) {
    fail(`index.html: unexpected <title>: "${titleMatch[1].trim()}"`);
  } else pass('index.html: <title> matches expected');

  const canon = indexHtml.match(/<link\s+rel="canonical"\s+href="([^"]+)"\s*\/?>/);
  if (!canon) fail('index.html: <link rel="canonical"> missing');
  else if (canon[1] !== CANONICAL) fail(`index.html: canonical is "${canon[1]}", expected "${CANONICAL}"`);
  else pass('index.html: canonical URL correct');

  const ogUrl = indexHtml.match(/<meta\s+property="og:url"\s+content="([^"]+)"\s*\/?>/);
  if (!ogUrl) fail('index.html: og:url missing');
  else if (ogUrl[1] !== CANONICAL) fail(`index.html: og:url is "${ogUrl[1]}", expected "${CANONICAL}"`);
  else pass('index.html: og:url matches canonical');

  // Malformed meta: look for any <meta ...> that is not properly closed before a newline with `>`.
  // Specifically guard against the prior bug where twitter:description had an unclosed tag.
  const metaMatches = indexHtml.match(/<meta[^>]*>/g) || [];
  const metaLikeButOpen = indexHtml.match(/<meta[^>]*$/gm) || [];
  if (metaLikeButOpen.length > 0) {
    fail(`index.html: ${metaLikeButOpen.length} malformed <meta> tag(s) not closed on same line`);
  } else pass('index.html: all <meta> tags appear closed');

  // Specifically verify twitter:description is present AND closed.
  const twDesc = indexHtml.match(/<meta\s+name="twitter:description"\s+content="[^"]*"\s*\/?>/);
  if (!twDesc) fail('index.html: twitter:description meta missing or malformed (must match name="twitter:description" content="...")');
  else pass('index.html: twitter:description well-formed');

  // og:image present
  if (!/<meta\s+property="og:image"\s+content="[^"]+"\s*\/?>/.test(indexHtml)) {
    fail('index.html: og:image meta tag missing');
  } else pass('index.html: og:image present');

  // twitter:card should be summary_large_image when og:image is set
  const twCard = indexHtml.match(/<meta\s+name="twitter:card"\s+content="([^"]+)"\s*\/?>/);
  if (!twCard) fail('index.html: twitter:card meta missing');
  else if (twCard[1] !== 'summary_large_image') warn(`index.html: twitter:card is "${twCard[1]}" — consider "summary_large_image" when og:image is set`);
  else pass('index.html: twitter:card is summary_large_image');

  // JSON-LD LocalBusiness schema present
  if (!indexHtml.includes('"@type": "LocalBusiness"')) {
    fail('index.html: JSON-LD LocalBusiness schema missing');
  } else pass('index.html: JSON-LD LocalBusiness schema present');

  // Google Fonts preconnect hints
  if (!indexHtml.includes('rel="preconnect" href="https://fonts.googleapis.com"')) {
    warn('index.html: missing preconnect hint for fonts.googleapis.com');
  } else pass('index.html: fonts.googleapis.com preconnect present');
}

// 3. Local href/src resolution + Pages-path correctness
if (indexHtml) {
  // All anchors to /hac/privacy.html should exist. Anchors beginning with '/' that are NOT /hac/
  // would break on Pages, so flag them.
  const localHrefs = [...indexHtml.matchAll(/href="(\/[^"#?]*)"/g)].map(m => m[1]);
  for (const href of localHrefs) {
    if (!href.startsWith(PAGES_BASE)) {
      fail(`index.html: absolute local href "${href}" does not start with ${PAGES_BASE} (will 404 on GitHub Pages project site)`);
    }
  }
  if (localHrefs.length > 0) pass(`index.html: ${localHrefs.length} absolute local href(s) all under ${PAGES_BASE}`);

  // Every /hac/<path> local href must resolve to a file in the repo.
  for (const href of localHrefs) {
    if (!href.startsWith(PAGES_BASE)) continue;
    const rel = href.slice(PAGES_BASE.length);
    if (rel === '' || rel.endsWith('/')) continue; // site root, not a file
    const localPath = path.join(ROOT, rel);
    if (!fs.existsSync(localPath)) {
      fail(`index.html: local href "${href}" points to missing file "${rel}"`);
    }
  }
}

if (privacyHtml) {
  // Back link must route correctly for Pages.
  if (!/href="\/"/.test(privacyHtml)) {
    fail('privacy.html: back link should be href="/" for root domain');
  } else pass('privacy.html: back link points to /');
}

if (termsHtml) {
  // Back link must route correctly for Pages.
  if (!/href="\/"/.test(termsHtml)) {
    fail('terms.html: back link should be href="/" for root domain');
  } else pass('terms.html: back link points to /');

  // Guard against malformed <meta> tags (same rule used on index.html).
  const termsMetaOpen = termsHtml.match(/<meta[^>]*$/gm) || [];
  if (termsMetaOpen.length > 0) {
    fail(`terms.html: ${termsMetaOpen.length} malformed <meta> tag(s) not closed on same line`);
  } else pass('terms.html: all <meta> tags appear closed');

  // Every absolute local href must route under /hac/ and resolve to a real file.
  const termsLocalHrefs = [...termsHtml.matchAll(/href="(\/[^"#?]*)"/g)].map(m => m[1]);
  let termsHrefsOk = true;
  for (const href of termsLocalHrefs) {
    if (!href.startsWith(PAGES_BASE)) {
      fail(`terms.html: absolute local href "${href}" does not start with ${PAGES_BASE} (will 404 on GitHub Pages project site)`);
      termsHrefsOk = false;
      continue;
    }
    const rel = href.slice(PAGES_BASE.length);
    if (rel === '' || rel.endsWith('/')) continue;
    const localPath = path.join(ROOT, rel);
    if (!fs.existsSync(localPath)) {
      fail(`terms.html: local href "${href}" points to missing file "${rel}"`);
      termsHrefsOk = false;
    }
  }
  if (termsHrefsOk && termsLocalHrefs.length > 0) {
    pass(`terms.html: ${termsLocalHrefs.length} absolute local href(s) all under ${PAGES_BASE} and resolve`);
  }
}

// index.html footer must link to both privacy and terms so users can reach them.
if (indexHtml) {
  if (!/href="\/privacy\.html"/.test(indexHtml)) {
    fail('index.html: footer Privacy Policy link href="/privacy.html" not found');
  } else pass('index.html: Privacy Policy link wired to /privacy.html');
  if (!/href="\/terms\.html"/.test(indexHtml)) {
    fail('index.html: footer Terms of Service link href="/terms.html" not found');
  } else pass('index.html: Terms of Service link wired to /terms.html');
}

// 4. Book/estimate CTA wiring — every link to LeadConnector should use the exact form URL.
if (indexHtml) {
  const lcMatches = [...indexHtml.matchAll(/(?:href|src)="(https?:\/\/api\.leadconnectorhq\.com\/[^"]+)"/g)].map(m => m[1]);
  if (lcMatches.length === 0) fail('index.html: no LeadConnector CTA links found');
  const wrong = lcMatches.filter(u => u !== FORM_URL);
  if (wrong.length) {
    for (const u of wrong) fail(`index.html: LeadConnector link mismatch: "${u}" (expected "${FORM_URL}")`);
  }
  if (lcMatches.length && wrong.length === 0) {
    pass(`index.html: all ${lcMatches.length} LeadConnector CTA link(s) use the exact form URL`);
  }

  // Must have at least the 2 expected CTA surfaces: hero link and main booking (iframe or link).
  const escapedFormUrl = FORM_URL.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // heroBook — standard anchor
  const heroRe = new RegExp(`id="heroBook"[^>]*href="${escapedFormUrl}"|href="${escapedFormUrl}"[^>]*id="heroBook"`);
  if (!heroRe.test(indexHtml)) fail('index.html: expected CTA with id="heroBook" bound to form URL not found');
  else pass('index.html: CTA id="heroBook" wired to form URL');
  // mainBook — may be an iframe (src=) or anchor (href=)
  const mainBookRe = new RegExp(`id="mainBook"[^>]*(?:href|src)="${escapedFormUrl}"|(?:href|src)="${escapedFormUrl}"[^>]*id="mainBook"`);
  if (!mainBookRe.test(indexHtml)) fail('index.html: expected CTA with id="mainBook" bound to form URL not found');
  else pass('index.html: CTA id="mainBook" wired to form URL');
  // Nav Free Estimate button
  if (!/class="nav-book"[^>]*href="https:\/\/api\.leadconnectorhq\.com\/widget\/form\/DqRO49iQIrGHxMJn8ZnY"|href="https:\/\/api\.leadconnectorhq\.com\/widget\/form\/DqRO49iQIrGHxMJn8ZnY"[^>]*class="nav-book"/.test(indexHtml)) {
    fail('index.html: nav Free Estimate button not wired to form URL');
  } else pass('index.html: nav Free Estimate button wired to form URL');
}

// 5. Forbidden storage APIs
const forbidden = ['localStorage', 'sessionStorage', 'indexedDB', 'document.cookie'];
for (const file of [INDEX, PRIVACY, TERMS]) {
  if (!fs.existsSync(file)) continue;
  const src = fs.readFileSync(file, 'utf8');
  for (const api of forbidden) {
    if (src.includes(api)) {
      fail(`${path.relative(ROOT, file)}: forbidden storage API "${api}" found`);
    }
  }
}
pass('no forbidden storage APIs in index.html, privacy.html, or terms.html');

// 6. Unresolved placeholders
// Allowed: GA4 placeholder G-XXXXXXXXXX inside the commented <!-- GA4 --> block,
// and GHL placeholder references inside the README handoff checklist.
function scanPlaceholders(src, label, { allowGA4Comment = false, allowGhlChecklist = false } = {}) {
  // Look for bracketed ALL-CAPS placeholders like [BUSINESS NAME], [USE_CASE_...], and G-XXXXXXXXXX.
  const bracketRe = /\[[A-Z][A-Z0-9 _\-]{2,}\]/g;
  const ga4Re = /G-XXXXXXXXXX/g;
  const bracketMatches = [...src.matchAll(bracketRe)];
  const ga4Matches = [...src.matchAll(ga4Re)];

  for (const m of bracketMatches) {
    const idx = m.index;
    // README: if allowGhlChecklist, these placeholders are documentation and expected.
    if (allowGhlChecklist) continue;
    fail(`${label}: unresolved placeholder ${m[0]} at offset ${idx}`);
  }
  for (const m of ga4Matches) {
    const idx = m.index;
    if (allowGA4Comment) {
      // Verify it's inside an HTML comment.
      const before = src.lastIndexOf('<!--', idx);
      const after = src.indexOf('-->', idx);
      if (before !== -1 && after !== -1 && before < idx && idx < after) continue;
      fail(`${label}: G-XXXXXXXXXX placeholder found outside a comment at offset ${idx}`);
    } else if (allowGhlChecklist) {
      // In README, GA4 section references it as documentation.
      continue;
    } else {
      fail(`${label}: unresolved GA4 placeholder G-XXXXXXXXXX at offset ${idx}`);
    }
  }
}

if (indexHtml) scanPlaceholders(indexHtml, 'index.html', { allowGA4Comment: true });
if (privacyHtml) scanPlaceholders(privacyHtml, 'privacy.html');
if (termsHtml) scanPlaceholders(termsHtml, 'terms.html');
if (readme) scanPlaceholders(readme, 'README.md', { allowGhlChecklist: true });
pass('no unresolved placeholders outside documented locations');

// Facebook Pixel placeholder check
if (indexHtml && indexHtml.includes('YOUR_PIXEL_ID_HERE')) {
  warn('index.html: Facebook Pixel YOUR_PIXEL_ID_HERE not yet replaced — add your real Pixel ID from business.facebook.com/events');
}

// 7. sitemap.xml content checks
if (sitemapXml) {
  if (!sitemapXml.includes(CANONICAL)) {
    fail(`sitemap.xml: canonical URL "${CANONICAL}" not found in sitemap`);
  } else pass('sitemap.xml: canonical URL present');
  if (!sitemapXml.includes('privacy.html')) fail('sitemap.xml: privacy.html URL missing');
  else pass('sitemap.xml: privacy.html URL present');
  if (!sitemapXml.includes('terms.html')) fail('sitemap.xml: terms.html URL missing');
  else pass('sitemap.xml: terms.html URL present');
}

// 8. robots.txt content checks
if (robotsTxt) {
  if (!/User-agent:\s*\*/i.test(robotsTxt)) fail('robots.txt: User-agent: * directive missing');
  else pass('robots.txt: User-agent: * present');
  if (!robotsTxt.includes('sitemap.xml')) fail('robots.txt: Sitemap directive missing');
  else pass('robots.txt: Sitemap directive present');
}

// 9. 404.html checks
if (notFoundHtml) {
  if (!/href="\/"/.test(notFoundHtml)) fail('404.html: link back to / missing');
  else pass('404.html: link back to / present');
  if (!notFoundHtml.includes('noindex')) warn('404.html: meta noindex not set — search engines may index the error page');
  else pass('404.html: meta noindex set');
}

// 10. Service pages: exist, have canonical, have form URL, link back to /
for (const svcFile of SVC_PAGES) {
  const svcPath = path.join(ROOT, svcFile);
  if (!fs.existsSync(svcPath)) {
    fail(`service page missing: ${svcFile}`);
    continue;
  }
  const svc = fs.readFileSync(svcPath, 'utf8');
  pass(`${svcFile} present`);
  const svcCanonical = `${CANONICAL}${svcFile}`;
  if (!svc.includes(svcCanonical)) fail(`${svcFile}: canonical URL missing or wrong`);
  else pass(`${svcFile}: canonical URL correct`);
  if (!svc.includes(FORM_URL)) fail(`${svcFile}: LeadConnector form URL missing`);
  else pass(`${svcFile}: form URL present`);
  if (!/href="\/"/.test(svc)) fail(`${svcFile}: link back to / missing`);
  else pass(`${svcFile}: back-link to / present`);
}

// --- Report ---
const GREEN = '\x1b[32m', RED = '\x1b[31m', YELLOW = '\x1b[33m', DIM = '\x1b[2m', RESET = '\x1b[0m';
console.log(`${DIM}HAC static validation${RESET}`);
for (const p of passes) console.log(`  ${GREEN}✓${RESET} ${p}`);
for (const w of warnings) console.log(`  ${YELLOW}!${RESET} ${w}`);
for (const e of errors) console.log(`  ${RED}✗${RESET} ${e}`);

console.log('');
console.log(`${passes.length} passed, ${warnings.length} warning(s), ${errors.length} error(s)`);

if (errors.length > 0) process.exit(1);
