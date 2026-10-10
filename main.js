const {
  app,
  desktopCapturer,
  dialog,
  clipboard,
  BrowserWindow,
  globalShortcut,
  ipcMain,
  Menu,
  nativeImage,
  safeStorage,
  screen,
  shell,
  Tray,
} = require("electron");
const { execFile, spawn } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { present, decisionOutput, describeTurn } = require("./lib/decisions");
const { buildModelsRequest, buildChatRequest, readChatReply, PROVIDERS, cleanModel, cleanLocalUrl, cleanRemoteUrl } = require("./lib/chat");
const { textDiff } = require("./lib/diff");
const {
  mergeClaudeSettings,
  mergeCursorHooks,
  mergeCodexSettings,
  mergeCopilotHooks,
  mergeMuseSettings,
  mergeGeminiSettings,
  mergeAntigravityHooks,
  mergeStatusLine,
  stripNook,
  hooksInstalled,
} = require("./lib/install-hooks");
const { createRelay } = require("./lib/relay");
const { normalizeLook, lookToCss } = require("./lib/appearance");
const {
  SERVICES,
  cleanServiceUrl,
  githubSummary,
  vercelSummary,
  stripeSummary,
  resendSummary,
  notionSummary,
  n8nSummary,
  calSummary,
} = require("./lib/services");
const { usageFromText, fromCodexAccount } = require("./lib/usage");
const { summarizeHistory, recapSvg, weekKey, mondayDue } = require("./lib/history");
const { QUERY, parseGithub, ciBadge, stateMap } = require("./lib/github");
const { pickTerminal } = require("./lib/terminal");
const { stripReasoning } = require("./lib/markdown");
const { finalFromTranscript } = require("./lib/transcript");
const { LANGUAGES, translate } = require("./lib/i18n");
const { pluginSource, ampSource, hermesManifest } = require("./lib/plugins");
const { takeSseEvents, deltaText } = require("./lib/stream");

const { installFeatures } = require("./lib/features");
const { demoState, STEPS: TOUR_STEPS } = require('./lib/demo');
const { timelineEntry } = require('./lib/session-detail');
const { windowAtPoint } = require('./lib/native');
const { createUpdateController } = require('./lib/updates');
let updateKit = null;
let demoStep = 0;
let demoAnswered = false;
let featureKit = null;
const { springProgress } = require("./lib/motion");
const GUTTER_X = 22;
const GUTTER_BOTTOM = 28;
const SIZES = {
  asleep: { width: 140, height: 4, gutterX: 0, gutterBottom: 0 },
  peek: { width: 300, height: 48, gutterX: GUTTER_X, gutterBottom: GUTTER_BOTTOM },
  open: { width: 440, height: 520, gutterX: GUTTER_X, gutterBottom: GUTTER_BOTTOM },
};
const PIPE = "\\\\.\\pipe\\nook-companion";

let win = null;
let appWin = null;
let tray = null;
let mode = "asleep";
let anim = null;
let motionReduced = false;
let boundsNow = null;
let relay = null;
const activity = [];
const sessions = new Map();
const pending = [];
const messages = [];
const chatBusyProviders = new Set();
const lookCssKeys = new Map();
let hookMessage = "";
let celebrate = 0;
let attachment = null;
let pet = null;
let petFollow = false;
let petTimer = null;
let demoOn = false;
let demoChat = [];
let servicePills = [];
let usagePills = [];
let github = null;
let githubStates = {};
let githubBadge = "";
let claudePlan = null;
let codexPlan = null;
let paused = false;
let displayName = "";
let petHome = null;
let lastTouch = Date.now();
let openWeek = false;
const PILL_CHOICES = ["gemini", "copilot", "muse", "opencode", "amp", "hermes", "claude-desktop", "github", "vercel", "stripe", "resend", "notion", "n8n", "cal"];
const colorCssKeys = new Map();
const DEFAULT_SHORTCUTS = {
  chat: "CommandOrControl+Shift+Alt+N",
  alert: "CommandOrControl+Shift+Alt+J",
  mute: "CommandOrControl+Shift+Alt+M",
  pet: "CommandOrControl+Shift+Alt+D",
  next: "CommandOrControl+Shift+Alt+Right",
  prev: "CommandOrControl+Shift+Alt+Left",
  toggle: "CommandOrControl+Shift+Alt+O",
  diff: "CommandOrControl+Shift+Alt+E",
};
const DEFAULT_COLORS = {
  claude: "#d4a574",
  cursor: "#dff25a",
  codex: "#7dcea0",
  copilot: "#8eb6ff",
  muse: "#d7a1ff",
  opencode: "#f2c14e",
  amp: "#f08a5d",
  hermes: "#9ad0ec",
  gemini: "#8ab4f8",
  antigravity: "#f6c453",
  "claude-desktop": "#e8b089",
};

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
}

app.setAppUserModelId("com.nook.companion");

let cardHeight = 360;

function windowSize(nextMode) {
  const content = { ...(SIZES[nextMode] || SIZES.asleep) };
  if (nextMode === "open") {
    content.height = cardHeight;
  }
  return {
    width: content.width + content.gutterX * 2,
    height: content.height + content.gutterBottom,
  };
}

function displayUnderCursor() {
  return screen.getDisplayNearestPoint(screen.getCursorScreenPoint());
}

function chosenDisplay() {
  const prefs = readPrefs();
  if (prefs.displayMode === "main") {
    return screen.getPrimaryDisplay();
  }
  if (prefs.displayMode === "screen") {
    const found = screen.getAllDisplays().find((item) => String(item.id) === String(prefs.displayId));
    if (found) {
      return found;
    }
  }
  return displayUnderCursor();
}

function targetBounds(nextMode) {
  const display = chosenDisplay();
  const size = windowSize(nextMode);
  return {
    x: Math.round(display.bounds.x + (display.bounds.width - size.width) / 2),
    y: display.bounds.y,
    width: size.width,
    height: size.height,
  };
}

function applyBounds(bounds) {
  if (!win || win.isDestroyed()) {
    return;
  }
  win.setBounds({
    x: Math.round(bounds.x),
    y: Math.round(bounds.y),
    width: Math.round(bounds.width),
    height: Math.round(bounds.height),
  });
  boundsNow = { ...bounds };
}

function animateTo(nextMode) {
  mode = nextMode;
  if (win && !win.isDestroyed()) {
    win.setIgnoreMouseEvents(nextMode === "asleep", { forward: true });
  }
  const from = boundsNow ?? targetBounds(nextMode);
  const to = targetBounds(nextMode);
  if (anim) {
    clearInterval(anim);
  }
  clipIsland("open");
  if (motionReduced) { anim = null; applyBounds(to); clipIsland(nextMode); return; }
  const started = Date.now();
  const duration = nextMode === "asleep" ? 280 : 460;
  anim = setInterval(() => {
    const t = Math.min(1, (Date.now() - started) / duration);
    const eased = nextMode === "asleep" ? 1 - Math.pow(1 - t, 3) : springProgress(t);
    applyBounds({
      x: from.x + (to.x - from.x) * eased,
      y: from.y,
      width: from.width + (to.width - from.width) * eased,
      height: from.height + (to.height - from.height) * eased,
    });
    if (t >= 1) {
      clearInterval(anim);
      anim = null;
      applyBounds(to);
      clipIsland(nextMode);
    }
  }, 16);
}

function clipIsland(nextMode) {
  if (!win || win.isDestroyed() || typeof win.setShape !== "function") {
    return;
  }
  const bounds = win.getBounds();
  const size = SIZES[nextMode] || SIZES.asleep;
  if (nextMode === "asleep") {
    win.setShape([{ x: 0, y: 0, width: bounds.width, height: size.height }]);
    return;
  }
  win.setShape([]);
}

function createWindow() {
  const initial = targetBounds("asleep");
  win = new BrowserWindow({
    x: initial.x,
    y: initial.y,
    width: initial.width,
    height: initial.height,
    show: false,
    frame: false,
    transparent: true,
    backgroundColor: "#00000000",
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    focusable: false,
    hasShadow: false,
    roundedCorners: false,
    thickFrame: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      backgroundThrottling: false,
    },
  });

  boundsNow = initial;
  win.setMinimumSize(80, 8);
  win.setIgnoreMouseEvents(true, { forward: true });
  win.setAlwaysOnTop(true, "screen-saver");
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  Menu.setApplicationMenu(null);

  win.once("ready-to-show", () => {
    if (!win || win.isDestroyed()) {
      return;
    }
    win.showInactive();
    clipIsland("asleep");
  });
  win.webContents.on("did-finish-load", () => {
    broadcast();
    applyLook(win);
    applyColors(win);
  });

  win.loadFile(path.join(__dirname, "index.html"));
}

function showNook() {
  if (!win || win.isDestroyed()) {
    return;
  }
  win.webContents.send("nook:welcome");
  win.showInactive();
}

