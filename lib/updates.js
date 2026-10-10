const fs = require("fs");
const path = require("path");
function createUpdateController({
  app,
  updater,
  onChange = () => {},
  confirmRestart = async () => true,
  platform = process.platform,
  schedule = true,
  getToken = () => "",
}) {
  const supported = app.isPackaged && platform === "win32";
  const file = path.join(app.getPath("userData"), "updates.json");
  let automatic = true;
  try {
    automatic = JSON.parse(fs.readFileSync(file, "utf8")).automatic !== false;
  } catch (_) {}
  const accessSaved = Boolean(getToken());
  let state = {
    phase: supported
      ? accessSaved
        ? "idle"
        : "access-required"
      : "unsupported",
    currentVersion: app.isPackaged
      ? app.getVersion()
      : require("../package.json").version,
    version: "",
    progress: 0,
    checkedAt: 0,
    automatic,
    accessSaved,
    message: supported
      ? accessSaved
        ? "Nook checks GitHub for stable releases."
        : "Save a GitHub token with repository access to check for updates."
      : "Install a Windows release to enable in-app updates.",
  };
  let firstTimer,
    interval,
    lastProgress = 0,
    installing = false;
  const listeners = [];
  const snapshot = () => ({ ...state });
  function patch(value) {
    state = { ...state, ...value };
    onChange(snapshot());
  }
  function fail() {
    patch({
      phase: "error",
      message:
        "Could not update Nook. Check your connection and GitHub token access, then try again. You can also download from GitHub while signed in.",
    });
  }
  if (supported) {
    updater.autoDownload = false;
    updater.autoInstallOnAppQuit = false;
    updater.allowPrerelease = false;
    updater.allowDowngrade = false;
    updater.logger = { info() {}, warn() {}, error() {}, debug() {} };
    for (const [event, handler] of [
      [
        "checking-for-update",
        () => patch({ phase: "checking", message: "Checking GitHub…" }),
      ],
      [
        "update-available",
        (info) =>
          patch({
            phase: "available",
            version: String(info.version),
            progress: 0,
            checkedAt: Date.now(),
            message: `Nook ${info.version} is available.`,
          }),
      ],
      [
        "update-not-available",
        () =>
          patch({
            phase: "current",
            version: "",
            checkedAt: Date.now(),
            message: "You have the latest version of Nook.",
          }),
      ],
      [
        "download-progress",
        (progress) => {
          if (Date.now() - lastProgress > 250 || progress.percent >= 100) {
            lastProgress = Date.now();
            patch({
              phase: "downloading",
              progress: Math.max(
                0,
                Math.min(100, Math.round(progress.percent)),
              ),
              message: "Downloading the update…",
            });
          }
        },
      ],
      [
        "update-downloaded",
        (info) =>
          patch({
            phase: "ready",
            version: String(info.version),
            progress: 100,
            message:
              "Your update is ready. Restart Nook when you are ready to install.",
          }),
      ],
      ["error", fail],
    ]) {
      updater.on(event, handler);
      listeners.push([event, handler]);
    }
  }
  async function check() {
    if (!supported) return { ok: false, ...snapshot() };
    if (["checking", "downloading", "ready"].includes(state.phase))
      return { ok: true, ...snapshot() };
    const token = getToken();
    if (!token) {
      patch({
        phase: "access-required",
        accessSaved: false,
        message:
          "Save a GitHub token with repository access to check for updates.",
      });
      return { ok: false, ...snapshot() };
    }
    // Use only the explicitly saved token, never an ambient publishing token.
    updater.setFeedURL({
      provider: "github",
      owner: "hoeslovevid",
      repo: "Nook-Interactive-Assistant",
      private: false,
      token,
      releaseType: "release",
    });
    patch({ phase: "checking", message: "Checking GitHub…" });
    try {
      await updater.checkForUpdates();
      return { ok: state.phase !== "error", ...snapshot() };
    } catch (_) {
      fail();
      return { ok: false, ...snapshot() };
    }
  }
  async function download() {
    if (!supported || state.phase !== "available")
      return { ok: false, ...snapshot() };
    patch({
      phase: "downloading",
      progress: 0,
      message: "Downloading the update…",
    });
    try {
      await updater.downloadUpdate();
      return { ok: state.phase === "ready", ...snapshot() };
    } catch (_) {
      fail();
      return { ok: false, ...snapshot() };
    }
  }
  async function install() {
    if (!supported || state.phase !== "ready" || installing)
      return { ok: false, ...snapshot() };
    installing = true;
    try {
      if (!(await confirmRestart()))
        return { ok: false, cancelled: true, ...snapshot() };
      updater.quitAndInstall(false, true);
      return { ok: true, ...snapshot() };
    } catch (_) {
      fail();
      return { ok: false, ...snapshot() };
    } finally {
      installing = false;
    }
  }
  function reschedule() {
    clearTimeout(firstTimer);
    clearInterval(interval);
    if (!schedule || !supported || !state.automatic || !state.accessSaved)
      return;
    firstTimer = setTimeout(check, 20000);
    firstTimer.unref?.();
    interval = setInterval(check, 6 * 60 * 60 * 1000);
    interval.unref?.();
  }
  reschedule();
  return {
    snapshot,
    check,
    download,
    install,
    refreshAccess() {
      const saved = Boolean(getToken());
      if (supported)
        updater.setFeedURL({
          provider: "github",
          owner: "hoeslovevid",
          repo: "Nook-Interactive-Assistant",
          private: false,
          token: getToken() || undefined,
          releaseType: "release",
        });
      patch({
        accessSaved: saved,
        phase: supported ? (saved ? "idle" : "access-required") : "unsupported",
        version: "",
        progress: 0,
        message: supported
          ? saved
            ? "GitHub access saved. Check for updates when ready."
            : "Save a GitHub token with repository access to check for updates."
          : "Install a Windows release to enable in-app updates.",
      });
      reschedule();
      return snapshot();
    },
    setAutomatic(value) {
      if (typeof value !== "boolean") return snapshot();
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, JSON.stringify({ automatic: value }));
      patch({ automatic: value });
      reschedule();
      return snapshot();
    },
    stop() {
      clearTimeout(firstTimer);
      clearInterval(interval);
      for (const [event, handler] of listeners)
        updater.removeListener(event, handler);
    },
  };
}
module.exports = { createUpdateController };
