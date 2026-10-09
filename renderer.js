const island = document.querySelector(".island");
const seed = document.querySelector(".seed");
const pupil = document.querySelector(".pupil");
const word = document.querySelector("#word");
const pinLabel = document.querySelector(".pin");
const pinButton = document.querySelector("#pin");
const quitButton = document.querySelector("#quit");
const status = document.querySelector("#status");
const hint = document.querySelector("#hint");
const approval = document.querySelector("#approval");
const approvalTitle = document.querySelector("#approval-title");
const approvalDetail = document.querySelector("#approval-detail");
const activityList = document.querySelector("#activity");
const connectButton = document.querySelector("#connect");
const connectStatus = document.querySelector("#connect-status");
const agentsPanel = document.querySelector("#panel-agents");
const chatPanel = document.querySelector("#panel-chat");
const agentsTab = document.querySelector("#tab-agents");
const chatTab = document.querySelector("#tab-chat");
const transcript = document.querySelector("#transcript");
const chatForm = document.querySelector("#chat-form");
const chatInput = document.querySelector("#chat-input");
const keyStatus = document.querySelector("#key-status");
const providerSelect = document.querySelector("#provider");
const questionsBox = document.querySelector("#questions");
const sessionsBox = document.querySelector("#sessions");
const extrasBox = document.querySelector("#extras");
const diffBox = document.querySelector("#diff");
const hookDiff = document.querySelector("#hook-diff");
const installButton = document.querySelector("#install-hooks");
const fileChip = document.querySelector("#file-chip");
const eye = document.querySelector(".eye");

const PROVIDER_NAMES = ["chatgpt", "gemini", "claude", "openrouter", "ollama", "lmstudio", "custom"];

let hovering = false;
let pinned = false;
let expanded = false;
let welcome = true;
let chatting = false;
let attention = false;
let tab = "agents";
let provider = "chatgpt";
let state = null;
let chatError = "";
let selectedSession = "";
let seenCelebrate = 0;
let greeted = false;
let audioCtx = null;
let aimX = 0;
let aimY = 0;
let eyeX = 0;
let eyeY = 0;
let held = false;
let tucked = false;
let pillIndex = 0;
let leaveTimer = 0;

function waiting() {
  return Boolean(state && state.pending && !tucked);
}

function shellMode() {
  if (waiting() || pinned || held || expanded || welcome || chatting) {
    return "open";
  }
  if (hovering && state && state.prefs && state.prefs.openOnHover) {
    return "open";
  }
  if (hovering) {
    return "peek";
  }
  return "asleep";
}

function renderShell() {
  const next = shellMode();
  document.body.classList.toggle("is-open", next === "open");
  document.body.classList.toggle("is-peek", next === "peek");
  document.body.classList.toggle("is-asleep", next === "asleep");
  pinLabel.hidden = !pinned;
  const strings = (state && state.strings) || {};
  pinButton.textContent = pinned ? strings.unpin || "Unpin" : strings.pin || "Pin open";
  window.nook.setOpen(next);
}

async function playSound(kind) {
  if (state && state.prefs && state.prefs.muted) {
    return;
  }
  const custom = await window.nook.readSound(kind);
  if (custom) {
    const audio = new Audio(custom);
    audio.play().catch(() => {});
    return;
  }
  const Context = window.AudioContext || window.webkitAudioContext;
  if (!Context) {
    return;
  }
  if (!audioCtx) {
    audioCtx = new Context();
  }
  const notes = kind === "finish" ? [523, 659, 784] : kind === "hi" ? [440, 554] : [660, 880];
  const now = audioCtx.currentTime;
  notes.forEach((freq, index) => {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    const start = now + index * 0.08;
    osc.type = "sine";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.04, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.16);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start(start);
    osc.stop(start + 0.18);
  });
}

function setTab(next) {
  tab = next;
  const agents = next === "agents";
  agentsPanel.hidden = !agents;
  chatPanel.hidden = agents;
  agentsTab.classList.toggle("is-selected", agents);
  chatTab.classList.toggle("is-selected", !agents);
}

function pulse(element, className) {
  element.classList.remove(className);
  void element.offsetWidth;
  element.classList.add(className);
}

let questionKey = "";

