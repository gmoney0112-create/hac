#!/usr/bin/env node
/*
 * Live smoke check for the HAC site. Hits the GitHub Pages deployment
 * and the LeadConnector form URL. Run via: npm run smoke:live
 *
 * Exit non-zero ONLY when an endpoint is broken or the LeadConnector
 * response has no HTML body. Known GHL content issues (literal "Button"
 * label, unresolved SMS consent placeholders) are reported as warnings
 * so they don't block the pipeline — they must be fixed inside GHL.
 */
'use strict';

const SITE = 'https://gmoney0112-create.github.io/hac/';
const PRIVACY = 'https://gmoney0112-create.github.io/hac/privacy.html';
const TERMS = 'https://gmoney0112-create.github.io/hac/terms.html';
const FORM = 'https://api.leadconnectorhq.com/widget/form/tO1CQEoKcm56IsYYboAq';

const GREEN = '\x1b[32m', RED = '\x1b[31m', YELLOW = '\x1b[33m', DIM = '\x1b[2m', RESET = '\x1b[0m';

let errors = 0;
let warnings = 0;

async function fetchWithTimeout(url, ms = 15000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      redirect: 'follow',
      headers: { 'User-Agent': 'hac-smoke-check/1.0' },
    });
    const text = await res.text();
    return { status: res.status, ok: res.ok, text, url: res.url };
  } finally {
    clearTimeout(t);
  }
}

async function check(label, url, { expectHtmlContains = [], ghlSoftChecks = false } = {}) {
  process.stdout.write(`${DIM}→${RESET} ${label} ${url} ... `);
  try {
    const r = await fetchWithTimeout(url);
    if (!r.ok) {
      console.log(`${RED}FAIL${RESET} (${r.status})`);
      errors++;
      return;
    }
    if (!r.text || r.text.length < 100) {
      console.log(`${RED}FAIL${RESET} (empty body)`);
      errors++;
      return;
    }
    for (const needle of expectHtmlContains) {
      if (!r.text.includes(needle)) {
        console.log(`${RED}FAIL${RESET} (missing expected content: ${needle})`);
        errors++;
        return;
      }
    }
    console.log(`${GREEN}OK${RESET} (${r.status}, ${r.text.length} bytes)`);

    if (ghlSoftChecks) {
      // Known GHL caveats — never fail, just warn loudly so the operator knows
      // they're still outstanding in GoHighLevel.
      const caveats = [
        { re: /\[BUSINESS NAME\]/, msg: 'SMS consent still contains [BUSINESS NAME] placeholder' },
        { re: /\[USE_CASE_FROM_CAMPAIGN_DESCRIPTION\]/, msg: 'SMS consent still contains [USE_CASE_FROM_CAMPAIGN_DESCRIPTION] placeholder' },
        { re: />Button<\/button>|value="Button"/, msg: 'Submit button still labelled literal "Button"' },
      ];
      for (const c of caveats) {
        if (c.re.test(r.text)) {
          console.log(`    ${YELLOW}!${RESET} GHL caveat: ${c.msg} (fix inside GoHighLevel)`);
          warnings++;
        }
      }
      // Terms-of-service link: during the temporary launch-safe setup, Terms
      // points to /hac/privacy.html. Warn (don't fail) until GHL is updated to
      // the real /hac/terms.html URL.
      const hasTermsUrl = /gmoney0112-create\.github\.io\/hac\/terms\.html/.test(r.text);
      const hasPrivacyUrl = /gmoney0112-create\.github\.io\/hac\/privacy\.html/.test(r.text);
      if (!hasTermsUrl) {
        if (hasPrivacyUrl) {
          console.log(`    ${YELLOW}!${RESET} GHL caveat: Terms link still points to /hac/privacy.html (update inside GoHighLevel to https://gmoney0112-create.github.io/hac/terms.html)`);
        } else {
          console.log(`    ${YELLOW}!${RESET} GHL caveat: Terms link does not reference /hac/terms.html yet (update inside GoHighLevel to https://gmoney0112-create.github.io/hac/terms.html)`);
        }
        warnings++;
      }
    }
  } catch (err) {
    console.log(`${RED}FAIL${RESET} (${err.message})`);
    errors++;
  }
}

(async () => {
  console.log(`${DIM}HAC live smoke check${RESET}`);
  await check('site     ', SITE, { expectHtmlContains: ['Heavenly Arbor Care', 'leadconnectorhq.com/widget/form/tO1CQEoKcm56IsYYboAq'] });
  await check('privacy  ', PRIVACY, { expectHtmlContains: ['Privacy Policy', 'SMS'] });
  await check('terms    ', TERMS, { expectHtmlContains: ['Terms of Service', 'Heavenly Arbor Care'] });
  await check('ghl form ', FORM, { ghlSoftChecks: true });

  console.log('');
  console.log(`${errors} endpoint error(s), ${warnings} GHL caveat(s)`);
  if (errors > 0) process.exit(1);
})();