function openApp() {
  if (appWin && !appWin.isDestroyed()) {
    if (appWin.isMinimized()) {
      appWin.restore();
    }
    appWin.show();
    appWin.focus();
    return;
  }
  appWin = new BrowserWindow({
    width: 960,
    height: 700,
    minWidth: 780,
    minHeight: 560,
    title: "Nook",
    backgroundColor: "#101114",
    autoHideMenuBar: true,
    center: true,
    show: true,
    icon: path.join(__dirname, "assets", "icon.png"),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      backgroundThrottling: false,
    },
  });
  appWin.once("ready-to-show", () => {
    if (appWin && !appWin.isDestroyed()) {
      appWin.show();
    }
  });
  appWin.on("closed", () => {
    appWin = null;
  });
  appWin.webContents.on("did-finish-load", () => {
    broadcast();
    applyLook(appWin);
  applyLook(pet);
    applyColors(appWin);
    if (openWeek) {
      appWin.webContents.send("nook:show-week");
      openWeek = false;
    }
  });
  appWin.loadFile(path.join(__dirname, "settings.html"));
}

function createTray() {
  const image = nativeImage
    .createFromPath(path.join(__dirname, "assets", "tray.png"))
    .resize({ width: 16, height: 16 });
  tray = new Tray(image);
  tray.setToolTip("Nook");
  refreshTray();
  tray.on("click", openApp);
}

function refreshTray() {
  if (!tray) {
    return;
  }
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: "Open Nook", click: openApp },
      { label: "Show the notch", click: showNook },
      { label: 'Check for updates', click: () => { navigateSettings('updates'); updateKit?.check(); } },
      {
        label: "Weekly recap",
        click: () => {
          openWeek = true;
          openApp();
          if (appWin && !appWin.isDestroyed() && !appWin.webContents.isLoading()) {
            appWin.webContents.send("nook:show-week");
            openWeek = false;
          }
        },
      },
      {
        label: paused ? "Resume" : "Pause",
        click: () => {
          paused = !paused;
          refreshTray();
          if (!paused) {
            refreshServices().catch(() => {});
          }
          broadcast();
        },
      },
      { type: "separator" },
      { label: "Quit Nook", click: () => app.quit() },
    ]),
  );
}

function hookCommand(args) {
  const cmd = path.join(__dirname, "hooks", "nook-hook.cmd");
  return `"${cmd}" ${args}`;
}

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (_error) {
    return null;
  }
}

function claudeSettingsPath() {
  return path.join(os.homedir(), ".claude", "settings.json");
}

function cursorHooksPath() {
  return path.join(os.homedir(), ".cursor", "hooks.json");
}

function codexHooksPath() {
  return path.join(os.homedir(), ".codex", "hooks.json");
}

function copilotHooksPath() {
  return path.join(os.homedir(), ".copilot", "hooks", "nook.json");
}

function geminiSettingsPath() {
  return path.join(os.homedir(), ".gemini", "settings.json");
}

function antigravityHooksPath() {
  return path.join(os.homedir(), ".gemini", "config", "hooks.json");
}

function statuslinePreviousPath() {
  return path.join(app.getPath("userData"), "statusline-previous.txt");
}

function museHooksPath() {
  return path.join(os.homedir(), ".muse", "hooks.json");
}

function writeJson(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  if (fs.existsSync(file)) {
    const backup = `${file}.bak-before-nook`;
    if (!fs.existsSync(backup)) {
      fs.copyFileSync(file, backup);
    }
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    fs.copyFileSync(file, `${file}.bak-nook-${stamp}`);
  }
  fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function claudeSettingsNext() {
  const base = mergeClaudeSettings(
    readJson(claudeSettingsPath()) ?? {},
    hookCommand("--agent claude"),
    hookCommand("--agent claude --wait"),
  );
  let saved = "";
  try {
    saved = fs.readFileSync(statuslinePreviousPath(), "utf8").trim();
  } catch (_error) {
    saved = "";
  }
  return mergeStatusLine(base, hookCommand("--statusline"), readPrefs().showClaudeUsage, saved);
}

function hookTargets() {
  const claude = claudeSettingsNext();
  return [
    {
      label: "Claude Code",
      file: claudeSettingsPath(),
      next: claude.settings,
      previousStatus: claude.previous,
    },
    {
      label: "Cursor",
      file: cursorHooksPath(),
      next: mergeCursorHooks(
        readJson(cursorHooksPath()) ?? {},
        hookCommand("--agent cursor"),
        hookCommand("--agent cursor --wait"),
      ),
    },
    {
      label: "Codex",
      file: codexHooksPath(),
      next: mergeCodexSettings(
        readJson(codexHooksPath()) ?? {},
        hookCommand("--agent codex"),
        hookCommand("--agent codex --wait"),
      ),
    },
    {
      label: "Copilot CLI",
      file: copilotHooksPath(),
      next: mergeCopilotHooks(
        readJson(copilotHooksPath()) ?? {},
        hookCommand("--agent copilot"),
        hookCommand("--agent copilot --wait"),
      ),
    },
    {
      label: "Muse Code",
      file: museHooksPath(),
      next: mergeMuseSettings(
        readJson(museHooksPath()) ?? {},
        hookCommand("--agent muse"),
        hookCommand("--agent muse --wait"),
      ),
    },
    {
      label: "Gemini CLI",
      file: geminiSettingsPath(),
      next: mergeGeminiSettings(readJson(geminiSettingsPath()) ?? {}, hookCommand("--agent gemini")),
    },
    {
      label: "Antigravity",
      file: antigravityHooksPath(),
      next: mergeAntigravityHooks(readJson(antigravityHooksPath()) ?? {}, hookCommand("--agent antigravity")),
    },
    {
      label: "OpenCode",
      file: path.join(os.homedir(), ".config", "opencode", "plugins", "nook.js"),
      text: pluginSource(path.join(__dirname, "hooks", "nook-hook.cmd")),
    },
    {
      label: "Amp",
      file: path.join(os.homedir(), ".config", "amp", "plugins", "nook.js"),
      text: ampSource(path.join(__dirname, "hooks", "nook-hook.cmd")),
    },
    {
      label: "Hermes",
      file: path.join(os.homedir(), ".hermes", "plugins", "nook", "plugin.json"),
      text: hermesManifest(path.join(__dirname, "hooks", "nook-hook.cmd")),
    },
  ];
}

let previewBodies = null;

function fileText(file) {
  try {
    return fs.readFileSync(file, "utf8");
  } catch (_error) {
    return "";
  }
}

function jsonReadable(text) {
  if (!String(text || "").trim()) {
    return true;
  }
  try {
    JSON.parse(text);
    return true;
  } catch (_error) {
    return false;
  }
}

function hookPlan() {
  const files = hookTargets().map((target) => {
    let before = fileText(target.file);
    if (before && !before.endsWith("\n")) {
      before = `${before}\n`;
    }
    const jsonTarget = typeof target.text !== "string";
    const readable = !jsonTarget || jsonReadable(before);
    const after =
      typeof target.text === "string"
        ? target.text.endsWith("\n")
          ? target.text
          : `${target.text}\n`
        : `${JSON.stringify(target.next, null, 2)}\n`;
    return {
      label: target.label,
      file: target.file,
      changed: readable && before !== after,
      blocked: !readable,
      diff: readable ? textDiff(before, after) : "This file could not be read, so Nook left it alone.",
      before,
    };
  });
  previewBodies = Object.fromEntries(files.map((file) => [file.file, file.before]));
  return files.map(({ before: _before, ...file }) => file);
}

function hookStatus() {
  const installed = {
    claude: hooksInstalled(readJson(claudeSettingsPath())),
    cursor: hooksInstalled(readJson(cursorHooksPath())),
    codex: hooksInstalled(readJson(codexHooksPath())),
    copilot: hooksInstalled(readJson(copilotHooksPath())),
    muse: hooksInstalled(readJson(museHooksPath())),
  };
  return { ...installed, message: hookMessage };
}

function connectedFlagPath() {
  return path.join(app.getPath("userData"), "hooks-connected.json");
}

function installHooks() {
  if (!previewBodies) {
    hookMessage = "Review the hook diff before installing.";
    broadcast();
    return hookStatus();
  }
  const targets = hookTargets();
  for (const target of targets) {
    let current = fileText(target.file);
    if (current && !current.endsWith("\n")) {
      current = `${current}\n`;
    }
    if (previewBodies[target.file] !== current) {
      hookMessage = `${target.label} changed after the review. Review it again before installing.`;
      previewBodies = null;
      broadcast();
      return hookStatus();
    }
    if (typeof target.text !== "string" && !jsonReadable(current)) {
      hookMessage = `${target.label} could not be read, so nothing was written.`;
      broadcast();
      return hookStatus();
    }
  }
  for (const target of targets) {
    if (typeof target.text === "string") {
      fs.mkdirSync(path.dirname(target.file), { recursive: true });
      if (fs.existsSync(target.file)) {
        const stamp = new Date().toISOString().replace(/[:.]/g, "-");
        fs.copyFileSync(target.file, `${target.file}.bak-nook-${stamp}`);
      }
      fs.writeFileSync(target.file, target.text, "utf8");
    } else {
      writeJson(target.file, target.next);
    }
    if (target.previousStatus) {
      fs.mkdirSync(path.dirname(statuslinePreviousPath()), { recursive: true });
      fs.writeFileSync(statuslinePreviousPath(), `${target.previousStatus}\n`, "utf8");
    }
  }
  previewBodies = null;
  fs.mkdirSync(path.dirname(connectedFlagPath()), { recursive: true });
  fs.writeFileSync(connectedFlagPath(), "{\"connected\":true}\n", "utf8");
  hookMessage =
    "Hooks installed. New sessions of Claude, Cursor, Codex, Copilot, and Muse will use them. Codex still asks you to trust hooks with /hooks. OpenCode, Amp, and Hermes files were written too. The Hermes file is a best-effort plugin because its published schema is incomplete.";
  broadcast();
  return hookStatus();
}

function uninstallHooks() {
  for (const target of hookTargets()) {
    if (!fs.existsSync(target.file)) {
      continue;
    }
    const current = fileText(target.file);
    if (typeof target.text === "string") {
      if (current.includes("nook-hook.cmd")) {
        const stamp = new Date().toISOString().replace(/[:.]/g, "-");
        fs.copyFileSync(target.file, `${target.file}.bak-nook-${stamp}`);
        fs.rmSync(target.file);
      }
      continue;
    }
    if (!jsonReadable(current)) {
      hookMessage = `${target.label} could not be read, so it was left alone.`;
      broadcast();
      return hookStatus();
    }
    const next = stripNook(JSON.parse(current || "{}"));
    writeJson(target.file, next);
  }
  hookMessage = "Nook's hooks were removed. Other hooks were left in place.";
  broadcast();
  return hookStatus();
}

function appearancePath() {
  return path.join(app.getPath("userData"), "appearance.json");
}

function readLook() {
  return normalizeLook(readJson(appearancePath()));
}

function writeLook(look) {
  const next = normalizeLook(look);
  fs.mkdirSync(path.dirname(appearancePath()), { recursive: true });
  fs.writeFileSync(appearancePath(), `${JSON.stringify(next, null, 2)}\n`, "utf8");
  return next;
}

async function applyLook(target) {
  if (!target || target.isDestroyed()) {
    return;
  }
  const previous = lookCssKeys.get(target.id);
  if (previous) {
    await target.webContents.removeInsertedCSS(previous).catch(() => {});
  }
  const key = await target.webContents.insertCSS(lookToCss(readLook()));
  lookCssKeys.set(target.id, key);
}

function applyLookEverywhere() {
  applyLook(win);
  applyLook(appWin);
  applyColors(win);
  applyColors(appWin);
}

function keysPath() {
  return path.join(app.getPath("userData"), "provider-keys.json");
}

function readKeys() {
  let raw = {};
  try {
    raw = JSON.parse(fs.readFileSync(keysPath(), "utf8"));
  } catch (_error) {
    return {};
  }
  if (!safeStorage.isEncryptionAvailable()) {
    return {};
  }
  const keys = {};
  for (const provider of [...Object.keys(PROVIDERS), ...SERVICES]) {
    if (typeof raw[provider] === "string") {
      try {
        keys[provider] = safeStorage.decryptString(Buffer.from(raw[provider], "base64"));
      } catch (_error) {
        keys[provider] = "";
      }
    }
  }
  return keys;
}

function knownSecret(provider) {
  return Boolean(PROVIDERS[provider]) || SERVICES.includes(provider);
}

function saveKey(provider, key) {
  if (!knownSecret(provider)) {
    throw new Error("Unknown key.");
  }
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error("Windows could not encrypt the key.");
  }
  const current = {};
  try {
    Object.assign(current, JSON.parse(fs.readFileSync(keysPath(), "utf8")));
  } catch (_error) {
    // A missing file just means this is the first saved key.
  }
  current[provider] = safeStorage.encryptString(key).toString("base64");
  fs.mkdirSync(path.dirname(keysPath()), { recursive: true });
  fs.writeFileSync(keysPath(), `${JSON.stringify(current)}\n`, "utf8");
}

