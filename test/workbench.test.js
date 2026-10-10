const test = require('node:test'), assert = require('node:assert/strict');
const { diffRows, timeline } = require('../lib/workbench');
const { pairDiff } = require('../lib/diff');
const { validAnswers } = require('../lib/decisions');
const { readAttachment } = require('../lib/attachments');
const fs = require('node:fs'), os = require('node:os'), path = require('node:path');
test('diff preview preserves hunk line numbers and identifies headers and additions', () => {
  const rows = diffRows('--- a/file.js\n+++ b/file.js\n@@ -10,2 +20,2 @@\n old\n-before\n+after');
  assert.deepEqual(rows.slice(0, 3).map(row => row.type), ['meta', 'meta', 'meta']);
  assert.equal(rows[3].next, 20); assert.equal(rows[4].old, 11); assert.equal(rows[5].next, 21); assert.equal(rows[5].text, 'after');
  assert.equal(pairDiff('', 'new'), '+ new'); assert.equal(pairDiff('old', ''), '- old'); assert.equal(pairDiff('same', 'same'), 'No changes.');
  assert.match(pairDiff('', Array(40).fill('new').join('\n')), /Preview truncated/);
});
test('task progress reflects actual recorded steps and question answers cannot be empty', () => {
  const session = { finished: false, steps: [{ task: 'SessionStart' }, { task: 'Read' }, { task: 'Edit' }] };
  assert.deepEqual(timeline(session), [{ label: 'Read', done: true, current: false }, { label: 'Edit', done: false, current: true }]);
  assert.ok(timeline({ ...session, finished: true }).every(row => row.done && !row.current));
  assert.equal(validAnswers([{ question: 'Plan' }], { Plan: '' }), false);
  assert.equal(validAnswers([{ question: 'Plan' }], { '': 'typed under wrong key' }), false);
  assert.equal(validAnswers([{ question: 'Plan' }], { Plan: 'Use the new design' }), true);
});
test('file context rejects large and binary files and treats images as images', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'nook-attachment-'));
  try {
    const file = path.join(directory, 'context.txt'); fs.writeFileSync(file, 'Source context'); assert.equal(readAttachment(file).text, 'Source context');
    fs.writeFileSync(file, Buffer.alloc(2000001)); assert.throws(() => readAttachment(file), /smaller than 2 MB/);
    fs.writeFileSync(file, Buffer.from([1, 0, 2])); assert.throws(() => readAttachment(file), /text, source/);
    fs.writeFileSync(file, Buffer.from([137,80,78,71,13,10,26,10])); assert.match(readAttachment(file).image, /^data:image\/png;base64,/);
    assert.throws(() => readAttachment(directory), /folder/);
  } finally { fs.rmSync(directory, { recursive: true, force: true }); }
});
