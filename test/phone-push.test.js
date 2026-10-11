const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), os = require('node:os'), path = require('node:path');
const { createPushBridge } = require('../lib/phone-push');
const { createServer, cleanPayload } = require('../push-relay/server.cjs');
test('native registrations stay private, revoke, and push projections exclude code and keys', async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'nook-phone-push-')); const calls = []; const settings = require('../lib/workspace').normalize({ phonePush: true, relayUrl: 'https://push.example.com' });
  const bridge = createPushBridge({ directory, getSettings: () => settings, getSecret: () => 'relay-private-secret', encrypt: text => Buffer.from(text).toString('base64'), decrypt: text => Buffer.from(text, 'base64').toString(), fetcher: async (url, request) => { calls.push({ url, request }); return { ok: true, json: async () => ({ ok: true }) }; } });
  try {
    assert.equal(bridge.register({ id: 'device-one', token: 'ab'.repeat(32), activityToken: 'cd'.repeat(32) }).ok, true);
    assert.ok(!fs.readFileSync(path.join(directory, 'phone-devices.json'), 'utf8').includes('ab'.repeat(32)));
    bridge.update({ pending: { id: 'request-1', agent: 'claude', detail: 'private command' }, sessions: [], keys: { key: 'secret' }, messages: ['secret message'] }); await bridge.flush();
    const payload = JSON.parse(calls[0].request.body); assert.equal(payload.state.requestId, 'request-1'); assert.ok(!JSON.stringify(payload).includes('private command')); assert.ok(!JSON.stringify(payload).includes('secret message')); assert.equal(bridge.snapshot().devices, 1);
    bridge.register({ id: 'device-one', activityEnded: true }); bridge.register({ id: 'device-one', remove: true }); assert.equal(bridge.snapshot().devices, 0); bridge.revoke();
  } finally { bridge.stop(); assert.ok(directory.startsWith(path.resolve(os.tmpdir()) + path.sep)); fs.rmSync(directory, { recursive: true, force: true }); }
});
test('APNs relay authenticates, validates freshness, and only forwards status payloads', async () => {
  const delivered = [], secret = 'a'.repeat(64); const server = createServer({ secret, send: async (token, payload, live) => { delivered.push({ token, payload, live }); return { ok: true }; } });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve)); const base = 'http://127.0.0.1:' + server.address().port;
  try {
    const input = { state: { status: 'Needs review', agent: 'claude', waiting: true, requestId: '1', updated: Math.floor(Date.now() / 1000), command: 'private' }, devices: [{ token: 'ab'.repeat(32), activityToken: 'cd'.repeat(32) }], alert: true };
    assert.equal((await fetch(base + '/notify', { method: 'POST', body: JSON.stringify(input) })).status, 401);
    const response = await fetch(base + '/notify', { method: 'POST', headers: { Authorization: 'Bearer ' + secret }, body: JSON.stringify(input) }); assert.equal((await response.json()).ok, true); assert.equal(delivered.length, 2); assert.ok(!JSON.stringify(delivered).includes('private'));
    assert.throws(() => cleanPayload({ ...input, state: { ...input.state, updated: 1 } }));
  } finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
});

test('push retries failed delivery, refreshes unchanged Live Activities, and initializes newly registered phones', async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'nook-push-retry-'));
  let time = 100000, fails = true; const calls = [];
  const settings = require('../lib/workspace').normalize({ phonePush: true, relayUrl: 'https://push.example.com' });
  const bridge = createPushBridge({ directory, getSettings: () => settings, getSecret: () => 'secret', encrypt: text => text, decrypt: text => text, now: () => time,
    fetcher: async (_, options) => { calls.push(JSON.parse(options.body)); if (fails) throw new Error('offline'); return { ok: true, json: async () => ({ ok: true }) }; } });
  const state = { pending: { id: 'one', agent: 'claude' }, sessions: [] };
  try {
    bridge.register({ id: 'device-one', token: 'ab'.repeat(32) }); bridge.update(state); await bridge.flush();
    assert.match(bridge.snapshot().error, /failed/); fails = false; time += 15000; await bridge.flush();
    assert.equal(calls.length, 2); assert.equal(bridge.snapshot().error, '');
    time += 60000; bridge.update(state); await bridge.flush(); assert.equal(calls.length, 3); assert.equal(calls[2].alert, false);
    bridge.register({ id: 'device-two', token: 'cd'.repeat(32) }); await bridge.flush(); assert.equal(calls[3].devices.length, 2);
    bridge.stop(); bridge.update(state); await bridge.flush(); assert.equal(calls.length, 4);
  } finally { bridge.stop(); fs.rmSync(directory, { recursive: true, force: true }); }
});

test('failed encryption preserves the previous phone registration', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'nook-push-save-')); let fail = false;
  const bridge = createPushBridge({ directory, getSettings: () => ({}), getSecret: () => '', encrypt: text => { if (fail) throw new Error('locked'); return text; }, decrypt: text => text });
  try {
    assert.equal(bridge.register({ id: 'device-one', token: 'ab'.repeat(32) }).ok, true); fail = true;
    assert.equal(bridge.register({ id: 'device-one', token: 'cd'.repeat(32) }).ok, false); assert.equal(bridge.snapshot().devices, 1);
    assert.ok(fs.readFileSync(path.join(directory, 'phone-devices.json'), 'utf8').includes('ab'.repeat(32)));
  } finally { bridge.stop(); fs.rmSync(directory, { recursive: true, force: true }); }
});

