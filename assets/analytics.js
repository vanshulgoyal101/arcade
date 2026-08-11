// Tiny Arcade — anonymous analytics beacon. Loaded on every page (hub + games).
// Logs one 'visit' per browser session and a 'play' per game page load. No PII;
// just a kind, the game slug, a timestamp (server-side), and an anonymous
// per-device id. Raw fetch to keep it tiny — no SDK on the game pages.
(function () {
  var URL = 'https://tmngedsmgcgbkbkmsnsw.supabase.co/rest/v1/arcade_events';
  var KEY = 'sb_publishable_qFZySs9l19_7bISrvmLHIw_vwt-DUdx';

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

  // '/wordle/' or '/wordle/index.html' -> 'wordle'; hub / other pages -> 'hub'.
  function slug() {
    var m = location.pathname.match(/^\/([a-z0-9-]+)\/(?:index\.html)?$/);
    return (m && m[1] !== 'stats' && m[1] !== 'assets') ? m[1] : 'hub';
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
  // One visit per browser session (any page).
  try {
    if (!sessionStorage.getItem('arcade.visited')) {
      sessionStorage.setItem('arcade.visited', '1');
      log('visit', g);
    }
  } catch (e) { log('visit', g); }
  // A play for each game page load.
  if (g !== 'hub') log('play', g);
})();
