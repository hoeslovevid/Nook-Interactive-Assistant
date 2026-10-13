const island = document.querySelector(".island");
const seed = document.querySelector(".seed");
const word = document.querySelector("#word");
const pinButton = document.querySelector("#pin");
const peekLine = document.querySelector("#peek-line");
const status = document.querySelector("#status");
const hint = document.querySelector("#hint");
const approvalTitle = document.querySelector("#approval-title");
const approvalDetail = document.querySelector("#approval-detail");
const ticker = document.querySelector("#ticker");
const meters = document.querySelector("#meters");
const weekGrid = document.querySelector("#week-grid");
const cardApproval = document.querySelector("#card-approval");
const cardDiff = document.querySelector("#card-diff");
const cardChat = document.querySelector("#card-chat");
const cardSession = document.querySelector("#card-session");
const cardWidgets = document.querySelector('#card-widgets');
const chatPill = document.querySelector("#chat-pill");
const transcript = document.querySelector("#transcript");
const chatForm = document.querySelector("#chat-form");
const chatInput = document.querySelector("#chat-input");
const keyStatus = document.querySelector("#key-status");
const providerSelect = document.querySelector("#provider");
const questionsBox = document.querySelector("#questions");
const sessionsBox = document.querySelector("#sessions");
const extrasBox = document.querySelector("#extras");
const diffBox = document.querySelector("#diff");
const fileChip = document.querySelector("#file-chip");

const PROVIDER_NAMES = ["chatgpt", "gemini", "claude", "openrouter", "deepseek", "mistral", "groq", "xai", "ollama", "lmstudio", "custom"];

let hovering = false;
let pinned = false;
let expanded = false;
let welcome = true;
let chatting = false;
let attention = false;
let card = "session";
let settleTimer = 0;
let leanTimer = 0;
let provider = "chatgpt";
let state = null;
let chatError = "";
let chatFailure = null;
let chatRetryTimer = 0;
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
let holdUntil = 0;
let lastShellMode = "";
let sending = false;
let receiving = false;
let celebrating = false;
let celebrationTimer = 0;
let beforeTour = null;
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const dropCue = document.querySelector("#drop-cue");
function updateCompanion() {
  const working = ((state && state.sessions) || []).some(s => !s.finished);
  const activeSession = ((state && state.sessions) || []).find(s => !s.finished);
  if (state) window.NookCompanion.agentColor(seed, state, selectedSession);
  seed.dataset.mood = window.NookMotion.companionMood({task:activeSession && activeSession.task,pending:waiting(),drop:island.classList.contains("is-drop"),receiving,thinking:sending||Boolean(state?.chatBusy||state?.comparison?.busy),celebrating,dancing:Boolean(state?.features?.music?.playing),working,hover:hovering||welcome,sleeping:!chatting&&!welcome&&!working&&!hovering&&!held&&!pinned&&!expanded});
  document.body.classList.toggle("is-thinking", sending);
  if (state?.demoMood) seed.dataset.mood = state.demoMood;
  for (const canvas of document.querySelectorAll('.focus-pet,.task-pet')) {
    canvas.dataset.mood = seed.dataset.mood;
    if (state) { window.NookCompanion.agentColor(canvas, state, selectedSession); window.NookCompanion.apply(canvas, state.features?.companion || {}, state.features?.previewOutfit); }
  }
}
function celebrateCompanion() {
  celebrating = true; updateCompanion(); window.clearTimeout(celebrationTimer);
  celebrationTimer = window.setTimeout(() => { celebrating = false; seed.classList.remove("is-happy", "is-hop"); updateCompanion(); }, 1200);
}

function waiting() {
  return Boolean(state && state.pending && !tucked);
}

