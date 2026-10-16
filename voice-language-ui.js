(() => {
  const cloud = [['en','English'],['fr','Français'],['es','Español'],['de','Deutsch'],['it','Italiano'],['pt','Português'],['zh','中文'],['ja','日本語'],['ko','한국어'],['hi','हिन्दी'],['ar','العربية'],['bn','বাংলা'],['ru','Русский'],['id','Bahasa Indonesia'],['uk','Українська'],['nl','Nederlands'],['tr','Türkçe'],['pl','Polski']];
  let config = {}, local = [], loaded = false, error = '', signature = '';
  const field = document.getElementById('voice-language'), mic = document.getElementById('voice-button');
  const picker = document.createElement('div'); picker.className = 'voice-language-picker'; picker.hidden = true;
  const select = document.createElement('select'), label = document.createElement('label'), close = document.createElement('button'); label.textContent = 'Speech language'; label.append(select); close.textContent = 'Close'; close.className = 'ghost'; close.onclick = () => { picker.hidden = true; mic?.focus(); if (typeof renderShell === 'function') renderShell(); }; picker.append(label, close); document.body.append(picker);
  function fill(element) {
    const options = config.voice !== 'windows' ? cloud : local.map(item => [item.id, item.name]);
    element.replaceChildren(new Option('Automatic', 'auto'), ...options.map(([id, name]) => new Option(name, id)));
    if (config.voiceLanguage && config.voiceLanguage !== 'auto' && !options.some(([id]) => id === config.voiceLanguage)) element.append(new Option(config.voiceLanguage + (config.voice === 'openai' && cloud.some(([id]) => id === config.voiceLanguage.split('-')[0]) ? ' · saved language' : ' · unavailable here'), config.voiceLanguage));
    element.value = config.voiceLanguage || 'auto';
  }
  async function load() { try { const result = await window.nook.speechLanguages(); local = result.languages || []; error = result.ok ? '' : result.error; loaded = true; signature = ''; paint(); } catch { error = 'Could not read installed speech languages.'; paint(); } }
  function paint() {
    const next = JSON.stringify([config.voice, config.voiceLanguage, local]); if (next !== signature) { signature = next; if (field) fill(field); fill(select); }
    const note = document.getElementById('voice-languages-note'); if (note) note.textContent = config.voice === 'openai' ? 'Your chosen language is sent with the recording to OpenAI.' : config.voice==='parakeet'?'Parakeet detects supported languages automatically. The saved language applies when you switch engines.':config.voice==='offline'?'Uses your downloaded Whisper model. Tiny is English-only; Base supports multiple languages.':error || (loaded ? local.length + ' installed speech languages · add more in Windows language settings.' : 'Reading installed speech languages…');
    if (mic) mic.title = 'Dictate · ' + (config.voiceLanguage || 'auto') + ' · Right-click to change language';
  }
  async function save(event) { try { await window.nook.saveCompanion({ voiceLanguage: event.target.value }); } catch { const note = document.getElementById('voice-languages-note'); if (note) note.textContent = 'Could not save. Try again.'; } }
  field?.addEventListener('change', save); select.addEventListener('change', save);
  mic?.addEventListener('contextmenu', event => { event.preventDefault(); if (mic.disabled || mic.getAttribute('aria-label') === 'Stop dictation') return; picker.hidden = !picker.hidden; if (!picker.hidden) { load(); select.focus(); } if (typeof renderShell === 'function') renderShell(); });
  window.addEventListener('keydown', event => { if (event.key === 'Escape') { picker.hidden = true; if (typeof renderShell === 'function') renderShell(); } });
  window.nook.onState(state => { config = window.NookCompanion.normalize(state.features?.companion); paint(); }); load();
})();
