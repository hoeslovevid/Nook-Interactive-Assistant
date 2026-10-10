// Self-hosted APNs relay. Receives status-only payloads; no agent code, commands, or API keys.
const http = require('node:http'), http2 = require('node:http2'), crypto = require('node:crypto'), fs = require('node:fs');
const validToken = value => typeof value === 'string' && /^[a-f0-9]{32,512}$/i.test(value);
function cleanPayload(input) {
  const state = input?.state;
  if (!state || !['Needs review', 'Finished', 'Working', 'Quiet'].includes(state.status) || !Array.isArray(input.devices) || input.devices.length > 3 || !Number.isSafeInteger(state.updated) || Math.abs(Date.now() / 1000 - state.updated) > 300) throw new Error('Invalid status payload');
  return { state: { status: state.status, agent: String(state.agent || 'Nook').slice(0, 40), waiting: Boolean(state.waiting), requestId: String(state.requestId || '').slice(0, 200), updated: state.updated, locked: Boolean(state.locked) }, alert: input.alert === true, devices: input.devices.map(device => ({ token: validToken(device.token) ? device.token : '', activityToken: validToken(device.activityToken) ? device.activityToken : '' })) };
}
function createApns({ teamId, keyId, key, bundleId, sandbox = true }) {
  if (!/^[A-Z0-9]{10}$/.test(teamId) || !/^[A-Z0-9]{10}$/.test(keyId) || !/^[a-zA-Z0-9.-]{3,150}$/.test(bundleId)) throw new Error('Configure the Apple team, key, and bundle identifiers.');
  const privateKey = crypto.createPrivateKey(key); let cached = '', created = 0;
  if (privateKey.asymmetricKeyType !== 'ec' || privateKey.asymmetricKeyDetails?.namedCurve !== 'prime256v1') throw new Error('Use the P-256 APNs signing key provided by Apple.');
  function jwt() {
    if (cached && Date.now() - created < 45 * 60000) return cached;
    const header = Buffer.from(JSON.stringify({ alg: 'ES256', kid: keyId })).toString('base64url');
    const body = Buffer.from(JSON.stringify({ iss: teamId, iat: Math.floor(Date.now() / 1000) })).toString('base64url');
    const data = header + '.' + body;
    cached = data + '.' + crypto.sign('sha256', Buffer.from(data), { key: privateKey, dsaEncoding: 'ieee-p1363' }).toString('base64url'); created = Date.now(); return cached;
  }
  return (token, payload, live = false) => new Promise((resolve, reject) => {
    const session = http2.connect(sandbox ? 'https://api.sandbox.push.apple.com' : 'https://api.push.apple.com');
    let completed = false;
    const finish = (error, result) => { if (completed) return; completed = true; clearTimeout(timer); session.close(); if (error) reject(error); else resolve(result); };
    const timer = setTimeout(() => { session.destroy(); finish(new Error('Apple push timed out')); }, 8000);
    session.on('error', error => finish(error));
    const stream = session.request({ ':method': 'POST', ':path': '/3/device/' + token, authorization: 'bearer ' + jwt(), 'apns-topic': bundleId + (live ? '.push-type.liveactivity' : ''), 'apns-push-type': live ? 'liveactivity' : 'alert', 'apns-priority': live ? '5' : '10', 'apns-expiration': String(Math.floor(Date.now() / 1000) + 120) });
    let status = 0, result = '';
    stream.on('response', headers => { status = Number(headers[':status']); });
    stream.on('data', chunk => { if (result.length < 1000) result += chunk; });
    stream.on('error', error => finish(error));
    stream.on('end', () => { const invalid = status === 410 || (status === 400 && /BadDeviceToken|DeviceTokenNotForTopic/.test(result)); finish(null, { ok: status === 200, invalid }); });
    stream.end(JSON.stringify(payload));
  });
}
function createServer({ secret, send }) {
  if (typeof secret !== 'string' || !/^[A-Za-z0-9_-]{32,500}$/.test(secret)) throw new Error('Set a strong NOOK_RELAY_TOKEN.');
  const expected = Buffer.from('Bearer ' + secret), rate = new Map();
  return http.createServer(async (request, response) => {
    const reply = (status, data) => { response.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }); response.end(JSON.stringify(data)); };
    if (request.url === '/healthz' && request.method === 'GET') return reply(200, { ok: true });
    const provided = Buffer.from(String(request.headers.authorization || ''));
    if (provided.length !== expected.length || !crypto.timingSafeEqual(provided, expected)) return reply(401, { ok: false });
    if (request.url !== '/notify' || request.method !== 'POST') return reply(404, { ok: false });
    const address = request.socket.remoteAddress, minute = Math.floor(Date.now() / 60000), previous = rate.get(address), count = previous?.minute === minute ? previous.count + 1 : 1;
    rate.set(address, { minute, count }); if (rate.size > 1000) rate.delete(rate.keys().next().value);
    if (count > 30) return reply(429, { ok: false });
    try {
      let raw = ''; for await (const chunk of request) { raw += chunk; if (Buffer.byteLength(raw) > 16000) return reply(413, { ok: false }); }
      const { state, alert, devices } = cleanPayload(JSON.parse(raw)), invalidTokens = [], results = [];
      await Promise.all(devices.map(async device => {
        if (device.activityToken) {
          const result = await send(device.activityToken, { aps: { timestamp: state.updated, event: 'update', 'content-state': state, 'stale-date': state.updated + 120 } }, true);
          if (result.invalid) invalidTokens.push(device.activityToken); else results.push(result.ok);
        }
        if (alert && device.token) {
          const result = await send(device.token, { aps: { alert: { title: 'Nook', body: state.waiting ? 'An agent needs your review.' : 'An agent finished working.' }, sound: 'default', category: 'NOOK_REVIEW' }, requestId: state.requestId }, false);
          if (result.invalid) invalidTokens.push(device.token); else results.push(result.ok);
        }
      }));
      reply(200, { ok: results.every(Boolean), invalidTokens });
    } catch { reply(400, { ok: false }); }
  });
}
if (require.main === module) {
  const send = createApns({ teamId: process.env.APNS_TEAM_ID, keyId: process.env.APNS_KEY_ID, key: fs.readFileSync(process.env.APNS_KEY_FILE), bundleId: process.env.APNS_BUNDLE_ID, sandbox: process.env.APNS_ENV !== 'production' });
  const server = createServer({ secret: process.env.NOOK_RELAY_TOKEN, send }); server.requestTimeout = 15000; server.headersTimeout = 10000;
  server.listen(Number(process.env.PORT) || 8787, '127.0.0.1', () => process.stdout.write('Nook push relay listening on localhost. Place an HTTPS reverse proxy in front of it.\n'));
}
module.exports = { cleanPayload, createApns, createServer };
