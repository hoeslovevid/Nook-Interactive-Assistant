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
  Notification,
  powerMonitor,
} = require("electron");
const { execFile, spawn } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { present, decisionOutput, describeTurn, validAnswers } = require("./lib/decisions");
const { PROVIDERS, cleanModel, cleanLocalUrl, cleanRemoteUrl } = require("./lib/chat");
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
const { createModelDiscovery } = require('./lib/model-discovery');
const modelDiscovery = createModelDiscovery();
const providerGuides = require('./lib/provider-guides');
const { normalizeLook, lookToCss, appBackground } = require("./lib/appearance");
const { previewHandoff, copyHandoff } = require('./lib/chat-handoff');
const handoffUndo = new Map();
const terminalLinks = new Map();
const locale = require('./lib/locale');
function makeMenu(items) { return Menu.buildFromTemplate(locale.menu(items, readPrefs().resolvedLanguage)); }
function localDialog(method, ...args) {
  const options = { ...args.pop() }, language = readPrefs().resolvedLanguage;
  for (const key of ['title', 'message', 'detail', 'buttonLabel']) if (options[key]) options[key] = locale.t(options[key], language);
  if (options.buttons) options.buttons = options.buttons.map(label => locale.t(label, language));
  if (options.filters) options.filters = options.filters.map(filter => ({ ...filter, name: locale.t(filter.name, language) }));
  return dialog[method](...args, options);
}
let soundKit = null;
let credentialKit = null;
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
const { createHistoryTail } = require('./lib/history-tail');
const historyTail = createHistoryTail();
const { summarizeHistory, recapSvg, weekKey, mondayDue } = require("./lib/history");
const { QUERY, parseGithub, ciBadge, stateMap } = require("./lib/github");
const { pickTerminal } = require("./lib/terminal");

const { finalFromTranscript } = require("./lib/transcript");
const { LANGUAGES, translate } = require("./lib/i18n");
const { pluginSource, ampSource, hermesManifest } = require("./lib/plugins");
const { recentMessages } = require('./lib/chat-memory');
const { completeChat } = require("./lib/chat-transport");
const { createChatSession } = require('./lib/chat-session');
const { createExperienceStore } = require('./lib/experience-store');
const { aggregateMetrics, backgroundDelay } = require('./lib/performance');
const { createSpeechOutput } = require('./lib/speech-output');
const { isQuiet } = require('./lib/alert-policy');
const { createEverydayStore } = require('./lib/everyday-store');
const { command: voiceCommand } = require('./lib/everyday');
const attachmentTray = require('./lib/attachment-tray').createAttachmentTray();
let everydayKit, chatWin, focusTimer, fullscreenWatcher, fullscreenDisplay = '', fullscreenOverride = false;
let comparison = {busy:false,results:[]}, comparisonAbort;
let experienceKit, speechKit, studioKit, suspended = false, startupMs = null;
const startupAt = Date.now(), settingsCache = new Map();
let backgroundTimer;
function readCachedSettings(file) {
  const cached=settingsCache.get(file);if(cached&&Date.now()-cached.time<1000)return cached.value;
  const value=readJson(file);settingsCache.set(file,{time:Date.now(),value});return value;
}
function runtimeMode() {
  const battery=Boolean(powerMonitor.isOnBatteryPower?.());
  return {battery,suspended,economy:experienceKit?.snapshot().settings.batterySaver!==false&&battery};
}
function refreshBackground(refresh = true) {
  clearTimeout(backgroundTimer);
  const runtime=runtimeMode();
  if(refresh&&!runtime.suspended){refreshUsage();readCodexPlan();refreshServices().catch(()=>{});}
  backgroundTimer=setTimeout(refreshBackground,backgroundDelay({battery:runtime.economy,suspended:runtime.suspended,idle:powerMonitor.getSystemIdleTime()>120}));backgroundTimer.unref?.();
}


const { installFeatures } = require("./lib/features");
const { demoState, STEPS: TOUR_STEPS } = require('./lib/demo');
const { timelineEntry } = require('./lib/session-detail');
const { windowAtPoint } = require('./lib/native');
const { createUpdateController } = require('./lib/updates');
let updateKit = null;
let demoStep = 0;
let demoAnswered = false;
let featureKit = null;
let workspaceKit = null, serviceDetails = null, pushBridge = null, customAgents = null;
const { createWorkspace } = require('./lib/workspace');
const { createServiceDetails } = require('./lib/service-details');
const { springProgress } = require("./lib/motion");
const GUTTER_X = 22;
const GUTTER_BOTTOM = 28;
const SIZES = {
  asleep: { width: 140, height: 4, gutterX: 0, gutterBottom: 0 },
  peek: { width: 300, height: 48, gutterX: GUTTER_X, gutterBottom: GUTTER_BOTTOM },
  open: { width: 620, height: 520, gutterX: GUTTER_X, gutterBottom: GUTTER_BOTTOM },
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
let stateRevision = 0;
const sessions = new Map();
const pending = [];
const messages = [];
const chatBusyProviders = new Set();
const chatSession = createChatSession({messages,complete:completeChat,getSettings(provider){
  if(!Object.hasOwn(PROVIDERS,provider))throw new Error('Unknown chat provider.');
  const spec=PROVIDERS[provider],key=readKeys()[provider];if(['bearer','anthropic'].includes(spec.auth)&&!key)throw new Error('Save a '+spec.label+' API key first.');
  const models=readModels();return {key,model:models[provider],url:provider==='ollama'?models.ollamaUrl:provider==='lmstudio'?models.lmstudioUrl:models.customUrl,greeting:displayName,context:studioKit?.context(provider)};
},onChange(){chatBusyProviders.clear();for(const id of chatSession.busyProviders())chatBusyProviders.add(id);if(!chatBusyProviders.size)everydayKit?.checkpoint(messages);broadcast();},onSent(provider,model){handoffUndo.delete(provider);experienceKit?.recent(provider,model);},onDone(reply){
  celebrate++;
  everydayKit?.notice({kind:'chat',id:reply.id,title:PROVIDERS[reply.provider].label+' replied',agent:reply.provider});
  const prefs=experienceKit?.snapshot().settings,alerts=workspaceKit?.snapshot().settings;
  if(prefs?.spokenReplies&&!readPrefs().muted&&!isQuiet(alerts)&&!alerts?.mutedAgents?.includes(reply.provider))speechKit?.speak({text:reply.content,voice:prefs.speechVoice,rate:prefs.speechRate});
}});
const lookCssKeys = new Map();
const lookRequests = new Map();
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
    content.width = everydayKit?.snapshot().layouts[String(chosenDisplay().id)]?.width || readLook().notchWidth;
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
  if(studioKit?.snapshot().settings.followMonitor)return displayUnderCursor();
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
  size.width = Math.min(size.width, display.bounds.width);
  size.height = Math.min(size.height, display.workArea.y + display.workArea.height - display.bounds.y);
  return {
    x: Math.round(Math.max(display.bounds.x,Math.min(display.bounds.x+display.bounds.width-size.width,display.bounds.x + (display.bounds.width - size.width) / 2 + (everydayKit?.snapshot().layouts[String(display.id)]?.offset || 0)))),
    y: display.bounds.y,
    width: size.width,
    height: size.height,
  };
}

function applyBounds(bounds) {
  if (!win || win.isDestroyed()) {
    return;
  }
  const moved=Boolean(boundsNow&&(boundsNow.x!==bounds.x||boundsNow.y!==bounds.y));
  win.setBounds({
    x: Math.round(bounds.x),
    y: Math.round(bounds.y),
    width: Math.round(bounds.width),
    height: Math.round(bounds.height),
  });
  boundsNow = { ...bounds };
  if(moved&&everydayKit)updateNotchVisibility();
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
    icon: path.join(__dirname, "assets", "icon.png"),
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
    updateNotchVisibility();
  });
  win.webContents.on("did-finish-load", () => {
    broadcast();
    applyLook(win);
    applyColors(win);
  });

  win.once('ready-to-show',()=>{startupMs=Date.now()-startupAt;});
  win.loadFile(path.join(__dirname, "index.html"));
}

