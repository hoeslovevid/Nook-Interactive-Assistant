const test = require('node:test');
const assert = require('node:assert/strict');
const { chatModels, createModelDiscovery } = require('../lib/model-discovery');
const models = () => new Response(JSON.stringify({ data: [{ id: 'example-chat' }] }));

test('model selection removes known non-chat models, invalid IDs and duplicates', () => {
  assert.deepEqual(chatModels({ data: [{ id: 'text-embedding-3-small' }, { id: 'gpt-image-1' }, { id: 'example-chat' }, { id: 'example-chat' }, { id: 'not valid' }, { id: 'rerank-v2' }, { id: 'image-only', architecture: { output_modalities: ['image'] } }, { id: 'no-chat', capabilities: { completion_chat: false } }] }), ['example-chat']);
  assert.deepEqual(chatModels({ models: [{ name: 'models/gemini-test', supportedGenerationMethods: ['generateContent'] }, { name: 'models/embedding', supportedGenerationMethods: ['embedContent'] }] }), ['gemini-test']);
});

test('discovery caches model lists, merges concurrent requests, expires and isolates credentials', async () => {
  let calls = 0, time = 0;
  const discovery = createModelDiscovery({ now: () => time, fetcher: async () => { calls++; return models(); } });
  const results = await Promise.all([discovery.discover('chatgpt', {}, 'key-a'), discovery.discover('chatgpt', {}, 'key-a')]);
  assert.equal(calls, 1); assert.deepEqual(results[0].models, ['example-chat']);
  assert.equal((await discovery.discover('chatgpt', {}, 'key-a')).cached, true); assert.equal(calls, 1);
  await discovery.discover('chatgpt', {}, 'key-b'); assert.equal(calls, 2);
  time = 60001; await discovery.discover('chatgpt', {}, 'key-a'); assert.equal(calls, 3);
  await discovery.discover('chatgpt', {}, 'key-a', true); assert.equal(calls, 4);
  discovery.clear(); await discovery.discover('chatgpt', {}, 'key-a'); assert.equal(calls, 5);
  assert.ok(!JSON.stringify(results).includes('key-a'));
});

test('connection checks require cloud keys and return useful errors without exposing response secrets', async () => {
  let calls = 0;
  const discovery = createModelDiscovery({ fetcher: async () => { calls++; return new Response('secret detail', { status: 401 }); } });
  assert.match((await discovery.discover('claude')).error, /Save your API key/); assert.equal(calls, 0);
  const result = await discovery.discover('claude', {}, 'sample-key'); assert.match(result.error, /Access denied/);
  assert.ok(!JSON.stringify(result).includes('secret detail'));
  assert.equal((await discovery.discover('unknown')).ok, false);
  assert.equal(calls, 1);
});

test('local checks use the saved address without auth; malformed and oversized lists fail safely', async () => {
  const discovery = createModelDiscovery({ fetcher: async (url, options) => {
    assert.equal(url, 'http://127.0.0.1:12345/v1/models'); assert.equal(options.redirect, 'error'); assert.equal(options.headers.Authorization, undefined);
    return new Response('invalid JSON');
  } });
  assert.match((await discovery.discover('ollama', { ollamaUrl: 'http://127.0.0.1:12345/v1/chat/completions' })).error, /local server/);
  const oversized = createModelDiscovery({ fetcher: async () => new Response('x'.repeat(8 * 1024 * 1024 + 1)) });
  assert.equal((await oversized.discover('custom')).ok, false);
});
