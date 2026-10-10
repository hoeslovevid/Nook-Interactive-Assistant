const test = require('node:test'), assert = require('node:assert/strict');
const { createServiceDetails } = require('../lib/service-details');
function fixture(options = {}) {
  let enabled = false, time = 1000, confirmations = 0; const calls = [];
  const kit = createServiceDetails({ getKeys: () => ({ vercel: 'private-api-key', n8n: 'n8n-key', github: 'github-key' }), getPrefs: () => ({ n8nUrl: 'https://flows.example.com' }), getGithub: () => ({ branches: [{ id: 'repo', url: 'https://github.com/example/repo', title: 'repo' }] }), now: () => time, actionsEnabled: () => enabled, confirm: async () => { confirmations++; return options.confirm !== false; }, fetcher: async (url, request) => { calls.push({ url, request }); return { ok: true, status: request.method === 'POST' ? 204 : 200, json: async () => url.includes('/v6/') ? { deployments: [{ uid: 'dpl_1', name: 'Project', state: 'READY', url: 'project.vercel.app' }] } : url.includes('api.github.com') ? { workflow_runs: [{ id: 123, name: 'CI', conclusion: 'failure', html_url: 'https://github.com/example/repo/actions/runs/123' }] } : { data: [{ id: 'workflow', name: 'Build', active: true }] } }; } });
  return { kit, calls, enable: () => { enabled = true; }, expire: () => { time += 300001; }, confirmations: () => confirmations };
}
test('service actions require opt-in, current offers, confirmation, and cannot replay', async () => {
  const f = fixture(); const before = await f.kit.detail('vercel'); assert.equal(before.items[0].actions.length, 0); f.enable();
  const detail = await f.kit.detail('vercel'), id = detail.items[0].actions[0].id;
  assert.ok(!JSON.stringify(detail).includes('private-api-key'));
  assert.equal((await f.kit.act('arbitrary')).ok, false); assert.equal((await f.kit.act(id)).ok, true); assert.equal((await f.kit.act(id)).ok, false); assert.equal(f.confirmations(), 1);
  const post = f.calls.find(call => call.request.method === 'POST'); assert.equal(post.url, 'https://api.vercel.com/v13/deployments'); assert.equal(JSON.parse(post.request.body).target, undefined);
  const expired = (await f.kit.detail('n8n')).items[0].actions[0].id; f.expire(); assert.equal((await f.kit.act(expired)).ok, false);
});
test('cancelled service changes never send a write request; CI retries use failed-jobs endpoint', async () => {
  const f = fixture({ confirm: false }); f.enable(); const detail = await f.kit.detail('github'), action = detail.items.find(item => item.id === 'run:123').actions[0];
  assert.equal((await f.kit.act(action.id)).cancelled, true); assert.equal(f.calls.filter(call => call.request.method === 'POST').length, 0);
});