function paintQuestions(pendingItem) {
  const key = pendingItem ? pendingItem.id : "";
  if (key === questionKey) {
    return;
  }
  questionKey = key;
  questionsBox.replaceChildren();
  if (!pendingItem || pendingItem.kind !== "question") {
    return;
  }
  for (const item of pendingItem.questions || []) {
    const group = document.createElement("fieldset");
    const legend = document.createElement("legend");
    legend.textContent = item.header || item.question;
    group.appendChild(legend);
    for (const option of item.options || []) {
      const label = document.createElement("label");
      const input = document.createElement("input");
      input.type = item.multi ? "checkbox" : "radio";
      input.name = item.question;
      input.value = option.label;
      label.appendChild(input);
      label.appendChild(document.createTextNode(` ${option.label}`));
      group.appendChild(label);
    }
    questionsBox.appendChild(group);
  }
}

function collectAnswers() {
  const answers = {};
  for (const group of questionsBox.querySelectorAll("fieldset")) {
    const input = group.querySelector("input");
    if (!input) {
      continue;
    }
    const picked = [...group.querySelectorAll("input:checked")].map((box) => box.value);
    answers[input.name] = picked.join(", ");
  }
  return answers;
}

function paintSessions() {
  sessionsBox.replaceChildren();
  for (const session of (state && state.sessions) || []) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "pill";
    button.dataset.agent = session.agent || "";
    const fileName = session.file ? session.file.split(/[/\\]/).pop() : "";
    const counts = session.added || session.removed ? ` +${session.added} −${session.removed}` : "";
    button.textContent = `${session.label}${fileName ? `: ${fileName}` : ""}${counts}`;
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      selectedSession = session.id;
      diffBox.hidden = false;
      diffBox.textContent = session.diff || session.detail || "No diff yet.";
      document.querySelector("#open-diff").hidden = !session.file;
      expanded = true;
      renderShell();
    });
    sessionsBox.appendChild(button);
  }
  if (selectedSession && !((state && state.sessions) || []).some((session) => session.id === selectedSession)) {
    diffBox.hidden = true;
  }
}

function paintProviders(models) {
  if (document.activeElement === providerSelect) {
    return;
  }
  const current = provider;
  providerSelect.replaceChildren();
  const labels = {
    chatgpt: "ChatGPT",
    gemini: "Gemini",
    claude: "Claude",
    openrouter: "OpenRouter",
    ollama: "Ollama",
    lmstudio: "LM Studio",
    custom: "Local server",
  };
  for (const name of PROVIDER_NAMES) {
    const option = document.createElement("option");
    option.value = name;
    option.textContent = `${labels[name]} · ${models[name] || name}`;
    providerSelect.appendChild(option);
  }
  providerSelect.value = PROVIDER_NAMES.includes(current) ? current : "chatgpt";
  provider = providerSelect.value;
}

function paintExtras() {
  extrasBox.replaceChildren();
  const pills = [...((state && state.usage) || []), ...((state && state.services) || [])];
  for (const item of pills) {
    const pill = document.createElement("p");
    pill.className = "pill";
    pill.dataset.agent = item.id || "";
    pill.textContent = `${item.title}: ${item.detail}`;
    extrasBox.appendChild(pill);
  }
}

let githubCursor = 0;

function githubRows() {
  const github = state && state.github;
  if (!github) {
    return [];
  }
  return [...(github.pulls || []), ...(github.reviews || []), ...(github.branches || [])];
}

function paintGithub() {
  const box = document.querySelector("#github-list");
  const rows = githubRows();
  box.replaceChildren();
  box.hidden = rows.length === 0;
  rows.forEach((row, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = index === githubCursor ? "pill is-selected" : "pill";
    button.textContent = `${row.kind === "review" ? "Review" : row.kind === "branch" ? "CI" : "PR"}: ${row.title}${row.state ? ` · ${row.state}` : ""}`;
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      githubCursor = index;
      window.nook.openUrl(row.url);
    });
    box.appendChild(button);
  });
  const badge = state && state.githubBadge;
  if (badge && badge !== window.__nookBadge) {
    window.__nookBadge = badge;
    playSound(badge === "red" ? "ask" : "finish");
  }
}

function moveGithub(step) {
  const rows = githubRows();
  if (!rows.length) {
    return;
  }
  githubCursor = (githubCursor + step + rows.length) % rows.length;
  paintGithub();
}

function openGithubRow() {
  const row = githubRows()[githubCursor];
  if (row) {
    window.nook.openUrl(row.url);
  }
}

function openLatestDiff() {
  const session = ((state && state.sessions) || []).find((item) => item.diff || item.file);
  if (!session) {
    return;
  }
  selectedSession = session.id;
  diffBox.hidden = false;
  diffBox.textContent = session.diff || session.detail || "No diff yet.";
  document.querySelector("#open-diff").hidden = !session.file;
  expanded = true;
  held = true;
  renderShell();
}

