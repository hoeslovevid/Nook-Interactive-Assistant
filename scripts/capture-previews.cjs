// Record the real UI with local sample data. No credentials, hooks, or remote services are used.
const { app, BrowserWindow } = require("electron");
const path = require("path"),
  fs = require("fs");
const root = path.resolve(__dirname, ".."),
  output = path.join(root, "dist", "preview-frames");
const data = path.join(root, "dist", "preview-data-" + Date.now());
if (!output.startsWith(root + path.sep))
  throw new Error("Preview frames must remain in this workspace");
fs.rmSync(output, { recursive: true, force: true });
fs.mkdirSync(data, { recursive: true });
fs.mkdirSync(output, { recursive: true });
fs.writeFileSync(
  path.join(data, "prefs.json"),
  JSON.stringify({ muted: true }),
);
app.setName("Nook preview recorder");
app.setPath("userData", data);
require("os").homedir = () => data;
const relayModule = require('../lib/relay'), createRelay = relayModule.createRelay;
relayModule.createRelay = (pipe, options) => createRelay(pipe + '-preview-' + process.pid, options);
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
    await settings.webContents.executeJavaScript('showPage("companion");');
    await delay(250);
    for (const outfit of ["cap", "glasses", "headphones", "crown", "raincoat"]) {
      await settings.webContents.executeJavaScript(
        `document.querySelector('.outfit-option[data-outfit="${outfit}"]').click()`,
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
      await settings.webContents.executeJavaScript(`showPage(${JSON.stringify(page)});`); await delay(250); await record(settings, 'app-settings', 15);
    }
    fs.writeFileSync(
      path.join(output, "done.json"),
      JSON.stringify({ ok: true }),
    );
  } catch (error) {
    fs.writeFileSync(
      path.join(output, "done.json"),
      JSON.stringify({ ok: false, error: error.stack }),
    );
  }
  app.quit();
});
