const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), os = require('node:os'), path = require('node:path');
const { createHistoryTail } = require('../lib/history-tail');

test('history reads bounded complete UTF-8 records, caches unchanged recaps and updates after appends', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'nook-tail-')); t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const file = path.join(root, 'history.jsonl');
  fs.writeFileSync(file, '{"old":"' + 'x'.repeat(200) + '"}\n{"new":"🌟"}\n');
  let time = 0, calls = 0;
  const reader = createHistoryTail({ maxBytes: 30, now: () => time });
  assert.equal(reader.read(file), '{"new":"🌟"}\n');
  const summarize = text => { calls++; return { text }; };
  reader.recap(file, summarize); reader.recap(file, summarize); assert.equal(calls, 1);
  fs.appendFileSync(file, '{"last":true}\n'); assert.match(reader.recap(file, summarize).text, /last/); assert.equal(calls, 2);
  time = 60000; reader.recap(file, summarize); assert.equal(calls, 3);
  fs.unlinkSync(file); assert.equal(reader.read(file), '');
});