function applyChrome() {
  const strings = (state && state.strings) || {};
  const language = state && state.prefs ? state.prefs.language : "en";
  document.documentElement.lang = language || "en";
  document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
  if (strings.agents) {
    agentsTab.textContent = strings.agents;
  }
  if (strings.chat) {
    chatTab.textContent = strings.chat;
  }
  if (strings.review) {
    connectButton.textContent = strings.review;
  }
  if (strings.install) {
    installButton.textContent = strings.install;
  }
  if (strings.customize) {
    document.querySelector("#customize").textContent = strings.customize;
  }
  if (strings.quit) {
    quitButton.textContent = strings.quit;
  }
  if (strings.pin && strings.unpin) {
    pinButton.textContent = pinned ? strings.unpin : strings.pin;
  }
  if (strings.terminal) {
    document.querySelector("#terminal").textContent = strings.terminal;
  }
  if (strings.always) {
    document.querySelector("#always").textContent = strings.always;
  }
  if (strings.deny) {
    document.querySelector("#deny").textContent = strings.deny;
  }
}

function paint() {
  applyChrome();
  paintExtras();
  paintGithub();
  const pending = state && state.pending;
  const wasAttention = attention;
  attention = Boolean(pending && !tucked);
  if (!pending) {
    tucked = false;
  }
  document.body.classList.toggle("is-alert", attention);
  if (attention && !wasAttention) {
    seed.classList.remove("is-squish");
    pulse(seed, "is-hop");
  }
  const strings = (state && state.strings) || {};
  word.textContent = pending ? strings.needs || "Needs you" : welcome ? strings.hi || "Hi" : "Nook";
  if (welcome && !greeted) {
    greeted = true;
    playSound("hi");
  }
  if (state && state.celebrate && state.celebrate !== seenCelebrate) {
    seenCelebrate = state.celebrate;
    seed.classList.remove("is-squish");
    pulse(seed, "is-happy");
    playSound("finish");
  }
  if (attention && !wasAttention) {
    playSound("ask");
  }
  const nextStatus = (state && state.status) || "Quiet";
  if (status.textContent !== nextStatus) {
    status.textContent = nextStatus;
    pulse(status, "is-fresh");
  }
  hint.textContent =
    (state && state.hint) || "Connect Claude and Cursor, or ask ChatGPT and Gemini.";

  approval.hidden = !pending;
  approvalTitle.textContent = pending ? pending.title : "";
  approvalDetail.textContent = pending ? pending.detail : "";
  const questioning = Boolean(pending && pending.kind === "question");
  document.querySelector("#allow").textContent = questioning
    ? (state && state.strings && state.strings.answer) || "Answer"
    : (state && state.strings && state.strings.allow) || "Allow";
  document.querySelector("#always").hidden = !pending || !pending.always;
  document.querySelector("#deny").hidden = questioning;
  paintQuestions(pending);
  paintSessions();

  activityList.replaceChildren();
  for (const item of (state && state.activity) || []) {
    const row = document.createElement("li");
    row.textContent = `${item.title}: ${item.detail}`;
    activityList.appendChild(row);
  }

  const hooks = (state && state.hooks) || {};
  if (hooks.claude && hooks.cursor) {
    connectStatus.textContent = hooks.message || "Claude and Cursor are connected.";
  } else if (hooks.message) {
    connectStatus.textContent = hooks.message;
  } else {
    connectStatus.textContent = "Hooks are not installed yet.";
  }

  const keys = (state && state.keys) || {};
  const models = (state && state.models) || {};
  paintProviders(models);
  const label = providerSelect.options[providerSelect.selectedIndex]
    ? providerSelect.options[providerSelect.selectedIndex].textContent
    : "Chat";
  const local = provider === "ollama" || provider === "lmstudio";
  chatInput.placeholder = `Ask ${label}`;
  const attached = state && state.attachment;
  fileChip.hidden = !attached;
  fileChip.textContent = attached ? attached.name : "";
  keyStatus.textContent =
    chatError ||
    (local ? `${label} uses the server on this PC.` : keys[provider] ? `${label} key saved` : `Add the ${label} key in the Nook app.`);

  const stick = transcript.scrollHeight - transcript.scrollTop - transcript.clientHeight < 24;
  transcript.replaceChildren();
  for (const message of (state && state.messages) || []) {
    if (message.provider !== provider) {
      continue;
    }
    const bubble = document.createElement("div");
    bubble.className = "bubble";
    const who = document.createElement("strong");
    who.textContent = message.role === "user" ? "You" : label;
    bubble.appendChild(who);
    const blocks = window.NookMarkdown
      ? window.NookMarkdown.markdownBlocks(message.content)
      : [{ type: "text", text: message.content }];
    for (const block of blocks) {
      if (block.type === "code") {
        const pre = document.createElement("pre");
        pre.className = "diff";
        pre.textContent = block.text;
        const copy = document.createElement("button");
        copy.type = "button";
        copy.className = "text-button";
        copy.textContent = "Copy";
        copy.addEventListener("click", (event) => {
          event.stopPropagation();
          navigator.clipboard.writeText(block.text).catch(() => {});
        });
        bubble.append(pre, copy);
      } else {
        const line = document.createElement(block.type === "heading" ? "strong" : "p");
        line.textContent = block.text;
        bubble.appendChild(line);
      }
    }
  }
  if (stick) {
    transcript.scrollTop = transcript.scrollHeight;
  }
  renderShell();
}

