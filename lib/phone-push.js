const fs = require('node:fs'), path = require('node:path');
const { isQuiet } = require('./workspace');
const hex = value => typeof value === 'string' && /^[a-f0-9]{32,512}$/i.test(value);
function createPushBridge({ directory, getSettings, getSecret, encrypt, decrypt, fetcher = fetch, now = Date.now }) {
  const file = path.join(directory, 'phone-devices.json');
  let devices = [], error = '', lastState = '', lastSent = 0, pendingState, latestState, timer, busy = false, locked = false, stopped = false;
  try { const payload = JSON.parse(fs.readFileSync(file, 'utf8')); devices = JSON.parse(decrypt(payload.encrypted)); if (!Array.isArray(devices)) devices = []; } catch { devices = []; }
  function save(next = devices) { fs.mkdirSync(directory, { recursive: true }); const temporary = file + '.tmp'; fs.writeFileSync(temporary, JSON.stringify({ encrypted: encrypt(JSON.stringify(next)) })); fs.renameSync(temporary, file); devices = next; }
  function schedule(delay = 15000) { if (!stopped && !timer && !busy) { timer = setTimeout(send, delay); timer.unref?.(); } }
  function changedDevices(next) { save(next); lastState = ''; if (latestState) { pendingState = statePayload(latestState); schedule(500); } }
  function statePayload(state) {
    const session = state.sessions?.find(item => !item.finished) || state.sessions?.[0];
    return { status: state.pending ? 'Needs review' : session?.finished ? 'Finished' : session ? 'Working' : 'Quiet', agent: String(state.pending?.agent || session?.agent || 'Nook').slice(0, 40), waiting: Boolean(state.pending), requestId: state.pending?.id || '', updated: Math.floor(now() / 1000), locked };
  }
  async function send() {
    clearTimeout(timer);
    timer = null;
    const settings = getSettings();
    if (stopped || busy || !settings.phonePush || !settings.relayUrl || !getSecret() || !pendingState || !devices.length) return;
    const state = { ...pendingState, updated: Math.floor(now() / 1000) }; pendingState = null; busy = true;
    const signature = JSON.stringify({ ...state, updated: 0 });
    const alert = signature !== lastState && (state.waiting ? settings.approvals : state.status === 'Finished' && settings.completions) && !isQuiet(settings) && !settings.mutedAgents.includes(state.agent);
    try {
      const response = await fetcher(settings.relayUrl + '/notify', { method: 'POST', headers: { Authorization: 'Bearer ' + getSecret(), 'Content-Type': 'application/json' }, body: JSON.stringify({ state, alert, devices: devices.map(({ token, activityToken }) => ({ token, activityToken })) }), signal: AbortSignal.timeout(15000), redirect: 'error' });
      if (!response.ok) throw new Error();
      const result = await response.json();
      const rejected = new Set(result.invalidTokens || []);
      if (rejected.size) { save(devices.map(device => ({ ...device, token: rejected.has(device.token) ? '' : device.token, activityToken: rejected.has(device.activityToken) ? '' : device.activityToken })).filter(device => device.token || device.activityToken)); }
      if (result.ok !== true) throw new Error();
      lastSent = now(); lastState = signature; error = '';
    } catch { error = 'Phone push failed. Check the relay and Apple push configuration.'; if (!pendingState) pendingState = state; }
    finally { busy = false; if (pendingState) { pendingState.updated = Math.floor(now() / 1000); schedule(); } }
  }
  const heartbeat = setInterval(() => { if (latestState && !busy && !pendingState && now() - lastSent >= 60000) { pendingState = statePayload(latestState); schedule(500); } }, 60000); heartbeat.unref?.();
  return {
    register(input) {
      if (typeof input?.id !== 'string' || !/^[a-z0-9-]{8,80}$/i.test(input.id)) return { ok: false, error: 'Invalid device.' };
      if (input.remove === true) { try { changedDevices(devices.filter(device => device.id !== input.id)); return { ok: true }; } catch { return { ok: false, error: 'Could not remove the device.' }; } }
      if (input.activityEnded === true) { try { changedDevices(devices.map(device => device.id === input.id ? { ...device, activityToken: '' } : device).filter(device => device.token || device.activityToken)); return { ok: true }; } catch { return { ok: false, error: 'Could not remove the activity.' }; } }
      if (!hex(input.token) && !hex(input.activityToken)) return { ok: false, error: 'Invalid push token.' };
      const old = devices.find(device => device.id === input.id) || {};
      if (!old.id && devices.length >= 3) return { ok: false, error: 'Three phones are already registered. Revoke phone devices first.' };
      const next = [...devices.filter(device => device.id !== input.id), { id: input.id, token: hex(input.token) ? input.token : old.token || '', activityToken: hex(input.activityToken) ? input.activityToken : old.activityToken || '', updated: now() }];
      try { changedDevices(next); return { ok: true }; } catch { return { ok: false, error: 'Windows could not encrypt the device registration.' }; }
    },
    revoke() { if (fs.existsSync(file)) fs.unlinkSync(file); devices = []; clearTimeout(timer); timer = null; pendingState = null; lastState = ''; return this.snapshot(); },
    snapshot: () => ({ devices: devices.length, lastSent, error, configured: Boolean(getSettings().relayUrl && getSecret()) }),
    update(state) { if (stopped) return; latestState = state; pendingState = statePayload(state); const signature = JSON.stringify({ ...pendingState, updated: 0 }); if (signature === lastState && now() - lastSent < 60000) { pendingState = null; return; } schedule(Math.max(500, 15000 - (now() - lastSent))); },
    lock(value) { locked = value; lastState = ''; },
    stop() { stopped = true; clearInterval(heartbeat); clearTimeout(timer); timer = null; pendingState = null; latestState = null; },
    flush: send,
  };
}
module.exports = { createPushBridge, hex };
