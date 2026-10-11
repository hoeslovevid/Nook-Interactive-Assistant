(() => {
  let items = [], selected = '', timer, signature = '', lastPending = '';
  const controls = [['usage-show-claude','showClaudeUsage'],['usage-show-codex','showCodexUsage']];
  for (const [id, key] of controls) document.getElementById(id)?.addEventListener('change', async event => { const field = event.target; field.disabled = true; try { await window.nook.savePrefs({ [key]: field.checked }); } catch { field.checked = !field.checked; } finally { field.disabled = false; } });
  const t = text => window.NookLocale?.t(text) || text;
  const dialog = document.createElement('dialog'); dialog.className = 'usage-dialog';
  const title = document.createElement('h2'), content = document.createElement('div'), close = document.createElement('button');
  close.className = 'ghost'; close.textContent = t('Close'); close.onclick = () => dialog.close(); dialog.append(title, content, close); document.body.append(dialog);
  function countdown(time) {
    if (!time) return t('Reset time unavailable');
    const minutes = Math.ceil((time - Date.now()) / 60000);
    if (minutes <= 0) return t('Reset due · refresh your agent');
    return t('Resets in') + ' ' + (minutes >= 60 ? Math.floor(minutes / 60) + 'h ' : '') + (minutes % 60) + 'm';
  }
  function card(item, compact = false) {
    const node = document.createElement('article'); node.className = 'usage-dashboard-card';
    const name = document.createElement('h3'); name.textContent = item.title; if (!compact) node.append(name);
    for (const [label, value, reset] of [['Session window', item.primaryUsed, item.resetsAt], ['Weekly window', item.weeklyUsed, item.weekResetsAt]]) {
      const row = document.createElement('div'); row.className = 'usage-window';
      const ring = document.createElement('div'); ring.className = 'usage-ring'; ring.style.setProperty('--used', (value ?? 0) + '%'); ring.dataset.tone = value >= 90 ? 'warning' : 'ready'; ring.textContent = value == null ? '—' : value + '%';
      ring.setAttribute('role', value == null ? 'img' : 'meter'); ring.setAttribute('aria-label', t(label)); ring.setAttribute('aria-valuemin', '0'); ring.setAttribute('aria-valuemax', '100'); if (value != null) ring.setAttribute('aria-valuenow', value);
      const copy = document.createElement('div'), heading = document.createElement('strong'), note = document.createElement('p'); heading.textContent = t(label); note.textContent = countdown(reset); copy.append(heading, note);
      if (value >= 90) { const warning = document.createElement('small'); warning.className = 'usage-warning'; warning.textContent = t('Near your limit'); copy.append(warning); }
      row.append(ring, copy); node.append(row);
    }
    const source = document.createElement('p'); source.className = 'note'; source.textContent = t('Read from your local agent') + ' · ' + new Date(item.sourceAt || item.readAt).toLocaleString(); node.append(source); return node;
  }
  function paint() {
    const dashboard = document.getElementById('usage-dashboard');
    if (dashboard) { dashboard.replaceChildren(...items.map(item => card(item))); if (!items.length) dashboard.textContent = t('Enable plan usage above, then start Claude or Codex.'); }
    if (dialog.open) { const item = items.find(item => item.id === selected); title.textContent = item?.title || t('Usage'); content.replaceChildren(...(item ? [card(item, true)] : [])); }
  }
  window.NookUsage = { open(id) { selected = id; if (!dialog.open) dialog.showModal(); paint(); if (typeof renderShell === 'function') renderShell(); } };
  dialog.addEventListener('close', () => { if (typeof renderShell === 'function') renderShell(); });
  dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
  window.nook.onState(state => { const pending = state.pending?.id || ''; if (pending && pending !== lastPending && dialog.open) dialog.close(); lastPending = pending; for (const [id, key] of controls) { const field = document.getElementById(id); if (field) field.checked = Boolean(state.prefs?.[key]); } const next = JSON.stringify([state.usage, state.prefs?.resolvedLanguage]); if (next === signature) return; signature = next; items = state.usage || []; paint(); });
  timer = setInterval(() => { if (!document.hidden && (dialog.open || document.getElementById('page-agents')?.hidden === false)) paint(); }, 60000);
  window.addEventListener('beforeunload', () => clearInterval(timer));
})();
