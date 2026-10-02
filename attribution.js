/* First-touch attribution + intent tracking for Broken Branch SA.
   - Saves UTM/click IDs, landing page, referrer, first-touch time and appends them to GHL form links/iframes.
   - Fires INTENT events (click_estimate, click_call, click_emergency_call). Completed leads are fired on thank-you.html only. */
(function () {
  var KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'gclid', 'gbraid', 'wbraid', 'fbclid'];
  var store = null;
  try { store = window.localStorage; } catch (e) {}
  var data = {};
  try { data = JSON.parse((store && store.getItem('bb_attr')) || '{}'); } catch (e) {}
  var qs = new URLSearchParams(location.search);
  var hasNew = KEYS.some(function (k) { return qs.get(k); });
  if (!data.landing_page || hasNew) {
    data = {};
    KEYS.forEach(function (k) { if (qs.get(k)) data[k] = qs.get(k); });
    data.landing_page = location.origin + location.pathname;
    data.referrer = document.referrer || '';
    data.first_touch_time = new Date().toISOString();
    try { if (store) store.setItem('bb_attr', JSON.stringify(data)); } catch (e) {}
  }
  function decorate(url) {
    try {
      var u = new URL(url, location.href);
      Object.keys(data).forEach(function (k) { if (data[k]) u.searchParams.set(k, data[k]); });
      return u.toString();
    } catch (e) { return url; }
  }
  function markIntent() {
    try { if (store) store.setItem('bb_lead_intent', String(Date.now())); } catch (e) {}
  }
  function track(name, params, fbEvent) {
    params = params || {};
    params.page_path = location.pathname;
    try { if (typeof gtag === 'function') gtag('event', name, params); } catch (e) {}
    try { if (window.fbq && fbEvent) fbq(fbEvent.type, fbEvent.name, { content_name: name }); } catch (e) {}
  }

  document.querySelectorAll('iframe[src*="leadconnectorhq"]').forEach(function (f) {
    f.src = decorate(f.src);
    markIntent(); // inline form is on this page: a later thank-you visit is a plausible form completion
  });
  document.querySelectorAll('a[href*="leadconnectorhq"]').forEach(function (a) {
    a.href = decorate(a.href);
    a.addEventListener('click', function () {
      markIntent();
      track('click_estimate', { event_category: 'intent', event_label: a.id || 'estimate_link' }, { type: 'trackCustom', name: 'EstimateClick' });
    });
  });
  document.querySelectorAll('a[href^="tel:"]').forEach(function (a) {
    a.addEventListener('click', function () {
      var emergency = /emergency/.test(location.pathname) || !!a.closest('#emergency, .em-sec, .em-btn');
      track(emergency ? 'click_emergency_call' : 'click_call',
        { event_category: 'intent', event_label: emergency ? 'emergency_phone' : 'phone_number' },
        { type: 'track', name: 'Contact' });
    });
  });
})();
