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
let updateError = "";
updater.on("error", (error) => {
  updateError = error.stack || error.message;
});
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
  getToken: () =>
    process.env.NOOK_UPDATE_TEST_TOKEN ||
    require("child_process")
      .execFileSync("gh", ["auth", "token"], {
        encoding: "utf8",
        windowsHide: true,
      })
      .trim(),
});
app.whenReady().then(async () => {
  try {
    const available = await controller.check();
    assert.equal(
      available.phase,
      "available",
      updateError || available.message,
    );
    const expected =
      process.argv.find((arg) => arg.startsWith("--expect="))?.slice(9) ||
      require("../package.json").version;
    assert.equal(available.version, expected);
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
