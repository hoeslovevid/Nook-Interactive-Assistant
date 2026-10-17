// Record the real UI with local sample data. No credentials, hooks, or remote services are used.
const { app, BrowserWindow } = require("electron");
const net = require("node:net"), assert = require("node:assert/strict");
const errors = [];
const path = require("path"),
  fs = require("fs");
const root = path.resolve(__dirname, ".."),
  output = path.join(root, "dist", "preview-frames");
const data = path.join(root, "dist", "preview-data-" + Date.now());
if (!output.startsWith(root + path.sep))
  throw new Error("Preview frames must remain in this workspace");
const customOnly = process.argv.includes('--custom-only');
fs.rmSync(customOnly ? path.join(output,'custom-agents') : output, { recursive: true, force: true });
fs.mkdirSync(data, { recursive: true });
fs.mkdirSync(output, { recursive: true });
fs.writeFileSync(
  path.join(data, "prefs.json"),
  JSON.stringify({ muted: true }),
);
app.setName("Nook preview recorder");
app.setPath("userData", data);
require("os").homedir = () => data;
const pipe = '\\\\.\\pipe\\nook-preview-' + process.pid;
const relayModule = require('../lib/relay'), createRelay = relayModule.createRelay;
relayModule.createRelay = (_pipe, options) => createRelay(pipe, options);
const credentials = require('../lib/credential-store'), realCredentials = credentials.createCredentialStore;
const memoryKeys = {};
credentials.createCredentialStore = options => realCredentials({ ...options, adapter: {
  read: async targets => Object.fromEntries(targets.filter(target => Object.hasOwn(memoryKeys, target)).map(target => [target, memoryKeys[target]])),
  write: async (target, value) => { memoryKeys[target] = value; }, delete: async target => { delete memoryKeys[target]; }
} });
const native = require('../lib/native'), realScript = native.runScript;
native.runScript = (name, args, ...rest) => name === 'windows-speech.ps1' && args.includes('languages') ? Promise.resolve({ ok:true, languages:[{id:'en-US',name:'English (United States)'},{id:'fr-FR',name:'French'}] }) : realScript(name,args,...rest);
// Recording uses simulated providers, and never sends account data over the network.
global.fetch = async () => new Response('{}', { status: 503 });
require('../lib/chat-transport').completeChat = async (_provider, _key, _history, _options, onDelta) => {
  const answer = '## A clearer greeting\n\n**Small change, friendly result.**\n\n- Keep the message concise.\n- Welcome people to their workspace.\n\n~~~js\nconst greeting = "Welcome to Nook";\n~~~\n\n> Ready when you are.';
  for (let length=20; length < answer.length + 20; length+=20) { onDelta(answer.slice(0,length)); await new Promise(resolve=>setTimeout(resolve,90)); }
  return answer;
};
app.on('web-contents-created', (_event, contents) => contents.on('console-message', (_event, level, message) => { if (level >= 3) errors.push(message); }));
const watchdog = setTimeout(() => { fs.writeFileSync(path.join(output,'done.json'),JSON.stringify({ok:false,error:'Preview capture timed out',errors})); app.exit(1); },300000);
require(path.join(root, "main.js"));
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function record(window, name, count) {
  const dir = path.join(output, name);
  fs.mkdirSync(dir, { recursive: true });
  let start = fs
    .readdirSync(dir)
    .filter((name) => name.endsWith(".png")).length;
  for (let i = 0; i < count; i++) {
    fs.writeFileSync(
      path.join(dir, String(start + i).padStart(4, "0") + ".png"),
      (await window.webContents.capturePage()).toPNG(),
    );
    await delay(90);
  }
}
app.whenReady().then(async () => {
  try {
    await delay(1800);
    const windows = BrowserWindow.getAllWindows();
    const settings = windows.find((w) =>
      w.webContents.getURL().endsWith("settings.html"),
    );
    const notch = windows.find((w) =>
      w.webContents.getURL().endsWith("index.html"),
    );
    settings.show();settings.focus();
    const run = code => settings.webContents.executeJavaScript(code);
    const notchRun = code => notch.webContents.executeJavaScript(code);
    await run("window.nook.refined('preferences',{advanced:true})");
    if (customOnly) await run("window.NookTour.finish()");
    if (!customOnly) {
    await settings.webContents.executeJavaScript("window.NookTour.start()");
    await delay(250);
    await record(settings, "app-tour", 12);
    for (let i = 1; i < 7; i++) {
      await settings.webContents.executeJavaScript(
        'document.getElementById("tour-next").click()',
      );
      await delay(180);
      await record(settings, "app-tour", 9);
    }
    await settings.webContents.executeJavaScript("window.NookTour.finish();");
    await delay(200);
    await settings.webContents.executeJavaScript('showPage("look");');
    await delay(250);
    for (const outfit of ["cap", "glasses", "headphones", "crown", "raincoat", "sunvisor", "wizard", "festive"]) {
      await settings.webContents.executeJavaScript(
        `{ const tile=document.querySelector('#wardrobe .outfit-option[data-outfit="${outfit}"]'); tile.click(); tile.scrollIntoView({block:'center'}); }`,
      );
      await delay(150);
      await record(settings, "app-tour", 10);
      await record(settings, "wardrobe", 12);
    }
    await settings.webContents.executeJavaScript("window.nook.setDemo(true)");
    await notch.webContents.executeJavaScript("window.nook.tourStep(1)");
    await delay(400);
    for (const [mood, title] of [
      ["reading", "Reading the project"],
      ["coding", "Editing the greeting"],
      ["running", "Checking the tests"],
      ["happy", "All checks passed"],
    ]) {
      await notch.webContents.executeJavaScript(
        `state.demoMood=${JSON.stringify(mood)}; state.status=${JSON.stringify(title)}; paint();`,
      );
      await delay(120);
      await record(notch, "notch", 16);
    }
    await settings.webContents.executeJavaScript("window.nook.tourStep(2)");
    await delay(250);
    await record(notch, "notch", 18);
    await record(notch, 'approvals', 15);
    await settings.webContents.executeJavaScript('window.nook.tourStep(3)');
    await delay(250);
    await record(notch, 'approvals', 15);
    await notch.webContents.executeJavaScript('document.querySelector("#questions input").click()');
    await record(notch, 'approvals', 12);
    await settings.webContents.executeJavaScript('window.nook.tourStep(1)');
    await delay(300);
    const sampleSteps = [];
    for (const [task, mood, title] of [['Read', 'reading', 'Reading the greeting'], ['Edit', 'coding', 'Improving the greeting'], ['Bash', 'running', 'Checking the result']]) {
      sampleSteps.push({task, title, time: Date.now()});
      await notch.webContents.executeJavaScript(`state.demoMood=${JSON.stringify(mood)}; Object.assign(state.sessions[0], {task:${JSON.stringify(task)},steps:${JSON.stringify(sampleSteps)}}); showDiff(state.sessions[0]); paint();`);
      await delay(200); await record(notch, 'workbench', 18);
    }
    await notch.webContents.executeJavaScript('state.demoMood="happy"; state.sessions[0].finished=true; state.sessions[0].task="Done"; paint();');
    await record(notch, 'workbench', 14);
    await settings.webContents.executeJavaScript('window.nook.tourStep(4)');
    await delay(300);
    await notch.webContents.executeJavaScript('state.messages=[{role:"user",provider:"chatgpt",content:"Can you explain this change?"},{role:"assistant",provider:"chatgpt",content:""}]; state.chatBusyProviders=["chatgpt"]; paint();');
    await record(notch, 'chat', 14);
    const reply = 'The greeting now welcomes people to Nook. The change is small, and the tests pass. What would you like to improve next?';
    for (let length = 15; length < reply.length + 15; length += 15) {
      await notch.webContents.executeJavaScript(`state.messages[1].content=${JSON.stringify(reply.slice(0, length))}; paint();`);
      await record(notch, 'chat', 3);
    }
    await notch.webContents.executeJavaScript('state.chatBusyProviders=[]; paint();'); await record(notch, 'chat', 14);
    await settings.webContents.executeJavaScript("window.nook.setDemo(false)");
    for (const page of ['look', 'keys', 'shortcuts', 'workspace']) {
      await settings.webContents.executeJavaScript(`showPage(${JSON.stringify(page)}); document.querySelector("main").scrollTop=0;`); await delay(250); await record(settings, 'app-settings', 15);
    }
    await run('window.NookTour.finish(); window.nook.savePrefs({showClaudeUsage:true})');
    await notchRun('pinned=true; held=true; expanded=true; showCard("session"); paint()');
    for (const theme of ['black','pearl','sand','mint','midnight']) {
      await run(`showPage("look"); document.querySelector("main").scrollTop=0; document.querySelector('#app-theme').value=${JSON.stringify(theme)}; document.querySelector('#app-theme').dispatchEvent(new Event('input',{bubbles:true})); document.querySelector('#app-theme').dispatchEvent(new Event('change',{bubbles:true})); document.querySelector('.appearance-options').scrollIntoView({block:'end'});`);
      await delay(350); await record(settings,'themes',12);
    }
    await run('document.querySelector("#app-theme").value="black"; document.querySelector("#app-theme").dispatchEvent(new Event("input",{bubbles:true})); document.querySelector("#app-theme").dispatchEvent(new Event("change",{bubbles:true}))'); await delay(250);
    async function usage(five, week) {
      return new Promise((resolve,reject) => { const socket=net.connect(pipe); socket.on('error',reject); socket.on('connect',()=>socket.write(JSON.stringify({id:'preview-usage-'+five,agent:'claude',statusline:true,payload:{rate_limits:{five_hour:{utilization:five,resets_at:new Date(Date.now()+3600000).toISOString()},weekly:{utilization:week,resets_at:new Date(Date.now()+86400000).toISOString()}}}})+'\n')); socket.on('data',()=>{socket.destroy();resolve();}); });
    }
    for (const [five,week] of [[25,42],[68,65],[92,86]]) {
      await usage(five,week); await delay(100); await notchRun('NookUsage.open("claude")'); await delay(350); await record(notch,'usage-dashboard',14);
    }
    await notchRun('document.querySelector(".usage-dialog").close(); provider="ollama"; providerSelect.value="ollama"; showCard("chat"); expanded=true; paint()');
    const chatting = notchRun('window.nook.sendChat("ollama","Help me improve this greeting.")');
    await record(notch,'chat-handoff',24); await chatting; await record(notch,'chat-handoff',10);
    await notchRun('document.querySelector("#chat-handoff").click()'); await delay(150);
    await notchRun('document.querySelector("#handoff-provider").value="lmstudio"'); await record(notch,'chat-handoff',16);
    await notchRun('document.querySelector("#handoff-confirm").click()'); await delay(150); await record(notch,'chat-handoff',14);
    const services = [
      {id:'github',title:'GitHub',detail:'3 open · 1 reviews'}, {id:'vercel',title:'Vercel',detail:'Nook · READY'},
      {id:'stripe',title:'Stripe',detail:'1,255.42 EUR'}, {id:'resend',title:'Resend',detail:'Welcome email · delivered'},
      {id:'notion',title:'Notion',detail:'3 recent pages'}, {id:'n8n',title:'n8n',detail:'2 active workflows'}, {id:'cal',title:'Cal.com',detail:'2 upcoming bookings'}
    ];
    await notchRun(`showCard('session'); state.usage=[]; state.services=${JSON.stringify(services)}; paint();`); await delay(300); await record(notch,'service-companions',18);
    await notchRun('state.services.find(item=>item.id==="vercel").detail="Nook · failed"; state.services.find(item=>item.id==="github").detail="3 open · 2 reviews · 1 failing"; paint()'); await record(notch,'service-companions',18);
    await notchRun(`state.services=${JSON.stringify(services)};paint()`); await record(notch,'service-companions',6); await notchRun('document.querySelector(".details").scrollTop=9999'); await record(notch,'service-companions',12);
    await run('showPage("companion"); document.querySelector("#sound-events").closest(".settings-group").scrollIntoView({block:"start"})');
    for (const volume of [20,55,80]) { await run(`window.nook.sounds('save',{volume:${volume}})`); await delay(120); await record(settings,'sound-studio',12); }
    }
    await run('showPage("agents"); const form=document.querySelector("#custom-agent-form"); form.elements.name.value="My coding assistant"; form.elements.id.value="my-coding-agent"; form.elements.color.value="#98baff";form.scrollIntoView({block:"start"})'); await delay(200); await run('document.querySelector("#custom-agent-form").closest(".settings-group").scrollIntoView({block:"start"})'); await delay(100); await record(settings,'custom-agents',14);
    await run('document.querySelector("#custom-agent-next").click();document.querySelector("#custom-agent-form").scrollIntoView({block:"start"})'); await delay(200); await run('document.querySelector("#custom-agent-form").scrollIntoView({block:"start"});document.querySelector("main").scrollTop-=24'); await delay(100); await record(settings,'custom-agents',14);
    await run('document.querySelector("#custom-agent-test-step").click();document.querySelector("#custom-agent-test").click();document.querySelector("#custom-agent-form").scrollIntoView({block:"start"})'); await delay(200); await run('document.querySelector("#custom-agent-form").closest(".settings-group").scrollIntoView({block:"start"})'); await delay(100); await record(settings,'custom-agents',16);
    await run('document.querySelector("#custom-agent-form").requestSubmit()'); await delay(200); await run('document.querySelector("#custom-agent-form").closest(".settings-group").scrollIntoView({block:"start"})'); await delay(100); await record(settings,'custom-agents',12);
    assert.ok(await run('document.querySelector("#custom-agent-list").textContent.includes("My coding assistant")'), 'The recorded custom agent must be saved');
    assert.deepEqual(errors,[],'Preview pages must have no renderer errors');
    fs.writeFileSync(path.join(output,'done.json'), JSON.stringify({ok:true,errors,version:require('../package.json').version}));
  } catch (error) {
    fs.writeFileSync(
      path.join(output, "done.json"),
      JSON.stringify({ ok: false, error: error.stack, errors }),
    );
  }
  clearTimeout(watchdog); app.quit();
});
