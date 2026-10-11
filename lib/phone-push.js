const fs = require('node:fs'), path = require('node:path');
const { isQuiet } = require('./workspace');
const { createHandoffPolicy } = require('./handoff-policy');
const hex = value => typeof value === 'string' && /^[a-f0-9]{32,512}$/i.test(value);
function createPushBridge({ directory, getSettings, getSecret, encrypt, decrypt, fetcher = fetch, now = Date.now }) {
  const file = path.join(directory, 'phone-devices.json'), policy = createHandoffPolicy({ now });
  let handoffTimer, handoff = policy.observe();
  let devices = [], error = '', lastState = '', lastSent = 0, pendingState, latestState, timer, busy = false, locked = false, stopped = false;
  try { const payload = JSON.parse(fs.readFileSync(file, 'utf8')); devices = JSON.parse(decrypt(payload.encrypted)); if (!Array.isArray(devices)) devices = []; else devices = devices.filter(device => device && /^[a-z0-9-]{8,80}$/i.test(device.id || '') && (hex(device.token) || hex(device.activityToken) || hex(device.startToken))).slice(0, 3).map(device => ({ ...device, token: hex(device.token) ? device.token : '', activityToken: hex(device.activityToken) ? device.activityToken : '', startToken: hex(device.startToken) ? device.startToken : '', autoHandoff: device.autoHandoff === true })); } catch { devices = []; }
  function save(next = devices) { fs.mkdirSync(directory, { recursive: true }); const temporary = file + '.tmp'; fs.writeFileSync(temporary, JSON.stringify({ encrypted: encrypt(JSON.stringify(next)) })); fs.renameSync(temporary, file); devices = next; }
  function schedule(delay = 15000) { if (!stopped && !timer && !busy) { timer = setTimeout(send, delay); timer.unref?.(); } }
  function changedDevices(next) { save(next); lastState = ''; if (latestState) { pendingState = statePayload(latestState); schedule(500); } }
  function statePayload(state) {
    handoff = policy.observe(state);
    clearTimeout(handoffTimer); handoffTimer = null;
    if (handoff.nextAt != null) { handoffTimer = setTimeout(() => { if (!stopped && latestState) { pendingState = statePayload(latestState); lastState = ''; schedule(0); } }, Math.max(1, handoff.nextAt - now())); handoffTimer.unref?.(); }
    const session = state.sessions?.find(item => !item.finished) || state.sessions?.[0];
    return { status: state.pending ? 'Needs review' : session?.finished ? 'Finished' : session ? 'Working' : 'Quiet', agent: String(state.pending?.agent || session?.agent || 'Nook').slice(0, 40), waiting: Boolean(state.pending), requestId: state.pending?.id || '', updated: Math.floor(now() / 1000), locked, handoffActive: handoff.active, handoffGeneration: handoff.generation };
  }
  async function send() {
    clearTimeout(timer);
    timer = null;
    const settings = getSettings();
    if (stopped || busy || !settings.phonePush || !settings.relayUrl || !getSecret() || !pendingState || !devices.length) return;
    const state = { ...pendingState, updated: Math.floor(now() / 1000) }; pendingState = null; busy = true;
    const delivery = devices.map(device => {
      let event = 'update';
      if (device.autoHandoff && device.activityToken && !state.handoffActive) event = 'end';
      else if (device.autoHandoff && device.startToken && !device.activityToken && state.handoffActive && device.startedGeneration !== state.handoffGeneration && device.blockedGeneration !== state.handoffGeneration && !isQuiet(settings) && !settings.mutedAgents.includes(state.agent) && (!state.waiting || settings.approvals)) event = 'start';
      return { token: device.token, activityToken: device.activityToken, startToken: event === 'start' ? device.startToken : '', event, eventId: event === 'start' ? state.handoffGeneration : '' };
    });
    const signature = JSON.stringify({ ...state, updated: 0 });
    const alert = signature !== lastState && (state.waiting ? settings.approvals : state.status === 'Finished' && settings.completions) && !isQuiet(settings) && !settings.mutedAgents.includes(state.agent);
    try {
      const response = await fetcher(settings.relayUrl + '/notify', { method: 'POST', headers: { Authorization: 'Bearer ' + getSecret(), 'Content-Type': 'application/json' }, body: JSON.stringify({ state, alert, devices: delivery }), signal: AbortSignal.timeout(15000), redirect: 'error' });
      if (!response.ok) throw new Error();
      const result = await response.json();
      const rejected = new Set(result.invalidTokens || []);
      const delivered = new Set(result.deliveredTokens || []);
      if (rejected.size || delivered.size) {
        save(devices.map(device => {
          const sent = delivery.find(item => item.event === 'start' ? item.startToken === device.startToken : item.activityToken === device.activityToken && item.activityToken);
          const next = { ...device, token: rejected.has(device.token) ? '' : device.token, activityToken: rejected.has(device.activityToken) ? '' : device.activityToken, startToken: rejected.has(device.startToken) ? '' : device.startToken };
          if (sent?.event === 'start' && delivered.has(sent.startToken)) next.startedGeneration = state.handoffGeneration;
          if (sent?.event === 'end' && delivered.has(sent.activityToken)) { next.activityToken = ''; next.blockedGeneration = state.handoffGeneration; }
          return next;
        }).filter(device => device.token || device.activityToken || device.startToken));
      }
      if (result.ok !== true) throw new Error();
      lastSent = now(); lastState = signature; error = '';
    } catch { error = 'Phone push failed. Check the relay and Apple push configuration.'; if (!pendingState) pendingState = state; }
    finally { busy = false; if (pendingState) { pendingState.updated = Math.floor(now() / 1000); schedule(pendingState.requestId !== state.requestId || pendingState.handoffActive !== state.handoffActive ? 0 : 15000); } }
  }
  const heartbeat = setInterval(() => { if (latestState && !busy && !pendingState && now() - lastSent >= 60000) { pendingState = statePayload(latestState); schedule(500); } }, 60000); heartbeat.unref?.();
  return {
    register(input) {
      if (typeof input?.id !== 'string' || !/^[a-z0-9-]{8,80}$/i.test(input.id)) return { ok: false, error: 'Invalid device.' };
      if (input.remove === true) { try { changedDevices(devices.filter(device => device.id !== input.id)); return { ok: true }; } catch { return { ok: false, error: 'Could not remove the device.' }; } }
      if (input.activityEnded === true) { try { changedDevices(devices.map(device => device.id === input.id ? { ...device, activityToken: '', blockedGeneration: handoff.generation } : device).filter(device => device.token || device.activityToken || device.startToken)); return { ok: true }; } catch { return { ok: false, error: 'Could not remove the activity.' }; } }
      if (!hex(input.token) && !hex(input.activityToken) && !hex(input.startToken)) return { ok: false, error: 'Invalid push token.' };
      const old = devices.find(device => device.id === input.id) || {};
      if (!old.id && devices.length >= 3) return { ok: false, error: 'Three phones are already registered. Revoke phone devices first.' };
      const next = [...devices.filter(device => device.id !== input.id), { ...old, id: input.id, token: hex(input.token) ? input.token : old.token || '', activityToken: hex(input.activityToken) ? input.activityToken : old.activityToken || '', startToken: hex(input.startToken) ? input.startToken : old.startToken || '', autoHandoff: typeof input.autoHandoff === 'boolean' ? input.autoHandoff : Boolean(old.autoHandoff), updated: now() }];
      try { changedDevices(next); return { ok: true }; } catch { return { ok: false, error: 'Windows could not encrypt the device registration.' }; }
    },
    revoke() { clearTimeout(handoffTimer); if (fs.existsSync(file)) fs.unlinkSync(file); devices = []; clearTimeout(timer); timer = null; pendingState = null; lastState = ''; return this.snapshot(); },
    snapshot: () => ({ devices: devices.length, lastSent, error, locked, handoffActive: handoff.active, handoffGeneration: handoff.generation, configured: Boolean(getSettings().relayUrl && getSecret()) }),
    update(state) { if (stopped) return; latestState = state; pendingState = statePayload(state); const signature = JSON.stringify({ ...pendingState, updated: 0 }); if (signature === lastState && now() - lastSent < 60000) { pendingState = null; return; } if (state.pending && state.pending.id !== JSON.parse(lastState || "{}").requestId) { clearTimeout(timer); timer = null; schedule(0); } else schedule(Math.max(500, 15000 - (now() - lastSent))); },
    lock(value) { locked = Boolean(value); policy.lock(locked); lastState = ''; },
    stop() { stopped = true; clearTimeout(handoffTimer); clearInterval(heartbeat); clearTimeout(timer); timer = null; pendingState = null; latestState = null; },
    flush: send,
  };
}
module.exports = { createPushBridge, hex };
