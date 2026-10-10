// Check the actual GitHub update feed as an older install. Never install or restart.
const { app } = require("electron");
const path = require("path"),
  fs = require("fs"),
  assert = require("assert/strict");
const root = path.resolve(__dirname, "..");
const data = path.join(root, "dist", "live-update-" + Date.now());
fs.mkdirSync(data, { recursive: true });
app.setName("Nook update verification");
app.setPath("userData", data);
process.env.LOCALAPPDATA = path.join(data, "cache");
app.getVersion = () => "0.1.0";
const { NsisUpdater } = require("electron-updater");
const updater = new NsisUpdater();
updater.forceDevUpdateConfig = true;
updater.updateConfigPath = path.join(
  root,
  "dist",
  "win-unpacked",
  "resources",
  "app-update.yml",
);
const { createUpdateController } = require("../lib/updates");
const controller = createUpdateController({
  app: {
    isPackaged: true,
    getVersion: app.getVersion,
    getPath: (name) => app.getPath(name),
  },
  updater,
  schedule: false,
});
app.whenReady().then(async () => {
  try {
    const available = await controller.check();
    assert.equal(available.phase, "available", available.message);
    assert.equal(available.version, require("../package.json").version);
    if (process.argv.includes("--download")) {
      const downloaded = await controller.download();
      assert.equal(downloaded.phase, "ready", downloaded.message);
    }
    assert.equal(updater.autoInstallOnAppQuit, false);
    fs.writeFileSync(
      path.join(root, "dist", "live-update-result.json"),
      JSON.stringify({ ok: true, ...controller.snapshot() }, null, 2),
    );
  } catch (error) {
    fs.writeFileSync(
      path.join(root, "dist", "live-update-result.json"),
      JSON.stringify({ ok: false, error: error.stack }, null, 2),
    );
    process.exitCode = 1;
  }
  controller.stop();
  app.quit();
});
