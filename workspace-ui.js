(() => {
  const $ = id => document.getElementById(id), form = $('workspace-form');
  const agents = ['claude', 'cursor', 'codex', 'gemini', 'copilot', 'muse', 'opencode', 'amp', 'hermes', 'antigravity', 'github'];
  for (const agent of agents) { const option = new Option(agent, agent); $('workspace-muted').append(option); }
  let current = null, historyTimer, historyRequest = 0, serviceRequest = 0;
  function paint(state) {
    const workspace = state.workspace; if (!workspace) return; current = workspace;
    for (const agent of new Set([...workspace.settings.mutedAgents, ...(state.sessions || []).map(session => session.agent)])) {
      if (typeof agent === 'string' && ![...$('workspace-muted').options].some(option => option.value === agent)) $('workspace-muted').append(new Option(agent, agent));
    }
    if (!form.contains(document.activeElement)) {
      for (const [name, value] of Object.entries(workspace.settings)) {
        const field = form.elements.namedItem(name); if (!field) continue;
        if (field.type === 'checkbox') field.checked = value;
        else if (name === 'mutedAgents') for (const option of field.options) option.selected = value.includes(option.value);
        else field.value = value;
      }
    }
    $('history-count').textContent = workspace.error || workspace.count + ' saved entries · ' + (workspace.settings.archive ? 'Recording is on' : 'Recording is off');
    $('relay-status').textContent = state.push?.error || (state.push?.configured ? 'Relay configured · ' : 'Relay setup needed · ') + (state.push?.devices || 0) + ' native phones';
  }
  window.nook.onState(paint);
  function message(id, text) { $(id).textContent = text; }
  form.addEventListener('submit', async event => {
    event.preventDefault(); const values = Object.fromEntries(new FormData(form));
    for (const field of form.querySelectorAll('input[type="checkbox"]')) values[field.name] = field.checked;
    values.retention = Number(values.retention); values.mutedAgents = [...$('workspace-muted').selectedOptions].map(option => option.value);
    try { const result = await window.nook.workspace('save', values); message('workspace-status', result.ok ? 'Preferences saved.' : result.error); } catch { message('workspace-status', 'Could not save preferences.'); }
  });
  $('relay-access-form').addEventListener('submit', async event => { event.preventDefault(); const token = $('relay-token').value.trim(); if (token.length < 32) return message('relay-status', 'Use the relay token generated during relay setup (at least 32 characters).'); const result = await window.nook.workspace('relay-token', token); $('relay-token').value = ''; message('relay-status', result.ok ? 'Relay token saved and encrypted on this PC.' : result.error); });
  $('relay-token-clear').addEventListener('click', async () => { await window.nook.workspace('relay-token', ''); });
  $('revoke-native').addEventListener('click', async () => { await window.nook.workspace('revoke-devices'); });
  function card(title, copy) { const node = document.createElement('article'); node.className = 'workspace-card'; const heading = document.createElement('h3'); heading.textContent = title; const text = document.createElement('p'); text.textContent = copy; node.append(heading, text); return node; }
  function button(label, action) { const button = document.createElement('button'); button.type = 'button'; button.className = 'ghost'; button.textContent = label; button.addEventListener('click', action); return button; }
  async function search() {
    const request = ++historyRequest;
    const result = await window.nook.workspace('search', { query: $('history-query').value, agent: $('history-agent').value.trim() }); if (request !== historyRequest) return;
    $('history-results').replaceChildren();
    for (const item of result.items || []) { const node = card(item.label || item.agent, [item.agent, item.project, new Date(item.time).toLocaleString()].filter(Boolean).join(' · ')); node.append(button('Open session', () => showDetail(item.id))); $('history-results').append(node); }
    if (!result.items?.length) $('history-results').append(card('No matching sessions', current?.settings.archive ? 'Completed sessions appear here as agents finish.' : 'Enable local session history to start recording.'));
  }
  async function showDetail(id) {
    const result = await window.nook.workspace('detail', id), item = result.item; if (!item) return;
    const area = $('history-detail'); area.replaceChildren(card(item.label || item.agent, new Date(item.time).toLocaleString())); area.hidden = false;
    if (item.final) area.append(card('Completed answer', item.final));
    for (const decision of item.decisions || []) area.append(card(decision.action, decision.detail));
    for (const step of item.steps || []) { const node = card(step.title || step.task, step.detail); if (step.diff) { const details = document.createElement('details'), summary = document.createElement('summary'), code = document.createElement('pre'); summary.textContent = 'View diff'; code.textContent = step.diff; details.append(summary, code); node.append(details); } area.append(node); }
    area.append(button('Close', () => { area.hidden = true; }), button('Delete entry', async () => { await window.nook.workspace('remove', id); area.hidden = true; search(); }));
    area.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' });
  }
  for (const id of ['history-query', 'history-agent']) $(id).addEventListener('input', () => { clearTimeout(historyTimer); historyTimer = setTimeout(search, 200); });
  $('history-search').addEventListener('click', search);
  $('history-clear').addEventListener('click', async () => { const result = await window.nook.workspace('clear'); if (result.ok) { $('history-detail').hidden = true; await search(); } });
  async function service() {
    const request = ++serviceRequest, service = $('service-choice').value; message('service-status', 'Loading service details…'); $('service-refresh').disabled = true;
    try {
      const result = await window.nook.serviceDetail(service); if (request !== serviceRequest) return;
      $('service-items').replaceChildren(); message('service-status', result.ok ? result.items.length + ' recent items' : result.error);
      for (const item of result.items || []) {
        const node = card(item.title, item.detail);
        if (item.url) node.append(button('Open in browser', () => window.nook.openServiceUrl(item.url)));
        for (const action of item.actions || []) node.append(button(action.label, async event => { event.target.disabled = true; const answer = await window.nook.serviceAction(action.id); message('service-status', answer.ok ? 'Action completed. Refresh to see the latest status.' : answer.cancelled ? 'Cancelled.' : answer.error); }));
        $('service-items').append(node);
      }
    } catch { message('service-status', 'Could not load service details.'); } finally { if (request === serviceRequest) $('service-refresh').disabled = false; }
  }
  $('service-refresh').addEventListener('click', service); $('service-choice').addEventListener('change', service);
  window.nook.onCommand(action => { if (!action.startsWith('service:')) return; const id = action.slice(8); if (!['github', 'vercel', 'n8n'].includes(id)) return; showPage('workspace'); $('service-choice').value = id; service(); });
  $('save-recap-png').addEventListener('click', async () => { await window.nook.saveRecapPng(); });
})();
