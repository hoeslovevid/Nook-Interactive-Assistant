const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { normalize } = require("./companion");
const { media, runScript } = require("./native");
const { createPhoneServer } = require("./phone");
const { sessionDetail, instructionDraft } = require("./session-detail");

function installFeatures({
  app,
  ipcMain,
  desktopCapturer,
  clipboard,
  getState,
  readVoiceKey,
  decide,
  broadcast,
  setAttachment,
  onDraft = () => {},
  serviceDetail = async () => ({ ok: false, error: 'Service unavailable.' }),
  serviceAction = async () => ({ ok: false, error: 'Actions unavailable.' }),
  registerDevice = () => ({ ok: false, error: 'Native phone setup is unavailable.' }),
  revokeDevices = () => {},
  historySearch = () => [], historyDetail = () => null,
}) {
  const configFile = path.join(app.getPath("userData"), "companion.json");
  let settings = normalize(),
    music = { available: false },
    mediaBusy = false,
    lastMedia = 0,
    voiceBusy = false;
  try {
    settings = normalize(JSON.parse(fs.readFileSync(configFile, "utf8")));
  } catch (_) {}
  let drafts = [];
  const phone = createPhoneServer({
    serviceDetail, serviceAction, registerDevice,
    port: settings.phonePort,
    historySearch: query => settings.phoneDetails ? { ok: true, items: historySearch(query) } : { ok: false, error: 'Enable session detail sharing on the PC first.' },
    historyDetail: id => settings.phoneDetails ? historyDetail(id) : null,
    getState,
    decide,
    getSession(id) {
      return settings.phoneDetails
        ? sessionDetail(
            getState().sessions.find((session) => session.id === id),
          )
        : null;
    },
    sendInstruction(id, text) {
      if (!settings.phoneInstructions)
        return { ok: false, error: "Enable phone drafts on your PC first." };
      if (getState().demo)
        return { ok: false, error: "Finish the walkthrough first." };
      if (drafts.length >= 8)
        return {
          ok: false,
          error: "Your PC inbox is full. Review drafts first.",
        };
      const draft = instructionDraft(
        getState().sessions.find((session) => session.id === id),
        text,
      );
      if (!draft)
        return {
          ok: false,
          error: "Choose a current session and enter up to 4,000 characters.",
        };
      drafts.unshift(draft);
      broadcast();
      onDraft();
      return { ok: true };
    },
  });
  let phoneError = '';
  if (settings.phoneAutoStart) phone.start().then(broadcast).catch(() => { phoneError = 'Phone access could not start. Check whether port ' + settings.phonePort + ' is available.'; broadcast(); });
  async function refreshMusic(action = "status", position = 0) {
    if (mediaBusy) return { ok: false, error: "Media request in progress." };
    mediaBusy = true;
    try {
      const result = await media(action, position);
      music = settings.music ? result : { available: false };
      lastMedia = Date.now();
      broadcast();
      return result;
    } finally {
      mediaBusy = false;
    }
  }
  const timer = setInterval(() => {
    if (settings.music) refreshMusic().catch(() => {});
  }, 6000);
  timer.unref();
  function saveSettings(patch) {
    settings = normalize({ ...settings, ...patch });
    fs.mkdirSync(path.dirname(configFile), { recursive: true });
    fs.writeFileSync(configFile, JSON.stringify(settings, null, 2));
    if (!settings.music) music = { available: false };
    broadcast();
    if (settings.music) refreshMusic().catch(() => {});
    return settings;
  }
  ipcMain.handle("nook:companion-save", (_event, patch) => saveSettings(patch));
  ipcMain.handle("nook:phone-draft", (_event, input) => {
    const draft = drafts.find((item) => item.id === input?.id);
    if (!draft)
      return { ok: false, error: "This draft is no longer available." };
    if (input.action === "copy") clipboard.writeText(draft.text);
    else if (input.action === "dismiss")
      drafts = drafts.filter((item) => item.id !== draft.id);
    else return { ok: false, error: "Unknown draft action." };
    broadcast();
    return { ok: true };
  });
  ipcMain.handle("nook:media", (_event, input) => {
    if (!settings.music)
      return {
        ok: false,
        error: "Enable music controls in Companion settings.",
      };
    return refreshMusic(input?.action || "status", input?.position);
  });
  ipcMain.handle("nook:windows", async () => {
    try {
      const sources = await desktopCapturer.getSources({
        types: ["window"],
        thumbnailSize: { width: 280, height: 180 },
        fetchWindowIcons: false,
      });
      return {
        ok: true,
        sources: sources
          .filter((source) => !/^Nook(?:$| ·)/.test(source.name))
          .map((source) => ({
            id: source.id,
            name: source.name,
            preview: source.thumbnail.toDataURL(),
          })),
      };
    } catch (_) {
      return {
        ok: false,
        error: "Could not list windows. Check Windows capture permissions.",
      };
    }
  });
  async function captureWindow(id) {
    if (typeof id !== "string" || !id.startsWith("window:"))
      return { ok: false, error: "Choose a window first." };
    try {
      const sources = await desktopCapturer.getSources({
        types: ["window"],
        thumbnailSize: { width: 1400, height: 900 },
      });
      const source = sources.find((item) => item.id === id);
      if (
        !source ||
        /^Nook(?:$| ·)/.test(source.name) ||
        source.thumbnail.isEmpty()
      )
        return {
          ok: false,
          error: "That window is unavailable. Restore it and try again.",
        };
      const image =
        "data:image/jpeg;base64," +
        source.thumbnail.toJPEG(85).toString("base64");
      setAttachment({ name: source.name, image, kind: "image" });
      broadcast();
      return { ok: true, name: source.name, image };
    } catch (_) {
      return { ok: false, error: "Could not capture this window." };
    }
  }
  ipcMain.handle("nook:capture-window", (_event, id) => captureWindow(id));
  ipcMain.handle("nook:transcribe", async (_event, input) => {
    if (voiceBusy)
      return { ok: false, error: "A recording is already being transcribed." };
    const bytes = Buffer.from(input?.bytes || []);
    if (
      bytes.length < 46 ||
      bytes.length > 10000000 ||
      bytes.toString("ascii", 0, 4) !== "RIFF" ||
      bytes.toString("ascii", 8, 12) !== "WAVE"
    )
      return { ok: false, error: "Invalid or oversized audio recording." };
    voiceBusy = true;
    let temporary = "";
    try {
      if (settings.voice === "openai") {
        const key = readVoiceKey();
        if (!key)
          return {
            ok: false,
            error:
              "Save an OpenAI API key in Models & connections, or select Windows dictation.",
          };
        const form = new FormData();
        form.append(
          "file",
          new Blob([bytes], { type: "audio/wav" }),
          "dictation.wav",
        );
        form.append("model", "whisper-1");
        const response = await fetch(
          "https://api.openai.com/v1/audio/transcriptions",
          {
            method: "POST",
            headers: { Authorization: "Bearer " + key },
            body: form,
            signal: AbortSignal.timeout(60000),
          },
        );
        if (!response.ok)
          return {
            ok: false,
            error:
              "OpenAI dictation returned " +
              response.status +
              ". Check your API key and quota.",
          };
        const result = await response.json();
        return { ok: true, text: String(result.text || "") };
      }
      temporary = path.join(
        app.getPath("temp"),
        "nook-dictation-" + crypto.randomBytes(12).toString("hex") + ".wav",
      );
      fs.writeFileSync(temporary, bytes);
      return await runScript(
        "windows-speech.ps1",
        ["-WaveFile", temporary],
        60000,
      );
    } catch (_) {
      return {
        ok: false,
        error: "Dictation failed. Check your speech setup or connection.",
      };
    } finally {
      voiceBusy = false;
      if (temporary) {
        try {
          fs.unlinkSync(temporary);
        } catch (_) {}
      }
    }
  });
  ipcMain.handle("nook:phone", async (_event, action) => {
    try {
      if (action === 'rotate' || action === 'stop') revokeDevices();
      const status =
        action === "start"
          ? await phone.start()
          : action === "stop"
            ? await phone.stop()
            : action === "rotate"
              ? phone.rotate()
              : phone.status();
      if (action !== "status") broadcast();
      return { ok: true, ...status };
    } catch (_) {
      return {
        ok: false,
        error:
          "Could not start phone access. Check whether another process uses this port.",
      };
    }
  });
  ipcMain.handle("nook:copy-phone", () => {
    const status = phone.status();
    if (status.urls.length) {
      clipboard.writeText(status.urls[0]);
      return { ok: true };
    }
    return { ok: false, error: "No local network address found." };
  });
  return {
    captureWindow,
    saveSettings,
    snapshot() {
      return {
        companion: settings,
        music: { ...music, updated: lastMedia },
        phone: phone.status(),
        phoneError,
        drafts: drafts.map((draft) => ({ ...draft })),
      };
    },
    async stop() {
      clearInterval(timer);
      await phone.stop();
    },
  };
}
module.exports = { installFeatures };
