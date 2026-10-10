const test = require('node:test');
const assert = require('node:assert/strict');
const { completeChat } = require('../lib/chat-transport');
const { takeSseEvents } = require('../lib/stream');
const history = [{ role: 'user', content: 'Hello' }];
function response(chunks, contentType = 'text/event-stream') {
  const encoder = new TextEncoder();
  return new Response(new ReadableStream({ start(controller) { for (const chunk of chunks) controller.enqueue(encoder.encode(chunk)); controller.close(); } }), { headers: { 'Content-Type': contentType } });
}
test('chat handles split CRLF frames, Unicode, and a final event without a blank line', async () => {
  const paints = [];
  const result = await completeChat('custom', '', history, {}, text => paints.push(text), { fetcher: async () => response(['data: {"choices":[{"delta":{"content":"Hi "}}]}\r', '\n\r\n', 'data: {"choices":[{"delta":{"content":"🌟"}}]}']) });
  assert.equal(result, 'Hi 🌟'); assert.equal(paints.at(-1), 'Hi 🌟');
  assert.deepEqual(takeSseEvents('data: one\r\n\r\ndata: two'), { events: ['one'], rest: 'data: two' });
});
test('chat accepts non-stream JSON and rejects errors after partial text', async () => {
  const json = '{"choices":[{"message":{"content":"JSON reply"}}]}';
  assert.equal(await completeChat('custom', '', history, {}, null, { fetcher: async () => response([json], 'application/json') }), 'JSON reply');
  await assert.rejects(completeChat('custom', '', history, {}, null, { fetcher: async () => response(['data: {"choices":[{"delta":{"content":"partial"}}]}\n\ndata: {"error":{"message":"rate limited"}}\n\n']) }), /interrupted/);
});
test('chat requires Claude credentials before connecting and times out stalled requests', async () => {
  let calls = 0;
  await assert.rejects(completeChat('claude', '', history, {}, null, { fetcher: async () => { calls++; } }), /API key/);
  assert.equal(calls, 0);
  // Keep the test alive: AbortSignal.timeout intentionally uses an unreferenced timer.
  const keepAlive = setTimeout(() => {}, 1000);
  try { await assert.rejects(completeChat('custom', '', history, {}, null, { timeout: 10, fetcher: (_, { signal }) => new Promise((_, reject) => signal.addEventListener('abort', () => reject(signal.reason), { once: true })) }), /too long/); }
  finally { clearTimeout(keepAlive); }
});

test('chat finishes on the provider completion marker even if the connection remains open', async () => {
  for (const [provider, key, data] of [
    ['custom', '', 'data: {"choices":[{"delta":{"content":"Done"}}]}\n\ndata: [DONE]\n\n'],
    ['claude', 'test-key', 'data: {"type":"content_block_delta","delta":{"text":"Done"}}\n\ndata: {"type":"message_stop"}\n\n'],
  ]) {
    let cancelled = false;
    const fetcher = async () => new Response(new ReadableStream({ start(controller) { controller.enqueue(new TextEncoder().encode(data)); }, cancel() { cancelled = true; } }));
    assert.equal(await completeChat(provider, key, history, {}, null, { fetcher }), 'Done'); assert.equal(cancelled, true);
  }
});
