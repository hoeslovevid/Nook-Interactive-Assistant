const fs = require('node:fs');
const path = require('node:path');
const { sessionDetail } = require('./session-detail');
const { isQuiet } = require('./alert-policy');
const clock = (value, fallback) => /^([01]\d|2[0-3]):[0-5]\d$/.test(value || '') ? value : fallback;
function normalize(input = {}) {
  return {
    archive: Boolean(input.archive), retention: [7, 30, 90].includes(input.retention) ? input.retention : 30,
    notifications: input.notifications !== false, approvals: input.approvals !== false,
    completions: input.completions !== false, ci: input.ci !== false,
    quietHours: Boolean(input.quietHours), quietStart: clock(input.quietStart, '22:00'), quietEnd: clock(input.quietEnd, '08:00'),
    mutedAgents: Array.isArray(input.mutedAgents) ? input.mutedAgents.filter(id => typeof id === 'string' && /^[a-z0-9-]{1,30}$/.test(id)).slice(0, 30) : [],
    serviceActions: Boolean(input.serviceActions), petTravel: input.petTravel !== false,
    relayUrl: (() => { try { const url = new URL(input.relayUrl); return url.protocol === 'https:' && !url.username && !url.password && !url.search && !url.hash ? url.origin : ''; } catch { return ''; } })(),
    phonePush: Boolean(input.phonePush),
  };
}
function mayNotify(settings, event, date = new Date()) {
  return settings.notifications && settings[event.kind] !== false && !settings.mutedAgents.includes(event.agent) && !isQuiet(settings, date);
}
function createWorkspace({ directory, notify = () => {}, onEvent = () => {}, now = Date.now, encrypt = () => { throw new Error('Encryption required'); }, decrypt = () => { throw new Error('Encryption required'); } }) {
  const configFile = path.join(directory, 'workspace.json'), archiveFile = path.join(directory, 'session-archive.json');
  const read = file => { try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return null; } };
  let settings = normalize(read(configFile) || {}), archive = [], error = '';
  const stored = read(archiveFile);
  if (fs.existsSync(archiveFile) && !stored) error = 'The saved archive could not be read. Clear it to start a new archive.';
  try {
    if (stored) {
      if (typeof stored.encrypted !== 'string') throw new Error('Missing encrypted archive');
      archive = JSON.parse(decrypt(stored.encrypted));
      if (!Array.isArray(archive) || archive.some(item => !item || typeof item.id !== 'string' || !Number.isFinite(item.time) || !Array.isArray(item.steps) || !Array.isArray(item.decisions))) throw new Error('Invalid archive entries');
    }
  } catch { archive = []; error = 'The session archive could not be read or decrypted. Clear it to start a new archive.'; }
  const seen = new Map();
  function prune() { archive = archive.filter(item => Number(item.time) > now() - settings.retention * 86400000).slice(0, 300); }
  function write(file, data) {
    fs.mkdirSync(directory, { recursive: true });
    const temporary = file + '.tmp'; fs.writeFileSync(temporary, JSON.stringify(data)); fs.renameSync(temporary, file);
  }
  function persist() {
    if (error) return;
    prune();
    while (archive.length && Buffer.byteLength(JSON.stringify(archive)) > 8000000) archive.pop();
    try { write(archiveFile, { encrypted: encrypt(JSON.stringify(archive)) }); }
    catch { error = 'History could not be saved. Check local storage and Windows encryption.'; }
  }
  const retentionTimer = setInterval(() => { if (fs.existsSync(archiveFile)) persist(); }, 3600000); retentionTimer.unref?.();
  if (fs.existsSync(archiveFile)) persist();
  function emit(event) {
    const id = event.kind + ':' + event.id;
    if (seen.has(id)) return;
    seen.set(id, now());
    if (seen.size > 500) seen.delete(seen.keys().next().value);
    onEvent(event);
    if (mayNotify(settings, event, new Date(now()))) notify(event);
  }
  return {
    snapshot: () => ({ settings: { ...settings, mutedAgents: [...settings.mutedAgents] }, count: (prune(), archive.length), error }),
    save(patch) { settings = normalize({ ...settings, ...patch }); write(configFile, settings); if (settings.archive) persist(); return this.snapshot(); },
    record(session) {
      if (!session?.finished) return;
      emit({ kind: 'completions', id: session.id + ':' + (session.steps?.at(-1)?.time || 0), agent: session.agent, title: 'Agent finished', sessionId: session.id });
      if (!settings.archive || error) return;
      const detail = sessionDetail(session), time = now();
      const archiveId = session.id + ':' + (session.steps?.at(-1)?.time || time);
      // Explicit opt-in: only bounded session content; never serialize the app state or provider keys.
      archive = [{ ...detail, id: archiveId, sessionId: session.id, label: String(detail.label || '').slice(0, 120), project: path.win32.basename(session.cwd || ''), time, decisions: [] }, ...archive.filter(item => item.id !== archiveId)];
      persist();
    },
    decision(item, action) {
      if (!settings.archive || error) return;
      const entry = { id: 'decision:' + item.id, label: String(item.title).slice(0, 120), agent: item.agent, project: '', time: now(), finished: true, final: '', steps: [], decisions: [{ action, time: now(), title: String(item.title).slice(0, 120), detail: String(item.detail || '').slice(0, 1000) }] };
      archive.unshift(entry); persist();
    },
    alert: emit,
    search({ query = '', agent = '', project = '' } = {}) {
      prune(); const term = String(query).toLowerCase().slice(0, 200);
      return archive.filter(item => (!agent || item.agent === agent) && (!project || item.project === project) && (!term || JSON.stringify(item).toLowerCase().includes(term))).slice(0, 100).map(({ id, label, agent, project, time, decisions, steps }) => ({ id, label, agent, project, time, decisions: decisions.length, steps: steps.length }));
    },
    detail(id) { prune(); const item = archive.find(item => item.id === id); return item ? JSON.parse(JSON.stringify(item)) : null; },
    remove(id) { archive = archive.filter(item => item.id !== id); persist(); return this.snapshot(); },
    clear() { archive = []; error = ''; if (fs.existsSync(archiveFile)) fs.unlinkSync(archiveFile); return this.snapshot(); },
    stop() { clearInterval(retentionTimer); },
  };
}
module.exports = { normalize, isQuiet, mayNotify, createWorkspace };