test('automatic activities start once per handoff, survive brief unlocks and end after the grace period', async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'nook-auto-handoff-')); let time = 100000; const calls = [];
  const settings = require('../lib/workspace').normalize({ phonePush: true, relayUrl: 'https://push.example.com' });
  const bridge = createPushBridge({ directory, getSettings: () => settings, getSecret: () => 'secret', encrypt: text => text, decrypt: text => text, now: () => time,
    fetcher: async (_, options) => { const payload = JSON.parse(options.body); calls.push(payload); return { ok: true, json: async () => ({ ok: true, deliveredTokens: payload.devices.map(item => item.event === 'start' ? item.startToken : item.activityToken).filter(Boolean) }) }; } });
  const working = { sessions: [{ agent: 'claude', finished: false }] };
  try {
    bridge.register({ id: 'automatic-phone', startToken: 'ab'.repeat(32), autoHandoff: true }); bridge.lock(true); bridge.update(working); await bridge.flush(); assert.equal(calls.at(-1).devices[0].event, 'update');
    time += 20000; bridge.update(working); await bridge.flush(); assert.equal(calls.at(-1).devices[0].event, 'start'); const generation = calls.at(-1).devices[0].eventId;
    time += 60000; bridge.update(working); await bridge.flush(); assert.equal(calls.filter(item => item.devices[0].event === 'start').length, 1);
    bridge.register({ id: 'automatic-phone', activityToken: 'cd'.repeat(32) }); await bridge.flush(); bridge.lock(false); bridge.update(working); await bridge.flush(); assert.equal(calls.at(-1).devices[0].event, 'update');
    time += 29999; bridge.update(working); await bridge.flush(); assert.equal(bridge.snapshot().handoffActive, true);
    time++; bridge.update(working); await bridge.flush(); assert.equal(calls.at(-1).devices[0].event, 'end'); assert.equal(bridge.snapshot().handoffActive, false);
    time += 15000; bridge.update({ pending: { id: 'urgent', agent: 'claude' }, sessions: [] }); await bridge.flush(); assert.equal(calls.at(-1).devices[0].event, 'start'); assert.notEqual(calls.at(-1).devices[0].eventId, generation);
    bridge.revoke(); assert.equal(bridge.snapshot().devices, 0);
  } finally { bridge.stop(); fs.rmSync(directory, { recursive: true, force: true }); }
});
test('APNs starts deduplicate relay retries, and automatic ending uses an end event', async () => {
  const delivered = [], secret = 'b'.repeat(64), server = createServer({ secret, send: async (token, payload) => { delivered.push(payload); return { ok: true }; } });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const input = { state: { status: 'Working', updated: Math.floor(Date.now() / 1000), locked: true }, devices: [{ startToken: 'ab'.repeat(32), event: 'start', eventId: 'generation-one' }] };
  const post = async value => (await fetch('http://127.0.0.1:' + server.address().port + '/notify', { method: 'POST', headers: { Authorization: 'Bearer ' + secret }, body: JSON.stringify(value) })).json();
  try {
    assert.equal((await post(input)).ok, true); assert.equal((await post(input)).ok, true); assert.equal(delivered.length, 1); assert.equal(delivered[0].aps.event, 'start'); assert.equal(delivered[0].aps['attributes-type'], 'NookActivity');
    await post({ ...input, devices: [{ activityToken: 'cd'.repeat(32), event: 'end' }] }); assert.equal(delivered[1].aps.event, 'end'); assert.ok(delivered[1].aps['dismissal-date']);
  } finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
});

test('automatic handoff honors quiet hours and muted agents while allowing later delivery', async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'nook-handoff-quiet-')); let time = 100000; const calls = [];
  const settings = require('../lib/workspace').normalize({ phonePush: true, relayUrl: 'https://push.example.com', mutedAgents: ['claude'] });
  const bridge = createPushBridge({ directory, getSettings: () => settings, getSecret: () => 'secret', encrypt: text => text, decrypt: text => text, now: () => time,
    fetcher: async (_, options) => { calls.push(JSON.parse(options.body)); return { ok: true, json: async () => ({ ok: true }) }; } });
  try {
    bridge.register({ id: 'automatic-phone', startToken: 'ab'.repeat(32), autoHandoff: true }); const state = { pending: { id: 'review', agent: 'claude' }, sessions: [] };
    bridge.update(state); await bridge.flush(); assert.equal(calls[0].devices[0].event, 'update'); assert.equal(calls[0].alert, false);
    settings.mutedAgents = []; time += 60000; bridge.update(state); await bridge.flush(); assert.equal(calls[1].devices[0].event, 'start');
  } finally { bridge.stop(); fs.rmSync(directory, { recursive: true, force: true }); }
});
