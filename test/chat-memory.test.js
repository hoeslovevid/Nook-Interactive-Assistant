const test = require('node:test');
const assert = require('node:assert/strict');
const { recentMessages } = require('../lib/chat-memory');
test('chat memory is bounded per provider without losing other conversations or active reply identity', () => {
  const messages = [{ provider: 'claude', content: 'Keep this' }, ...Array.from({ length: 30 }, (_, i) => ({ provider: 'chatgpt', content: String(i) }))];
  const reply = { provider: 'chatgpt', content: '' }; messages.push(reply);
  const retained = recentMessages(messages);
  assert.equal(retained.length, 25); assert.equal(retained[0], messages[0]); assert.equal(retained.at(-1), reply);
  assert.equal(retained[1].content, '7'); reply.content = 'Streamed'; assert.equal(retained.at(-1).content, 'Streamed');
});