function clearKey(provider) {
  if (!knownSecret(provider)) {
    throw new Error("Unknown key.");
  }
  const current = {};
  try {
    Object.assign(current, JSON.parse(fs.readFileSync(keysPath(), "utf8")));
  } catch (_error) {
    return;
  }
  delete current[provider];
  fs.mkdirSync(path.dirname(keysPath()), { recursive: true });
  fs.writeFileSync(keysPath(), `${JSON.stringify(current)}\n`, "utf8");
}

function modelsPath() {
  return path.join(app.getPath("userData"), "models.json");
}

function readModels() {
  const saved = readJson(modelsPath()) || {};
  const next = {};
  for (const [name, spec] of Object.entries(PROVIDERS)) {
    next[name] = cleanModel(saved[name], spec.model);
  }
  next.ollamaUrl = cleanLocalUrl(saved.ollamaUrl, PROVIDERS.ollama.url);
  next.lmstudioUrl = cleanLocalUrl(saved.lmstudioUrl, PROVIDERS.lmstudio.url);
  next.customUrl = cleanRemoteUrl(saved.customUrl, PROVIDERS.custom.url);
  return next;
}

function writeModels(patch) {
  const next = readModels();
  const source = patch && typeof patch === "object" ? patch : {};
  for (const name of Object.keys(PROVIDERS)) {
    if (typeof source[name] === "string") {
      next[name] = cleanModel(source[name], next[name]);
    }
  }
  if (typeof source.ollamaUrl === "string") {
    next.ollamaUrl = cleanLocalUrl(source.ollamaUrl, next.ollamaUrl);
  }
  if (typeof source.lmstudioUrl === "string") {
    next.lmstudioUrl = cleanLocalUrl(source.lmstudioUrl, next.lmstudioUrl);
  }
  if (typeof source.customUrl === "string") {
    next.customUrl = cleanRemoteUrl(source.customUrl, next.customUrl);
  }
  fs.mkdirSync(path.dirname(modelsPath()), { recursive: true });
  fs.writeFileSync(modelsPath(), `${JSON.stringify(next, null, 2)}\n`, "utf8");
  return next;
}

function keyStatus() {
  const keys = readKeys();
  const status = {};
  for (const [name, spec] of Object.entries(PROVIDERS)) {
    status[name] = spec.local || spec.auth === "optional" || spec.auth === "none" ? true : Boolean(keys[name]);
  }
  return status;
}

function serviceKeyStatus() {
  const keys = readKeys();
  const status = {};
  for (const name of [...SERVICES, "custom"]) {
    status[name] = Boolean(keys[name]);
  }
  return status;
}

function prefsPath() {
  return path.join(app.getPath("userData"), "prefs.json");
}

function readPrefs() {
  const saved = readJson(prefsPath()) || {};
  const shortcuts = {};
  const shortcutSource = saved.shortcuts && typeof saved.shortcuts === "object" ? saved.shortcuts : {};
  for (const [name, fallback] of Object.entries(DEFAULT_SHORTCUTS)) {
    const value = typeof shortcutSource[name] === "string" ? shortcutSource[name].trim() : fallback;
    shortcuts[name] = shortcutAllowed(value) ? value : fallback;
  }
  const colors = {};
  const colorSource = saved.colors && typeof saved.colors === "object" ? saved.colors : {};
  for (const [name, fallback] of Object.entries(DEFAULT_COLORS)) {
    const value = typeof colorSource[name] === "string" ? colorSource[name].trim() : fallback;
    colors[name] = /^#[0-9a-fA-F]{6}$/.test(value) ? value : fallback;
  }
  return {
    language: LANGUAGES.includes(saved.language) ? saved.language : "en",
    muted: Boolean(saved.muted),
    shortcuts,
    colors,
    n8nUrl: cleanServiceUrl(saved.n8nUrl) || "http://127.0.0.1:5678",
    calUrl: cleanServiceUrl(saved.calUrl) || "https://api.cal.com",
    openOnHover: Boolean(saved.openOnHover),
    showClaudeUsage: Boolean(saved.showClaudeUsage),
    showCodexUsage: Boolean(saved.showCodexUsage),
    hideProject: Boolean(saved.hideProject),
    mainTool: ["vscode", "cursor", "codex", "antigravity"].includes(saved.mainTool) ? saved.mainTool : "",
    pills: Array.isArray(saved.pills) ? saved.pills.filter((name) => PILL_CHOICES.includes(name)).slice(0, 4) : [],
    petX: saved.petX != null && Number.isFinite(Number(saved.petX)) ? Number(saved.petX) : null,
    petY: saved.petY != null && Number.isFinite(Number(saved.petY)) ? Number(saved.petY) : null,
    recapWeek: typeof saved.recapWeek === "string" ? saved.recapWeek : "",
    displayMode: saved.displayMode === "main" || saved.displayMode === "screen" ? saved.displayMode : "follow",
    displayId: typeof saved.displayId === "string" || typeof saved.displayId === "number" ? String(saved.displayId) : "",
  };
}

