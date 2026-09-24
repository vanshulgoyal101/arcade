export function initCatalog(root = document, navigate = href => location.assign(href)) {
  const random = root.getElementById('randomBtn');
  if (!random) return;
  const cards = [...root.querySelectorAll('.grid a.card')];
  random.disabled = cards.length === 0;
  random.addEventListener('click', () => {
    const card = cards[Math.floor(Math.random() * cards.length)];
    if (card) navigate(card.getAttribute('href'));
  });
}

initCatalog();