function showNook() {
  if (!win || win.isDestroyed()) {
    return;
  }
  fullscreenOverride = true;
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
    backgroundColor: appBackground(readLook()),
    autoHideMenuBar: true,
    center: true,
    show: false,
    icon: path.join(__dirname, "assets", "icon.png"),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      backgroundThrottling: true,
    },
  });
  appWin.on('show',broadcast);
  appWin.on("closed", () => {
    appWin = null;
  });
  appWin.webContents.on("did-finish-load", async () => {
    const target = appWin;
    target.webContents.send("nook:state",currentState());
    broadcast();
    // Reveal the app after applying its saved theme to avoid a dark launch flash.
    await applyLook(target).catch(() => {});
    if (!target || target.isDestroyed()) return;
    target.show();
    applyLook(pet);
    applyColors(target);
    if (openWeek) {
      target.webContents.send("nook:show-week");
      openWeek = false;
    }
  });
  appWin.loadFile(path.join(__dirname, "settings.html"));
}

function createTray() {
  const image = nativeImage
    .createFromPath(path.join(__dirname, "assets", "tray.png"));
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
    makeMenu([
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
  return normalizeLook(readCachedSettings(appearancePath()));
}

function writeLook(look) {
  const next = normalizeLook(look);
  fs.mkdirSync(path.dirname(appearancePath()), { recursive: true });
  fs.writeFileSync(appearancePath(), `${JSON.stringify(next, null, 2)}\n`, "utf8");
  settingsCache.delete(appearancePath());
  return next;
}

async function applyLook(target) {
  if (!target || target.isDestroyed()) {
    return;
  }
  const request = (lookRequests.get(target.id) || 0) + 1;
  lookRequests.set(target.id, request);
  const currentLook = readLook();
  if (target === win && process.platform === 'win32' && typeof target.setBackgroundMaterial === 'function') { try { target.setBackgroundMaterial(currentLook.surface === 'frosted' ? 'acrylic' : 'none'); } catch {} }
  if (target === appWin) target.setBackgroundColor(appBackground(currentLook));
  const key = await target.webContents.insertCSS(lookToCss(currentLook));
  if (target.isDestroyed()) return;
  if (lookRequests.get(target.id) !== request) {
    await target.webContents.removeInsertedCSS(key).catch(() => {});
    return;
  }
  const previous = lookCssKeys.get(target.id);
  lookCssKeys.set(target.id, key);
  if (previous) await target.webContents.removeInsertedCSS(previous).catch(() => {});
}

function applyLookEverywhere() {
  applyLook(win);
  applyLook(appWin);
  applyLook(pet);
  applyLook(chatWin);
  applyColors(win);
  applyColors(appWin);
}

function keysPath() {
  return path.join(app.getPath("userData"), "provider-keys.json");
}

function readLegacyKeys() {
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
  for (const provider of [...Object.keys(PROVIDERS), ...SERVICES, 'update-access', 'phone-relay']) {
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
  return Object.hasOwn(PROVIDERS, provider) || SERVICES.includes(provider) || provider === 'update-access' || provider === 'phone-relay';
}

function readKeys() { return { ...(credentialKit?.status().ready ? {} : readLegacyKeys()), ...(credentialKit?.snapshot() || {}) }; }
async function saveKey(provider, key) {
  if (!knownSecret(provider)) throw new Error('Unknown key.');
  if (!credentialKit) throw new Error('Credential Manager is not ready.');
  await credentialKit.set(provider, key);
}
async function clearKey(provider) {
  if (!knownSecret(provider)) throw new Error('Unknown key.');
  if (!credentialKit) throw new Error('Credential Manager is not ready.');
  await credentialKit.remove(provider);
}

function modelsPath() {
  return path.join(app.getPath("userData"), "models.json");
}

function readModels() {
  const saved = readCachedSettings(modelsPath()) || {};
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
  settingsCache.delete(modelsPath());
  return next;
}

function keyStatus(keys = readKeys()) {
  const status = {};
  for (const [name, spec] of Object.entries(PROVIDERS)) {
    status[name] = spec.local || spec.auth === "none" ? true : Boolean(keys[name]);
  }
  return status;
}

function serviceKeyStatus(keys = readKeys()) {
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
  const saved = readCachedSettings(prefsPath()) || {};
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
    language: [...LANGUAGES, "system"].includes(saved.language) ? saved.language : "system",
    resolvedLanguage: locale.resolveLanguage(saved.language || "system", app.getLocale()),
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
  if ([...LANGUAGES, "system"].includes(source.language)) {
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
  settingsCache.delete(prefsPath());
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
  return historyTail.read(historyPath());
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
        if (githubBadge) workspaceKit?.alert({ kind: 'ci', id: githubBadge + ':' + Date.now(), agent: 'github', title: githubBadge === 'red' ? 'GitHub CI failed' : githubBadge === 'green' ? 'GitHub CI passed' : 'A pull request needs review' });
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
      getJson(`${prefs.calUrl}/v2/bookings?status=upcoming&limit=20`, { Authorization: `Bearer ${keys.cal}`, "cal-api-version": "2026-05-01" }).then((payload) =>
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
  if (petFlight) { clearInterval(petFlight); petFlight = null; }
  petHome = null;
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
      icon: path.join(__dirname, "assets", "icon.png"),
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
  if (workspaceKit?.snapshot().settings.petTravel === false) return;
  if (!pet || pet.isDestroyed() || !pet.isVisible()) return;
  const spot = pet.getBounds();
  if (!petHome) petHome = {x: spot.x, y: spot.y};
  const home = win && !win.isDestroyed() ? win.getBounds() : {x: spot.x, y: 0};
  pet.webContents.send('nook:pet', 'travel');
  flyPetTo({ x: home.x + Math.max(0, (home.width || 144) / 2 - 72), y: home.y + 4 }, () => { if (pending.length) pet?.hide(); });
}
function sendPetBack() {
  if (pending.length) return;
  if (!pet || pet.isDestroyed() || !petHome) return;
  const home = petHome; petHome = null;
  pet.showInactive();
  pet.webContents.send('nook:pet', 'awake');
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
  const prefs = { ...readPrefs() }, keys = readKeys();
  prefs.colors = { ...prefs.colors, ...Object.fromEntries((customAgents?.list() || []).map(profile => [profile.id, profile.color])) };
  const strings = translate(prefs.resolvedLanguage);
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
  chatSession.ensure();
  const result = {
    revision: ++stateRevision,
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
          receivedAt: first.receivedAt,
        }
      : null,
    pendingCount: pending.length,
    requests: pending.slice(0,20).map(({id,agent,title,receivedAt})=>({id,agent,title,receivedAt})),
    activity: activity.slice(0, 8),
    displays: screen.getAllDisplays().map((item) => ({
      id: String(item.id),
      primary: item.id === screen.getPrimaryDisplay().id,
      label: `${item.bounds.width}×${item.bounds.height}`,
    })),
    sessions: [...sessions.values()].slice(-4).reverse(),
    celebrate,
    attachment, attachments: attachmentTray.snapshot(),
    hooks,
    keys: keyStatus(keys),
    serviceKeys: serviceKeyStatus(keys),
    services: servicePills,
    usage: usagePills,
    github,
    githubBadge,
    paused,
    experience: experienceKit?.snapshot(), everyday: everydayKit?.snapshot(), studio:studioKit?.snapshot(), currentDisplay:String(chosenDisplay().id), comparison, runtime: runtimeMode(), speech: speechKit?.snapshot(),
    greeting: displayName,
    recap: historyTail.recap(historyPath(), summarizeHistory),
    strings,
    prefs,
    demo: demoOn,
    features: featureKit ? featureKit.snapshot() : {},
    updates: updateKit ? updateKit.snapshot() : null,
    workspace: workspaceKit ? workspaceKit.snapshot() : null,
    push: pushBridge ? pushBridge.snapshot() : null,
    models: readModels(), connections: Object.fromEntries(connectionHealth),
    look: readLook(), effectiveMotion: runtimeMode().economy && readLook().motion === "full" ? "economy" : readLook().motion,
    messages: recentMessages(messages,200),
    chatBusy: chatBusyProviders.size > 0,
    chatBusyProviders: [...chatBusyProviders],
    handoffUndo: [...handoffUndo.keys()],
    customAgents: customAgents?.list() || [],
    sounds: soundKit?.snapshot(),
    keyStorage: credentialKit?.status(),
  };
  if (!demoOn) return result;
  const sample = demoState(result, demoStep, demoAnswered);
  if (demoChat.length) sample.messages = demoChat;
  return sample;
}

function broadcast() {
  const state = currentState();
  if (!state.demo) pushBridge?.update(state);
  for (const target of [win, appWin, pet, chatWin]) {
    if (target && !target.isDestroyed() && (target !== appWin || target.isVisible())) {
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

function rememberSession(agent, payload, pid, terminal) {
  const turn = describeTurn(agent, payload);
  const key = `${agent}:${turn.sessionId}`;
  const link = require('./lib/terminal').terminalLink(terminal); if (link) terminalLinks.set(key, link);
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
    terminalLinks.delete(oldest);
  }
  if (turn.finished) {
    celebrate = Date.now();
    workspaceKit?.record(sessions.get(key));
  }
}

function rememberActivity(msg) {
  if (msg.payload?.nook_custom_agent) {
    const profile = customAgents?.find(msg.agent); if (!profile || msg.payload.nook_custom_agent !== profile.id) return;
    msg.payload.nook_agent = profile.name;
  }
  lastTouch = Date.now();
  maybeMonday();
  const summary = present(msg.agent, msg.payload || {}, false);
  const turn = describeTurn(msg.agent, msg.payload || {});
  rememberSession(msg.agent, msg.payload || {}, msg.pid, msg.terminal);
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
  rememberSession(msg.agent, msg.payload || {}, msg.pid, msg.terminal);
  pending.push({
    id: msg.id,
    agent: msg.agent,
    payload: msg.payload || {},
    title: summary.title,
    detail: summary.detail,
    kind: summary.kind,
    questions: summary.questions || [],
    always: msg.agent === "claude" && summary.kind === "approval",
    receivedAt: Date.now(),
  });
  workspaceKit?.alert({ kind: 'approvals', id: msg.id, agent: msg.agent, title: 'An agent needs your review' });
  sendPetHome();
  broadcast();
  attention();
  if (mode === "open") {
    animateTo("open");
  }
}

app.on("second-instance", () => {
  openApp();
  showNook();
});

if (gotLock) {
  app.whenReady().then(async () => {
    credentialKit = require('./lib/credential-store').createCredentialStore({ directory: app.getPath('userData'), providers: [...Object.keys(PROVIDERS), ...SERVICES, 'update-access', 'phone-relay', 'spotify-oauth'], decrypt: value => safeStorage.decryptString(Buffer.from(value, 'base64')) });
    await credentialKit.init();
    customAgents = require("./lib/custom-agents").createCustomAgents(app.getPath("userData"));
    soundKit = require("./lib/sound-settings").createSoundSettings(app.getPath("userData"));
    workspaceKit = createWorkspace({ directory: app.getPath('userData'),
      onEvent(event) { everydayKit?.notice(event); },
      encrypt: text => { if (!safeStorage.isEncryptionAvailable()) throw new Error('Encryption unavailable'); return safeStorage.encryptString(text).toString('base64'); },
      decrypt: text => safeStorage.decryptString(Buffer.from(text, 'base64')),
      notify(event) {
        if (!Notification.isSupported()) return;
        const notice = new Notification({ title: 'Nook · ' + locale.t(event.title, readPrefs().resolvedLanguage), body: event.agent ? event.agent + ' · ' + locale.t('Click to review in Nook', readPrefs().resolvedLanguage) : locale.t('Click to review in Nook', readPrefs().resolvedLanguage), icon: path.join(__dirname, 'assets', 'icon.png'), silent: readPrefs().muted });
        notice.on('click', () => { if (event.kind === 'ci') { openServicePage('github'); return; } showNook(); attention(); if (event.sessionId) win?.webContents.send('nook:command', 'session:' + event.sessionId); });
        notice.show();
      },
    });
    serviceDetails = createServiceDetails({ getKeys: readKeys, getPrefs: readPrefs, getGithub: () => github,
      actionsEnabled: () => !demoOn && workspaceKit.snapshot().settings.serviceActions,
      async confirm(plan) { const answer = await localDialog('showMessageBox', appWin || win, { type: 'question', title: plan.label, message: plan.label + '?', detail: (plan.summary || plan.title) + '\nThis changes your ' + plan.service + ' service.', buttons: ['Cancel', plan.label], defaultId: 0, cancelId: 0 }); return answer.response === 1; },
    });
    pushBridge = require('./lib/phone-push').createPushBridge({ directory: app.getPath('userData'), getSettings: () => workspaceKit.snapshot().settings, getSecret: () => readKeys()['phone-relay'],
      encrypt: text => { if (!safeStorage.isEncryptionAvailable()) throw new Error(); return safeStorage.encryptString(text).toString('base64'); }, decrypt: text => safeStorage.decryptString(Buffer.from(text, 'base64')) });
    powerMonitor.on('lock-screen', () => { studioKit?.suspend();pushBridge.lock(true); broadcast(); }); powerMonitor.on('unlock-screen', () => { studioKit?.resume();pushBridge.lock(false); broadcast(); });
    const phoneCertificate=require('./lib/phone-certificate').createPhoneCertificate({directory:app.getPath('userData'),encrypt:value=>{if(!safeStorage.isEncryptionAvailable())throw new Error('Secure phone pairing requires Windows encryption.');return safeStorage.encryptString(value).toString('base64');},decrypt:value=>safeStorage.decryptString(Buffer.from(value,'base64'))});
    featureKit = installFeatures({ app, ipcMain, desktopCapturer, clipboard, getState: currentState, getRuntime: runtimeMode, readVoiceKey: () => readKeys().chatgpt, decide: handleDecision, broadcast, setAttachment: addAttachment, onDraft: () => navigateSettings('companion'), serviceDetail: readServiceDetail, serviceAction: (id, input) => serviceDetails.act(id, input), registerDevice: input => pushBridge.register(input), revokeDevices: () => pushBridge.revoke(), historySearch: query => workspaceKit.search(query), historyDetail: id => workspaceKit.detail(id), phoneChat:(provider,text,device)=>studioKit?.phoneChat(provider,text,device),forgetPhone:device=>studioKit?.forgetPhone(device),getPhoneTls:()=>phoneCertificate.load() });
    updateKit = createUpdateController({app, updater: app.isPackaged && process.platform === 'win32' ? require('electron-updater').autoUpdater : null, onChange: broadcast, getToken: () => readKeys()['update-access'] || '',
      async confirmRestart() {
        const busy = pending.length || chatBusyProviders.size || [...sessions.values()].some(session => !session.finished);
        if (!busy) return true;
        const result = await localDialog('showMessageBox', {type:'question', title:'Restart Nook to update?', message:'Some agents are still working or waiting for you.', detail:'Restarting disconnects Nook briefly. Your agents stay in their terminals. Finish any waiting approval first, or restart when you are ready.', buttons:['Restart and install','Keep working'], defaultId:1, cancelId:1});
        return result.response === 0;
      }
    });
    relay = createRelay(PIPE, {
      onCancel(id) { const index = pending.findIndex(item => item.id === id); if (index < 0) return; pending.splice(index, 1); sendPetBack(); broadcast(); },
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
    experienceKit = createExperienceStore(app.getPath('userData'));
    everydayKit = createEverydayStore({directory:app.getPath('userData'),encrypt:text=>{if(!safeStorage.isEncryptionAvailable()||safeStorage.getSelectedStorageBackend?.()==='basic_text')throw new Error('Secure chat saving is unavailable on this system.');return safeStorage.encryptString(text).toString('base64');},decrypt:text=>safeStorage.decryptString(Buffer.from(text,'base64'))});
    messages.push(...everydayKit.restore());
    let retentionTicks=0;
    focusTimer=setInterval(()=>{try{const expired=++retentionTicks%3600===0&&everydayKit.expire();if(everydayKit.tick()){celebrate++;broadcast();}else if(expired)broadcast();}catch{}},1000);focusTimer.unref();
    setupDisplayBehavior();
    speechKit = createSpeechOutput({onChange:broadcast});
    studioKit=require('./lib/studio-main').installStudio({app,ipcMain,broadcast,getState:currentState,readKeys,readModels,writeModels,complete:completeChat,discover:(provider,refresh)=>modelDiscovery.discover(provider,readModels(),readKeys()[provider],refresh),messages,chatSession,everyday:everydayKit,experience:experienceKit,speech:speechKit,features:()=>featureKit.snapshot(),credential:credentialKit,encrypt:text=>{if(!safeStorage.isEncryptionAvailable())throw new Error('Windows encryption is unavailable.');return safeStorage.encryptString(text).toString('base64');},decrypt:text=>safeStorage.decryptString(Buffer.from(text,'base64')),openUrl:url=>shell.openExternal(url),showChat(provider,command){showNook();win?.webContents.send('nook:command','provider:'+provider);if(command)win?.webContents.send('nook:command',command);},showService:id=>{showNook();win?.webContents.send('nook:command','service:'+id);},applyProfile,followDisplay(){if(win?.isFocused()||currentState().pending)return String(screen.getDisplayMatching(win?.getBounds()||screen.getPrimaryDisplay().bounds).id);const desired=targetBounds(mode);if(!boundsNow||boundsNow.x!==desired.x||boundsNow.y!==desired.y)animateTo(mode);return String(chosenDisplay().id);},controlMedia:action=>featureKit.controlMedia(action),foreground:require('./lib/foreground').createForegroundWatcher()});
    for(const event of ['on-battery','on-ac'])powerMonitor.on(event,()=>{broadcast();refreshBackground();});
    powerMonitor.on('suspend',()=>{suspended=true;speechKit.stop();studioKit?.suspend?.();broadcast();});
    powerMonitor.on('resume',()=>{suspended=false;studioKit?.resume();refreshBackground();broadcast();});
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
    refreshBackground();

    function followDisplay() {
      let delay=500;
      try {
        if(suspended||!win||win.isDestroyed()||anim||(mode!=='asleep'&&mode!=='peek')||readPrefs().displayMode!=='follow')return;
        const cursor=screen.getCursorScreenPoint(),display=screen.getDisplayNearestPoint(cursor),near=cursor.y-display.bounds.y<80;delay=near?125:runtimeMode().economy?1000:500;
        const next=targetBounds(mode);if(!boundsNow||Math.abs(boundsNow.x-next.x)>2||Math.abs(boundsNow.y-next.y)>2){applyBounds(next);if(mode==='asleep')clipIsland('asleep');broadcast();}
      }finally{const timer=setTimeout(followDisplay,delay);timer.unref();}
    }
    followDisplay();
  });
}

ipcMain.on("nook:set-open", (_event, open, height, reducedMotion) => {
  if(_event.sender!==win?.webContents)return;
  motionReduced = Boolean(reducedMotion);
  if (motionReduced && anim) { clearInterval(anim); anim = null; applyBounds(targetBounds(mode)); clipIsland(mode); }
  const next = open === "peek" || open === "open" || open === "asleep" ? open : open ? "open" : "asleep";
  if(next==='asleep'&&everydayKit?.snapshot().settings.paused){fullscreenOverride=false;updateNotchVisibility();}
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
    if (win.isFocusable() !== (next === 'open')) win.setFocusable(next === "open");
  }
  if (next === mode) {
    if (resized) {
      animateTo("open");
    }
    return;
  }
  animateTo(next);
});

// Activate only after an explicit interaction, never because the notch was hovered.
ipcMain.on('nook:focus-window', event => {
  const target = BrowserWindow.fromWebContents(event.sender);
  if (!target || ![win, appWin, chatWin].includes(target) || target.isDestroyed()) return;
  if (!target.isFocusable()) target.setFocusable(true);
  if (!target.isFocused()) target.focus();
});

ipcMain.on("nook:quit", () => {
  app.quit();
});

ipcMain.on("nook:open-app", (_event, page) => {
  if (["studio","home","keys","look","agents","workspace","companion","updates","performance","shortcuts","week","everyday"].includes(page)) navigateSettings(page);
  else openApp();
});

ipcMain.handle("nook:save-look", (_event, look) => {
  const next = writeLook(look);
  applyLookEverywhere();
  if (win && !win.isDestroyed()) animateTo(mode);
  broadcast();
  return next;
});

ipcMain.handle("nook:clear-key", async (_event, provider) => {
  try {
    await clearKey(provider);
    modelDiscovery.clear();
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
  if (item.kind === 'question' && action !== 'terminal' && (action !== 'allow' || !validAnswers(item.questions, choice.answers))) return false;
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
  workspaceKit?.decision(item, action);
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
  modelDiscovery.clear();
  broadcast();
  return next;
});

function addAttachment(file) {const added=attachmentTray.add(file);attachment=added;return added;}
function attachPath(filePath) {
  try {
    addAttachment(require('./lib/attachments').readAttachment(filePath)); broadcast();
    return { ok: true, name: attachment.name };
  } catch (error) { return { ok: false, error: error.code ? 'That file could not be read.' : error.message }; }
}
ipcMain.handle('nook:attach-path', (_event, filePath) => attachPath(filePath));
ipcMain.handle('nook:pick-file', async () => {
  const result = await localDialog('showOpenDialog', chatWin || win, { title: 'Add context to chat', properties: ['openFile','multiSelections'] });
  if(result.canceled)return {ok:false,cancelled:true};
  const results=result.filePaths.map(attachPath);const failed=results.find(r=>!r.ok);
  return failed || {ok:true,name:result.filePaths.length+' files attached'};
});
ipcMain.handle("nook:attach-file", (_event, file) => {
  const name = file && typeof file.name === "string" ? file.name.slice(0, 120) : "file";
  const text = file && typeof file.text === "string" ? file.text.slice(0, 60000) : "";
  if (!text) {
    return { ok: false, error: "That file is empty." };
  }
  try {addAttachment({name,text});}catch(error){return {ok:false,error:error.message};}
  broadcast();
  return { ok: true, name };
});

ipcMain.handle("nook:clear-file", () => {
  attachment = null;
  attachmentTray.clear();
  broadcast();
  return { ok: true };
});

ipcMain.handle("nook:save-key", async (_event, input) => {
  const provider = input && input.provider;
  const key = input && typeof input.key === "string" ? input.key.trim() : "";
  if (!key) {
    return { ok: false, error: "Paste a key first." };
  }
  if (key.length > 500 || /\s/.test(key)) return { ok: false, error: "Paste a single API key without spaces (up to 500 characters)." };
  try {
    await saveKey(provider, key);
    modelDiscovery.clear();
    broadcast();
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error.message };
  }
});

ipcMain.handle("nook:chat", async (_event, input) => {
  const provider = input && input.provider;
  const text = input && typeof input.text === "string" ? input.text.trim().slice(0, 2000) : "";
  if (!Object.hasOwn(PROVIDERS, provider)) {
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
  if(studioKit?.snapshot().settings.actions&&require('./lib/studio').intent(text))return studioKit.prepare(text,provider).catch(error=>({ok:false,error:error.message}));
  const file=attachmentTray.take() || attachment;
  const work=chatSession.send(provider,text,{attachment:file});
  if(chatSession.busy(provider)){attachment=null;attachmentTray.clear();broadcast();}
  return work;
});
ipcMain.handle('nook:chat-control',async (_event,input)=>{
  const provider=input?.provider;if(!Object.hasOwn(PROVIDERS,provider)||demoOn)return {ok:false,error:'Choose a connected provider outside the walkthrough.'};
  if(input.action==='stop')return chatSession.stop(provider);
  if(['retry','regenerate','edit'].includes(input.action))return chatSession.send(provider,input.text,{action:input.action,messageId:input.messageId});
  return {ok:false,error:'Unknown chat action.'};
});

ipcMain.handle('nook:handoff', (_event, input) => {
  if (demoOn) return { ok: false, error: 'Leave the walkthrough to copy a real conversation.' };
  const from = input?.from, to = input?.to;
  try {
    if (input?.action === 'preview' && Object.hasOwn(PROVIDERS, from)) return { ok: true, ...previewHandoff(messages, from) };
    if (!Object.hasOwn(PROVIDERS, to) || chatBusyProviders.has(to) || chatBusyProviders.has(from)) throw new Error('Wait for the conversation to finish.');
    if (input.action === 'copy') {
      const copied = copyHandoff(messages, input, PROVIDERS);
      handoffUndo.set(to, messages.filter(row => row.provider === to));
      messages.splice(0, messages.length, ...recentMessages([...messages.filter(row => row.provider !== to), ...copied]));
    } else if (input.action === 'undo' && handoffUndo.has(to)) {
      messages.splice(0, messages.length, ...recentMessages([...messages.filter(row => row.provider !== to), ...handoffUndo.get(to)])); handoffUndo.delete(to);
    } else throw new Error('There is no chat to restore.');
    broadcast(); return { ok: true, provider: to };
  } catch (error) { return { ok: false, error: error.message }; }
});
ipcMain.handle('nook:chat-url', async (_event, value) => {
  const url = require('./lib/rich-markdown').webUrl(value);
  if (!url) return { ok: false };
  try { await shell.openExternal(url); return { ok: true }; } catch { return { ok: false }; }
});
ipcMain.handle("nook:save-prefs", (_event, patch) => {
  const previous = readPrefs();
  let next = writePrefs(patch);
  if(next.muted)speechKit?.stop();
  const registrationErrors = registerShortcuts();
  const shortcutErrors = registrationErrors.filter(name => patch && patch.shortcuts && Object.hasOwn(patch.shortcuts, name));
  if (shortcutErrors.length) { next = writePrefs({ shortcuts: previous.shortcuts }); registerShortcuts(); }
  applyColors(win);
  applyColors(appWin);
  refreshTray();
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

ipcMain.handle("nook:read-sound", (_event, kind) => soundKit?.read(kind) || "");
ipcMain.handle('nook:sounds', async (_event, { action, value } = {}) => {
  if (!soundKit) return { ok: false, error: 'Sound settings are not ready.' };
  try {
    if (action === 'save') soundKit.save(value);
    else if (action === 'remove') soundKit.remove(value);
    else if (action === 'import') {
      if (!require('./lib/sound-settings').EVENTS.includes(value)) return { ok: false, error: 'Unknown sound event.' };
      const picked = await localDialog('showOpenDialog', appWin || win, { title: 'Choose sound', filters: [{ name: 'Audio under 2 MB', extensions: ['wav', 'mp3', 'ogg', 'm4a'] }], properties: ['openFile'] });
      if (picked.canceled || !picked.filePaths[0]) return { ok: false, cancelled: true };
      soundKit.import(value, picked.filePaths[0]);
    } else if (action !== 'snapshot') return { ok: false, error: 'Unknown sound action.' };
    broadcast(); return { ok: true, ...soundKit.snapshot() };
  } catch (error) { return { ok: false, error: error.message }; }
});

async function parentChain(pid) {
  const id = Number(pid);
  if (!Number.isInteger(id) || id <= 0) return [];
  const result = await require('./lib/native').runScript('windows-process-chain.ps1', ['-ProcessId', String(id)], 6000);
  return result.chain || [];
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
  const link = terminalLinks.get(session.id);
  if (link?.host === 'editor' && await require('./lib/terminal-focus').focusLinkedTerminal(link)) {
    const picked = link.pid ? {pid:link.pid} : pickTerminal(await parentChain(session.pid));
    if (picked.pid) focusPid(picked.pid); return { ok: true, exact: true };
  }
  if (link?.host === 'wt') {
    const result = await require('./lib/native').runScript('windows-terminal-focus.ps1', ['-TabTitle', link.title], 6000);
    if (result.ok) return result;
  }
  const picked = pickTerminal(await parentChain(session.pid));
  if (picked.kind === "window" && picked.pid) {
    focusPid(picked.pid);
    return { ok: true };
  }
  if (session.cwd) {
    return openInEditor(session.cwd);
  }
  return { ok: false };
});
async function openInEditor(target) {
  const candidates = [
    path.join(app.getPath('home'), 'AppData', 'Local', 'Programs', 'Microsoft VS Code', 'Code.exe'),
    path.join(app.getPath('home'), 'AppData', 'Local', 'Programs', 'cursor', 'Cursor.exe'),
    path.join(process.env.ProgramFiles || 'C:\\Program Files', 'Microsoft VS Code', 'Code.exe'),
  ];
  const executable = candidates.find(file => fs.existsSync(file));
  if (executable) return new Promise(resolve => {
    const child = spawn(executable, [target], {windowsHide:true,stdio:'ignore'});
    child.once('error', () => resolve({ok:false,folder:true}));
    child.once('spawn', () => { child.unref(); resolve({ok:true,folder:true}); });
  });
  const error = await shell.openPath(target); return {ok:!error,folder:true};
}

ipcMain.handle('nook:terminal-setup', async (_event, action) => {
  if (action === 'helper') { shell.showItemInFolder(path.join(__dirname, 'assets', 'terminal-helper.vsix')); return { ok: true }; }
  if (action !== 'linked-wt') return { ok: false };
  const selected = await localDialog('showOpenDialog', appWin || win, { title: 'Choose a project folder', properties: ['openDirectory'] });
  const folder = selected.filePaths?.[0]; if (selected.canceled || !folder) return { ok: false, cancelled: true };
  if (/[;\r\n]/.test(folder)) return { ok: false, error: 'Choose a folder without semicolons or line breaks.' };
  const title = 'Nook · ' + require('crypto').randomBytes(6).toString('hex');
  return new Promise(resolve => execFile('wt.exe', ['new-tab', '--title', title, '--suppressApplicationTitle', '-d', folder, 'powershell.exe', '-NoExit', '-Command', "$env:NOOK_TERMINAL_TITLE='" + title + "'"], { windowsHide: true }, error => resolve(error ? { ok: false, error: 'Install Windows Terminal to open a linked tab.' } : { ok: true })));
});
ipcMain.handle("nook:open-file", async (_event, file) => {
  const target = typeof file === "string" ? file : "";
  if (!target || target.includes("\0") || !path.isAbsolute(target)) {
    return { ok: false };
  }
  return openInEditor(target);
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
  const svg = recapSvg(summary, {
    hideProject: readPrefs().hideProject,
    logo: 'data:image/svg+xml;base64,' + fs.readFileSync(path.join(__dirname, 'assets', 'logo.svg')).toString('base64'),
  });
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
  return (await modelDiscovery.discover(provider, readModels(), readKeys()[provider])).models;
});
const connectionHealth = new Map();
ipcMain.handle('nook:check-connection', async (_event, provider, refresh) => { const result=await modelDiscovery.discover(provider,readModels(),readKeys()[provider],Boolean(refresh));if(Object.hasOwn(PROVIDERS,provider)){connectionHealth.set(provider,{ok:result.ok,error:result.error,time:Date.now()});studioKit?.rememberModels(provider,result);broadcast();}return result; });
ipcMain.handle('nook:provider-guide', async (_event, provider) => {
  const url = providerGuides[provider]?.url;
  if (!url) return { ok: false };
  try { await shell.openExternal(url); return { ok: true }; } catch (_) { return { ok: false }; }
});

ipcMain.on("nook:pet-move", (_event, point) => {
  if (petFlight) { clearInterval(petFlight); petFlight = null; }
  petHome = null;
  const x = Number(point && point.x);
  const y = Number(point && point.y);
  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    return;
  }
  placePet(x, y);
  lastTouch = Date.now();
});
ipcMain.on('nook:show-notch', () => { showNook(); win?.webContents.send('nook:command', 'home'); });

ipcMain.handle('nook:workspace', async (_event, { action, value } = {}) => {
  if (!workspaceKit) return { ok: false, error: 'Workspace is not ready.' };
  try {
    if (action === 'search') return { ok: true, items: workspaceKit.search(value) };
    if (action === 'detail') return { ok: true, item: workspaceKit.detail(value) };
    if (action === 'save') { const next = workspaceKit.save(value);if(isQuiet(next.settings)&&speechKit?.snapshot().phase==='speaking')speechKit.stop(); broadcast(); return { ok: true, ...next }; }
    if (action === 'remove') { workspaceKit.remove(value); broadcast(); return { ok: true }; }
    if (action === 'clear') {
      const answer = await localDialog('showMessageBox', appWin || win, { type: 'question', title: 'Clear session history?', message: 'Delete all saved sessions and decisions?', detail: 'This removes Nook’s local session archive.', buttons: ['Keep history', 'Delete history'], defaultId: 0, cancelId: 0 });
      if (answer.response !== 1) return { ok: false, cancelled: true }; workspaceKit.clear(); broadcast(); return { ok: true };
    }
    if (action === 'relay-token') {
      if (value === '') await clearKey('phone-relay');
      else if (typeof value === 'string' && /^[A-Za-z0-9_\-]{32,500}$/.test(value)) await saveKey('phone-relay', value);
      else return { ok: false, error: 'Use a relay token of 32–500 letters, digits, hyphens, or underscores.' };
      broadcast(); return { ok: true };
    }
    if (action === 'revoke-devices') { pushBridge.revoke(); broadcast(); return { ok: true }; }
    return { ok: false, error: 'Unknown workspace action.' };
  } catch { return { ok: false, error: 'Nook could not save the workspace settings.' }; }
});
function readServiceDetail(service) { if (demoOn) return Promise.resolve({ ok: true, service, time: Date.now(), items: [{ id: 'demo-service', title: 'Walkthrough sample', detail: 'Sample service status · no account used', url: '', actions: [] }] }); return serviceDetails.detail(service); }
ipcMain.handle('nook:service-detail', (_event, service) => readServiceDetail(service));
function openServicePage(service) { if (!SERVICES.includes(service)) return; openApp(); const send = () => appWin?.webContents.send('nook:command', 'service:' + service); if (appWin.webContents.isLoading()) appWin.webContents.once('did-finish-load', send); else send(); }
ipcMain.on('nook:open-service', (_event, service) => openServicePage(service));
ipcMain.handle('nook:custom-agent', async (_event, { action, value } = {}) => {
  try {
    if (action === 'preview') return { ok: true, payload: customAgents.adapt(value.profile, value.sample) };
    if (action === 'save') { const profile = customAgents.save(value); broadcast(); return { ok: true, profile }; }
    if (action === 'remove') { customAgents.remove(value); broadcast(); return { ok: true }; }
    if (action === 'export') {
      const profile = customAgents.find(value); if (!profile) throw new Error('Save the agent first.');
      const result = await localDialog('showSaveDialog', appWin || win, { title: 'Export agent hook profile', defaultPath: profile.id + '-nook.json', filters: [{ name: 'JSON profile', extensions: ['json'] }] });
      if (result.canceled || !result.filePath) return { ok: false, cancelled: true };
      fs.writeFileSync(result.filePath, JSON.stringify(profile, null, 2));
      const command = require('./lib/custom-agents').hookCommand(process.execPath, path.join(__dirname, 'hooks', 'nook-custom-hook.js'), result.filePath);
      return { ok: true, command };
    }
    throw new Error('Choose a custom-agent action.');
  } catch (error) { return { ok: false, error: error.message }; }
});
ipcMain.handle('nook:service-action' , (_event, value) => serviceDetails.act(typeof value === 'string' ? value : value?.id, value?.input));
ipcMain.handle('nook:service-url', (_event, value) => {
  try {
    const url = new URL(value), host = url.hostname;
    const approved = host === 'github.com' || host === 'vercel.com' || host.endsWith('.vercel.app') || host === 'notion.so' || host.endsWith('.notion.so') || host.endsWith('.notion.site') || (cleanServiceUrl(readPrefs().n8nUrl) && url.origin === cleanServiceUrl(readPrefs().n8nUrl));
    if (!approved || !['https:', 'http:'].includes(url.protocol) || url.username || url.password || (url.protocol === 'http:' && !['localhost', '127.0.0.1'].includes(host))) return { ok: false };
    shell.openExternal(url.href); return { ok: true };
  } catch { return { ok: false }; }
});
ipcMain.handle('nook:recap-png', async () => {
  const target = await localDialog('showSaveDialog', appWin || win, { title: 'Save weekly recap', defaultPath: path.join(app.getPath('pictures'), 'Nook weekly recap.png'), filters: [{ name: 'PNG image', extensions: ['png'] }] });
  if (target.canceled || !target.filePath) return { ok: false, cancelled: true };
  const svg = recapSvg(summarizeHistory(readHistoryTail(), Date.now()), { hideProject: readPrefs().hideProject, logo: 'data:image/svg+xml;base64,' + fs.readFileSync(path.join(__dirname, 'assets/logo.svg')).toString('base64') });
  const preview = new BrowserWindow({ show: false, width: 1080, height: 1920, useContentSize: true, webPreferences: { sandbox: true, nodeIntegration: false, contextIsolation: true } });
  try {
    await preview.loadURL('data:text/html;base64,' + Buffer.from('<html><body style="margin:0">' + svg + '</body></html>').toString('base64'));
    await preview.webContents.executeJavaScript('Promise.all([...document.querySelectorAll("image")].map(image => new Promise(resolve => {const img=new Image();img.onload=resolve;img.onerror=resolve;img.src=image.getAttribute("href");})))');
    fs.writeFileSync(target.filePath, (await preview.webContents.capturePage()).resize({ width: 1080, height: 1920 }).toPNG()); return { ok: true };
  } catch { return { ok: false, error: 'Could not save the recap image.' }; } finally { preview.destroy(); }
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
ipcMain.handle('nook:update-access', async (_event, input) => {
  if (['checking','downloading'].includes(updateKit?.snapshot().phase)) return {ok:false,error:'Wait for the current update operation to finish.'};
  try {
    if (input?.action === 'clear') await clearKey('update-access');
    else if (input?.action === 'save' && typeof input.token === 'string' && /^[A-Za-z0-9_]{20,500}$/.test(input.token.trim())) await saveKey('update-access',input.token.trim());
    else return {ok:false,error:'Enter a valid GitHub access token.'};
    const state = updateKit?.refreshAccess(); broadcast(); return {ok:true,...state};
  } catch (_) { return {ok:false,error:'Windows could not save the encrypted token.'}; }
});
ipcMain.handle('nook:pet-home', () => {
  if (petFlight) { clearInterval(petFlight); petFlight = null; } petHome = null;
  pet?.hide(); showNook(); win?.webContents.send('nook:welcome'); return { ok: true };
});
ipcMain.handle('nook:pet-menu', (event) => {
  const target = BrowserWindow.fromWebContents(event.sender);
  if (![win, pet].includes(target) || !featureKit) return;
  const settings = featureKit.snapshot().companion;
  const labels = { none: 'Original', cap: 'Day off', glasses: 'Bookworm', headphones: 'Headphones', scarf: 'Cozy scarf', winter: 'Winter', crown: 'Little monarch', bow: 'Blush bow', raincoat: 'Rainy day', sunvisor: 'Summer breeze', wizard: 'Moon wizard', festive: 'Holiday' };
  const menu = makeMenu([
    { label: 'Open chat', click: () => { showNook(); win.webContents.send('nook:open-chat'); } },
    { label: 'Wardrobe', submenu: [...Object.entries(labels).map(([outfit, label]) => ({ label, type: 'radio', checked: !settings.seasonal && settings.outfit === outfit, click: () => featureKit.saveSettings({outfit, seasonal: false}) })), { label: 'Seasonal', type: 'radio', checked: settings.seasonal, click: () => featureKit.saveSettings({seasonal: true}) }] },
    { label: readPrefs().muted ? 'Unmute sounds' : 'Mute sounds', click: () => { writePrefs({muted: !readPrefs().muted}); broadcast(); } },
    { type: 'separator' },
    { label: target === pet ? 'Send home' : 'Move to desktop', click: () => { if (target === pet) { if (petFlight) { clearInterval(petFlight); petFlight = null; } petHome = null; pet.hide(); } else togglePet(); } },
    { label: 'Companion settings', click: () => navigateSettings('companion') }
  ]);
  menu.popup({ window: target });
});
let petDropBusy = false;
ipcMain.handle('nook:pet-drop', async (_event, point) => {
  if (petDropBusy || !pet || !featureKit || !Number.isFinite(point?.x) || !Number.isFinite(point?.y)) return { ok: false };
  const spot = pet.getBounds();
  const display = screen.getDisplayNearestPoint({x: Math.round(point.x), y: Math.round(point.y)});
  if (point.y < display.bounds.y + 65 && Math.abs(point.x - (display.bounds.x + display.bounds.width / 2)) < 220) { pet.hide(); showNook(); return { ok: true, home: true }; }
  writePrefs({petX: spot.x, petY: spot.y});
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
  studioKit?.stop();chatSession.dispose();comparisonAbort?.abort();speechKit?.stop();clearTimeout(backgroundTimer);clearInterval(focusTimer);fullscreenWatcher?.stop();
  workspaceKit?.stop();
  pushBridge?.stop();
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

function applyProfile(id){
  if(chatBusyProviders.size||pending.length)throw new Error('Finish the current reply or waiting approval before switching profiles.');
  const profile=experienceKit.get(id);
  writeLook(profile.look);writeModels(profile.models);writePrefs(profile.prefs);experienceKit.save(profile.experience);workspaceKit.save(profile.alerts);
  experienceKit.activate(id);if(readPrefs().muted)speechKit?.stop();applyLookEverywhere();registerShortcuts();refreshTray();refreshBackground(false);animateTo(mode);broadcast();
}
ipcMain.handle('nook:experience',async (_event,input)=>{
  if(!experienceKit)return {ok:false,error:'Workspace settings are starting.'};
  try {
    if(input?.action==='save'){const before=experienceKit.snapshot().settings;experienceKit.save(input.value||{});if(before.batterySaver!==experienceKit.snapshot().settings.batterySaver)refreshBackground(false);if(before.spokenReplies&&!experienceKit.snapshot().settings.spokenReplies)speechKit?.stop();}
    else if(input?.action==='create-profile')experienceKit.create(input.value,currentState());
    else if(input?.action==='remove-profile')experienceKit.remove(input.value);
    else if(input?.action==='apply-profile') {
      applyProfile(input.value);
    }
    else if(input?.action==='detect-local') {
      const results=await Promise.all(['ollama','lmstudio'].map(async id=>({id,...await modelDiscovery.discover(id,readModels(),'',true)})));
      return {ok:true,results};
    }
    broadcast();return {ok:true,...experienceKit.snapshot()};
  }catch(error){return {ok:false,error:error.message};}
});
let performanceSamples=0;
ipcMain.handle('nook:performance',()=>{const measured=aggregateMetrics(app.getAppMetrics());if(performanceSamples++===0)measured.cpu=null;return {ok:true,...measured,startupMs,...runtimeMode(),backgroundInterval:backgroundDelay({battery:runtimeMode().economy,suspended,idle:powerMonitor.getSystemIdleTime()>120}),mode:readLook().motion};});
ipcMain.handle('nook:speech-output',async (_event,input)=>{
  if(!speechKit)return {ok:false,error:'Speech is starting.'};
  if(input?.action==='stop')return speechKit.stop();
  if(input?.action==='voices')return speechKit.voices();
  if(input?.action==='speak'){
    if(readPrefs().muted||isQuiet(workspaceKit?.snapshot().settings))return {ok:false,error:'Speech is muted by your sound or quiet-hours settings.'};
    const prefs=experienceKit.snapshot().settings;return speechKit.speak({text:input.value,voice:prefs.speechVoice,rate:prefs.speechRate});
  }
  return {ok:false,error:'Unknown speech action.'};
});
ipcMain.on('nook:palette-command',(_event,command)=>{
  if(typeof command!=='string'||command.length>220)return;
  if(command==='chat'){showNook();win?.webContents.send('nook:open-chat');}
  else if(command==='home'){showNook();win?.webContents.send('nook:command','home');}
  else if(command.startsWith('provider:')&&Object.hasOwn(PROVIDERS,command.slice(9))){showNook();win?.webContents.send('nook:command',command);}
  else if(command.startsWith('session:')&&sessions.has(command.slice(8))){showNook();win?.webContents.send('nook:command',command);}
  else if(command.startsWith('service:')&&SERVICES.includes(command.slice(8))){showNook();win?.webContents.send('nook:command',command);}
});

function openChatWindow(provider='chatgpt') {
  if(!Object.hasOwn(PROVIDERS,provider))throw new Error('Choose a chat provider.');
  if(chatWin&&!chatWin.isDestroyed()){chatWin.show();chatWin.focus();chatWin.webContents.send('nook:command','provider:'+provider);return;}
  chatWin=new BrowserWindow({width:900,height:760,minWidth:600,minHeight:520,title:'Nook · Chat',icon:path.join(__dirname,'assets','icon.png'),backgroundColor:appBackground(readLook()),autoHideMenuBar:true,webPreferences:{preload:path.join(__dirname,'preload.js'),contextIsolation:true,nodeIntegration:false,sandbox:true,backgroundThrottling:true}});
  const target=chatWin;target.webContents.setWindowOpenHandler(()=>({action:'deny'}));target.webContents.on('will-navigate',event=>event.preventDefault());
  target.on('closed',()=>{chatWin=null;});target.webContents.on('did-finish-load',()=>{applyLook(target);target.webContents.send('nook:state',currentState());target.webContents.send('nook:command','provider:'+provider);});
  target.loadFile(path.join(__dirname,'index.html'),{query:{detached:'1'}});
}
function updateNotchVisibility(){if(!win||win.isDestroyed())return;const prefs=everydayKit?.snapshot().settings;
  const hide=!fullscreenOverride&&(prefs?.paused||prefs?.hideFullscreen&&fullscreenDisplay===String(chosenDisplay().id));
  if(hide)win.hide();else if(!win.isVisible())win.showInactive();
}
function setupDisplayBehavior(){
  fullscreenWatcher=require('./lib/fullscreen').createFullscreenWatcher(value=>{fullscreenDisplay=value.fullscreen?String(screen.getDisplayNearestPoint(screen.screenToDipPoint({x:value.x,y:value.y})).id):'';fullscreenOverride=false;updateNotchVisibility();});
  if(everydayKit.snapshot().settings.hideFullscreen)fullscreenWatcher.start();
  for(const event of ['display-added','display-removed','display-metrics-changed'])screen.on(event,()=>{if(win&&!win.isDestroyed())animateTo(mode);updateNotchVisibility();broadcast();});
}
async function compareModels(input){
  if(comparison.busy)throw new Error('Stop or finish the current comparison first.');
  const text=typeof input?.text==='string'?input.text.trim():'';
  if(!text||text.length>2000||!Array.isArray(input?.models)||input.models.length!==2)throw new Error('Enter a prompt and choose two models.');
  const selected=input.models.map(value=>{if(!Object.hasOwn(PROVIDERS,value?.provider))throw new Error('Choose two known providers.');const spec=PROVIDERS[value.provider];const model=cleanModel(value.model,'');if(!model)throw new Error('Enter a valid model ID.');const key=readKeys()[value.provider];if(['bearer','anthropic'].includes(spec.auth)&&!key)throw new Error('Connect '+spec.label+' first.');const models=readModels();return {provider:value.provider,model,key,url:value.provider==='ollama'?models.ollamaUrl:value.provider==='lmstudio'?models.lmstudioUrl:models.customUrl};});
  comparisonAbort=new AbortController();const controller=comparisonAbort;
  comparison={busy:true,prompt:text,results:selected.map(({provider,model})=>({provider,model,content:'',status:'streaming'}))};broadcast();let last=0;
  await Promise.all(selected.map(async(options,index)=>{const reply=comparison.results[index];try{reply.content=await completeChat(options.provider,options.key,[{role:'user',content:text}],options,delta=>{reply.content=delta;if(Date.now()-last>120){last=Date.now();broadcast();}},{signal:controller.signal});reply.status=controller.signal.aborted?'stopped':'complete';}catch(error){reply.status=controller.signal.aborted?'stopped':'error';reply.error=error.message;}finally{broadcast();}}));
  comparison.busy=false;comparisonAbort=null;if(!controller.signal.aborted){const completed=comparison.results.some(r=>r.status==='complete');if(completed)celebrate++;everydayKit.notice({id:'compare:'+Date.now(),kind:'comparison',title:completed?'Model comparison finished':'Model comparison needs attention',agent:'Nook'});}broadcast();return {ok:true,...comparison};
}
ipcMain.handle('nook:everyday',async(event,{action,value}={})=>{
  if(!everydayKit)return {ok:false,error:'Nook is starting.'};
  try{
    if(action==='save'){if(value&&Object.hasOwn(value,'paused'))fullscreenOverride=false;const next=everydayKit.save(value||{});if(next.settings.saveChats)everydayKit.checkpoint(messages);if(next.settings.hideFullscreen)fullscreenWatcher.start();else{fullscreenWatcher.stop();fullscreenDisplay='';}updateNotchVisibility();}
    else if(action==='request-select'){const at=pending.findIndex(item=>item.id===value);if(at<0)throw new Error('That request is no longer waiting.');const [item]=pending.splice(at,1);pending.unshift(item);}
    else if(action==='chat-window'){openChatWindow(value?.provider);return {ok:true};}
    else if(action==='draft'){if(typeof value!=='string'||value.length>2000)throw new Error('Enter a prompt of up to 2,000 characters.');showNook();win?.webContents.send('nook:command','draft:'+value);return {ok:true};}
    else if(action==='chat-return'){if(event.sender===chatWin?.webContents)chatWin.close();showNook();win?.webContents.send('nook:command','provider:'+(Object.hasOwn(PROVIDERS,value?.provider)?value.provider:'chatgpt'));return {ok:true};}
    else if(action==='attachment-remove'){attachmentTray.remove(value);attachment=attachmentTray.snapshot().files.at(-1)||null;}
    else if(action==='chat'){
      if(demoOn)throw new Error('Leave the walkthrough to use saved chats.');
      if(['open','new','delete','clear'].includes(value?.action)&&chatBusyProviders.size)throw new Error('Stop or finish current replies before changing conversations.');
      if(value?.action==='export'){const entry=everydayKit.chat('detail',value);const result=await localDialog('showSaveDialog',chatWin||appWin||win,{title:'Export conversation',defaultPath:'Nook-conversation.md',filters:[{name:'Markdown',extensions:['md']}]});if(result.canceled)return {ok:false,cancelled:true};fs.writeFileSync(result.filePath,'# '+entry.name+'\n\n'+entry.messages.map(m=>'## '+(m.role==='user'?'You':PROVIDERS[entry.provider].label)+'\n\n'+m.content).join('\n\n'),'utf8');return {ok:true};}
      if(value?.action==='delete'){const ids=everydayKit.chat('detail',value).messages.map(m=>m.id);chatSession.forget(ids);studioKit?.clearSummaries(ids);}
      if(value?.action==='clear'){chatSession.forget();studioKit?.clearSummaries();}
      const before=everydayKit.snapshot().active,result=everydayKit.chat(value?.action,value);
      if(value?.action==='detail')return {ok:true,conversation:result};
      if(value?.action==='open'){messages.splice(0,messages.length,...messages.filter(m=>m.provider!==result.provider),...result.messages);handoffUndo.delete(result.provider);}
      if(value?.action==='new'){messages.splice(0,messages.length,...messages.filter(m=>m.provider!==value.provider));handoffUndo.delete(value.provider);}
      if(value?.action==='clear'){messages.length=0;handoffUndo.clear();}
      if(value?.action==='delete'){const provider=Object.keys(before).find(p=>before[p]===value.id);if(provider){messages.splice(0,messages.length,...messages.filter(m=>m.provider!==provider));handoffUndo.delete(provider);}}
    }
    else if(action==='task'){const next=everydayKit.task(value?.action,value);if(value?.action==='toggle'&&next.tasks.find(t=>t.id===value.id)?.done)celebrate++;}
    else if(action==='prompt')everydayKit.prompt(value?.action,value);
    else if(action==='focus')everydayKit.focus(value?.action,value);
    else if(action==='inbox')everydayKit.inbox(value?.action,value?.id);
    else if(action==='layout'){if(!screen.getAllDisplays().some(d=>String(d.id)===String(value?.id)))throw new Error('Choose a connected display.');everydayKit.layout(value.id,value.layout);animateTo(mode);}
    else if(action==='compare'){if(demoOn)throw new Error('Leave the walkthrough to compare models.');return await compareModels(value);}
    else if(action==='compare-stop'){comparisonAbort?.abort();return {ok:true};}
    else if(action==='voice-preview')return {ok:true,command:voiceCommand(value)};
    else if(action==='voice-run'){
      const command=voiceCommand(value);if(!command)throw new Error('That command is not recognized.');
      if(command.action.startsWith('focus-'))everydayKit.focus(command.action.slice(6));
      else if(command.action==='mute'||command.action==='unmute'){writePrefs({muted:command.action==='mute'});if(command.action==='mute')speechKit?.stop();refreshTray();}
      else{showNook();if(command.action==='chat')win?.webContents.send('nook:open-chat');else win?.webContents.send('nook:command',command.action==='requests'?'home':'widget:'+command.action);}
    }
    else throw new Error('Unknown workspace action.');
    broadcast();return {ok:true,...everydayKit.snapshot()};
  }catch(error){return {ok:false,error:error.message};}
});