function shortcutAllowed(value) {
  if (!/^[A-Za-z0-9+ ]{3,64}$/.test(value)) {
    return false;
  }
  return !/^CommandOrControl\+Alt\+[A-Za-z]$/.test(value);
}

function writePrefs(patch) {
  const next = readPrefs();
  const source = patch && typeof patch === "object" ? patch : {};
  if (LANGUAGES.includes(source.language)) {
    next.language = source.language;
  }
  if (typeof source.muted === "boolean") {
    next.muted = source.muted;
  }
  if (source.shortcuts && typeof source.shortcuts === "object") {
    for (const name of Object.keys(DEFAULT_SHORTCUTS)) {
      if (typeof source.shortcuts[name] === "string") {
        const value = source.shortcuts[name].trim();
        if (shortcutAllowed(value)) {
          next.shortcuts[name] = value;
        }
      }
    }
  }
  if (source.colors && typeof source.colors === "object") {
    for (const name of Object.keys(DEFAULT_COLORS)) {
      if (typeof source.colors[name] === "string" && /^#[0-9a-fA-F]{6}$/.test(source.colors[name].trim())) {
        next.colors[name] = source.colors[name].trim();
      }
    }
  }
  if (typeof source.n8nUrl === "string") {
    const url = cleanServiceUrl(source.n8nUrl);
    if (url) {
      next.n8nUrl = url;
    }
  }
  if (typeof source.calUrl === "string") {
    const url = cleanServiceUrl(source.calUrl);
    if (url) {
      next.calUrl = url;
    }
  }
  for (const flag of ["openOnHover", "showClaudeUsage", "showCodexUsage", "hideProject"]) {
    if (typeof source[flag] === "boolean") {
      next[flag] = source[flag];
    }
  }
  if (["vscode", "cursor", "codex", "antigravity", ""].includes(source.mainTool)) {
    next.mainTool = source.mainTool;
  }
  if (Array.isArray(source.pills)) {
    next.pills = source.pills.filter((name) => PILL_CHOICES.includes(name)).slice(0, 4);
  }
  if (Number.isFinite(Number(source.petX)) && Number.isFinite(Number(source.petY))) {
    next.petX = Math.round(Number(source.petX));
    next.petY = Math.round(Number(source.petY));
  }
  if (typeof source.recapWeek === "string" && source.recapWeek.length < 16) {
    next.recapWeek = source.recapWeek;
  }
  if (source.displayMode === "follow" || source.displayMode === "main" || source.displayMode === "screen") {
    next.displayMode = source.displayMode;
    if (source.displayMode === "screen") {
      const current = displayUnderCursor();
      next.displayId = String(current.id);
    }
  }
  fs.mkdirSync(path.dirname(prefsPath()), { recursive: true });
  fs.writeFileSync(prefsPath(), `${JSON.stringify(next, null, 2)}\n`, "utf8");
  return next;
}

function maybeMonday() {
  const prefs = readPrefs();
  if (!mondayDue(Date.now(), prefs.recapWeek)) {
    return;
  }
  writePrefs({ recapWeek: weekKey(Date.now()) });
  showNook();
  if (win && !win.isDestroyed()) {
    win.webContents.send("nook:command", "recap");
  }
}

function historyPath() {
  return path.join(app.getPath("userData"), "history.jsonl");
}

function appendHistory(entry) {
  try {
    fs.mkdirSync(path.dirname(historyPath()), { recursive: true });
    fs.appendFileSync(historyPath(), `${JSON.stringify(entry)}\n`, "utf8");
  } catch (_error) {
    // A full disk should not stop the island.
  }
}

function readHistoryTail() {
  try {
    const lines = fs.readFileSync(historyPath(), "utf8").split("\n");
    return lines.slice(-2000).join("\n");
  } catch (_error) {
    return "";
  }
}

function newestSnapshot(root) {
  const found = [];
  function walk(dir, depth) {
    if (depth > 2 || found.length > 40) {
      return;
    }
    let entries = [];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch (_error) {
      return;
    }
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full, depth + 1);
      } else if (/\.(json|jsonl)$/i.test(entry.name)) {
        try {
          const stat = fs.statSync(full);
          found.push({ full, mtime: stat.mtimeMs, size: stat.size });
        } catch (_error) {
          // Skip a file that disappeared.
        }
      }
    }
  }
  walk(root, 0);
  found.sort((left, right) => right.mtime - left.mtime);
  if (!found[0] || found[0].size > 8000000) {
    return "";
  }
  try {
    return fs.readFileSync(found[0].full, "utf8").slice(-200000);
  } catch (_error) {
    return "";
  }
}

let lastCodexRead = 0;

function refreshUsage() {
  const prefs = readPrefs();
  const pills = [];
  if (prefs.showClaudeUsage && claudePlan) {
    pills.push(claudePlan);
  }
  if (prefs.showCodexUsage && codexPlan) {
    pills.push(codexPlan);
  }
  usagePills = pills;
}

function readCodexPlan() {
  const prefs = readPrefs();
  if (paused || !prefs.showCodexUsage || Date.now() - lastCodexRead < 60000) {
    return;
  }
  lastCodexRead = Date.now();
  const child = spawn("codex", ["app-server"], { windowsHide: true });
  let buffer = "";
  let ready = false;
  const kill = setTimeout(() => child.kill(), 15000);
  const sendLine = (message) => {
    if (child.stdin.writable) {
      child.stdin.write(`${JSON.stringify(message)}\n`);
    }
  };
  child.on("error", () => clearTimeout(kill));
  child.stdout.on("data", (chunk) => {
    buffer += chunk.toString("utf8");
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";
    for (const line of lines) {
      let message = null;
      try {
        message = JSON.parse(line);
      } catch (_error) {
        message = null;
      }
      if (!message) {
        continue;
      }
      if (!ready && message.id === 1) {
        ready = true;
        sendLine({ method: "initialized" });
        sendLine({ id: 2, method: "account/rateLimits/read", params: {} });
      }
      if (message.id === 2 && message.result) {
        const parsed = fromCodexAccount(message.result);
        if (parsed) {
          codexPlan = parsed;
          refreshUsage();
          broadcast();
        }
        clearTimeout(kill);
        child.kill();
      }
    }
  });
  sendLine({
    id: 1,
    method: "initialize",
    params: { clientInfo: { name: "nook", version: "0.1.0" }, capabilities: {} },
  });
}

