const fs = require('node:fs'), path = require('node:path');
const { isQuiet } = require('./workspace');
const hex = value => typeof value === 'string' && /^[a-f0-9]{32,512}$/i.test(value);
function createPushBridge({ directory, getSettings, getSecret, encrypt, decrypt, fetcher = fetch, now = Date.now }) {
  const file = path.join(directory, 'phone-devices.json');
  let devices = [], error = '', lastState = '', lastSent = 0, pendingState, timer, busy = false, locked = false;
  try { const payload = JSON.parse(fs.readFileSync(file, 'utf8')); devices = JSON.parse(decrypt(payload.encrypted)); if (!Array.isArray(devices)) devices = []; } catch { devices = []; }
  function save() { fs.mkdirSync(directory, { recursive: true }); fs.writeFileSync(file, JSON.stringify({ encrypted: encrypt(JSON.stringify(devices)) })); }
  function statePayload(state) {
    const session = state.sessions?.find(item => !item.finished) || state.sessions?.[0];
    return { status: state.pending ? 'Needs review' : session?.finished ? 'Finished' : session ? 'Working' : 'Quiet', agent: String(state.pending?.agent || session?.agent || 'Nook').slice(0, 40), waiting: Boolean(state.pending), requestId: state.pending?.id || '', updated: Math.floor(now() / 1000), locked };
  }
  async function send() {
    timer = null;
    const settings = getSettings();
    if (busy || !settings.phonePush || !settings.relayUrl || !getSecret() || !pendingState || !devices.length) return;
    const state = pendingState; pendingState = null; busy = true;
    const signature = JSON.stringify({ ...state, updated: 0 });
    const alert = signature !== lastState && (state.waiting ? settings.approvals : state.status === 'Finished' && settings.completions) && !isQuiet(settings) && !settings.mutedAgents.includes(state.agent);
    try {
      const response = await fetcher(settings.relayUrl + '/notify', { method: 'POST', headers: { Authorization: 'Bearer ' + getSecret(), 'Content-Type': 'application/json' }, body: JSON.stringify({ state, alert, devices: devices.map(({ token, activityToken }) => ({ token, activityToken })) }), signal: AbortSignal.timeout(15000), redirect: 'error' });
      if (!response.ok) throw new Error();
      const result = await response.json();
      if (result.ok !== true) throw new Error();
      const rejected = new Set(result.invalidTokens || []);
      if (rejected.size) { devices = devices.map(device => ({ ...device, token: rejected.has(device.token) ? '' : device.token, activityToken: rejected.has(device.activityToken) ? '' : device.activityToken })).filter(device => device.token || device.activityToken); save(); }
      lastSent = now(); lastState = signature; error = '';
    } catch { error = 'Phone push failed. Check the relay and Apple push configuration.'; }
    finally { busy = false; if (pendingState) timer = setTimeout(send, 15000); }
  }
  return {
    register(input) {
      if (typeof input?.id !== 'string' || !/^[a-z0-9-]{8,80}$/i.test(input.id)) return { ok: false, error: 'Invalid device.' };
      if (input.remove === true) { devices = devices.filter(device => device.id !== input.id); try { save(); return { ok: true }; } catch { return { ok: false, error: 'Could not remove the device.' }; } }
      if (input.activityEnded === true) { devices = devices.map(device => device.id === input.id ? { ...device, activityToken: '' } : device); try { save(); return { ok: true }; } catch { return { ok: false, error: 'Could not remove the activity.' }; } }
      if (!hex(input.token) && !hex(input.activityToken)) return { ok: false, error: 'Invalid push token.' };
      const old = devices.find(device => device.id === input.id) || {};
      if (!old.id && devices.length >= 3) return { ok: false, error: 'Three phones are already registered. Revoke phone devices first.' };
      devices = [...devices.filter(device => device.id !== input.id), { id: input.id, token: hex(input.token) ? input.token : old.token || '', activityToken: hex(input.activityToken) ? input.activityToken : old.activityToken || '', updated: now() }];
      try { save(); return { ok: true }; } catch { devices = devices.filter(device => device.id !== input.id); return { ok: false, error: 'Windows could not encrypt the device registration.' }; }
    },
    revoke() { devices = []; if (fs.existsSync(file)) fs.unlinkSync(file); lastState = ''; return this.snapshot(); },
    snapshot: () => ({ devices: devices.length, lastSent, error, configured: Boolean(getSettings().relayUrl && getSecret()) }),
    update(state) { pendingState = statePayload(state); const signature = JSON.stringify({ ...pendingState, updated: 0 }); if (signature === lastState) { pendingState = null; return; } if (!timer && !busy) { timer = setTimeout(send, Math.max(500, 15000 - (now() - lastSent))); timer.unref?.(); } },
    lock(value) { locked = value; lastState = ''; },
    stop() { clearTimeout(timer); pendingState = null; },
    flush: send,
  };
}
module.exports = { createPushBridge, hex };
