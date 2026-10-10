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
