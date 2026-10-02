/* First-touch attribution: saves UTM/click-ID, landing page and referrer, and passes them to the GHL form. */
(function () {
  var KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'gclid', 'fbclid'];
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
    try { if (store) store.setItem('bb_attr', JSON.stringify(data)); } catch (e) {}
  }
  function decorate(url) {
    try {
      var u = new URL(url, location.href);
      Object.keys(data).forEach(function (k) { if (data[k]) u.searchParams.set(k, data[k]); });
      return u.toString();
    } catch (e) { return url; }
  }
  document.querySelectorAll('iframe[src*="leadconnectorhq"]').forEach(function (f) { f.src = decorate(f.src); });
  document.querySelectorAll('a[href*="leadconnectorhq"]').forEach(function (a) { a.href = decorate(a.href); });
})();
