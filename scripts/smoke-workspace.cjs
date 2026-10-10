// Runs real desktop/phone UI against isolated sample data and mocked service APIs.
const { app, BrowserWindow, nativeImage, dialog, Notification, screen } = require('electron');
const fs = require('node:fs'), path = require('node:path'), net = require('node:net'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..'), output = path.join(root, 'dist', 'workspace-qa'), data = path.join(output, 'data-' + Date.now());
fs.mkdirSync(data, { recursive: true });
app.setName('Nook workspace verification'); app.setPath('userData', data); require('node:os').homedir = () => data;
fs.writeFileSync(path.join(data, 'prefs.json'), JSON.stringify({ muted: true }));
const pipe = '\\\\.\\pipe\\nook-workspace-qa-' + process.pid;
const relayModule = require('../lib/relay'), realRelay = relayModule.createRelay;
relayModule.createRelay = (_pipe, options) => realRelay(pipe, options);
Notification.prototype.show = function () {};
dialog.showMessageBox = async () => ({ response: 1 });
dialog.showSaveDialog = async () => ({ canceled: false, filePath: path.join(output, 'recap.png') });
const detailsModule = require('../lib/service-details'), realDetails = detailsModule.createServiceDetails;
const writes = [];
detailsModule.createServiceDetails = options => realDetails({ ...options, fetcher: async (url, request) => {
  if (request.method === 'POST') { writes.push({ url, body: request.body }); return { ok: true, status: 204 }; }
  return { ok: true, status: 200, json: async () => ({ deployments: [{ uid: 'sample-deployment', name: 'Nook sample', state: 'READY', url: 'nook-sample.vercel.app' }] }) };
} });
let push;
const pushModule = require('../lib/phone-push'), realPush = pushModule.createPushBridge;
pushModule.createPushBridge = options => (push = realPush({ ...options, fetcher: async () => ({ ok: true, json: async () => ({ ok: true }) }) }));
const errors = [];
app.on('web-contents-created', (_event, contents) => {
  contents.on('console-message', (_event, level, text) => { if (level >= 3) errors.push(text); });
  contents.on('did-fail-load', (_event, code, text) => errors.push(code + ': ' + text));
});
require('../main');
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
let sequence = 0;
function activity(payload) { return new Promise((resolve, reject) => { const socket = net.connect(pipe); socket.on('error', reject); socket.on('connect', () => socket.write(JSON.stringify({ id: 'sample-' + ++sequence, agent: 'claude', payload }) + '\n')); socket.on('data', () => { socket.destroy(); resolve(); }); }); }
function approval(id) { return new Promise((resolve, reject) => { const socket = net.connect(pipe); socket.on('error', reject); socket.on('connect', () => { socket.write(JSON.stringify({ id, agent: 'claude', wait: true, payload: { hook_event_name: 'PermissionRequest', session_id: 'sample', tool_name: 'Bash', tool_input: { command: 'echo sample' } } }) + '\n'); resolve(socket); }); }); }
app.whenReady().then(async () => {
  const waiting = [];
  try {
    await delay(1600);
    const settings = BrowserWindow.getAllWindows().find(window => window.webContents.getURL().endsWith('settings.html'));
    const notch = BrowserWindow.getAllWindows().find(window => window.webContents.getURL().endsWith('index.html'));
    assert.ok(settings && notch); const run = text => settings.webContents.executeJavaScript(text);
    await run('window.NookTour.finish()');
    await run('window.nook.workspace("save", {archive:true,notifications:false,serviceActions:true})');
    await activity({ hook_event_name: 'PostToolUse', session_id: 'sample', tool_name: 'Edit', tool_input: { file_path: 'C:\\sample\\hello.js', old_string: 'const greeting=1;', new_string: 'const greeting=2;' }, cwd: 'C:\\sample' });
    await activity({ hook_event_name: 'Stop', session_id: 'sample', last_assistant_message: 'Completed the sample greeting.', cwd: 'C:\\sample' });
    await delay(120);
    const search = await run('window.nook.workspace("search", {query:"sample greeting"})'); assert.equal(search.items.length, 1);
    assert.ok(!fs.readFileSync(path.join(data, 'session-archive.json'), 'utf8').includes('Completed the sample greeting'));
    await run('showPage("workspace"); document.getElementById("history-query").value="sample greeting"; document.getElementById("history-search").click()'); await delay(120);
    assert.equal(await run('document.querySelectorAll("#history-results .workspace-card").length'), 1);
    await run('document.querySelector("#history-results button").click()'); await delay(120);
    assert.ok(await run('document.getElementById("history-detail").innerText.includes("Completed the sample greeting")'));
    await run('window.nook.saveKey("vercel", "sample-key-for-mocked-api")');
    await run('document.getElementById("service-choice").value="vercel"; document.getElementById("service-refresh").click()'); await delay(160);
    assert.equal(await run('document.querySelectorAll("#service-items .workspace-card").length'), 1);
    await run('document.querySelector("#service-items button:last-child").click()'); await delay(160); assert.equal(writes.length, 1);
    await run('window.nook.saveCompanion({phoneDetails:true,phoneInstructions:true})');
    const status = await run('window.nook.phone("start")'); assert.ok(status.ok);
    const base = 'http://127.0.0.1:' + status.port;
    assert.equal((await fetch(base + '/history')).status, 401); assert.equal((await fetch(base + '/device', { method: 'POST', body: '{}' })).status, 401);
    const paired = await (await fetch(base + '/pair', { method: 'POST', body: JSON.stringify({ code: status.code }) })).json();
    const headers = { Authorization: 'Bearer ' + paired.token, 'Content-Type': 'application/json' };
    assert.equal((await (await fetch(base + '/history?q=sample', { headers })).json()).items.length, 1);
    assert.equal((await (await fetch(base + '/service?id=vercel', { headers })).json()).items[0].title, 'Nook sample');
    assert.equal((await fetch(base + '/device', { method: 'POST', headers, body: JSON.stringify({ id: 'sample-device', token: 'ab'.repeat(32) }) })).status, 200); assert.equal(push.snapshot().devices, 1);
    await run('window.nook.togglePet()'); await delay(250);
    const pet = BrowserWindow.getAllWindows().find(window => window.webContents.getURL().endsWith('pet.html')); assert.ok(pet); const home = pet.getBounds();
    waiting.push(await approval('queue-one')); waiting.push(await approval('queue-two')); await delay(700); assert.equal(pet.isVisible(), false);
    await run('window.nook.decide("queue-one", "deny", {})'); await delay(150); assert.equal(pet.isVisible(), false);
    await run('window.nook.decide("queue-two", "deny", {})'); await delay(700); assert.ok(pet.isVisible()); assert.ok(Math.abs(pet.getBounds().x - home.x) < 2); assert.ok(Math.abs(pet.getBounds().y - home.y) < 2);
    const abandoned = await approval('queue-disconnected'); waiting.push(abandoned); await delay(500); abandoned.destroy(); await delay(700); assert.ok(pet.isVisible());
    const state = await (await fetch(base + '/state', { headers })).json(); assert.equal(state.pending, null);
    await run('window.nook.saveCompanion({outfit:"raincoat",seasonal:false})'); await delay(200);
    assert.equal(await pet.webContents.executeJavaScript('document.querySelector("canvas").dataset.outfit'), 'raincoat');
    await run('window.nook.saveRecapPng()'); assert.deepEqual(nativeImage.createFromPath(path.join(output, 'recap.png')).getSize(), { width: 1080, height: 1920 });
    await run('showPage("workspace"); document.querySelector("main").scrollTop=0'); await delay(100);
    fs.writeFileSync(path.join(output, 'workspace.png'), (await settings.webContents.capturePage()).toPNG());
    await run('showPage("companion")'); await delay(100); fs.writeFileSync(path.join(output, 'wardrobe.png'), (await settings.webContents.capturePage()).toPNG());
    await run('window.nook.phone("stop")'); assert.equal(push.snapshot().devices, 0);
    assert.deepEqual(errors, []);
    fs.writeFileSync(path.join(output, 'result.json'), JSON.stringify({ ok: true, errors, archiveSearch: true, serviceConfirmation: true, queueTravel: true, disconnectedRequest: true, nativeDeviceRevocation: true, pngExport: true }, null, 2));
  } catch (error) { fs.writeFileSync(path.join(output, 'result.json'), JSON.stringify({ ok: false, error: error.stack, errors }, null, 2)); }
  finally { for (const socket of waiting) socket.destroy(); app.quit(); }
});
