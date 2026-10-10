// Tests the unpacked release without touching the user's Nook data or agent setup.
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const assert = require('node:assert/strict');
const { createRelay } = require('../lib/relay');
const root = path.resolve(__dirname, '..');
const appDir = path.join(root, 'dist', 'win-unpacked', 'resources', 'app');
const exe = path.join(root, 'dist', 'win-unpacked', 'Nook.exe');
const data = path.join(root, 'dist', 'smoke-data');
const resultFile = path.join(data, 'result.json');
const manifest = path.join(appDir, 'package.json');
const wrapper = path.join(appDir, 'smoke.cjs');

function run(command, args, options = {}, input = '') {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { windowsHide: true, ...options });
    let stdout = '', stderr = '';
    child.stdout.on('data', chunk => { stdout += chunk; });
    child.stderr.on('data', chunk => { stderr += chunk; });
    child.on('error', reject);
    const timeout = setTimeout(() => { child.kill(); reject(new Error('Packaged smoke test timed out')); }, 30000);
    child.on('close', code => { clearTimeout(timeout); resolve({ code, stdout, stderr }); });
    child.stdin.end(input);
  });
}

(async () => {
  assert.ok(fs.existsSync(exe), 'Build the unpacked app first');
  for (const file of ['hooks/nook-hook.cmd', 'hooks/nook-hook.js', 'lib/windows-media.ps1', 'lib/windows-speech.ps1', 'phone/phone.html', 'assets/icon.png', 'assets/icon.svg', 'assets/logo.svg', 'assets/tray.png', 'assets/tray@2x.png', 'assets/tray@3x.png', 'assets/favicon.ico', 'assets/apple-touch-icon.png']) {
    assert.ok(fs.existsSync(path.join(appDir, file)), `Missing runtime resource: ${file}`);
  }
  assert.ok(!fs.existsSync(path.join(appDir, 'test')), 'Tests should not ship');
  assert.ok(!fs.existsSync(path.join(appDir, 'assets/previews')), 'Previews should not ship');
  fs.mkdirSync(data, { recursive: true });
  const original = fs.readFileSync(manifest, 'utf8');
  const config = JSON.parse(original);
  config.main = 'smoke.cjs';
  fs.writeFileSync(wrapper, `
    const { app, BrowserWindow } = require('electron');
    const fs = require('fs');
    const data = process.env.NOOK_SMOKE_DATA;
    app.setName('Nook packaging smoke');
    app.setPath('userData', data);
    require('os').homedir = () => data;
    const errors = [];
    app.on('web-contents-created', (_event, contents) => {
      contents.on('console-message', (_event, level, message) => { if (level >= 3) errors.push(message); });
      contents.on('did-fail-load', (_event, code, message) => errors.push(code + ': ' + message));
    });
    process.on('uncaughtException', error => errors.push(error.stack));
    const relayModule = require('./lib/relay'), createRelay = relayModule.createRelay;
    relayModule.createRelay = (pipe, options) => createRelay(pipe + '-smoke-' + process.pid, options);
    require('./main.js');
    setTimeout(async () => {
      const windows = BrowserWindow.getAllWindows();
      const pages = await Promise.all(windows.map(window => window.webContents.executeJavaScript('({title: document.title, ready: document.readyState, text: document.body.innerText.length, brandCount: document.querySelectorAll(".brand-logo").length, images: [...document.querySelectorAll(".brand-logo")].every(image => image.complete && image.naturalWidth > 0)})').catch(error => { errors.push(error.message); return {}; })));
      const media = await require('./lib/native').media();
      fs.writeFileSync(process.env.NOOK_SMOKE_RESULT, JSON.stringify({windows: windows.length, pages, errors, media}));
      app.quit();
    }, 6500);
  `);
  try {
    fs.writeFileSync(manifest, JSON.stringify(config));
    const boot = await run(exe, [], { env: { ...process.env, NOOK_SMOKE_DATA: data, NOOK_SMOKE_RESULT: resultFile } });
    assert.equal(boot.code, 0, boot.stderr);
    const result = JSON.parse(fs.readFileSync(resultFile, 'utf8'));
    assert.ok(result.windows >= 2, 'Notch and settings should open');
    assert.deepEqual(result.errors, [], 'No renderer errors');
    assert.ok(result.pages.every(page => page.ready === 'complete'));
    assert.ok(result.pages.every(page => page.images), 'Brand images should load in packaged pages');
    assert.ok(result.pages.some(page => page.brandCount === 1), 'Settings should show the logo');
    assert.ok(result.pages.some(page => page.text > 0), 'Settings should render visible content');
    assert.equal(result.media.ok, true, 'Packaged Windows media script should execute');
    console.log('Packaged startup, pages, resources, and native media passed');
  } finally {
    fs.writeFileSync(manifest, original);
    fs.unlinkSync(wrapper);
  }
  const pipe = `\\\\.\\pipe\\nook-packaging-${process.pid}`;
  const relay = createRelay(pipe, { onActivity() {}, onApproval(msg) { relay.respond(msg.id, { hookSpecificOutput: { hookEventName: 'PermissionRequest', decision: { behavior: 'allow' } } }); } });
  await relay.listen();
  try {
    const hook = await run('cmd.exe', ['/d', '/s', '/c', `""${path.join(appDir, 'hooks', 'nook-hook.cmd')}" --agent claude --wait"`], { windowsVerbatimArguments: true, env: { ...process.env, NOOK_PIPE: pipe } }, JSON.stringify({ hook_event_name: 'PermissionRequest', tool_name: 'Bash', tool_input: { command: 'echo smoke' } }));
    assert.equal(hook.code, 0, hook.stderr);
    assert.equal(JSON.parse(hook.stdout).hookSpecificOutput.decision.behavior, 'allow');
    console.log('Installed agent hook passed using the bundled runtime');
  } finally { relay.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