async function getJson(url, headers, body) {
  const response = await fetch(url, {
    method: body ? "POST" : "GET",
    headers,
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) {
    throw new Error(String(response.status));
  }
  return response.json();
}

function pillAllowed(id) {
  const prefs = readPrefs();
  const picked = [...(prefs.mainTool ? [prefs.mainTool] : []), ...prefs.pills];
  if (!picked.length) {
    return true;
  }
  return picked.includes(id);
}

async function refreshServices() {
  if (paused) {
    return;
  }
  const keys = readKeys();
  const prefs = readPrefs();
  const pills = [];
  const jobs = [];
  if (keys.github && pillAllowed("github")) {
    jobs.push(
      (async () => {
        const headers = {
          Authorization: `Bearer ${keys.github}`,
          Accept: "application/vnd.github+json",
          "Content-Type": "application/json",
          "User-Agent": "nook",
        };
        const payload = await getJson("https://api.github.com/graphql", headers, { query: QUERY });
        const next = parseGithub(payload);
        githubBadge = ciBadge(githubStates, next);
        githubStates = stateMap(next);
        github = next;
        const failing = next.pulls.filter((row) => row.state === "failure").length;
        pills.push({
          id: "github",
          title: "GitHub",
          detail: `${next.pulls.length} open · ${next.reviews.length} reviews${failing ? ` · ${failing} failing` : ""} · ${next.stars} stars`,
        });
      })(),
    );
  }
  if (keys.vercel && pillAllowed("vercel")) {
    jobs.push(
      getJson("https://api.vercel.com/v6/deployments?limit=1", { Authorization: `Bearer ${keys.vercel}` }).then(
        (payload) => pills.push(vercelSummary(payload.deployments)),
      ),
    );
  }
  if (keys.stripe && pillAllowed("stripe")) {
    jobs.push(
      getJson("https://api.stripe.com/v1/balance", { Authorization: `Bearer ${keys.stripe}` }).then((payload) =>
        pills.push(stripeSummary(payload)),
      ),
    );
  }
  if (keys.resend && pillAllowed("resend")) {
    jobs.push(
      getJson("https://api.resend.com/emails?limit=1", { Authorization: `Bearer ${keys.resend}` }).then((payload) =>
        pills.push(resendSummary(payload)),
      ),
    );
  }
  if (keys.notion && pillAllowed("notion")) {
    jobs.push(
      getJson(
        "https://api.notion.com/v1/search",
        {
          Authorization: `Bearer ${keys.notion}`,
          "Notion-Version": "2022-06-28",
          "Content-Type": "application/json",
        },
        { page_size: 1 },
      ).then((payload) => pills.push(notionSummary(payload))),
    );
  }
  if (keys.n8n && pillAllowed("n8n")) {
    jobs.push(
      getJson(`${prefs.n8nUrl}/api/v1/workflows`, { "X-N8N-API-KEY": keys.n8n }).then((payload) =>
        pills.push(n8nSummary(payload)),
      ),
    );
  }
  if (keys.cal && pillAllowed("cal")) {
    jobs.push(
      getJson(`${prefs.calUrl}/v2/bookings?status=upcoming`, { Authorization: `Bearer ${keys.cal}` }).then((payload) =>
        pills.push(calSummary(payload)),
      ),
    );
  }
  await Promise.all(jobs.map((job) => job.catch(() => null)));
  servicePills = pills;
  broadcast();
}

function colorCss(colors) {
  return Object.entries(colors)
    .filter(([name, hex]) => /^[a-z0-9-]{1,20}$/.test(name) && /^#[0-9a-fA-F]{6}$/.test(hex))
    .map(([name, hex]) => `.pill[data-agent="${name}"]{border-color:${hex}}`)
    .join("\n");
}

function applyColors(target) {
  if (!target || target.isDestroyed()) {
    return;
  }
  const css = colorCss(readPrefs().colors);
  const previous = colorCssKeys.get(target.id);
  target.webContents
    .insertCSS(css)
    .then((key) => {
      if (previous) {
        target.webContents.removeInsertedCSS(previous).catch(() => {});
      }
      colorCssKeys.set(target.id, key);
    })
    .catch(() => {});
}

function registerShortcuts() {
  const errors = [];
  globalShortcut.unregisterAll();
  const shortcuts = readPrefs().shortcuts;
  const actions = {
    chat: () => {
      showNook();
      if (win && !win.isDestroyed()) {
        win.webContents.send("nook:open-chat");
      }
    },
    alert: () => attention(),
    mute: () => {
      const prefs = readPrefs();
      writePrefs({ muted: !prefs.muted });
      broadcast();
    },
    pet: () => togglePet(),
    next: () => sendIsland("next"),
    prev: () => sendIsland("prev"),
    toggle: () => sendIsland("toggle"),
    diff: () => sendIsland("diff"),
  };
  for (const [name, accelerator] of Object.entries(shortcuts)) {
    const action = actions[name];
    if (!action) {
      continue;
    }
    try {
      if (!globalShortcut.register(accelerator, action)) errors.push(name);
    } catch (_error) {
      errors.push(name);
    }
  }
  return errors;
}

function sendIsland(action) {
  showNook();
  if (win && !win.isDestroyed()) {
    win.webContents.send("nook:command", action);
  }
}

function togglePet() {
  const point = screen.getCursorScreenPoint();
  const prefs = readPrefs();
  if (pet && !pet.isDestroyed() && pet.isVisible()) {
    pet.hide();
    return;
  }
  const x = prefs.petX == null ? point.x + 24 : prefs.petX;
  const y = prefs.petY == null ? point.y + 24 : prefs.petY;
  if (!pet || pet.isDestroyed()) {
    pet = new BrowserWindow({
      width: 144,
      height: 144,
      x,
      y,
      frame: false,
      transparent: true,
      alwaysOnTop: true,
      skipTaskbar: true,
      resizable: false,
      focusable: true,
      hasShadow: false,
      roundedCorners: false,
      thickFrame: false,
      webPreferences: {
        preload: path.join(__dirname, "preload.js"),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
      },
    });
    pet.webContents.on("did-finish-load", () => { applyLook(pet); pet.webContents.send("nook:state", currentState()); });
    pet.loadFile(path.join(__dirname, "pet.html"));
    pet.setAlwaysOnTop(true, "screen-saver");
  }
  placePet(x, y);
  pet.showInactive();
}

function placePet(x, y) {
  if (!pet || pet.isDestroyed()) {
    return;
  }
  const area = screen.getDisplayNearestPoint({x: Math.round(x), y: Math.round(y)}).workArea;
  pet.setPosition(Math.max(area.x, Math.min(area.x + area.width - 144, Math.round(x))), Math.max(area.y, Math.min(area.y + area.height - 144, Math.round(y))));
}

let petFlight = null;
function flyPetTo(home, done = () => {}) {
  if (petFlight) { clearInterval(petFlight); petFlight = null; }
  if (!pet || pet.isDestroyed()) return;
  const start = pet.getBounds();
  if (motionReduced) { pet.setPosition(Math.round(home.x), Math.round(home.y)); done(); return; }
  const began = Date.now();
  petFlight = setInterval(() => {
    if (!pet || pet.isDestroyed()) { clearInterval(petFlight); petFlight = null; return; }
    const elapsed = Math.min(1, (Date.now() - began) / 420);
    const progress = springProgress(elapsed);
    pet.setPosition(Math.round(start.x + (home.x - start.x) * progress), Math.round(start.y + (home.y - start.y) * progress));
    if (elapsed === 1) { clearInterval(petFlight); petFlight = null; done(); }
  }, 16);
}
function sendPetHome() {
  if (!pet || pet.isDestroyed() || !pet.isVisible()) return;
  const spot = pet.getBounds();
  if (!petHome) petHome = {x: spot.x, y: spot.y};
  const home = win && !win.isDestroyed() ? win.getBounds() : {x: spot.x, y: 0};
  flyPetTo(home);
}
function sendPetBack() {
  if (!pet || pet.isDestroyed() || !petHome) return;
  const home = petHome; petHome = null;
  pet.showInactive();
  flyPetTo(home, () => writePrefs({petX: home.x, petY: home.y}));
}

function startDemo() {
  demoOn = true;
  demoStep = 0;
  demoChat = [];
  demoAnswered = false;
  broadcast();
  showNook();
}
function stopDemo() {
  demoOn = false;
  broadcast();
}

function currentState() {
  const first = pending[0] || null;
  const latest = activity[0] || null;
  const strings = translate(readPrefs().language);
  let status = strings.quiet;
  let hint = "Hover the top edge, or ask a model.";
  if (first) {
    status = strings.needs;
    hint = first.detail;
  } else if (latest) {
    status = latest.title;
    hint = latest.detail;
  }
  const hooks = hookStatus();
  if (!first && !latest && hooks.claude && hooks.cursor) {
    hint = "Sessions will check in here.";
  }
  const result = {
    status,
    hint,
    pending: first
      ? {
          id: first.id,
          agent: first.agent,
          title: first.title,
          detail: first.detail,
          kind: first.kind,
          questions: first.questions || [],
          always: Boolean(first.always),
        }
      : null,
    activity: activity.slice(0, 8),
    displays: screen.getAllDisplays().map((item) => ({
      id: String(item.id),
      primary: item.id === screen.getPrimaryDisplay().id,
      label: `${item.bounds.width}×${item.bounds.height}`,
    })),
    sessions: [...sessions.values()].slice(-4).reverse(),
    celebrate,
    attachment,
    hooks,
    keys: keyStatus(),
    serviceKeys: serviceKeyStatus(),
    services: servicePills,
    usage: usagePills,
    github,
    githubBadge,
    paused,
    greeting: displayName,
    recap: summarizeHistory(readHistoryTail(), Date.now()),
    strings: translate(readPrefs().language),
    prefs: readPrefs(),
    demo: demoOn,
    features: featureKit ? featureKit.snapshot() : {},
    updates: updateKit ? updateKit.snapshot() : null,
    models: readModels(),
    look: readLook(),
    messages: messages.slice(-12),
    chatBusy: chatBusyProviders.size > 0,
  };
  if (!demoOn) return result;
  const sample = demoState(result, demoStep, demoAnswered);
  if (demoChat.length) sample.messages = demoChat;
  return sample;
}

function broadcast() {
  const state = currentState();
  for (const target of [win, appWin, pet]) {
    if (target && !target.isDestroyed()) {
      target.webContents.send("nook:state", state);
    }
  }
}

function attention() {
  if (!win || win.isDestroyed()) {
    return;
  }
  win.webContents.send("nook:attention");
  win.showInactive();
}

function finalLine(payload) {
  const source = payload && typeof payload === "object" ? payload : {};
  const direct = source.last_assistant_message || source.final_message;
  if (typeof direct === "string" && direct.trim()) {
    return finalFromTranscript(JSON.stringify({ message: { content: direct } }));
  }
  const file = typeof source.transcript_path === "string" ? source.transcript_path : "";
  const home = os.homedir();
  if (!file || !path.isAbsolute(file) || !file.startsWith(home)) {
    return "";
  }
  try {
    const stat = fs.statSync(file);
    if (!stat.isFile() || stat.size > 5000000) {
      return "";
    }
    const length = Math.min(stat.size, 120000);
    const buf = Buffer.alloc(length);
    const fd = fs.openSync(file, "r");
    fs.readSync(fd, buf, 0, length, Math.max(0, stat.size - length));
    fs.closeSync(fd);
    return finalFromTranscript(buf.toString("utf8"));
  } catch (_error) {
    return "";
  }
}

function rememberSession(agent, payload, pid) {
  const turn = describeTurn(agent, payload);
  const key = `${agent}:${turn.sessionId}`;
  const previous = sessions.get(key);
  if (sessions.has(key)) {
    sessions.delete(key);
  }
  const final = turn.finished ? finalLine(payload) : (previous && previous.final) || "";
  sessions.set(key, {
    id: key,
    agent,
    pid: Number(pid) || (previous && previous.pid) || 0,
    ...turn,
    final,
    steps: [...(previous?.steps || []), timelineEntry(turn, turn.finished ? final : '')].slice(-30),
  });
  while (sessions.size > 6) {
    const oldest = sessions.keys().next().value;
    sessions.delete(oldest);
  }
  if (turn.finished) {
    celebrate = Date.now();
  }
}

function rememberActivity(msg) {
  lastTouch = Date.now();
  maybeMonday();
  const summary = present(msg.agent, msg.payload || {}, false);
  const turn = describeTurn(msg.agent, msg.payload || {});
  rememberSession(msg.agent, msg.payload || {}, msg.pid);
  const project = turn.cwd ? path.basename(turn.cwd).slice(0, 80) : "";
  appendHistory({
    t: Date.now(),
    agent: msg.agent,
    sessionId: turn.sessionId,
    project,
    files: turn.file ? 1 : 0,
    added: turn.added,
    removed: turn.removed,
    command: /shell|bash|powershell/i.test(`${summary.title} ${summary.detail}`) ? 1 : 0,
    question: summary.kind === "question" ? 1 : 0,
  });
  activity.unshift({
    id: msg.id,
    agent: msg.agent,
    title: summary.title,
    detail: summary.detail,
    file: turn.file,
    added: turn.added,
    removed: turn.removed,
    final: turn.finished ? finalLine(msg.payload || {}) : "",
  });
  if (activity.length > 8) {
    activity.pop();
  }
  broadcast();
}

function rememberApproval(msg) {
  if (demoOn) stopDemo();
  lastTouch = Date.now();
  const summary = present(msg.agent, msg.payload || {}, true);
  rememberSession(msg.agent, msg.payload || {}, msg.pid);
  pending.push({
    id: msg.id,
    agent: msg.agent,
    payload: msg.payload || {},
    title: summary.title,
    detail: summary.detail,
    kind: summary.kind,
    questions: summary.questions || [],
    always: msg.agent === "claude" && summary.kind === "approval",
  });
  sendPetHome();
  broadcast();
  attention();
  if (mode === "open") {
    animateTo("open");
  }
}

async function completeChat(provider, key, history, options, onDelta) {
  const request = buildChatRequest(provider, history, { ...options, stream: true });
  const headers = { ...request.headers };
  if ((request.auth === "bearer" || request.auth === "optional") && key) {
    headers.Authorization = `Bearer ${key}`;
  }
  if (request.auth === "anthropic") {
    headers["x-api-key"] = key;
    headers["anthropic-version"] = "2023-06-01";
  }
  let response;
  try {
    response = await fetch(request.url, {
      method: "POST",
      headers,
      body: JSON.stringify(request.body),
    });
  } catch (_error) {
    throw new Error(`Could not reach ${request.label}.`);
  }
  if (!response.ok) {
    throw new Error(`${request.label} returned ${response.status}.`);
  }
  const reader = response.body && response.body.getReader ? response.body.getReader() : null;
  if (!reader) {
    return readChatReply(await response.json());
  }
  const decoder = new TextDecoder();
  let buf = "";
  let full = "";
  while (true) {
    const chunk = await reader.read();
    if (chunk.done) {
      break;
    }
    buf += decoder.decode(chunk.value, { stream: true });
    const taken = takeSseEvents(buf);
    buf = taken.rest;
    for (const event of taken.events) {
      const bit = deltaText(event, request.auth);
      if (bit) {
        full += bit;
        if (onDelta) {
          onDelta(full);
        }
      }
    }
  }
  if (stripReasoning(full)) {
    return stripReasoning(full);
  }
  try {
    return readChatReply(JSON.parse(buf));
  } catch (_error) {
    throw new Error(`${request.label} returned an empty reply.`);
  }
}

app.on("second-instance", () => {
  openApp();
  showNook();
});

if (gotLock) {
  app.whenReady().then(async () => {
    featureKit = installFeatures({ app, ipcMain, desktopCapturer, clipboard, getState: currentState, readVoiceKey: () => readKeys().chatgpt, decide: handleDecision, broadcast, setAttachment: (file) => { attachment = file; }, onDraft: () => navigateSettings('companion') });
    updateKit = createUpdateController({app, updater: app.isPackaged && process.platform === 'win32' ? require('electron-updater').autoUpdater : null, onChange: broadcast,
      async confirmRestart() {
        const busy = pending.length || chatBusyProviders.size || [...sessions.values()].some(session => !session.finished);
        if (!busy) return true;
        const result = await dialog.showMessageBox({type:'question', title:'Restart Nook to update?', message:'Some agents are still working or waiting for you.', detail:'Restarting disconnects Nook briefly. Your agents stay in their terminals. Finish any waiting approval first, or restart when you are ready.', buttons:['Restart and install','Keep working'], defaultId:1, cancelId:1});
        return result.response === 0;
      }
    });
    relay = createRelay(PIPE, {
      onActivity: rememberActivity,
      onApproval: rememberApproval,
      onStatus: (msg) => {
        const parsed = usageFromText(JSON.stringify(msg.payload || {}), "Claude");
        if (!parsed) {
          return;
        }
        parsed.id = "claude";
        parsed.title = "Claude";
        claudePlan = parsed;
        refreshUsage();
        broadcast();
      },
    });
    try {
      await relay.listen();
    } catch (error) {
      hookMessage = `The local hook relay did not start: ${error.message}`;
    }
    if (!fs.existsSync(connectedFlagPath())) {
      hookMessage = "Review the hook diff, then install it.";
    }
    createWindow();
    createTray();
    openApp();
    execFile(
      "powershell.exe",
      ["-NoProfile", "-Command", "([adsi]\"WinNT://$env:USERDOMAIN/$env:USERNAME,user\").FullName"],
      { windowsHide: true, timeout: 4000 },
      (_error, stdout) => {
        const full = String(stdout || "").trim();
        if (full.includes(" ")) {
          displayName = full.split(/\s+/)[0];
          broadcast();
        }
      },
    );
    registerShortcuts();
    refreshUsage();
    readCodexPlan();
    maybeMonday();
    refreshServices().catch(() => {});
    setInterval(() => {
      if (!pet || pet.isDestroyed() || !pet.isVisible()) {
        return;
      }
      const idle = Date.now() - lastTouch > 120000;
      const cursor = screen.getCursorScreenPoint();
      const bounds = pet.getBounds();
      const far = Math.abs(cursor.x - bounds.x) > 240 || Math.abs(cursor.y - bounds.y) > 240;
      pet.webContents.send("nook:pet", idle && far ? "asleep" : "awake");
    }, 15000);
    setInterval(() => {
      refreshUsage();
      readCodexPlan();
      refreshServices().catch(() => {});
    }, 120000);

    setInterval(() => {
      if (!win || win.isDestroyed() || (mode !== "asleep" && mode !== "peek") || anim) {
        return;
      }
      const prefs = readPrefs();
      if (prefs.displayMode !== "follow") {
        return;
      }
      const cursor = screen.getCursorScreenPoint();
      const display = displayUnderCursor();
      const near = cursor.y - display.bounds.y < 80;
      if (!near && Date.now() % 500 > 125) {
        return;
      }
      const next = targetBounds(mode);
      const same =
        boundsNow &&
        Math.abs(boundsNow.x - next.x) < 2 &&
        Math.abs(boundsNow.y - next.y) < 2;
      if (!same) {
        applyBounds(next);
        if (mode === "asleep") {
          clipIsland("asleep");
        }
      }
    }, 125);
  });
}

ipcMain.on("nook:set-open", (_event, open, height, reducedMotion) => {
  motionReduced = Boolean(reducedMotion);
  if (motionReduced && anim) { clearInterval(anim); anim = null; applyBounds(targetBounds(mode)); clipIsland(mode); }
  const next = open === "peek" || open === "open" || open === "asleep" ? open : open ? "open" : "asleep";
  const requested = Number(height);
  let resized = false;
  if (next === "open" && Number.isFinite(requested) && requested > 0) {
    const clamped = Math.max(180, Math.min(560, Math.round(requested)));
    if (Math.abs(clamped - cardHeight) > 12) {
      cardHeight = clamped;
      resized = true;
    }
  }
  if (win && !win.isDestroyed()) {
    win.setFocusable(next === "open");
  }
  if (next === mode) {
    if (resized) {
      animateTo("open");
    }
    return;
  }
  animateTo(next);
});

ipcMain.on("nook:quit", () => {
  app.quit();
});

ipcMain.on("nook:open-app", () => {
  openApp();
});

ipcMain.handle("nook:save-look", (_event, look) => {
  const next = writeLook(look);
  applyLookEverywhere();
  broadcast();
  return next;
});

ipcMain.handle("nook:clear-key", (_event, provider) => {
  try {
    clearKey(provider);
    broadcast();
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error.message };
  }
});

function handleDecision(choice) {
  if (demoOn && choice?.id === `demo-request-${demoStep}`) {
    demoAnswered = true;
    broadcast();
    return true;
  }
  if (!choice || typeof choice.id !== "string" || (!relay && !choice.id.startsWith("demo-"))) {
    return false;
  }
  const item = pending.find((entry) => entry.id === choice.id);
  if (!item) {
    return false;
  }
  const action = choice.action || (choice.allow ? "allow" : "deny");
  if (!["allow", "deny", "always", "terminal"].includes(action) || action === "always" && !item.always) return false;
  if (!choice.id.startsWith("demo-")) {
  if (action === "terminal") {
    relay.respond(item.id, null);
  } else {
    const allow = action === "allow" || action === "always";
    relay.respond(
      item.id,
      decisionOutput(item.agent, allow, {
        always: action === "always",
        payload: item.payload,
        answers: choice.answers,
      }),
    );
  }
  }
  appendHistory({
    t: Date.now(),
    agent: item.agent,
    permission: true,
  });
  const index = pending.findIndex((entry) => entry.id === choice.id);
  if (index !== -1) {
    pending.splice(index, 1);
  }
  const verb =
    action === "always" ? "Always allowed" : action === "terminal" ? "Sent back" : action === "allow" ? "Allowed" : "Denied";
  sendPetBack();
  if (mode === "open") {
    animateTo("open");
  }
  activity.unshift({
    id: item.id,
    agent: item.agent,
    title: item.title,
    detail: `${verb} ${item.detail}`,
  });
  broadcast();
  return true;
}
ipcMain.on("nook:decide", (_event, choice) => handleDecision(choice));

ipcMain.handle("nook:preview-hooks", () => {
  try {
    return { ok: true, files: hookPlan() };
  } catch (error) {
    return { ok: false, error: error.message, files: [] };
  }
});

ipcMain.handle("nook:install-hooks", () => {
  try {
    return installHooks();
  } catch (error) {
    hookMessage = error.message;
    broadcast();
    return hookStatus();
  }
});

ipcMain.handle("nook:uninstall-hooks", () => {
  try {
    return uninstallHooks();
  } catch (error) {
    hookMessage = error.message;
    broadcast();
    return hookStatus();
  }
});

ipcMain.handle("nook:save-model", (_event, patch) => {
  const next = writeModels(patch);
  broadcast();
  return next;
});

ipcMain.handle("nook:attach-path", (_event, filePath) => {
  const file = typeof filePath === "string" ? filePath : "";
  if (!file || !path.isAbsolute(file) || !fs.existsSync(file)) {
    return { ok: false, error: "Drop a file from Explorer." };
  }
  let stat;
  try {
    stat = fs.statSync(file);
  } catch (_error) {
    return { ok: false, error: "That file could not be read." };
  }
  if (!stat.isFile()) {
    return { ok: false, error: "Drop a file, not a folder." };
  }
  const text = fs.readFileSync(file, "utf8").slice(0, 60000);
  if (!text.trim()) {
    return { ok: false, error: "That file is empty." };
  }
  attachment = { name: path.basename(file).slice(0, 120), text };
  broadcast();
  return { ok: true, name: attachment.name };
});

ipcMain.handle("nook:attach-file", (_event, file) => {
  const name = file && typeof file.name === "string" ? file.name.slice(0, 120) : "file";
  const text = file && typeof file.text === "string" ? file.text.slice(0, 60000) : "";
  if (!text) {
    return { ok: false, error: "That file is empty." };
  }
  attachment = { name, text };
  broadcast();
  return { ok: true, name };
});

ipcMain.handle("nook:clear-file", () => {
  attachment = null;
  broadcast();
  return { ok: true };
});

ipcMain.handle("nook:save-key", (_event, input) => {
  const provider = input && input.provider;
  const key = input && typeof input.key === "string" ? input.key.trim() : "";
  if (!key) {
    return { ok: false, error: "Paste a key first." };
  }
  try {
    saveKey(provider, key);
    broadcast();
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error.message };
  }
});

