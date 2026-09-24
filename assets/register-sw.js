(() => {
  if (!('serviceWorker' in navigator)) return;
  let registration;
  let updating = false;

  async function refresh() {
    if (updating || !navigator.onLine || document.hidden) return;
    updating = true;
    try {
      if (registration) await registration.update();
      else registration = await navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' });
    } catch {
    } finally {
      updating = false;
    }
  }

  addEventListener('load', () => {
    void refresh();
    setInterval(refresh, 60000);
  }, { once: true });
  addEventListener('online', refresh);
  document.addEventListener('visibilitychange', refresh);
})();