function wake() {
  if (hovering) {
    return;
  }
  hovering = true;
  welcome = false;
  window.clearTimeout(leaveTimer);
  renderShell();
}

let dragX = 0;
let dragY = 0;
seed.addEventListener("pointerdown", (event) => {
  dragX = event.screenX;
  dragY = event.screenY;
});
seed.addEventListener("pointerup", (event) => {
  const dx = event.screenX - dragX;
  const dy = event.screenY - dragY;
  if (dx * dx + dy * dy > 144) {
    event.stopPropagation();
    window.nook.togglePet();
  }
});

island.addEventListener("mouseenter", wake);
window.addEventListener("mousemove", wake);

island.addEventListener("mouseleave", () => {
  window.clearTimeout(leaveTimer);
  leaveTimer = window.setTimeout(() => {
    hovering = false;
    if (!pinned && !held && !waiting()) {
      expanded = false;
    }
    aimX = 0;
    aimY = 0;
    renderShell();
  }, state && state.prefs && state.prefs.openOnHover ? 700 : 0);
});

island.addEventListener("click", (event) => {
  if (event.target.closest("button, input, select, textarea, a")) {
    return;
  }
  expanded = true;
  held = true;
  tucked = false;
  welcome = false;
  renderShell();
});

island.addEventListener("dragover", (event) => {
  event.preventDefault();
  island.classList.add("is-drop");
  expanded = true;
  renderShell();
});

island.addEventListener("dragleave", () => {
  island.classList.remove("is-drop");
});

island.addEventListener("drop", async (event) => {
  event.preventDefault();
  island.classList.remove("is-drop");
  const file = event.dataTransfer.files && event.dataTransfer.files[0];
  if (!file) {
    return;
  }
  const text = await file.text();
  await window.nook.attachFile({ name: file.name, text });
  setTab("chat");
  expanded = true;
  renderShell();
});

island.addEventListener("mousemove", (event) => {
  const rect = island.getBoundingClientRect();
  aimX = Math.max(-1, Math.min(1, (event.clientX - rect.left - 28) / 70)) * 2.6;
  aimY = Math.max(-1, Math.min(1, (event.clientY - rect.top - 24) / 70)) * 2.2;
});

seed.addEventListener("click", (event) => {
  event.stopPropagation();
  seed.classList.remove("is-hop");
  pulse(seed, "is-squish");
});

function followEye() {
  eyeX += (aimX - eyeX) * 0.18;
  eyeY += (aimY - eyeY) * 0.18;
  pupil.setAttribute("cx", (24 + eyeX).toFixed(2));
  pupil.setAttribute("cy", (27 + eyeY).toFixed(2));
  eye.setAttribute("rx", hovering ? "8.2" : "6.5");
  eye.setAttribute("ry", hovering ? "9.2" : "7.5");
  requestAnimationFrame(followEye);
}

followEye();

pinButton.addEventListener("click", (event) => {
  event.stopPropagation();
  pinned = !pinned;
  renderShell();
});

quitButton.addEventListener("click", (event) => {
  event.stopPropagation();
  window.nook.quit();
});

agentsTab.addEventListener("click", () => setTab("agents"));
chatTab.addEventListener("click", () => setTab("chat"));

providerSelect.addEventListener("change", () => {
  provider = providerSelect.value;
  chatError = "";
  paint();
});

function decidePending(action) {
  if (state && state.pending) {
    const answers = state.pending.kind === "question" ? collectAnswers() : undefined;
    window.nook.decide(state.pending.id, action, answers);
  }
}

