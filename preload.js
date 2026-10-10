const { contextBridge, ipcRenderer, webUtils } = require("electron");

contextBridge.exposeInMainWorld("nook", {
  setOpen(open, height, reducedMotion) {
    ipcRenderer.send("nook:set-open", open, height, reducedMotion);
  },
  quit() {
    ipcRenderer.send("nook:quit");
  },
  onWelcome(callback) {
    ipcRenderer.on("nook:welcome", () => {
      callback();
    });
  },
  onState(callback) {
    ipcRenderer.on("nook:state", (_event, state) => {
      callback(state);
    });
  },
  onAttention(callback) {
    ipcRenderer.on("nook:attention", () => {
      callback();
    });
  },
  decide(id, action, answers) {
    ipcRenderer.send("nook:decide", { id, action, answers });
  },
  previewHooks() {
    return ipcRenderer.invoke("nook:preview-hooks");
  },
  installHooks() {
    return ipcRenderer.invoke("nook:install-hooks");
  },
  uninstallHooks() {
    return ipcRenderer.invoke("nook:uninstall-hooks");
  },
  sendChat(provider, text) {
    return ipcRenderer.invoke("nook:chat", { provider, text });
  },
  saveModel(patch) {
    return ipcRenderer.invoke("nook:save-model", patch);
  },
  filePath(file) {
    return webUtils.getPathForFile(file);
  },
  attachFile(file) {
    return ipcRenderer.invoke("nook:attach-file", file);
  },
  attachPath(filePath) {
    return ipcRenderer.invoke("nook:attach-path", filePath);
  },
  clearFile() {
    return ipcRenderer.invoke("nook:clear-file");
  },
  saveKey(provider, key) {
    return ipcRenderer.invoke("nook:save-key", { provider, key });
  },
  clearKey(provider) {
    return ipcRenderer.invoke("nook:clear-key", provider);
  },
  saveLook(look) {
    return ipcRenderer.invoke("nook:save-look", look);
  },
  openApp() {
    ipcRenderer.send("nook:open-app");
  },
  onOpenChat(callback) {
    ipcRenderer.on("nook:open-chat", () => {
      callback();
    });
  },
  savePrefs(patch) {
    return ipcRenderer.invoke("nook:save-prefs", patch);
  },
  setDemo(start) {
    return ipcRenderer.invoke("nook:demo", Boolean(start));
  },
  recapSvg() {
    return ipcRenderer.invoke("nook:recap-svg");
  },
  openSounds() {
    return ipcRenderer.invoke("nook:open-sounds");
  },
  readSound(kind) {
    return ipcRenderer.invoke("nook:read-sound", kind);
  },
  togglePet() {
    return ipcRenderer.invoke("nook:toggle-pet");
  },
  onCommand(callback) {
    ipcRenderer.on("nook:command", (_event, action) => callback(action));
  },
  onShowWeek(callback) {
    ipcRenderer.on("nook:show-week", () => callback());
  },
  onPet(callback) {
    ipcRenderer.on("nook:pet", (_event, mode) => callback(mode));
  },
  movePet(x, y) {
    ipcRenderer.send("nook:pet-move", { x, y });
  },
  petMenu() { return ipcRenderer.invoke('nook:pet-menu'); },
  petHome() { return ipcRenderer.invoke('nook:pet-home'); },
  dropPet(x, y) { return ipcRenderer.invoke('nook:pet-drop', { x, y }); },
  tourStep(step) { return ipcRenderer.invoke('nook:tour-step', step); },
  phoneDraft(id, action) { return ipcRenderer.invoke('nook:phone-draft', { id, action }); },
  update(action, value) { return ipcRenderer.invoke('nook:update', { action, value }); },
  openTerminal(sessionId) {
    return ipcRenderer.invoke("nook:open-terminal", sessionId);
  },
  openFile(file) {
    return ipcRenderer.invoke("nook:open-file", file);
  },
  openUrl(url) {
    return ipcRenderer.invoke("nook:open-url", url);
  },
  saveRecap() {
    return ipcRenderer.invoke("nook:save-recap");
  },
  saveCompanion(patch) { return ipcRenderer.invoke("nook:companion-save", patch); },
  media(action, position) { return ipcRenderer.invoke("nook:media", { action, position }); },
  windows() { return ipcRenderer.invoke("nook:windows"); },
  captureWindow(id) { return ipcRenderer.invoke("nook:capture-window", id); },
  transcribe(bytes) { return ipcRenderer.invoke("nook:transcribe", { bytes }); },
  phone(action) { return ipcRenderer.invoke("nook:phone", action); },
  copyPhone() { return ipcRenderer.invoke("nook:copy-phone"); },
  listModels(provider) {
    return ipcRenderer.invoke("nook:models", provider);
  },
});