function shellMode() {
  if (waiting() || pinned || held || expanded || welcome || chatting || document.activeElement?.matches('input,textarea,select,[contenteditable=true]') || document.body.classList.contains('is-recording') || document.querySelector("dialog[open],.voice-language-picker:not([hidden])")) {
    return "open";
  }
  if (hovering && state && (state.prefs?.openOnHover || state.everyday?.settings?.hoverDashboard)) {
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
  pinButton.classList.toggle("is-on", pinned);
  const strings = (state && state.strings) || {};
  pinButton.setAttribute("aria-label", pinned ? strings.unpin || "Unpin" : strings.pin || "Pin open");
  if (next !== lastShellMode) {
    window.clearTimeout(settleTimer);
    document.body.classList.remove("is-settled");
    if (next === "open") settleTimer = window.setTimeout(() => document.body.classList.add("is-settled"), (reducedMotion.matches || state?.look?.motion === "reduced") ? 0 : 130);
    lastShellMode = next;
  }
  updateCompanion();
  seed.classList.toggle("is-hover", hovering);
  const height = next === "open" ? measureOpen() : 0;
  window.nook.setOpen(next, height, (reducedMotion.matches || state?.look?.motion === "reduced"));
}

function measureOpen() {
  const top = document.querySelector(".top");
  const details = document.querySelector(".details");
  const style = details ? getComputedStyle(details) : null;
  const content = details ? [...details.children].filter(node => !node.hidden).reduce((total, node) => total + node.offsetHeight, 0) : 120;
  const padding = style ? parseFloat(style.paddingTop) + parseFloat(style.paddingBottom) : 0;
  const gap = top ? parseFloat(getComputedStyle(top).marginBottom) || 0 : 0;
  const height = Math.ceil((top ? top.offsetHeight : 40) + content + padding + gap + 12);
  const dialog = document.querySelector("dialog[open]");
  const overlayHeight = dialog ? Math.max(400, dialog.scrollHeight + 64) : document.querySelector(".voice-language-picker:not([hidden])") ? 300 : 0;
  return Math.max(180, Math.min(560, Math.max(height, overlayHeight)));
}

async function playSound(kind) {
  const alerts = state?.workspace?.settings;
  if (window.NookAlerts?.isQuiet(alerts)) return;
  const agent = state?.pending?.agent || state?.sessions?.[0]?.agent;
  if (kind !== 'hi' && alerts?.mutedAgents?.includes(agent)) return;
  if (state && state.prefs && state.prefs.muted) {
    return;
  }
  return window.NookSoundPlayer.play(kind, state?.sounds);
}

function showCard(next) {
  card = ['chat','diff','widgets'].includes(next) ? next : "session";
  chatting = card === "chat";
  layoutCards();
}

function layoutCards() {
  const showingApproval = Boolean(state && state.pending && !tucked);
  const nextCard = showingApproval ? "approval" : card;
  if (island.dataset.card !== nextCard) {
    island.dataset.card = nextCard;
    const entering = {approval:cardApproval,chat:cardChat,diff:cardDiff,session:cardSession,widgets:cardWidgets}[nextCard];
    pulse(entering, "card-enter");
  }
  cardApproval.hidden = !showingApproval;
  cardDiff.hidden = showingApproval || card !== "diff";
  cardChat.hidden = showingApproval || card !== "chat";
  cardSession.hidden = showingApproval || card === "diff" || card === "chat" || card === 'widgets';
  cardWidgets.hidden = showingApproval || card !== 'widgets';
  document.querySelector('#notch-home').setAttribute('aria-pressed', String(nextCard !== 'chat'));
  document.querySelector('#notch-chat').setAttribute('aria-pressed', String(nextCard === 'chat'));
}

function pulse(element, className) {
  element.classList.remove(className);
  void element.offsetWidth;
  element.classList.add(className);
}

let questionKey = "";
let weeksOpen = false;

function usageTone(detail) {
  const match = String(detail || "").match(/(\d+)%/);
  const value = match ? Number(match[1]) : 0;
  if (value > 80) {
    return "is-hot";
  }
  if (value > 50) {
    return "is-warn";
  }
  return "is-ok";
}

let headerSignature="";
function paintHeader() {
  const signature=JSON.stringify([state?.usage,state?.github?.weeks,weeksOpen]);if(signature===headerSignature)return;headerSignature=signature;
  meters.replaceChildren();
  for (const item of (state && state.usage) || []) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `meter ${usageTone(item.detail)}`;
    const match = String(item.detail || "").match(/(\d+)%/);
    button.textContent = match ? `${item.title} ${match[1]}%` : item.title;
    button.title = item.detail || item.title;
    button.addEventListener("click", () => {
      status.textContent = `${item.title}: ${item.detail}`;
    });
    meters.appendChild(button);
  }
  const weeks = (state && state.github && state.github.weeks) || [];
  weekGrid.replaceChildren();
  const shown = weeksOpen ? weeks : weeks.slice(-1);
  for (const week of shown) {
    const column = document.createElement("span");
    column.className = "week-col";
    for (const count of week) {
      const day = document.createElement("i");
      const level = count > 8 ? 3 : count > 3 ? 2 : count > 0 ? 1 : 0;
      day.className = `day is-${level}`;
      column.appendChild(day);
    }
    weekGrid.appendChild(column);
  }
}

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
    group.dataset.question = item.question;
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
      if (option.description) {
        const note = document.createElement("span");
        note.className = "option-note";
        note.textContent = option.description;
        label.appendChild(note);
      }
      group.appendChild(label);
    }
    const typed = document.createElement("input");
    typed.type = "text";
    typed.className = "typed-answer";
    typed.placeholder = "or type an answer";
    typed.maxLength = 240;
    typed.setAttribute('aria-label', item.question + ': your answer');
    group.appendChild(typed);
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
    const typed = group.querySelector(".typed-answer");
    const picked = [...group.querySelectorAll("input:checked")].map((box) => box.value);
    answers[group.dataset.question] = typed && typed.value.trim() ? typed.value.trim() : picked.join(", ");
  }
  return answers;
}