ipcMain.handle("nook:chat", async (_event, input) => {
  const provider = input && input.provider;
  const text = input && typeof input.text === "string" ? input.text.trim() : "";
  if (!PROVIDERS[provider]) {
    return { ok: false, error: "Unknown chat provider." };
  }
  if (!text) {
    return { ok: false, error: "Write a message first." };
  }
  if (demoOn) {
    const answer = 'This is a sample reply. Connect a model to start a real conversation. You can ask about code, files, or a screenshot.';
    demoChat.push({ role: 'user', provider, content: text.slice(0, 4000) }, { role: 'assistant', provider, content: answer });
    demoChat = demoChat.slice(-12);
    broadcast();
    return { ok: true, reply: answer };
  }
  const spec = PROVIDERS[provider];
  const key = readKeys()[provider];
  if (spec.auth === "bearer" && !key) {
    return { ok: false, error: `Save a ${spec.label} API key first.` };
  }
  if (chatBusyProviders.has(provider)) return { ok: false, error: "This model is still responding." };
  chatBusyProviders.add(provider);
  const models = readModels();
  const file = attachment;
  const content = file ? `${text}\n\n[${file.name} attached]` : text;
  attachment = null;
  messages.push({ role: "user", provider, content });
  broadcast();
  const replyMessage = { role: "assistant", provider, content: "" };
  messages.push(replyMessage);
  let lastPaint = 0;
  try {
    const reply = await completeChat(
      provider,
      key,
      messages.filter((message) => message.provider === provider && message !== replyMessage),
      {
        model: models[provider],
        url: provider === "ollama" ? models.ollamaUrl : provider === "lmstudio" ? models.lmstudioUrl : models.customUrl,
        attachment: file,
        greeting: displayName,
      },
      (text) => {
        replyMessage.content = text;
        const now = Date.now();
        if (now - lastPaint > 80) {
          lastPaint = now;
          broadcast();
        }
      },
    );
    replyMessage.content = reply;
    broadcast();
    return { ok: true };
  } catch (error) {
    replyMessage.content = error.message;
    broadcast();
    return { ok: false, error: error.message };
  } finally {
    chatBusyProviders.delete(provider);
    broadcast();
  }
});

