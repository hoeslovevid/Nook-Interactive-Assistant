const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), os = require('node:os'), path = require('node:path'), crypto = require('node:crypto');
const { createWorkspace, normalize, isQuiet, mayNotify } = require('../lib/workspace');
function fixture() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'nook-workspace-')), key = crypto.randomBytes(32);
  const encrypt = text => { const iv = crypto.randomBytes(12), cipher = crypto.createCipheriv('aes-256-gcm', key, iv); const body = Buffer.concat([cipher.update(text), cipher.final()]); return Buffer.concat([iv, cipher.getAuthTag(), body]).toString('base64'); };
  const decrypt = text => { const bytes = Buffer.from(text, 'base64'), cipher = crypto.createDecipheriv('aes-256-gcm', key, bytes.subarray(0, 12)); cipher.setAuthTag(bytes.subarray(12, 28)); return Buffer.concat([cipher.update(bytes.subarray(28)), cipher.final()]).toString(); };
  let time = Date.now(); const notifications = [], kit = createWorkspace({ directory, encrypt, decrypt, now: () => time, notify: event => notifications.push(event) });
  return { directory, kit, notifications, encrypt, decrypt, advance: amount => { time += amount; }, close() { kit.stop(); assert.ok(path.resolve(directory).startsWith(path.resolve(os.tmpdir()) + path.sep)); fs.rmSync(directory, { recursive: true, force: true }); } };
}
test('archive is opt-in, encrypted, searchable and expires without exposing app secrets', () => {
  const f = fixture();
  try {
    const session = { id: 'one', agent: 'claude', label: 'Fix issue', cwd: 'C:\\work\\Project', finished: true, final: 'Finished the patch', steps: [{ time: 1, title: 'Edit', detail: 'greeting change', diff: '+hello' }], keys: { secret: 'never-persist-this-key' } };
    f.kit.record(session); assert.equal(f.kit.search().length, 0);
    f.kit.save({ archive: true, retention: 7 }); f.kit.record(session);
    assert.equal(f.kit.search({ query: 'hello', agent: 'claude', project: 'Project' }).length, 1);
    assert.equal(f.kit.detail('one:1').keys, undefined);
    const disk = fs.readFileSync(path.join(f.directory, 'session-archive.json'), 'utf8'); assert.ok(!disk.includes('Finished the patch')); assert.ok(!disk.includes('never-persist-this-key'));
    const loaded = createWorkspace({ directory: f.directory, encrypt: f.encrypt, decrypt: f.decrypt }); assert.equal(loaded.detail('one:1').final, 'Finished the patch'); loaded.stop();
    f.kit.save({ archive: false }); f.kit.record({ ...session, id: 'two' }); assert.equal(f.kit.search().length, 1);
    f.advance(8 * 86400000); assert.equal(f.kit.search().length, 0); f.kit.clear(); assert.ok(!fs.existsSync(path.join(f.directory, 'session-archive.json')));
  } finally { f.close(); }
});
test('notification quiet hours wrap midnight, per-agent controls apply, and completion alerts deduplicate', () => {
  const settings = normalize({ quietHours: true, quietStart: '22:00', quietEnd: '08:00', mutedAgents: ['claude'] });
  assert.ok(isQuiet(settings, new Date(2026, 9, 10, 23, 0))); assert.ok(isQuiet(settings, new Date(2026, 9, 11, 7, 59))); assert.ok(!isQuiet(settings, new Date(2026, 9, 11, 8, 0)));
  assert.ok(!mayNotify(settings, { kind: 'approvals', agent: 'claude' }, new Date(2026, 9, 10, 12, 0)));
  const f = fixture(); try { const session = { id: 'one', agent: 'codex', finished: true, steps: [{ time: 5 }], final: 'done' }; f.kit.record(session); f.kit.record(session); assert.equal(f.notifications.length, 1); } finally { f.close(); }
});
test('unreadable history is preserved until an explicit clear', () => {
  const f = fixture(); try { f.kit.stop(); fs.writeFileSync(path.join(f.directory, 'session-archive.json'), '{bad'); const next = createWorkspace({ directory: f.directory, encrypt: f.encrypt, decrypt: f.decrypt }); assert.ok(next.snapshot().error); next.save({ archive: true }); assert.equal(fs.readFileSync(path.join(f.directory, 'session-archive.json'), 'utf8'), '{bad'); next.clear(); assert.equal(next.snapshot().error, ''); next.stop(); } finally { f.close(); }
});
test('wardrobe motion settles and reduced motion does not oscillate', () => {
  const { wardrobeStep, OUTFITS } = require('../lib/companion'); let pose = { sway: .8, velocity: 0 };
  for (let i = 0; i < 500; i++) pose = wardrobeStep(pose, 0, 16, false);
  assert.ok(Math.abs(pose.sway) < .001); assert.deepEqual(wardrobeStep(pose, 1, 16, true), { sway: 0, velocity: 0 }); assert.ok(OUTFITS.includes('raincoat'));
});
test('multiple completed turns of one agent session remain independently searchable', () => {
  const f = fixture(); try { f.kit.save({ archive: true }); f.kit.record({ id: 'one', agent: 'claude', finished: true, final: 'First answer', steps: [{ time: 10 }] }); f.kit.record({ id: 'one', agent: 'claude', finished: true, final: 'Second answer', steps: [{ time: 20 }] }); assert.equal(f.kit.search().length, 2); assert.equal(f.kit.detail('one:10').final, 'First answer'); assert.equal(f.kit.detail('one:20').final, 'Second answer'); } finally { f.close(); }
});

test('invalid decrypted archive entries cannot crash startup or overwrite the saved archive', () => {
  const f = fixture();
  try {
    f.kit.stop(); const file = path.join(f.directory, 'session-archive.json');
    for (const value of [[null], {}, [{ id: 'one', time: Date.now(), steps: [] }]]) {
      const saved = JSON.stringify({ encrypted: f.encrypt(JSON.stringify(value)) }); fs.writeFileSync(file, saved);
      const kit = createWorkspace({ directory: f.directory, encrypt: f.encrypt, decrypt: f.decrypt });
      try { assert.match(kit.snapshot().error, /archive/); assert.deepEqual(kit.search(), []); kit.save({ archive: true }); assert.equal(fs.readFileSync(file, 'utf8'), saved); }
      finally { kit.stop(); }
    }
  } finally { f.close(); }
});