document.querySelector("#allow").addEventListener("click", () => {
  decidePending("allow");
});

document.querySelector("#always").addEventListener("click", () => {
  decidePending("always");
});

document.querySelector("#terminal").addEventListener("click", () => {
  decidePending("terminal");
});

window.addEventListener("keydown", (event) => {
  if (event.target.matches("input, textarea") && event.key !== "Enter") {
    return;
  }
  if (event.key === "Escape") {
    if (state && state.pending) {
      tucked = true;
    }
    held = false;
    expanded = false;
    renderShell();
    return;
  }
  if (event.target.matches("input, textarea")) {
    if (event.ctrlKey && event.key === "Enter") {
      chatForm.requestSubmit();
    }
    return;
  }
  if (event.key === "a" || event.key === "A") {
    decidePending("allow");
  }
  if (event.key === "d" || event.key === "D") {
    decidePending("deny");
  }
  if (event.ctrlKey && event.key === "e") {
    openLatestDiff();
  }
  if (event.ctrlKey && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
    moveGithub(event.key === "ArrowDown" ? 1 : -1);
    event.preventDefault();
  }
  if (event.ctrlKey && event.key === "o") {
    openGithubRow();
  }
  if (event.ctrlKey && event.key === "k") {
    chatInput.value = "";
    setTab("chat");
  }
});

document.querySelector("#deny").addEventListener("click", () => {
  decidePending("deny");
});

connectButton.addEventListener("click", async () => {
  connectButton.disabled = true;
  const preview = await window.nook.previewHooks();
  const files = (preview && preview.files) || [];
  hookDiff.hidden = false;
  hookDiff.textContent = files.map((file) => `${file.label}\n${file.diff}`).join("\n\n");
  installButton.hidden = files.every((file) => !file.changed);
  connectButton.disabled = false;
  expanded = true;
  renderShell();
});

installButton.addEventListener("click", async () => {
  installButton.disabled = true;
  await window.nook.installHooks();
  installButton.hidden = true;
  hookDiff.hidden = true;
  installButton.disabled = false;
});

fileChip.addEventListener("click", () => {
  window.nook.clearFile();
});

chatInput.addEventListener("focus", () => {
  chatting = true;
  renderShell();
});

chatInput.addEventListener("blur", () => {
  chatting = false;
  renderShell();
});

chatForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const text = chatInput.value;
  chatInput.value = "";
  chatError = "";
  const result = await window.nook.sendChat(provider, text);
  if (!result.ok && result.error) {
    chatError = result.error;
    paint();
  }
});

document.querySelector("#tuck").addEventListener("click", (event) => {
  event.stopPropagation();
  tucked = true;
  held = false;
  expanded = false;
  renderShell();
});

document.querySelector("#open-terminal").addEventListener("click", (event) => {
  event.stopPropagation();
  const session = (state && state.sessions && state.sessions[0]) || null;
  window.nook.openTerminal(session ? session.id : "");
});

document.querySelector("#open-diff").addEventListener("click", (event) => {
  event.stopPropagation();
  const session = ((state && state.sessions) || []).find((item) => item.id === selectedSession);
  if (session && session.file) {
    window.nook.openFile(session.file);
  }
});

window.nook.onCommand((action) => {
  if (action === "toggle") {
    held = !held;
    expanded = held;
    renderShell();
  }
  if (action === "next" || action === "prev") {
    moveGithub(action === "next" ? 1 : -1);
    expanded = true;
    held = true;
    renderShell();
  }
  if (action === "diff" || action === "recap") {
    openLatestDiff();
  }
  if (action === "recap") {
    hint.textContent = "This week's recap is in the Nook window.";
  }
});

document.querySelector("#send-out").addEventListener("click", (event) => {
  event.stopPropagation();
  window.nook.togglePet();
});

window.nook.onOpenChat(() => {
  setTab("chat");
  expanded = true;
  welcome = false;
  renderShell();
  chatInput.focus();
});

document.querySelector("#customize").addEventListener("click", (event) => {
  event.stopPropagation();
  window.nook.openApp();
});

let welcomeTimer = 0;

function showWelcome() {
  welcome = true;
  renderShell();
  window.clearTimeout(welcomeTimer);
  welcomeTimer = window.setTimeout(() => {
    welcome = false;
    renderShell();
  }, 2200);
}

window.nook.onWelcome(showWelcome);
window.nook.onState((next) => {
  state = next;
  paint();
});
window.nook.onAttention(() => {
  attention = true;
  welcome = false;
  setTab("agents");
  renderShell();
});
showWelcome();