ipcMain.handle("nook:save-prefs", (_event, patch) => {
  const previous = readPrefs();
  let next = writePrefs(patch);
  const registrationErrors = registerShortcuts();
  const shortcutErrors = registrationErrors.filter(name => patch && patch.shortcuts && Object.hasOwn(patch.shortcuts, name));
  if (shortcutErrors.length) { next = writePrefs({ shortcuts: previous.shortcuts }); registerShortcuts(); }
  applyColors(win);
  applyColors(appWin);
  if (win && !win.isDestroyed() && !anim) {
    applyBounds(targetBounds(mode));
    clipIsland(mode);
  }
  broadcast();
  return { ...next, shortcutErrors };
});

ipcMain.handle("nook:demo", (_event, start) => {
  if (start) {
    startDemo();
  } else {
    stopDemo();
  }
  return { demo: demoOn };
});

ipcMain.handle("nook:recap-svg", () => recapSvg(summarizeHistory(readHistoryTail(), Date.now())));

ipcMain.handle("nook:open-sounds", () => {
  const dir = path.join(app.getPath("userData"), "sounds");
  fs.mkdirSync(dir, { recursive: true });
  return shell.openPath(dir);
});

ipcMain.handle("nook:read-sound", (_event, kind) => {
  if (kind !== "hi" && kind !== "ask" && kind !== "finish") {
    return "";
  }
  const dir = path.join(app.getPath("userData"), "sounds");
  for (const ext of ["wav", "mp3", "ogg"]) {
    const file = path.join(dir, `${kind}.${ext}`);
    try {
      const stat = fs.statSync(file);
      if (stat.size > 2000000) {
        return "";
      }
      const mime = ext === "mp3" ? "audio/mpeg" : ext === "ogg" ? "audio/ogg" : "audio/wav";
      return `data:${mime};base64,${fs.readFileSync(file).toString("base64")}`;
    } catch (_error) {
      // Try the next extension.
    }
  }
  return "";
});

