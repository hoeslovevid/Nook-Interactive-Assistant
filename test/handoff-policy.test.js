const test = require('node:test'), assert = require('node:assert/strict');
const { createHandoffPolicy } = require('../lib/handoff-policy');
test('routine handoff waits twenty seconds and brief locks never start it', () => {
  let time = 0; const policy = createHandoffPolicy({ now: () => time, generation: () => 'one' }), working = { sessions: [{ finished: false }] };
  policy.lock(true); assert.equal(policy.observe(working).active, false); time = 19999; assert.equal(policy.observe(working).active, false); policy.lock(false); time = 20000; assert.equal(policy.observe(working).active, false);
  policy.lock(true); time += 20000; assert.equal(policy.observe(working).active, true); assert.equal(policy.observe(working).generation, 'one');
});
test('urgent requests hand off immediately; unlock waits thirty seconds and relock keeps the same activity', () => {
  let time = 1000, count = 0; const policy = createHandoffPolicy({ now: () => time, generation: () => 'generation-' + ++count }), working = { sessions: [{ finished: false }] };
  assert.equal(policy.observe({ pending: { id: 'urgent' } }).active, true); policy.lock(true); policy.observe(working); policy.lock(false); time += 29999; assert.equal(policy.observe(working).active, true);
  policy.lock(true); const generation = policy.observe(working).generation; time += 20000; assert.equal(policy.observe(working).generation, generation); assert.equal(count, 1);
  policy.lock(false); time += 30000; assert.equal(policy.observe(working).active, false); assert.equal(policy.observe({ pending: { id: 'next' } }).active, true); assert.equal(count, 2);
});
