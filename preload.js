const { contextBridge, ipcRenderer, webUtils } = require("electron");
let latestStateRevision = 0;

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
      if(Number.isFinite(state?.revision)) {if(state.revision<latestStateRevision)return;latestStateRevision=state.revision;}
      try { callback(state); } catch (error) { console.error('Nook view update failed:',error.message); }
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
  customAgent(action, value) { return ipcRenderer.invoke('nook:custom-agent', { action, value }); },
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
  chatControl(action, value) { return ipcRenderer.invoke('nook:chat-control', {action,...value}); },
  experience(action, value) { return ipcRenderer.invoke('nook:experience', {action,value}); },
  performance() { return ipcRenderer.invoke('nook:performance'); },
  everyday(action, value) { return ipcRenderer.invoke('nook:everyday',{action,value}); },
  speechOutput(action, value) { return ipcRenderer.invoke('nook:speech-output',{action,value}); },
  paletteCommand(command) { ipcRenderer.send('nook:palette-command',command); },
  handoff(action, value) { return ipcRenderer.invoke('nook:handoff', { action, ...value }); },
  openChatUrl(url) { return ipcRenderer.invoke('nook:chat-url', url); },
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
  pickFile() { return ipcRenderer.invoke('nook:pick-file'); },
  showNotch() { ipcRenderer.send('nook:show-notch'); },
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
  openApp(page) {
    ipcRenderer.send("nook:open-app", page);
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
  sounds(action, value) { return ipcRenderer.invoke('nook:sounds', { action, value }); },
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
  updateAccess(action, token) { return ipcRenderer.invoke('nook:update-access', {action,token}); },
  openTerminal(sessionId) {
    return ipcRenderer.invoke("nook:open-terminal", sessionId);
  },
  terminalSetup(action) { return ipcRenderer.invoke('nook:terminal-setup', action); },
  openFile(file) {
    return ipcRenderer.invoke("nook:open-file", file);
  },
  openUrl(url) {
    return ipcRenderer.invoke("nook:open-url", url);
  },
  saveRecap() {
    return ipcRenderer.invoke("nook:save-recap");
  },
  previewOutfit(outfit, previous) { return ipcRenderer.invoke("nook:outfit-preview", { outfit, previous }); },
  speechLanguages() { return ipcRenderer.invoke("nook:speech-languages"); },
  saveCompanion(patch) { return ipcRenderer.invoke("nook:companion-save", patch); },
  media(action, position) { return ipcRenderer.invoke("nook:media", { action, position }); },
  windows() { return ipcRenderer.invoke("nook:windows"); },
  captureWindow(id) { return ipcRenderer.invoke("nook:capture-window", id); },
  transcribe(bytes) { return ipcRenderer.invoke("nook:transcribe", { bytes }); },
  phone(action) { return ipcRenderer.invoke("nook:phone", action); },
  copyPhone() { return ipcRenderer.invoke("nook:copy-phone"); },
  workspace(action, value) { return ipcRenderer.invoke('nook:workspace', { action, value }); },
  serviceDetail(service) { return ipcRenderer.invoke('nook:service-detail', service); },
  openService(service) { ipcRenderer.send('nook:open-service', service); },
  serviceAction(id, input) { return ipcRenderer.invoke('nook:service-action', { id, input }); },
  openServiceUrl(url) { return ipcRenderer.invoke('nook:service-url', url); },
  saveRecapPng() { return ipcRenderer.invoke('nook:recap-png'); },
  checkConnection(provider, refresh = false) { return ipcRenderer.invoke('nook:check-connection', provider, refresh); },
  providerGuide(provider) { return ipcRenderer.invoke('nook:provider-guide', provider); },
  listModels(provider) {
    return ipcRenderer.invoke("nook:models", provider);
  },
});
