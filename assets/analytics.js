// Tiny Arcade — pseudonymous page-load analytics with browser privacy controls.
(function () {
  var URL = 'https://tmngedsmgcgbkbkmsnsw.supabase.co/rest/v1/arcade_events';
  var KEY = 'sb_publishable_qFZySs9l19_7bISrvmLHIw_vwt-DUdx';
  var preferenceKey = 'arcade.analytics.disabled';
  var privateBrowser = navigator.doNotTrack === '1' || navigator.globalPrivacyControl === true;
  var control = document.getElementById('analytics-enabled');
  var status = document.getElementById('privacy-status');

  function optedOut() {
    try { return privateBrowser || localStorage.getItem(preferenceKey) === '1'; }
    catch (e) { return true; }
  }

  if (control) {
    control.checked = !optedOut();
    control.disabled = privateBrowser;
    if (status && privateBrowser) status.textContent = 'Analytics is disabled by your browser privacy preference.';
    control.addEventListener('change', function () {
      try {
        if (control.checked) localStorage.removeItem(preferenceKey);
        else {
          localStorage.setItem(preferenceKey, '1');
          localStorage.removeItem('arcade.vid');
        }
        sessionStorage.removeItem('arcade.visited');
        if (status) status.textContent = control.checked ? 'Analytics enabled for future page visits.' : 'Analytics disabled on this browser.';
      } catch (e) {
        control.checked = false;
        if (status) status.textContent = 'Browser storage is unavailable. The preference could not be saved; analytics is disabled while storage is unavailable.';
      }
    });
  }
  if (optedOut()) return;

  function visitorId() {
    try {
      var v = localStorage.getItem('arcade.vid');
      if (!v) {
        v = (crypto && crypto.randomUUID) ? crypto.randomUUID() : String(Date.now()) + '-' + Math.random().toString(36).slice(2);
        localStorage.setItem('arcade.vid', v);
      }
      return v;
    } catch (e) { return null; }
  }

  function slug() {
    if (location.pathname === '/' || location.pathname === '/index.html') return 'hub';
    var m = location.pathname.match(/^\/([a-z0-9-]+)\/(?:index\.html)?$/);
    var games = ['2048', 'chromatic', 'digit-span', 'echo', 'flash', 'flashmath', 'hue-hunt', 'interval', 'sprint', 'where', 'word', 'wordle'];
    return m && games.indexOf(m[1]) !== -1 ? m[1] : null;
  }

  function log(kind, game) {
    try {
      fetch(URL, {
        method: 'POST',
        keepalive: true,
        headers: {
          apikey: KEY,
          Authorization: 'Bearer ' + KEY,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
        },
        body: JSON.stringify({ kind: kind, game: game, visitor: visitorId() }),
      }).catch(function () {});
    } catch (e) { /* ignore */ }
  }

  var g = slug();
  if (!g) return;
  // One visit per tab session on recognized pages.
  try {
    if (!sessionStorage.getItem('arcade.visited')) {
      sessionStorage.setItem('arcade.visited', '1');
      log('visit', g);
    }
  } catch (e) { log('visit', g); }
  // A play for each game page load.
  if (g !== 'hub') log('play', g);
})();
