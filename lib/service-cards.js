(function (root, factory) {
  const api = factory(root); if (typeof module === 'object' && module.exports) module.exports = api; else root.NookServiceCards = api;
})(globalThis, root => {
  const colors = { github: '#f28b95', vercel: '#ab99ff', stripe: '#73a9ff', resend: '#efbd70', notion: '#c1c9d8', n8n: '#ed9f5f', cal: '#8bd0b1' };
  function describe(item) {
    if (['claude', 'codex'].includes(item.id)) { const high = Math.max(item.primaryUsed ?? 0, item.weeklyUsed ?? 0) >= 90; return { mood: high ? 'expectant' : 'happy', status: high ? 'Near your limit' : 'View usage', tone: high ? 'warning' : 'ready', color: '#b7c6ff' }; }
    const detail = String(item.detail || ''), failure = /(?:\b(?:failed|failure|error|offline)\b|[1-9]\d* failing)/i.test(detail), attention = /[1-9]\d* reviews/i.test(detail);
    return { mood: failure ? 'dizzy' : attention ? 'expectant' : 'happy', status: failure ? 'Needs attention' : attention ? 'Review requested' : 'Connected', tone: failure ? 'error' : attention ? 'warning' : 'ready', color: colors[item.id] || '#b7c6ff' };
  }
  const mounted = new WeakMap();
  function render(container, items, { openService, openUsage, colors: custom = {} }) {
    let cards = mounted.get(container); if (!cards) { cards = new Map(); mounted.set(container, cards); }
    const ids = new Set(); let position=0;
    for (const item of items) {
      const id = item.id; if (!id || ids.has(id)) continue; ids.add(id);
      let card = cards.get(id);
      if (!card) {
        const service = Object.hasOwn(colors, id), usage = ['claude', 'codex'].includes(id), element = document.createElement(service || usage ? 'button' : 'div');
        element.className = 'service-card'; element.dataset.agent = id;
        if (service || usage) { element.type = 'button'; element.addEventListener('click', event => { event.stopPropagation(); if (service) openService(id); else openUsage?.(id); }); }
        const canvas = document.createElement('canvas'); canvas.width = canvas.height = 96; canvas.className = 'brand-seed service-pet'; canvas.setAttribute('aria-hidden', 'true');
        const copy = document.createElement('span'); copy.className = 'service-card-copy';
        const title = document.createElement('strong'), detail = document.createElement('span'), badge = document.createElement('small');
        detail.dataset.noLocalize = 'true'; copy.append(title, detail, badge); element.append(canvas, copy);
        card = { element, canvas, title, detail, badge }; cards.set(id, card); container.append(element); root.NookSeed.bind(canvas);
      }
      if(container.children[position]!==card.element)container.insertBefore(card.element,container.children[position]||null);position++;
      const descriptor = describe(item), hue = /^#[0-9a-f]{6}$/i.test(custom[id]) ? custom[id] : descriptor.color;
      for (const [key, value] of Object.entries({ body: hue, pupil: '#202735', mood: descriptor.mood })) if (card.canvas.dataset[key] !== value) card.canvas.dataset[key] = value;
      card.element.dataset.tone = descriptor.tone;
      const title = String(item.title || id), detail = String(item.detail || '');
      if (card.title.textContent !== title) card.title.textContent = title;
      if (card.detail.textContent !== detail) card.detail.textContent = detail;
      const badge = root.NookLocale?.t(descriptor.status) || descriptor.status;
      if (card.badge.textContent !== badge) card.badge.textContent = badge;
      const accessible = title + ': ' + detail; if (card.element.getAttribute('aria-label') !== accessible) card.element.setAttribute('aria-label', accessible);
    }
    for (const [id, card] of cards) if (!ids.has(id)) { card.canvas._nookDispose?.(); card.element.remove(); cards.delete(id); }
  }
  return { describe, render };
});
