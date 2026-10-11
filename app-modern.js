(() => {
  for (const button of document.querySelectorAll('.nav')) {
    const label = document.createElement('span');
    // Keep badges inside the label while giving every section a consistent icon.
    while (button.firstChild) label.append(button.firstChild);
    button.append(window.NookIcons.icon(button.dataset.page), label);
    button.addEventListener('click', () => updatePage());
  }
  function updatePage() {
    const selected = document.querySelector('.nav.is-selected');
    const label = selected?.querySelector('span');
    document.querySelector('#app-page-name').textContent = label ? [...label.childNodes].filter(node=>node.nodeType===Node.TEXT_NODE).map(node=>node.textContent).join('').trim() : 'Workspace';
    for (const button of document.querySelectorAll('.nav')) { if (button === selected) button.setAttribute('aria-current', 'page'); else button.removeAttribute('aria-current'); }
  }
  new MutationObserver(updatePage).observe(document.querySelector('nav'), { subtree: true, attributes: true, attributeFilter: ['class'] });
  window.addEventListener('nook-language-change',updatePage);
  document.querySelector('#app-open-notch').addEventListener('click', () => window.nook.showNotch());
  window.nook.onState(state => {
    const active = (state.sessions || []).filter(session => !session.finished).length;
    const waiting = state.pendingCount || (state.pending ? 1 : 0);
    document.querySelector('#app-agent-count').textContent = active ? active + ' active agent' + (active === 1 ? '' : 's') : 'No active agents';
    document.querySelector('#app-requests').textContent = waiting ? waiting + ' request' + (waiting === 1 ? '' : 's') + ' waiting for you' : state.demo ? 'Sample workspace' : 'Ready when you are';
    document.querySelector('.workspace-glance').classList.toggle('has-requests', waiting > 0);
    document.querySelector('#app-context').textContent = state.demo ? 'Walkthrough' : state.phone?.enabled || state.features?.phone?.enabled ? 'Phone access on' : 'Local workspace';
  });
  updatePage();
})();
