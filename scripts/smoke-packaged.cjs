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
    const timeout = setTimeout(() => { child.kill(); reject(new Error('Packaged smoke test timed out')); }, 45000);
    child.on('close', code => { clearTimeout(timeout); resolve({ code, stdout, stderr }); });
    child.stdin.end(input);
  });
}

(async () => {
  assert.ok(fs.existsSync(exe), 'Build the unpacked app first');
  for (const file of ['hooks/nook-hook.cmd', 'hooks/nook-hook.js', 'lib/windows-media.ps1', 'lib/windows-speech.ps1', 'phone/phone.html', 'assets/icon.png', 'assets/icon.svg', 'assets/logo.svg', 'assets/tray.png', 'assets/tray@2x.png', 'assets/tray@3x.png', 'assets/favicon.ico', 'assets/apple-touch-icon.png']) {
    assert.ok(fs.existsSync(path.join(appDir, file)), `Missing runtime resource: ${file}`);
  }
  for(const file of ['studio-ui.js','studio.css','island.css','lib/studio.js','lib/studio-main.js','lib/studio-store.js','lib/wake-listener.js','lib/windows-wake.ps1','lib/windows-foreground.ps1','lib/foreground.js','lib/spotify.js','lib/phone-certificate.js'])assert.ok(fs.existsSync(path.join(appDir,file)),'Missing studio resource: '+file);
  for(const file of ['controls-ui.js','controls.css','workspace-next-ui.js','workspace-next.css','voice-workspace-ui.js','notch-next-ui.js','flow-pill.html','flow-pill.css','flow-pill.js','lib/flow-main.js','lib/voice-workspace.js','lib/offline-speech.js','lib/windows-flow.ps1','lib/offline-extract.ps1'])assert.ok(fs.existsSync(path.join(appDir,file)),'Missing voice resource: '+file);
  for(const file of ['library-ui.js','library.css','recovery-chat-ui.js','lib/library-data.js','lib/library-main.js','lib/document-reader.js','lib/document-worker.js','lib/windows-library.ps1','node_modules/pdfjs-dist/legacy/build/pdf.mjs','node_modules/pdfjs-dist/standard_fonts/LiberationSans-Regular.ttf','node_modules/pdfjs-dist/cmaps/78-EUC-H.bcmap','node_modules/fflate/package.json','node_modules/ignore/package.json'])assert.ok(fs.existsSync(path.join(appDir,file)),'Missing library resource: '+file);
  for(const file of ['ios-notch.css','assistant-ui.js','connected-phone-ui.js','companion-scenes-ui.js','voice-advanced-ui.js','lib/conversation-assistant.js','lib/phone-relay.js','lib/native-speech.js','lib/native-speech-assets.json','lib/native-speech-NOTICE.md','lib/speaker-transcript.js','lib/voice-statistics.js','node_modules/bonjour-service/package.json'])assert.ok(fs.existsSync(path.join(appDir,file)),'Missing modern companion resource: '+file);
  for(const file of ['voice-setup-ui.js','meeting-review-ui.js','preview-editor-ui.js','next-ui.js','context-review-ui.js','readiness-ui.js','polish-ui.js','polish.css','wake-capture.html','wake-capture.js','lib/local-wake.js','lib/notch-interaction.js','lib/model-routing.js','lib/meeting-tools.js','lib/notch-layout.js'])assert.ok(fs.existsSync(path.join(appDir,file)),'Missing refinement resource: '+file);
  for(const file of ['local-ai-ui.js','local-ai.css','lib/local-ai.js','lib/local-ai-assets.json','lib/local-ai-runtime-LICENSE.txt','lib/local-ai-model-LICENSE.txt','lib/local-ai-NOTICE.md','lib/pet-performance.js','pet-playground-ui.js','pet-playground.css'])assert.ok(fs.existsSync(path.join(appDir,file)),'Missing local AI resource: '+file);
  for(const file of ['extensions-ui.js','extensions.css','lib/expansion-main.js','lib/personal-tools.js','lib/portfolio.js','lib/cloud-voice.js','lib/clipboard-privacy.js','lib/frame-clock.js','lib/windows-clipboard.ps1','lib/windows-apps.ps1','lib/windows-audio-playback.ps1'])assert.ok(fs.existsSync(path.join(appDir,file)),'Missing expansion resource: '+file);
  for(const file of ['hub-ui.js','hub.css','pet-layers-ui.js','lib/hub-main.js','lib/hub-store.js','lib/file-shelf.js','lib/unified-search.js'])assert.ok(fs.existsSync(path.join(appDir,file)),'Missing project tools resource: '+file);
  for(const file of ['refined-ui.js','refined.css','lib/refined-main.js','lib/memory-center.js','lib/smart-models.js','lib/activity-queue.js','lib/pet-packs.js','lib/portfolio-networks.js','lib/assistant-stream.js','lib/responsiveness.js'])assert.ok(fs.existsSync(path.join(appDir,file)),'Missing personal workspace resource: '+file);
  assert.ok(!fs.existsSync(path.join(appDir, 'test')), 'Tests should not ship');
  for (const file of ['experience.css','experience-settings-ui.js','experience-notch-ui.js','model-setup-ui.js','notch-preview-ui.js','command-palette-ui.js','lib/experience-store.js','lib/chat-session.js','lib/lifelike.js','lib/speech-output.js','lib/windows-voice-output.ps1','notch-modern.css', 'app-modern.css', 'light-theme.css', 'app-modern.js', 'lib/appearance.js', 'lib/ui-icons.js', 'lib/workbench.js', 'lib/chat-transport.js', 'lib/attachments.js', 'lib/model-discovery.js', 'lib/provider-guides.js', 'lib/chat-memory.js', 'lib/history-tail.js']) assert.ok(fs.existsSync(path.join(appDir, file)), `Missing modern UI resource: ${file}`);
  assert.ok(!fs.existsSync(path.join(appDir, 'assets/previews')), 'Previews should not ship');
  for(const file of ['everyday-ui.js','everyday.css','personality-ui.js','lib/everyday.js','lib/everyday-store.js','lib/attachment-tray.js','lib/fullscreen.js','lib/windows-fullscreen.ps1'])assert.ok(fs.existsSync(path.join(appDir,file)),'Missing everyday resource: '+file);
  for (const file of ['usage-ui.js','voice-language-ui.js','custom-agent-ui.js','companion-extras.css','hooks/nook-custom-hook.js','lib/custom-agents.js','lib/handoff-policy.js','rich-chat.css','service-cards.css','sound-settings.css','localization.css','lib/rich-markdown.js','lib/chat-handoff.js','lib/locale.js','lib/locale-catalog.js','lib/Coucou-Translation-LICENSE.txt','lib/service-cards.js','lib/sound-player.js','lib/sound-settings.js','lib/credential-store.js','lib/windows-credentials.ps1','lib/windows-terminal-focus.ps1','lib/windows-process-chain.ps1','lib/terminal-focus.js','assets/terminal-helper.vsix']) assert.ok(fs.existsSync(path.join(appDir,file)), 'Missing feature resource: '+file);
  fs.mkdirSync(data, { recursive: true });
  fs.writeFileSync(path.join(data,'document-smoke.pdf'),require('../test/fixtures/documents.cjs').pdf('Packaged PDF source references'));
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
    require('selfsigned');require('qrcode');require('./main.js');
    setTimeout(async () => {
      const windows = BrowserWindow.getAllWindows();
      const pages = await Promise.all(windows.map(window => window.webContents.executeJavaScript('({title: document.title, ready: document.readyState, text: document.body.innerText.length, brandCount: document.querySelectorAll(".brand-logo").length, images: [...document.querySelectorAll(".brand-logo")].every(image => image.complete && image.naturalWidth > 0)})').catch(error => { errors.push(error.message); return {}; })));
      const media = await require('./lib/native').media();
      let document;try{document=await require('./lib/document-reader').readDocument(require('path').join(data,'document-smoke.pdf'));}catch(error){errors.push(error.message);}
      fs.writeFileSync(process.env.NOOK_SMOKE_RESULT, JSON.stringify({windows: windows.length, pages, errors, media, document}));
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
    assert.ok(result.document.pages[0].text.includes('Packaged PDF source references'),'Packaged PDF worker and local fonts should work');
    console.log('Packaged startup, PDF worker, local fonts, pages, resources, and native media passed');
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
