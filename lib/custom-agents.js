const fs = require('node:fs'), path = require('node:path');
const reserved = new Set('claude cursor codex copilot muse gemini opencode amp hermes antigravity github vercel stripe resend notion n8n cal chatgpt openrouter ollama lmstudio custom'.split(' '));
const fields = { event: 'event', session: 'session_id', cwd: 'cwd', file: 'file_path', text: 'message', before: 'old_string', after: 'new_string', command: 'command' };
function fieldPath(value) {
  return typeof value === 'string' && value.length <= 80 && /^(?:[a-zA-Z_][\w-]*)(?:\.[a-zA-Z_][\w-]*){0,7}$/.test(value) && !value.split('.').some(key => ['__proto__', 'prototype', 'constructor'].includes(key));
}
function normalize(input) {
  if (!input || typeof input !== 'object' || !/^[a-z][a-z0-9-]{1,24}$/.test(input.id || '') || reserved.has(input.id)) throw new Error('Use a unique agent ID with 2–25 lowercase letters, numbers, or hyphens.');
  if (typeof input.name !== 'string' || !input.name.trim() || input.name.length > 40) throw new Error('Enter an agent name of 1–40 characters.');
  const mapping = {};
  for (const [key, fallback] of Object.entries(fields)) { const value = input.fields?.[key] ?? fallback; if (!fieldPath(value)) throw new Error('Use simple dot-separated event field names.'); mapping[key] = value; }
  const events = {};
  for (const key of ['read', 'edit', 'run', 'complete']) { const value = input.events?.[key] ?? key; if (typeof value !== 'string' || !value.trim() || value.length > 80) throw new Error('Enter event names of 1–80 characters.'); events[key] = value.trim(); }
  if (new Set(Object.values(events)).size !== 4) throw new Error('Each task needs a different event name.');
  return { id: input.id, name: input.name.trim(), color: /^#[a-f0-9]{6}$/i.test(input.color || '') ? input.color : '#9bbaff', fields: mapping, events };
}
function read(source, dotted) { let value = source; for (const key of dotted.split('.')) { if (!value || typeof value !== 'object' || !Object.hasOwn(value, key)) return undefined; value = value[key]; } return value; }
function adapt(profile, source) {
  const config = normalize(profile); if (!source || typeof source !== 'object' || Array.isArray(source)) throw new Error('Provide a JSON event object.');
  const event = read(source, config.fields.event), kind = Object.keys(config.events).find(key => config.events[key] === event);
  if (!kind) return null;
  const text = (field, max) => { const value = read(source, config.fields[field]); return typeof value === 'string' ? value.slice(0, max) : ''; };
  const session = text('session', 180); if (!session.trim()) throw new Error('The event needs a session ID.');
  return { nook_custom_agent: config.id, nook_agent: config.name, session_id: session, cwd: text('cwd', 1024), hook_event_name: kind === 'complete' ? 'Stop' : 'PostToolUse', tool_name: kind === 'complete' ? '' : { read: 'Read', edit: 'Edit', run: 'Bash' }[kind], tool_input: { file_path: text('file', 1024), old_string: text('before', 4000), new_string: text('after', 4000), command: text('command', 1000) }, last_assistant_message: kind === 'complete' ? text('text', 4000) : '' };
}
function createCustomAgents(directory) {
  const file = path.join(directory, 'custom-agents.json'); let profiles = [];
  try { profiles = JSON.parse(fs.readFileSync(file, 'utf8')).slice(0, 10).map(normalize); } catch { profiles = []; }
  function save(next) { fs.mkdirSync(directory, { recursive: true }); const temporary = file + '.tmp'; fs.writeFileSync(temporary, JSON.stringify(next, null, 2)); fs.renameSync(temporary, file); profiles = next; }
  return { list: () => profiles.map(profile => JSON.parse(JSON.stringify(profile))), find: id => profiles.find(profile => profile.id === id),
    save(input) { const profile = normalize(input); if (!profiles.some(item => item.id === profile.id) && profiles.length >= 10) throw new Error('Ten custom agents are already saved.'); save([...profiles.filter(item => item.id !== profile.id), profile]); return profile; },
    remove(id) { save(profiles.filter(item => item.id !== id)); }, adapt };
}
const quotePS = value => "'" + String(value).replace(/'/g, "''") + "'";
function hookCommand(executable, hook, config) { return "$env:ELECTRON_RUN_AS_NODE='1'; & " + [executable, hook].map(quotePS).join(' ') + ' --config ' + quotePS(config); }
module.exports = { normalize, adapt, read, fieldPath, createCustomAgents, hookCommand };
