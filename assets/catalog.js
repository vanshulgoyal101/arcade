const normalize = value => value.toLowerCase().replace(/colour/g, 'color').trim();

export function initCatalog(root = document, navigate = href => location.assign(href)) {
  const form = root.getElementById('catalog-search');
  const input = root.getElementById('game-search');
  const count = root.getElementById('game-count');
  const random = root.getElementById('randomBtn');
  if (!form || !input || !count || !random) return;
  const reset = form.querySelector('button[type="reset"]');
  const entries = [...root.querySelectorAll('.grid a.card')].map(card => ({
    card,
    text: normalize([...card.querySelectorAll('h2, p, .tag')].map(element => element.textContent).join(' ')),
  }));
  let visible = entries;

  function update() {
    const terms = normalize(input.value).split(/[\s-]+/).filter(Boolean);
    visible = entries.filter(entry => terms.every(term => entry.text.includes(term)));
    const matches = new Set(visible);
    for (const entry of entries) entry.card.hidden = !matches.has(entry);
    count.textContent = visible.length ? `${visible.length} ${visible.length === 1 ? 'game' : 'games'}` : 'No games match.';
    random.disabled = visible.length === 0;
    reset.disabled = input.value.length === 0;
  }

  form.addEventListener('submit', event => event.preventDefault());
  input.addEventListener('input', update);
  form.addEventListener('reset', () => {
    input.value = '';
    update();
    input.focus();
  });
  random.addEventListener('click', () => {
    const entry = visible[Math.floor(Math.random() * visible.length)];
    if (entry) navigate(entry.card.getAttribute('href'));
  });
  root.defaultView?.addEventListener('pageshow', update);
  update();
  form.hidden = false;
}

initCatalog();