const test = require('node:test'), assert = require('node:assert/strict');
const { createServiceDetails } = require('../lib/service-details');
function fixture({ changed = false, confirm = true } = {}) {
  const calls = [], confirmations = []; let reviewing = false;
  const kit = createServiceDetails({ getKeys: () => ({ github: 'key', vercel: 'key', n8n: 'key' }), getPrefs: () => ({ n8nUrl: 'https://flows.example.com' }), getGithub: () => ({ login: 'me', reviews: [{ id: 'pr:1', title: 'Fix', url: 'https://github.com/a/b/pull/1' }] }), actionsEnabled: () => true,
    confirm: async plan => { confirmations.push(plan.summary); reviewing = true; return confirm; },
    fetcher: async (url, request) => {
      calls.push({ url, ...request }); let payload;
      if (request.method !== 'GET') return { ok: true, status: 204 };
      if (url.includes('/pulls/1')) payload = { state: 'open', head: { sha: (changed && reviewing ? 'b' : 'a').repeat(40) }, user: { login: 'author' } };
      else if (url.includes('/actions/')) payload = { workflow_runs: [] };
      else if (url.includes('/v6/')) payload = { deployments: [{ uid: 'deployment', name: 'App', state: 'BUILDING' }] };
      else if (url.includes('/v13/')) payload = { readyState: changed && reviewing ? 'READY' : 'BUILDING' };
      else if (url.includes('/workflows')) payload = { data: [] };
      else if (url.includes('/executions?')) payload = { data: [{ id: '42', status: 'error', workflowId: 'workflow', stoppedAt: 'today' }] };
      else payload = { status: changed && reviewing ? 'success' : 'error', workflowId: 'workflow' };
      return { ok: true, status: 200, json: async () => payload };
    } });
  return { kit, calls, confirmations };
}
test('PR reviews require comments where appropriate, bind the reviewed commit, and cannot apply after a new commit', async () => {
  for (const changed of [false, true]) {
    const f = fixture({ changed }), detail = await f.kit.detail('github'), actions = detail.items[0].actions;
    assert.equal(actions.length, 3); const action = actions.find(action => action.label === 'Request changes'); assert.equal(action.needsText, true);
    const result = await f.kit.act(action.id, { text: 'Please fix the race.' }); assert.equal(result.ok, !changed);
    const writes = f.calls.filter(call => call.method === 'POST'); assert.equal(writes.length, changed ? 0 : 1);
    if (!changed) { const body = JSON.parse(writes[0].body); assert.equal(body.event, 'REQUEST_CHANGES'); assert.equal(body.commit_id, 'a'.repeat(40)); assert.equal(body.body, 'Please fix the race.'); }
    assert.match(f.confirmations[0], /Please fix the race/); assert.equal((await f.kit.act(action.id, { text: 'repeat' })).ok, false);
  }
  const f = fixture(), action = (await f.kit.detail('github')).items[0].actions.find(action => action.needsText); assert.equal((await f.kit.act(action.id, { text: '' })).ok, false); assert.equal(f.confirmations.length, 0);
});
test('Vercel cancellation uses PATCH and rejects builds that finished during confirmation', async () => {
  for (const changed of [false, true]) {
    const f = fixture({ changed }), action = (await f.kit.detail('vercel')).items[0].actions.find(action => action.label === 'Cancel build');
    assert.equal((await f.kit.act(action.id)).ok, !changed); const writes = f.calls.filter(call => call.method === 'PATCH'); assert.equal(writes.length, changed ? 0 : 1); if (!changed) assert.equal(writes[0].url, 'https://api.vercel.com/v12/deployments/deployment/cancel');
  }
});
test('n8n retries explain repeated effects, recheck failed status, and do not include execution data', async () => {
  for (const changed of [false, true]) {
    const f = fixture({ changed }), action = (await f.kit.detail('n8n')).items[0].actions[0];
    assert.match(action.summary, /side effects/); assert.equal((await f.kit.act(action.id)).ok, !changed); const writes = f.calls.filter(call => call.method === 'POST'); assert.equal(writes.length, changed ? 0 : 1); if (!changed) assert.match(writes[0].url, /executions\/42\/retry$/);
    assert.ok(f.calls.filter(call => call.url.includes('/executions') && call.method === 'GET').every(call => call.url.includes('includeData=false')));
  }
});
