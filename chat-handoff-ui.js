(() => {
  const open = document.querySelector('#chat-handoff'), panel = document.querySelector('#handoff-panel'), list = document.querySelector('#handoff-messages'), target = document.querySelector('#handoff-provider'), note = document.querySelector('#handoff-note');
  let preview = null, source = '';
  let latest = null;
  list.dataset.noLocalize = 'true';
  open.addEventListener('click', async () => {
    source = provider; preview = await window.nook.handoff('preview', { from: source });
    if (!preview.ok) { keyStatus.textContent = preview.error; return; }
    panel.hidden = false; list.replaceChildren(); target.replaceChildren(); note.textContent = '';
    for (const option of providerSelect.options) {
      if (option.value === source) continue;
      const copy = option.cloneNode(true); target.append(copy);
    }
    preview.rows.forEach((row, index) => {
      const label = document.createElement('label'), check = document.createElement('input'), copy = document.createElement('span');
      check.type = 'checkbox'; check.value = String(index); check.checked = true; copy.textContent = row.role + ': ' + row.content.slice(0, 180) + (row.content.length > 180 ? '…' : '');
      label.append(check, copy); list.append(label);
    });
    target.focus();
  });
  document.querySelector('#handoff-cancel').addEventListener('click', () => { panel.hidden = true; });
  document.querySelector('#handoff-confirm').addEventListener('click', async event => {
    const button = event.currentTarget; button.disabled = true;
    try {
      const result = await window.nook.handoff('copy', { from: source, to: target.value, revision: preview.revision, selected: [...list.querySelectorAll('input:checked')].map(field => Number(field.value)) });
      if (!result.ok) { note.textContent = result.error; return; }
      provider = result.provider; providerSelect.value = provider; panel.hidden = true; document.querySelector('#handoff-undo').hidden = false; paint();
    } finally { button.disabled = false; }
  });
  document.querySelector('#handoff-undo').addEventListener('click', async () => {
    const result = await window.nook.handoff('undo', { to: provider });
    if (!result.ok) keyStatus.textContent = result.error;
    else document.querySelector('#handoff-undo').hidden = true;
  });
  function sync(next) {
    open.disabled = Boolean(next.demo) || (next.chatBusyProviders || []).includes(provider) || !(next.messages || []).some(row => row.provider === provider && row.content);
    document.querySelector('#handoff-undo').hidden = !(next.handoffUndo || []).includes(provider);
  }
  providerSelect.addEventListener('change', () => { panel.hidden = true; if (latest) sync(latest); });
  window.nook.onState(next => { latest = next; sync(next); });
})();
