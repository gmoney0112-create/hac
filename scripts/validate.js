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
const README = path.join(ROOT, 'README.md');

const PAGES_BASE = '/hac/';
const CANONICAL = 'https://gmoney0112-create.github.io/hac/';
const FORM_URL = 'https://api.leadconnectorhq.com/widget/form/tO1CQEoKcm56IsYYboAq';
const EXPECTED_TITLE = 'Heavenly Arbor Care – Professional Tree Services in San Antonio';

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
const readme = read(README);
if (indexHtml) pass('index.html present');
if (privacyHtml) pass('privacy.html present');
if (readme) pass('README.md present');

// 2. index.html head checks
if (indexHtml) {
  const titleMatch = indexHtml.match(/<title>([^<]+)<\/title>/);
  if (!titleMatch) fail('index.html: <title> missing');
  else if (titleMatch[1].trim() !== EXPECTED_TITLE) {
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
  if (!/href="\/hac\/"/.test(privacyHtml)) {
    fail('privacy.html: back link should be href="/hac/" for GitHub Pages project path');
  } else pass('privacy.html: back link points to /hac/');
}

// 4. Book/estimate CTA wiring — every link to LeadConnector should use the exact form URL.
if (indexHtml) {
  const lcMatches = [...indexHtml.matchAll(/href="(https?:\/\/api\.leadconnectorhq\.com\/[^"]+)"/g)].map(m => m[1]);
  if (lcMatches.length === 0) fail('index.html: no LeadConnector CTA links found');
  const wrong = lcMatches.filter(u => u !== FORM_URL);
  if (wrong.length) {
    for (const u of wrong) fail(`index.html: LeadConnector link mismatch: "${u}" (expected "${FORM_URL}")`);
  }
  if (lcMatches.length && wrong.length === 0) {
    pass(`index.html: all ${lcMatches.length} LeadConnector CTA link(s) use the exact form URL`);
  }

  // Must have at least the 3 expected CTA surfaces: nav, hero, main booking.
  const expectedCtaIds = ['heroBook', 'mainBook'];
  for (const id of expectedCtaIds) {
    const re = new RegExp(`id="${id}"[^>]*href="${FORM_URL.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"|href="${FORM_URL.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"[^>]*id="${id}"`);
    if (!re.test(indexHtml)) fail(`index.html: expected CTA with id="${id}" bound to form URL not found`);
    else pass(`index.html: CTA id="${id}" wired to form URL`);
  }
  // Nav Free Estimate button
  if (!/class="nav-book"[^>]*href="https:\/\/api\.leadconnectorhq\.com\/widget\/form\/tO1CQEoKcm56IsYYboAq"|href="https:\/\/api\.leadconnectorhq\.com\/widget\/form\/tO1CQEoKcm56IsYYboAq"[^>]*class="nav-book"/.test(indexHtml)) {
    fail('index.html: nav Free Estimate button not wired to form URL');
  } else pass('index.html: nav Free Estimate button wired to form URL');
}

// 5. Forbidden storage APIs
const forbidden = ['localStorage', 'sessionStorage', 'indexedDB', 'document.cookie'];
for (const file of [INDEX, PRIVACY]) {
  if (!fs.existsSync(file)) continue;
  const src = fs.readFileSync(file, 'utf8');
  for (const api of forbidden) {
    if (src.includes(api)) {
      fail(`${path.relative(ROOT, file)}: forbidden storage API "${api}" found`);
    }
  }
}
pass('no forbidden storage APIs in index.html or privacy.html');

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
if (readme) scanPlaceholders(readme, 'README.md', { allowGhlChecklist: true });
pass('no unresolved placeholders outside documented locations');

// --- Report ---
const GREEN = '\x1b[32m', RED = '\x1b[31m', YELLOW = '\x1b[33m', DIM = '\x1b[2m', RESET = '\x1b[0m';
console.log(`${DIM}HAC static validation${RESET}`);
for (const p of passes) console.log(`  ${GREEN}✓${RESET} ${p}`);
for (const w of warnings) console.log(`  ${YELLOW}!${RESET} ${w}`);
for (const e of errors) console.log(`  ${RED}✗${RESET} ${e}`);

console.log('');
console.log(`${passes.length} passed, ${warnings.length} warning(s), ${errors.length} error(s)`);

if (errors.length > 0) process.exit(1);
