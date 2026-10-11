(() => {
  const events = [['hi', 'Greeting'], ['ask', 'Approval or question'], ['finish', 'Task completed'], ['error', 'Chat error'], ['interaction', 'Pet interaction']];
  const root = document.querySelector('#sound-events'), volume = document.querySelector('#sound-volume'), note = document.querySelector('#sound-status');
  let current = null;
  const stop = document.createElement('button'); stop.type = 'button'; stop.className = 'ghost'; stop.id = 'sound-stop'; stop.textContent = 'Stop preview';
  stop.addEventListener('click', () => window.NookSoundPlayer.stop()); root.before(stop);
  for (const [kind, label] of events) {
    const row = document.createElement('div'); row.className = 'sound-event';
    const copy = document.createElement('label'), check = document.createElement('input'); check.type = 'checkbox'; check.dataset.sound = kind; copy.append(check, document.createTextNode(label));
    const filename = document.createElement('small'); filename.dataset.soundFile = kind; filename.dataset.noLocalize = 'true';
    const actions = document.createElement('div'); actions.className = 'settings-actions';
    for (const [action, text] of [['preview', 'Preview'], ['import', 'Choose sound'], ['remove', 'Use default']]) {
      const button = document.createElement('button'); button.type = 'button'; button.className = 'ghost'; button.textContent = text;
      button.addEventListener('click', async () => {
        if (action === 'preview') { try { await window.NookSoundPlayer.play(kind, current, true); note.textContent=''; } catch { note.textContent='Could not play this sound.'; } return; }
        button.disabled = true;
        try { const result = await window.nook.sounds(action, kind); note.textContent = result.error || (result.cancelled ? '' : 'Sound saved.'); } finally { button.disabled = false; }
      }); actions.append(button);
    }
    check.addEventListener('change', () => window.nook.sounds('save', { enabled: { [kind]: check.checked } })); row.append(copy, filename, actions); root.append(row);
  }
  volume.addEventListener('input', () => { document.querySelector('#sound-volume-value').textContent = volume.value + '%'; });
  volume.addEventListener('change', () => window.nook.sounds('save', { volume: Number(volume.value) }));
  window.nook.onState(state => {
    if (!state.sounds) return; current = state.sounds;
    if (document.activeElement !== volume) volume.value = current.volume;
    document.querySelector('#sound-volume-value').textContent = current.volume + '%';
    for (const [kind] of events) {
      root.querySelector('[data-sound="' + kind + '"]').checked = current.enabled[kind];
      const filename=root.querySelector('[data-sound-file="' + kind + '"]');
      if(current.custom[kind]) filename.dataset.noLocalize='true'; else delete filename.dataset.noLocalize;
      filename.textContent=current.custom[kind] || 'Default tone';
    }
  });
})();
