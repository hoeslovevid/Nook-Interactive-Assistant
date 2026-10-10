const test = require("node:test"),
  assert = require("node:assert/strict"),
  { EventEmitter } = require("node:events");
const fs = require("node:fs"),
  os = require("node:os"),
  path = require("node:path");
const { createUpdateController } = require("../lib/updates");
function fixture(options = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "nook-update-test-"));
  const updater = new EventEmitter();
  let installs = 0,
    checks = 0,
    downloads = 0;
  updater.checkForUpdates = async () => {
    checks++;
    updater.emit("update-available", { version: "0.3.0" });
  };
  updater.downloadUpdate = async () => {
    downloads++;
    updater.emit("download-progress", { percent: 52 });
    updater.emit("update-downloaded", { version: "0.3.0" });
  };
  updater.quitAndInstall = () => {
    installs++;
  };
  const app = {
    isPackaged: options.packaged !== false,
    getVersion: () => "0.2.0",
    getPath: () => dir,
  };
  const controller = createUpdateController({
    app,
    updater,
    platform: "win32",
    schedule: false,
    ...options,
  });
  return {
    controller,
    updater,
    dir,
    counts: () => ({ installs, checks, downloads }),
    close() {
      controller.stop();
      assert.equal(path.dirname(path.resolve(dir)), path.resolve(os.tmpdir()));
      fs.rmSync(dir, { recursive: true, force: true });
    },
  };
}
test("updates check automatically but only download and restart on explicit actions", async () => {
  const f = fixture();
  try {
    assert.equal(f.updater.autoDownload, false);
    assert.equal(f.updater.autoInstallOnAppQuit, false);
    assert.equal((await f.controller.install()).ok, false);
    await f.controller.check();
    assert.equal(f.controller.snapshot().phase, "available");
    assert.equal(f.counts().downloads, 0);
    await f.controller.download();
    assert.equal(f.controller.snapshot().phase, "ready");
    assert.equal(f.counts().installs, 0);
    await f.controller.check();
    assert.equal(f.controller.snapshot().phase, "ready");
    assert.equal(f.counts().checks, 1);
    await f.controller.install();
    assert.equal(f.counts().installs, 1);
  } finally {
    f.close();
  }
});
test("restart can be cancelled while an agent is active; errors offer a retry", async () => {
  const f = fixture({ confirmRestart: async () => false });
  try {
    await f.controller.check();
    await f.controller.download();
    assert.equal((await f.controller.install()).cancelled, true);
    assert.equal(f.counts().installs, 0);
    f.updater.emit("error", new Error("sensitive internal failure"));
    assert.equal(f.controller.snapshot().phase, "error");
    assert.ok(!f.controller.snapshot().message.includes("sensitive"));
    await f.controller.check();
    assert.equal(f.controller.snapshot().phase, "available");
  } finally {
    f.close();
  }
});
test("source builds never contact the update server; automatic preference persists", async () => {
  const f = fixture({ packaged: false });
  try {
    assert.equal((await f.controller.check()).phase, "unsupported");
    assert.equal(f.counts().checks, 0);
  } finally {
    f.close();
  }
  const g = fixture();
  try {
    g.controller.setAutomatic(false);
    assert.equal(
      JSON.parse(fs.readFileSync(path.join(g.dir, "updates.json"))).automatic,
      false,
    );
    assert.equal(g.controller.snapshot().automatic, false);
  } finally {
    g.close();
  }
});
