const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), os = require('node:os'), path = require('node:path'), net = require('node:net'), { spawn } = require('node:child_process');
const { normalize, adapt, createCustomAgents, hookCommand } = require('../lib/custom-agents');
const profile = { id: 'my-agent', name: 'My assistant', color: '#98baff', fields: { event: 'payload.event', session: 'payload.id' }, events: { read: 'file_read', edit: 'file_edit', run: 'shell', complete: 'done' } };
test('custom adapters reject unsafe paths, reserved agents, ambiguous events, and missing session IDs', () => {
  assert.throws(() => normalize({ ...profile, id: 'claude' })); assert.throws(() => normalize({ ...profile, fields: { event: '__proto__.polluted' } })); assert.throws(() => normalize({ ...profile, events: { read: 'same', edit: 'same' } }));
  assert.equal(adapt(profile, { payload: { event: 'unknown' } }), null); assert.throws(() => adapt(profile, { payload: { event: 'done' } }));
  const result = adapt(profile, { payload: { event: 'file_edit', id: 'session-1' }, file_path: 'a.js', old_string: 'old', new_string: 'new', apiKey: 'secret' });
  assert.equal(result.tool_name, 'Edit'); assert.equal(result.session_id, 'session-1'); assert.ok(!JSON.stringify(result).includes('secret'));
  assert.equal(adapt(profile, { payload: { event: 'done', id: 'one' }, message: 'Finished' }).hook_event_name, 'Stop');
  assert.match(hookCommand("C:\\a'b\\Nook.exe", 'hook.js', 'config.json'), /a''b/);
});
test('saved profiles survive restart and custom CLI sends activity without asking or granting permission', async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'nook-custom-agent-')), pipe = process.platform === 'win32' ? '\\\\.\\pipe\\nook-custom-test-' + process.pid : path.join(directory, 'test.sock');
  let received; const server = net.createServer(socket => socket.on('data', data => { received = JSON.parse(data.toString().trim()); socket.end('{"ok":true}\n'); }));
  await new Promise(resolve => server.listen(pipe, resolve));
  try {
    const kit = createCustomAgents(directory); kit.save(profile); assert.equal(createCustomAgents(directory).list()[0].name, profile.name);
    const config = path.join(directory, 'profile.json'); fs.writeFileSync(config, JSON.stringify(normalize(profile)));
    const child = spawn(process.execPath, [path.resolve('hooks/nook-custom-hook.js'), '--config', config], { env: { ...process.env, NOOK_PIPE: pipe }, windowsHide: true }); child.stdin.end(JSON.stringify({ payload: { event: 'shell', id: 'one' }, command: 'echo example' }));
    const code = await new Promise((resolve, reject) => { child.on('error', reject); child.on('exit', resolve); }); assert.equal(code, 0); assert.equal(received.agent, 'my-agent'); assert.equal(received.wait, false); assert.equal(received.payload.tool_name, 'Bash');
    kit.remove(profile.id); assert.deepEqual(kit.list(), []);
  } finally { await new Promise(resolve => server.close(resolve)); fs.rmSync(directory, { recursive: true, force: true }); }
});