let sessionsSignature="";
function paintSessions() {
  const signature=JSON.stringify([state?.sessions,selectedSession]);
  if(signature!==sessionsSignature){sessionsSignature=signature;
  sessionsBox.replaceChildren();
  for (const session of (state && state.sessions) || []) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = session.id === selectedSession ? "pill is-selected" : "pill";
    button.dataset.agent = session.agent || "";
    const fileName = session.file ? session.file.split(/[/\\]/).pop() : "";
    const counts = session.added || session.removed ? ` +${session.added} −${session.removed}` : "";
    button.textContent = `${session.label}${fileName ? `: ${fileName}` : ""}${counts}`;
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      showDiff(session);
    });
    sessionsBox.appendChild(button);
  }
  }
  if (selectedSession && !((state && state.sessions) || []).some((session) => session.id === selectedSession)) {
    selectedSession = ''; if (card === 'diff') showCard('session');
  }
  const selected = state?.sessions?.find(session => session.id === selectedSession);
  if (selected && card === 'diff') paintDiff(selected);
}

let providerSignature = "";
function paintProviders(models) {
  if (document.activeElement === providerSelect) {
    return;
  }
  const current = provider;
  const signature = JSON.stringify(PROVIDER_NAMES.map(name => models[name]));
  if (signature === providerSignature) { providerSelect.value = current; return; }
  providerSignature = signature;
  providerSelect.replaceChildren();
  const labels = {
    chatgpt: "ChatGPT",
    gemini: "Gemini",
    claude: "Claude",
    openrouter: "OpenRouter",
    ollama: "Ollama",
    lmstudio: "LM Studio",
    deepseek: "DeepSeek", mistral: "Mistral", groq: "Groq", xai: "Grok",
    custom: "Custom endpoint",
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
  const pills = window.NookExperience.serviceSort([...((state && state.usage) || []), ...((state && state.services) || [])],state?.experience?.settings);
  window.NookServiceCards.render(extrasBox, pills, { openService: id => window.nook.openService(id), openUsage: id => window.NookUsage?.open(id), colors: state?.prefs?.colors });
}

let githubCursor = 0;

function githubRows() {
  const github = state && state.github;
  if (!github) {
    return [];
  }
  return [...(github.pulls || []), ...(github.reviews || []), ...(github.branches || [])];
}

let githubSignature="";
function paintGithub() {
  const signature=JSON.stringify([state?.github,githubCursor,state?.githubBadge]);if(signature===githubSignature)return;githubSignature=signature;
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

function paintTicker() {
  ticker.replaceChildren();
  const sessions = (state && state.sessions) || [];
  const latest = sessions.find((item) => item.finished && item.final) || null;
  if (latest) {
    const row = document.createElement("li");
    row.className = "ticker-final";
    row.textContent = latest.final;
    ticker.appendChild(row);
  }
  for (const item of ((state && state.activity) || []).slice(0, 6)) {
    if (latest && item.final) {
      continue;
    }
    const row = document.createElement("li");
    const button = document.createElement("button");
    button.type = "button";
    button.className = "ticker-step";
    const name = document.createElement("span");
    name.textContent = item.file || item.title;
    button.appendChild(name);
    if (item.added) {
      const added = document.createElement("span");
      added.className = "plus";
      added.textContent = `+${item.added}`;
      button.appendChild(added);
    }
    if (item.removed) {
      const removed = document.createElement("span");
      removed.className = "minus";
      removed.textContent = `−${item.removed}`;
      button.appendChild(removed);
    }
    button.addEventListener("click", () => {
      const session = sessions.find((entry) => entry.file && entry.file === item.file) || sessions[0];
      if (session) {
        showDiff(session);
      }
    });
    if (ticker.childElementCount === (latest ? 1 : 0)) {
      button.classList.add("is-current");
    }
    row.appendChild(button);
    ticker.appendChild(row);
  }
}

let diffSignature = '', diffAnswer = false;
function paintDiff(session, final = diffAnswer) {
  diffAnswer = final;
  const text = final ? session.final : session.diff || session.detail || 'No changes to preview yet.';
  const signature = JSON.stringify([session.id, text, session.task, session.finished, session.steps]);
  if (signature === diffSignature) return;
  diffSignature = signature;
  document.querySelector('#diff-agent').textContent = session.label || session.agent;
  document.querySelector('#diff-task').textContent = session.finished ? 'Completed' : session.task || 'Working';
  const file = session.file || '';
  document.querySelector('#diff-name').textContent = final ? 'Completed answer' : file.split(/[/\\]/).pop() || 'Activity';
  document.querySelector('#diff-path').textContent = file; document.querySelector('#diff-path').title = file;
  document.querySelector('#diff-counts').textContent = session.diff && !final ? `+${session.added || 0}  −${session.removed || 0}` : '';
  const steps = document.querySelector('#task-steps'); steps.replaceChildren();
  for (const step of window.NookWorkbench.timeline(session)) { const row = document.createElement('li'); row.className = step.current ? 'is-current' : step.done ? 'is-done' : ''; row.textContent = step.label; steps.append(row); }
  diffBox.replaceChildren(); diffBox.hidden = false;
  if (session.diff && !final) {
    for (const row of window.NookWorkbench.diffRows(text)) {
      const line = document.createElement('span'); line.className = 'diff-line ' + row.type;
      const gutter = document.createElement('span'); gutter.className = 'diff-gutter'; gutter.setAttribute('aria-hidden', 'true'); gutter.textContent = row.next ?? row.old ?? '';
      const sign = document.createElement('span'); sign.className = 'diff-sign'; sign.textContent = row.type === 'added' ? '+' : row.type === 'removed' ? '−' : ' ';
      const copy = document.createElement('span'); copy.className = 'diff-code'; copy.textContent = row.text;
      line.append(gutter, sign, copy); diffBox.append(line);
    }
  } else { const copy = document.createElement('span'); copy.className = 'activity-preview'; copy.textContent = text; diffBox.append(copy); }
  document.querySelector("#open-diff").hidden = !session.file;
}
function showDiff(session) {
  selectedSession = session.id; diffAnswer = false; paintDiff(session);
  showCard("diff");
  expanded = true;
  held = true;
  renderShell();
}

function openLatestDiff() {
  const session = ((state && state.sessions) || []).find((item) => item.diff || item.file);
  if (!session) {
    return;
  }
  showDiff(session);
}

function applyChrome() {
  const strings = (state && state.strings) || {};
  const language = state && state.prefs ? (state.prefs.resolvedLanguage || state.prefs.language) : "en";
  document.documentElement.lang = language || "en";
  document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
  if (strings.chat) {
    chatPill.textContent = strings.chat;
  }
  if (strings.pin && strings.unpin) {
    pinButton.setAttribute("aria-label", pinned ? strings.unpin : strings.pin);
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

let transcriptSignature = "";
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
    celebrateCompanion();
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

  layoutCards();
  const quiet = !attention && !hovering && !((state && state.activity) || []).length && !(state && state.attachment);
  seed.classList.toggle("is-doze", quiet && !welcome);
  seed.classList.toggle("is-hold", Boolean(state && state.attachment) || island.classList.contains("is-drop"));
  if (pending) {
    peekLine.textContent = "Allow?";
  } else if (state && state.attachment) {
    peekLine.textContent = state.attachment.name;
  } else {
    const step = ((state && state.activity) || [])[0];
    const session = ((state && state.sessions) || [])[0];
    peekLine.textContent = (step && (step.file || step.title)) || (session && session.final) || "";
  }
  approvalTitle.textContent = pending ? pending.title : "";
  document.querySelector('#approval-agent').textContent = pending ? (state?.sessions?.find(session => session.agent === pending.agent)?.label || pending.agent || 'Agent') + ' needs your review' : '';
  document.querySelector('#approval-queue').textContent = state?.pendingCount > 1 ? state.pendingCount + ' waiting' : '';
  document.querySelector('#approval-error').hidden = true;
  approvalDetail.textContent = pending ? pending.detail : "";
  const questioning = Boolean(pending && pending.kind === "question");
  document.querySelector("#allow").textContent = questioning
    ? (state && state.strings && state.strings.answer) || "Answer"
    : (state && state.strings && state.strings.allow) || "Allow";
  document.querySelector("#always").hidden = !pending || !pending.always;
  document.querySelector("#deny").hidden = questioning;
  paintQuestions(pending);
  paintSessions();
  paintHeader();
  paintTicker();
  const active = state?.sessions?.find(session => !session.finished) || state?.sessions?.[0];
  document.querySelector('#focus-label').textContent = active ? (active.label || active.agent) : 'YOUR WORKSPACE';
  const muted = Boolean(state?.prefs?.muted); const soundButton = document.querySelector('#notch-sound');
  soundButton.setAttribute('aria-pressed', String(muted)); soundButton.setAttribute('aria-label', muted ? 'Enable sounds' : 'Mute sounds'); soundButton.title = muted ? 'Enable sounds' : 'Mute sounds';
  soundButton.replaceChildren(window.NookIcons.icon(muted ? 'muted' : 'sound'));

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
  fileChip.textContent = attached ? attached.name + " ×" : "";
  keyStatus.textContent =
    chatError ||
    (local ? `${label} uses the server on this PC.` : provider === "custom" ? "Custom server · API key is optional; use Models to configure it." : keys[provider] ? `${label} key saved` : `Add the ${label} key in the Nook app.`);
  if (state?.demo) keyStatus.textContent = 'Sample chat · replies stay on this PC · no API charges';
  paintChatRecovery();

  const chatMessages = (state?.messages || []).filter(message => message.provider === provider);
  const nextTranscript = JSON.stringify([provider, label, sending, state?.chatBusyProviders?.includes(provider), chatMessages]);
  if (nextTranscript !== transcriptSignature) {
  transcriptSignature = nextTranscript;
  const stick = transcript.scrollHeight - transcript.scrollTop - transcript.clientHeight < 24;
  transcript.replaceChildren();
  for (const message of chatMessages) {
    if (message.provider !== provider) {
      continue;
    }
    const bubble = document.createElement("div");
    bubble.className = "bubble";
    bubble.dataset.role = message.role;
    transcript.appendChild(bubble);
    const who = document.createElement("strong");
    who.textContent = message.role === "user" ? "You" : label;
    bubble.appendChild(who);
    if (message.role === 'assistant' && !message.content && (sending || state?.chatBusyProviders?.includes(provider))) {
      const dots = document.createElement('span'); dots.className = 'thinking-dots'; dots.setAttribute('aria-label', 'Model is responding');
      for (let index = 0; index < 3; index++) dots.append(document.createElement('i')); bubble.append(dots);
    }
    const content = document.createElement('div');
    content.dataset.noLocalize = 'true';
    content.append(window.NookRichMarkdown.renderMarkdown(message.content, { openUrl: url => window.nook.openChatUrl(url), copyLabel:'Copy code' }));
    bubble.append(content);
    window.NookChatControls?.decorate(bubble,message);
  }
  if (!transcript.children.length) {
    const empty = document.createElement("div"); empty.className = "chat-empty";
    const title = document.createElement("strong"); title.textContent = "A little space to think.";
    const copy = document.createElement("p"); copy.textContent = "Ask a question, work through an idea, or drop a file for context.";
    empty.append(title, copy); transcript.appendChild(empty);
  }
  if (stick) {
    transcript.scrollTop = transcript.scrollHeight;
  }
  }
  renderShell();
}

function wake() {
  if (hovering) {
    return;
  }
  hovering = true;
  if(state?.everyday?.settings?.hoverDashboard && !held && !pinned && !expanded && !chatting && !new URLSearchParams(location.search).has('detached'))showCard('widgets');
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
window.addEventListener("mousemove", (event) => {
  const onIsland = event.target instanceof Element && event.target.closest(".island");
  if (onIsland) {
    wake();
  }
});

island.addEventListener("mouseleave", () => {
  window.clearTimeout(leaveTimer);
  const hoverDelay = state && (state.prefs?.openOnHover || state.everyday?.settings?.hoverDashboard) ? 700 : 0;
  const wait = Math.max(hoverDelay, holdUntil - Date.now());
  leaveTimer = window.setTimeout(() => {
    hovering = false;
    if (!pinned && !waiting()) {
      expanded = false;
      held = false;
    }
    aimX = 0;
    aimY = 0;
    wakeEye();
    renderShell();
  }, Math.max(0, wait));
});

island.addEventListener("click", (event) => {
  if (event.target.closest("button, input, select, textarea, a")) {
    return;
  }
  if (held && !pinned && !waiting() && Date.now() >= holdUntil) {
    held = false;
    expanded = false;
    welcome = false;
    renderShell();
    return;
  }
  expanded = true;
  held = true;
  holdUntil = Date.now() + 400;
  tucked = false;
  welcome = false;
  renderShell();
});

let dragDepth = 0;
function setDrop(active) { island.classList.toggle("is-drop", active); dropCue.hidden = !active; updateCompanion(); }
island.addEventListener("dragenter", event => { if (!Array.from(event.dataTransfer.types).includes("Files")) return; event.preventDefault(); dragDepth++; setDrop(true); expanded = true; renderShell(); });
island.addEventListener("dragover", event => { if (!Array.from(event.dataTransfer.types).includes("Files")) return; event.preventDefault(); event.dataTransfer.dropEffect = "copy"; setDrop(true); });
island.addEventListener("dragleave", () => { dragDepth = Math.max(0, dragDepth - 1); if (!dragDepth) setDrop(false); });
island.addEventListener("drop", async event => {
  event.preventDefault(); dragDepth = 0; setDrop(false);
  const files = Array.from(event.dataTransfer.files || []);
  showCard("chat"); expanded = true;
  receiving = true; renderShell();
  try {
    if(!files.length)throw new Error('Drop a file from Explorer.');
    let attached;
    for(const file of files){const filePath=window.nook.filePath(file);if(!filePath)throw new Error('Drop a file from Explorer.');attached=await window.nook.attachPath(filePath);if(!attached?.ok)throw new Error(attached?.error||'Could not attach this file.');}
    fileChip.textContent = attached.name; fileChip.hidden = false; pulse(fileChip, "is-attached");
    chatError = ""; keyStatus.textContent = "Ready to ask about " + attached.name;
    window.setTimeout(() => { receiving = false; celebrateCompanion(); renderShell(); chatInput.focus(); }, (reducedMotion.matches || state?.look?.motion === "reduced") ? 0 : 450);
  } catch (error) { receiving = false; chatError = error.message; keyStatus.textContent = chatError; renderShell(); }
});
window.addEventListener("dragend", () => { dragDepth = 0; setDrop(false); });

island.addEventListener("mousemove", (event) => {
  const rect = island.getBoundingClientRect();
  aimX = Math.max(-1, Math.min(1, (event.clientX - rect.left - 28) / 70)) * 2.6;
  aimY = Math.max(-1, Math.min(1, (event.clientY - rect.top - 24) / 70)) * 2.2;
});

seed.addEventListener("click", (event) => {
  event.stopPropagation();
  seed.classList.remove("is-hop");
  pulse(seed, "is-squish");
  window.setTimeout(() => seed.classList.remove("is-squish"), 450);
});

seed.addEventListener("mouseenter", () => {
  window.clearTimeout(leanTimer);
  leanTimer = window.setTimeout(() => seed.classList.add("is-lean"), 400);
});

seed.addEventListener("mouseleave", () => {
  window.clearTimeout(leanTimer);
  seed.classList.remove("is-lean");
});

let eyeFrame = 0;
function wakeEye() { if (!eyeFrame && !document.hidden) eyeFrame = requestAnimationFrame(followEye); }
function followEye() {
  eyeFrame = 0;
  if (document.hidden) return;
  const reduced = reducedMotion.matches || state?.look?.motion === 'reduced';
  eyeX = reduced ? aimX : eyeX + (aimX - eyeX) * 0.18;
  eyeY = reduced ? aimY : eyeY + (aimY - eyeY) * 0.18;
  if (seed) {
    seed._nookAim = { x: eyeX, y: eyeY };
    seed.classList.toggle("is-wide", document.body.classList.contains("is-alert"));
  }
  if (Math.abs(eyeX - aimX) + Math.abs(eyeY - aimY) > .01) wakeEye();
}
island.addEventListener('mousemove', wakeEye);
island.addEventListener('mouseleave', wakeEye);
document.addEventListener('visibilitychange', () => { if (document.hidden) { cancelAnimationFrame(eyeFrame); eyeFrame = 0; } else wakeEye(); });
wakeEye();

pinButton.addEventListener("click", (event) => {
  event.stopPropagation();
  pinned = !pinned;
  renderShell();
});

chatPill.addEventListener("click", (event) => {
  event.stopPropagation();
  showCard("chat");
  expanded = true;
  renderShell();
  chatInput.focus();
});

document.querySelector("#diff-back").addEventListener("click", (event) => {
  event.stopPropagation();
  showCard("session");
});

document.querySelector("#chat-settings").addEventListener("click", () => window.nook.openApp("keys"));
document.querySelector("#chat-back").addEventListener("click", () => { showCard("session"); renderShell(); });
const modelPanel = document.querySelector('#chat-model-picker');
const modelOptions = document.querySelector('#chat-model-options');
const modelSearch = document.querySelector('#chat-model-search');
const modelFeedback = document.querySelector('#chat-model-status');
let availableChatModels = [], availableChatDetails = {}, modelLookup = 0;
function closeModelPicker() { modelLookup++; modelPanel.hidden = true; renderShell(); }
let modelOptionSignature='';
function paintChatModelOptions() {
  const signature=JSON.stringify([availableChatModels,availableChatDetails,provider,state?.experience?.settings?.favorites,state?.experience?.settings?.recents,modelSearch.value,sending]);
  if(signature===modelOptionSignature)return;modelOptionSignature=signature;
  const chosen=modelOptions.value;
  modelOptions.replaceChildren();
  const placeholder = document.createElement('option'); placeholder.value = ''; placeholder.textContent = 'Choose a model'; modelOptions.append(placeholder);
  for (const id of window.NookExperience.modelSort(availableChatModels,provider,state?.experience?.settings).filter(id => id.toLowerCase().includes(modelSearch.value.trim().toLowerCase()))) {
    const option = document.createElement('option'); option.value = id; const info=availableChatDetails[id]||{},favorite=state?.experience?.settings?.favorites?.includes(provider+':'+id); option.textContent = (favorite?'★ ':'')+id+(info.vision===true?' · Images':'')+(info.contextWindow?' · '+Math.round(info.contextWindow/1000)+'k':''); modelOptions.append(option);
  }
  if([...modelOptions.options].some(o=>o.value===chosen))modelOptions.value=chosen;
  modelOptions.disabled = sending;
}
document.querySelector('#chat-choose-model').addEventListener('click', async () => {
  if (!modelPanel.hidden) { closeModelPicker(); return; }
  modelPanel.hidden = false; modelSearch.value = ''; availableChatModels = []; paintChatModelOptions();
  modelFeedback.textContent = 'Loading models…'; renderShell();
  const lookup = ++modelLookup, requestedProvider = provider;
  try {
    const result = await window.nook.checkConnection(requestedProvider);
    if (lookup !== modelLookup || provider !== requestedProvider) return;
    availableChatModels = result.models; availableChatDetails=result.details||{}; paintChatModelOptions();
    modelFeedback.textContent = !result.ok ? result.error : availableChatModels.length ? 'Choose a model to use for your next message.' : 'No chat models listed. Use Models to enter an ID manually.';
  } catch (_) { if (lookup === modelLookup) modelFeedback.textContent = 'Could not load models. Try again.'; }
  renderShell();
});
modelSearch.addEventListener('input', paintChatModelOptions);
document.querySelector('#chat-model-close').addEventListener('click', closeModelPicker);
modelOptions.addEventListener('change', async () => {
  if (!modelOptions.value || sending) return;
  const requestedProvider = provider, id = modelOptions.value; modelOptions.disabled = true;
  try { await window.nook.saveModel({ [requestedProvider]: id }); closeModelPicker(); }
  catch (_) { modelFeedback.textContent = 'Could not save this model. Try again.'; }
  finally { modelOptions.disabled = sending; }
});
providerSelect.addEventListener("change", () => {
  provider = providerSelect.value;
  chatError = ""; chatFailure = null; closeModelPicker();
  paint();
});

function decidePending(action) {
  if (state && state.pending) {
    const answers = state.pending.kind === "question" ? collectAnswers() : undefined;
    if (state.pending.kind === 'question' && action !== 'terminal') {
      if (action !== 'allow') return;
      if (!state.pending.questions.length || state.pending.questions.some(question => !answers[question.question]?.trim())) {
        const error = document.querySelector('#approval-error'); error.textContent = 'Answer every question before sending.'; error.hidden = false; return;
      }
    }
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
  if (document.querySelector("dialog[open],.voice-language-picker:not([hidden])")) return;
  if (event.target.matches("input, textarea, select, [contenteditable=true]") && event.key !== "Enter") {
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
  if (event.target.matches("input, textarea, select, [contenteditable=true]")) {
    if (event.target === chatInput && event.ctrlKey && event.key === "Enter") {
      event.preventDefault();
      chatForm.requestSubmit();
    }
    return;
  }
  if ((event.key === "a" || event.key === "A") && !event.ctrlKey && !event.metaKey && !event.altKey) {
    decidePending("allow");
  }
  if ((event.key === "d" || event.key === "D") && !event.ctrlKey && !event.metaKey && !event.altKey) {
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
    showCard("chat");
  }
});

document.querySelector("#deny").addEventListener("click", () => {
  decidePending("deny");
});

weekGrid.addEventListener("click", () => {
  weeksOpen = !weeksOpen;
  paintHeader();
});

fileChip.addEventListener("click", () => {
  window.nook.clearFile();
});

chatInput.addEventListener("focus", () => {
  chatting = true;
  renderShell();
  window.nook.focusWindow();
});

document.addEventListener('pointerdown', event => {
  if (event.target.closest('input,textarea,select,button,[contenteditable=true]')) window.nook.focusWindow();
});

async function runChatAction(action, text, messageId) {
  if(sending)return;const originalProvider=provider;
  const retryText=action==='retry'?state?.messages?.findLast(m=>m.provider===originalProvider&&m.role==='user')?.prompt:text;
  const sendButton=chatForm.querySelector('button[type="submit"]');sending=true;providerSelect.disabled=true;sendButton.disabled=true;sendButton.textContent='…';chatError='';chatFailure=null;renderShell();
  try {
    const result=action==='send'?await window.nook.sendChat(originalProvider,text):await window.nook.chatControl(action,{provider:originalProvider,text,messageId});
    if(!result.ok){chatError=result.error||'Could not send this request.';chatFailure=result.failure?{...result.failure,provider:originalProvider}:null;if(['send','retry'].includes(action)&&!chatInput.value)chatInput.value=retryText||'';playSound('error');}
    else if(!result.stopped)celebrateCompanion();
  }catch{chatError='Could not connect. Please try again.';if(['send','retry'].includes(action)&&!chatInput.value)chatInput.value=retryText||'';playSound('error');}
  finally{sending=false;providerSelect.disabled=false;sendButton.disabled=false;sendButton.textContent='↑';paint();window.NookChatControls?.paint(state);if(chatError)document.querySelector('#chat-error-panel').scrollIntoView({block:'nearest'});}
}
chatForm.addEventListener('submit',event=>{event.preventDefault();const text=chatInput.value.trim();if(!text||sending)return;chatInput.value='';runChatAction('send',text);});

const API_RECOVERY = {
  billing:{label:'Check API billing',url:'https://platform.openai.com/settings/organization/billing'},
  limits:{label:'Check API limits',url:'https://platform.openai.com/settings/organization/limits'},
  project:{label:'Check project settings',url:'https://platform.openai.com/settings/'},
};
function paintChatRecovery() {
  window.clearTimeout(chatRetryTimer);
  const failure=chatFailure?.provider===provider?chatFailure:null;
  const panel=document.querySelector('#chat-error-panel');panel.hidden=!chatError;
  document.querySelector('#chat-error-copy').textContent=chatError;
  document.querySelector('#chat-error-title').textContent=failure?.kind==='quota'?'API quota needs attention':failure?.kind==='rate-limit'?'API rate limit reached':failure?.kind==='limit'?'API limit reached':'Request could not complete';
  const action=provider==='chatgpt'?API_RECOVERY[failure?.action]:null;
  const account=document.querySelector('#chat-error-account');account.hidden=!action;account.textContent=action?.label||'Check API account';
  const retry=document.querySelector('#chat-retry'),wait=Math.max(0,Math.ceil(((failure?.retryAt||0)-Date.now())/1000));
  retry.disabled=sending||wait>0;retry.textContent=wait?`Retry in ${wait}s`:'Retry request';
  if(chatError&&wait)chatRetryTimer=window.setTimeout(paintChatRecovery,1000);
}

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
  if(action.startsWith('provider:')){const id=action.slice(9);if(PROVIDER_NAMES.includes(id)){if(provider!==id){chatError='';chatFailure=null;}provider=id;providerSelect.value=id;showCard('chat');held=true;expanded=true;paint();window.nook.focusWindow();chatInput.focus();}return;}
  if(action.startsWith('service:')){window.nook.openService(action.slice(8));return;}
  if (action === 'home') { showCard('session'); held = true; welcome = false; expanded = true; renderShell(); return; }
  if (action.startsWith('session:')) {
    const session = state?.sessions?.find(item => item.id === action.slice(8));
    if (session) { showDiff(session); if (session.final) paintDiff(session, true); }
    return;
  }
  if (action === "toggle") {
    held = !held;
    expanded = held;
    renderShell();
  }
  if (action === "next" || action === "prev") {
    const sessions = state?.sessions || [];
    if (sessions.length) { const index = sessions.findIndex(session => session.id === selectedSession); showDiff(sessions[(Math.max(0, index) + (action === 'next' ? 1 : -1) + sessions.length) % sessions.length]); }
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

window.nook.onOpenChat(() => {
  showCard("chat");
  expanded = true;
  welcome = false;
  renderShell();
  window.nook.focusWindow();
  chatInput.focus();
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

reducedMotion.addEventListener("change", () => renderShell());
window.nook.onWelcome(showWelcome);
window.nook.onState((next) => {
  if (next.pending?.id !== state?.pending?.id) { tucked = false; attention = false; if(next.pending)window.NookPalette?.close(); }
  const wasDemo = Boolean(state?.demo);
  if (next.demo && !wasDemo) beforeTour = { provider, pinned, held, expanded, welcome, tucked, card, selectedSession };
  state = next;
  if (next.demo) { pinned = true; held = true; welcome = false; tucked = false; if (next.demoStep === 4) provider = 'chatgpt'; showCard(next.demoStep === 4 ? 'chat' : 'session'); }
  else if (wasDemo && beforeTour) {
    provider = beforeTour.provider; pinned = beforeTour.pinned; held = beforeTour.held; expanded = beforeTour.expanded; welcome = beforeTour.welcome; tucked = beforeTour.tucked; selectedSession = beforeTour.selectedSession;
    showCard(beforeTour.card); beforeTour = null;
  }
  paint();
});
seed.addEventListener('contextmenu', event => { event.preventDefault(); window.nook.petMenu(); });
window.nook.onAttention(() => {
  attention = true;
  welcome = false;
  showCard("session");
  renderShell();
});
showWelcome();
document.querySelector('#notch-home').addEventListener('click', () => { showCard('session'); held = true; welcome = false; expanded = true; renderShell(); });
document.querySelector('#notch-chat').addEventListener('click', () => { showCard('chat'); held = true; welcome = false; expanded = true; renderShell(); chatInput.focus(); });
document.querySelector('#notch-settings').addEventListener('click', () => window.nook.openApp());
document.querySelector('#notch-sound').addEventListener('click', () => window.nook.savePrefs({ muted: !state?.prefs?.muted }));
document.querySelector('#chat-retry').addEventListener('click', () => {
  const text=chatInput.value.trim();
  const latestUser=state?.messages?.findLast(m=>m.provider===provider&&m.role==='user');
  if(text){chatInput.value='';runChatAction(latestUser?.prompt===text?'retry':'send',text);}else runChatAction('retry');
});
document.querySelector('#chat-error-settings').addEventListener('click',()=>window.nook.openApp('keys'));
document.querySelector('#chat-error-account').addEventListener('click',()=>{
  const action=provider==='chatgpt'&&chatFailure?.provider===provider?API_RECOVERY[chatFailure.action]:null;
  if(action)window.nook.openChatUrl(action.url);
});
document.querySelector('#notch-attach').addEventListener('click', async () => {
  const button = document.querySelector('#notch-attach'); button.disabled = true;
  held = true; expanded = true; welcome = false; renderShell();
  try { const result = await window.nook.pickFile(); if (result.cancelled) return; showCard('chat'); chatError = result.ok ? '' : result.error; paint(); chatInput.focus(); }
  catch { chatError = 'Could not open that file.'; showCard('chat'); paint(); }
  finally { button.disabled = false; }
});
setInterval(() => {
  if (document.hidden || cardApproval.hidden) return;
  const elapsed = Math.max(0, Math.floor((Date.now() - (state?.pending?.receivedAt || Date.now())) / 1000));
  document.querySelector('#approval-age').textContent = Math.floor(elapsed / 60) + ':' + String(elapsed % 60).padStart(2, '0');
}, 1000);
