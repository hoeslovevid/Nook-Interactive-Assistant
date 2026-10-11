(() => {
  const $ = id => document.getElementById(id), form = $('custom-agent-form');
  const defaults = { event: 'event', session: 'session_id', cwd: 'cwd', file: 'file_path', text: 'message', before: 'old_string', after: 'new_string', command: 'command' };
  for (const [group, values] of [['fields', defaults], ['events', { read: 'read', edit: 'edit', run: 'run', complete: 'complete' }]]) {
    for (const [key, value] of Object.entries(values)) { const label = document.createElement('label'); label.className = 'model-field'; label.textContent = (group === 'fields' ? 'Field · ' : 'Event · ') + key; const input = document.createElement('input'); input.name = group + ':' + key; input.value = value; input.maxLength = 80; label.append(input); $('custom-agent-' + group).append(label); }
  }
  const step = index => { for (const node of form.querySelectorAll('[data-agent-step]')) node.hidden = Number(node.dataset.agentStep) !== index; };
  $('custom-agent-next').onclick = () => { if (form.elements.name.reportValidity() && form.elements.id.reportValidity()) step(1); };
  $('custom-agent-back').onclick = () => step(0); $('custom-agent-test-step').onclick = () => step(2); $('custom-agent-mapping').onclick = () => step(1);
  function profile() { const values = Object.fromEntries(new FormData(form)); return { id: values.id, name: values.name, color: values.color, fields: Object.fromEntries(Object.keys(defaults).map(key => [key, values['fields:' + key]])), events: Object.fromEntries(['read','edit','run','complete'].map(key => [key, values['events:' + key]])) }; }
  const status = text => { $('custom-agent-status').textContent = text; };
  $('custom-agent-test').onclick = async () => { try { const result = await window.nook.customAgent('preview', { profile: profile(), sample: JSON.parse($('custom-agent-sample').value) }); if (!result.ok) throw new Error(result.error); $('custom-agent-result').hidden = false; $('custom-agent-result-label').textContent = result.payload ? [result.payload.tool_name || 'Finished', result.payload.tool_input.file_path, result.payload.session_id].filter(Boolean).join(' · ') : 'This event is not mapped.'; $('custom-agent-preview').textContent = result.payload ? JSON.stringify(result.payload, null, 2) : 'This event is not mapped. Check the event name.'; status(result.payload ? 'Event mapped. Nothing was sent to your agent.' : 'No matching event.'); } catch (error) { status(error.message); } };
  form.onsubmit = async event => { event.preventDefault(); const result = await window.nook.customAgent('save', profile()); status(result.ok ? 'Agent saved. Export its hook profile below to connect it.' : result.error); };
  let signature = '';
  window.nook.onState(state => {
    const profiles = state.customAgents || [], next = JSON.stringify(profiles); if (signature === next) return; signature = next; $('custom-agent-list').replaceChildren();
    for (const item of profiles) {
      const card = document.createElement('article'); card.className = 'workspace-card'; const title = document.createElement('strong'); title.textContent = item.name; title.style.color = item.color; card.append(title);
      for (const [action, label] of [['edit','Edit'],['export','Export hook profile'],['remove','Remove']]) {
        const button = document.createElement('button'); button.type = 'button'; button.className = 'ghost'; button.textContent = label;
        button.onclick = async () => {
          if (action === 'edit') { for (const key of ['name','id','color']) form.elements[key].value = item[key]; for (const group of ['fields','events']) for (const [key, value] of Object.entries(item[group])) form.elements[group + ':' + key].value = value; step(0); return; }
          try { const result = await window.nook.customAgent(action, item.id); if (result.command) { $('custom-agent-command').hidden = false; $('custom-agent-command-text').value = result.command; } status(result.ok ? action === 'export' ? 'Profile exported. Add this command to your agent’s activity hook.' : 'Agent removed.' : result.cancelled ? 'Cancelled.' : result.error); } catch { status('Could not update the custom agent.'); }
        }; card.append(button);
      } $('custom-agent-list').append(card);
    }
  });
  $('custom-agent-copy').onclick = async () => { try { await navigator.clipboard.writeText($('custom-agent-command-text').value); status('Command copied.'); } catch { status('Select the command to copy it.'); } };
})();