function parentChain(pid) {
  const chain = [];
  const next = (current, left) =>
    new Promise((resolve) => {
      const id = Number(current);
      if (!Number.isInteger(id) || id <= 0 || left <= 0) {
        resolve(chain);
        return;
      }
      execFile(
        "wmic",
        ["process", "where", `ProcessId=${id}`, "get", "Name,ParentProcessId", "/format:csv"],
        { windowsHide: true, timeout: 1500 },
        (error, stdout) => {
          if (error || !stdout) {
            resolve(chain);
            return;
          }
          const line = String(stdout)
            .split(/\r?\n/)
            .map((row) => row.trim())
            .find((row) => row && !row.startsWith("Node") && row.includes(","));
          if (!line) {
            resolve(chain);
            return;
          }
          const parts = line.split(",");
          chain.push({ name: parts[1] || "", pid: id });
          next(Number(parts[2]) || 0, left - 1).then(resolve);
        },
      );
    });
  return next(pid, 8);
}

function focusPid(pid) {
  const script = [
    "Add-Type -TypeDefinition 'using System; using System.Runtime.InteropServices; public class NookFocus { [DllImport(\"user32.dll\")] public static extern bool SetForegroundWindow(IntPtr h); [DllImport(\"user32.dll\")] public static extern bool ShowWindow(IntPtr h, int n); }'",
    `$p = Get-Process -Id ${Number(pid)} -ErrorAction SilentlyContinue`,
    "if ($p -and $p.MainWindowHandle -ne 0) { [NookFocus]::ShowWindow($p.MainWindowHandle, 9); [NookFocus]::SetForegroundWindow($p.MainWindowHandle) }",
  ].join("; ");
  execFile("powershell.exe", ["-NoProfile", "-Command", script], { windowsHide: true });
}

ipcMain.handle("nook:open-terminal", async (_event, sessionId) => {
  const list = [...sessions.values()];
  const session = list.find((item) => item.id === sessionId) || list[list.length - 1];
  if (!session) {
    return { ok: false };
  }
  const picked = pickTerminal(await parentChain(session.pid));
  if (picked.kind === "window" && picked.pid) {
    focusPid(picked.pid);
    return { ok: true };
  }
  if (session.cwd) {
    execFile("code", [session.cwd], { windowsHide: true });
    return { ok: true, folder: true };
  }
  return { ok: false };
});

ipcMain.handle("nook:open-file", (_event, file) => {
  const target = typeof file === "string" ? file : "";
  if (!target || target.includes("\0") || !path.isAbsolute(target)) {
    return { ok: false };
  }
  execFile("code", [target], { windowsHide: true });
  return { ok: true };
});

ipcMain.handle("nook:open-url", (_event, url) => {
  try {
    const parsed = new URL(String(url || ""));
    if (parsed.protocol !== "https:" || !/(^|\.)github\.com$/.test(parsed.hostname)) {
      return { ok: false };
    }
    shell.openExternal(parsed.toString());
    return { ok: true };
  } catch (_error) {
    return { ok: false };
  }
});

ipcMain.handle("nook:save-recap", () => {
  const summary = summarizeHistory(readHistoryTail(), Date.now());
  const svg = recapSvg(summary, { hideProject: readPrefs().hideProject });
  const dir = app.getPath("pictures");
  const day = new Date().toISOString().slice(0, 10);
  let file = path.join(dir, `Nook weekly recap ${day}.svg`);
  let extra = 2;
  while (fs.existsSync(file)) {
    file = path.join(dir, `Nook weekly recap ${day}-${extra}.svg`);
    extra += 1;
  }
  fs.writeFileSync(file, svg, "utf8");
  shell.showItemInFolder(file);
  return { ok: true, file };
});

ipcMain.handle("nook:models", async (_event, provider) => {
  const spec = PROVIDERS[provider];
  if (!spec) {
    return [];
  }
  const models = readModels();
  const base = provider === "ollama" ? models.ollamaUrl : provider === "lmstudio" ? models.lmstudioUrl : provider === "custom" ? models.customUrl : spec.url;
  const { url, headers } = buildModelsRequest(provider, { url: base }, readKeys()[provider]);
  try {
    const response = await fetch(url, { headers, signal: AbortSignal.timeout(8000) });
    if (!response.ok) {
      return [];
    }
    const payload = await response.json();
    const list = Array.isArray(payload.data) ? payload.data : Array.isArray(payload.models) ? payload.models : [];
    return list
      .map((item) => (item && (item.id || item.name)) || "")
      .filter((name) => typeof name === "string" && name)
      .slice(0, 500);
  } catch (_error) {
    return [];
  }
});

ipcMain.on("nook:pet-move", (_event, point) => {
  const x = Number(point && point.x);
  const y = Number(point && point.y);
  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    return;
  }
  placePet(x, y);
  lastTouch = Date.now();
});

ipcMain.handle("nook:toggle-pet", () => {
  togglePet();
  return { ok: true };
});

function navigateSettings(page) {
  openApp();
  const send = () => appWin?.webContents.send('nook:command', 'page-' + page);
  if (appWin?.webContents.isLoading()) appWin.webContents.once('did-finish-load', send);
  else send();
}
ipcMain.handle('nook:tour-step', (_event, step) => {
  if (!demoOn || !Number.isInteger(step) || step < 0 || step >= TOUR_STEPS.length) return { ok: false };
  demoStep = step; demoAnswered = false; broadcast(); showNook(); return { ok: true };
});
ipcMain.handle('nook:update', (_event, input) => {
  if (!updateKit) return {ok:false,message:'Updates are not ready yet.'};
  if (input?.action === 'automatic') return updateKit.setAutomatic(input.value);
  if (['check','download','install'].includes(input?.action)) return updateKit[input.action]();
  return updateKit.snapshot();
});
ipcMain.handle('nook:pet-home', () => {
  pet?.hide(); showNook(); win?.webContents.send('nook:welcome'); return { ok: true };
});
ipcMain.handle('nook:pet-menu', (event) => {
  const target = BrowserWindow.fromWebContents(event.sender);
  if (![win, pet].includes(target) || !featureKit) return;
  const settings = featureKit.snapshot().companion;
  const labels = { none: 'Original', cap: 'Day off', glasses: 'Bookworm', headphones: 'Headphones', scarf: 'Cozy scarf', winter: 'Winter' };
  const menu = Menu.buildFromTemplate([
    { label: 'Open chat', click: () => { showNook(); win.webContents.send('nook:open-chat'); } },
    { label: 'Wardrobe', submenu: [...Object.entries(labels).map(([outfit, label]) => ({ label, type: 'radio', checked: !settings.seasonal && settings.outfit === outfit, click: () => featureKit.saveSettings({outfit, seasonal: false}) })), { label: 'Seasonal', type: 'radio', checked: settings.seasonal, click: () => featureKit.saveSettings({seasonal: true}) }] },
    { label: readPrefs().muted ? 'Unmute sounds' : 'Mute sounds', click: () => { writePrefs({muted: !readPrefs().muted}); broadcast(); } },
    { type: 'separator' },
    { label: target === pet ? 'Send home' : 'Move to desktop', click: () => { if (target === pet) pet.hide(); else togglePet(); } },
    { label: 'Companion settings', click: () => navigateSettings('companion') }
  ]);
  menu.popup({ window: target });
});
let petDropBusy = false;
ipcMain.handle('nook:pet-drop', async (_event, point) => {
  if (petDropBusy || !pet || !featureKit || !Number.isFinite(point?.x) || !Number.isFinite(point?.y)) return { ok: false };
  const spot = pet.getBounds();
  writePrefs({petX: spot.x, petY: spot.y});
  const display = screen.getDisplayNearestPoint({x: Math.round(point.x), y: Math.round(point.y)});
  if (point.y < display.bounds.y + 65 && Math.abs(point.x - (display.bounds.x + display.bounds.width / 2)) < 220) { pet.hide(); showNook(); return { ok: true, home: true }; }
  petDropBusy = true;
  try {
    const physical = screen.dipToScreenPoint({x: Math.round(point.x), y: Math.round(point.y)});
    const hit = await windowAtPoint(physical.x, physical.y, process.pid);
    if (!hit.ok || !hit.handle) return { ok: true, moved: true };
    const sources = await desktopCapturer.getSources({types: ['window'], thumbnailSize: {width: 0, height: 0}});
    const source = sources.find(source => source.id.split(':')[1] === hit.handle && !/^Nook(?:$| ·)/.test(source.name));
    if (!source) return { ok: true, moved: true };
    const result = await featureKit.captureWindow(source.id);
    if (result.ok) { showNook(); win.webContents.send('nook:open-chat'); }
    return result;
  } finally { petDropBusy = false; }
});

app.on("before-quit", () => {
  updateKit?.stop();
  if (featureKit) featureKit.stop().catch(() => {});
  globalShortcut.unregisterAll();
  if (petTimer) {
    clearInterval(petTimer);
  }
  if (relay) {
    relay.close();
  }
});

app.on("window-all-closed", () => {
  app.quit();
});
