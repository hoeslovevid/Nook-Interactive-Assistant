// Original, compact line icons used by the desktop chrome.
(() => {
  const paths = {
    library:'M3 4h7l2 2 2-2h7v16h-7l-2 2-2-2H3ZM12 6v16M6 8h3M6 12h3M15 8h3M15 12h3',
    voice:'M9 6a3 3 0 0 1 6 0v6a3 3 0 0 1-6 0ZM6 11v1a6 6 0 0 0 12 0v-1M12 18v4M8 22h8',
    studio:'M3 12h4l3-7 4 14 3-7h4M4 4h3M17 20h3',
    everyday: 'M5 3h14v18H5ZM8 7h8M8 11h5M8 15h3M15 15l2 2 4-4',
    performance: 'M3 15a9 9 0 0 1 18 0M12 15l5-7M5 19h14M6 12h.01M12 6h.01M18 12h.01',
    home: 'M3 10 12 3l9 7M5 9v11h5v-6h4v6h5V9',
    chat: 'M5 4h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H9l-6 3V6a2 2 0 0 1 2-2Z',
    plus: 'M12 5v14M5 12h14',
    settings: 'M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z',
    sound: 'M11 4 6 8H3v8h3l5 4ZM15 8c3 2 3 6 0 8M18 5c5 4 5 10 0 14',
    muted: 'M11 4 6 8H3v8h3l5 4ZM16 9l6 6M22 9l-6 6',
    look: 'M12 3a9 9 0 1 0 0 18h1a2 2 0 0 0 2-2c0-1-2-1-2-3 0-1 1-2 2-2h3a3 3 0 0 0 3-3 9 9 0 0 0-9-8ZM7 9h.01M11 6h.01M16 8h.01',
    keys: 'M14 4a6 6 0 1 1-4 10L3 21H1v-4l7-7a6 6 0 0 1 6-6ZM17 7h.01',
    agents: 'M4 7h16v13H4ZM9 12h.01M15 12h.01M9 16h6M12 3v4M1 11v5M23 11v5',
    shortcuts: 'M3 5h18v14H3ZM6 9h.01M10 9h.01M14 9h.01M18 9h.01M7 14h10',
    week: 'M4 4h16v17H4ZM8 2v4M16 2v4M4 9h16M8 13h.01M12 13h.01M16 13h.01M8 17h.01M12 17h.01',
    companion: 'M12 4c5 5 8 8 8 12a8 8 0 1 1-16 0c0-4 3-7 8-12ZM9 14h.01M15 14h.01',
    updates: 'M12 3v12M7 10l5 5 5-5M4 16v5h16v-5',
    workspace: 'M3 4h18v5H3ZM3 13h8v8H3ZM15 13h6v8h-6Z',
  };
  function icon(name) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24'); svg.setAttribute('aria-hidden', 'true'); svg.classList.add('ui-icon');
    const path = document.createElementNS(svg.namespaceURI, 'path'); path.setAttribute('d', paths[name] || paths.home); svg.append(path); return svg;
  }
  function mount() { for (const element of document.querySelectorAll('[data-icon]')) if (!element.querySelector('.ui-icon')) element.prepend(icon(element.dataset.icon)); }
  window.NookIcons = { icon, mount };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount); else mount();
})();
