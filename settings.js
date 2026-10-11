const pages = {
  look: document.querySelector("#page-look"),
  keys: document.querySelector("#page-keys"),
  agents: document.querySelector("#page-agents"),
  shortcuts: document.querySelector("#page-shortcuts"),
  week: document.querySelector("#page-week"),
  companion: document.querySelector("#page-companion"),
  updates: document.querySelector('#page-updates'),
  workspace: document.querySelector('#page-workspace'),
};
const navButtons = document.querySelectorAll(".nav");
const lookForm = document.querySelector("#look-form");
const radiusValue = document.querySelector("#radius-value");
const previewBody = document.querySelector("#preview-body");
const previewBar = document.querySelector("#preview-bar");
const previewSeed = document.querySelector("#preview-seed");
const previewName = document.querySelector("#preview-name");

let look = null;

function showPage(name) {
  document.querySelector("main").scrollTop = 0;
  for (const [id, page] of Object.entries(pages)) {
    const visible = id === name;
    page.hidden = !visible;
    if (visible) {
      page.classList.remove("is-entering");
      void page.offsetWidth;
      page.classList.add("is-entering");
    }
  }
  for (const button of navButtons) {
    button.classList.toggle("is-selected", button.dataset.page === name);
  }
}

function readLookForm() {
  const data = new FormData(lookForm);
  return {
    accent: String(data.get("accent") || ""),
    paper: String(data.get("paper") || ""),
    islandTop: String(data.get("islandTop") || ""),
    islandBottom: String(data.get("islandBottom") || ""),
    seed: String(data.get("seed") || ""),
    radius: Number(data.get("radius")),
    theme: String(data.get("theme") || "black"),
    density: String(data.get("density") || "comfortable"),
    motion: String(data.get("motion") || "full"),
    notchWidth: Number(data.get("notchWidth") || 620),
  };
}

function paintPreview(next) {
  const radius = Math.min(32, Math.max(10, Number(next.radius) || 22));
  const right = 210;
  const left = 70;
  const bottom = 78;
  const curve = Math.round((radius / 32) * 22);
  previewBody.setAttribute(
    "d",
    `M${left} 0 H${right} V${bottom} Q${right} ${bottom + curve} ${right - curve} ${bottom + curve} H${left + curve} Q${left} ${bottom + curve} ${left} ${bottom} Z`,
  );
  document.querySelector("#fill-top").setAttribute("stop-color", next.islandTop || "#0a0a0a");
  document.querySelector("#fill-bottom").setAttribute("stop-color", next.islandBottom || "#000000");
  previewBar.setAttribute("fill", next.accent || "#b7c6ff");
  previewSeed.setAttribute("fill", next.seed || "#edf0f6");
  document.querySelector("#preview-pupil").setAttribute("fill", next.accent || "#b7c6ff");
  previewName.setAttribute("fill", next.paper || "#edf0f6");
  const companion = document.querySelector(".preview-companion");
  companion.dataset.body = next.seed; companion.dataset.pupil = next.accent;
  radiusValue.textContent = String(radius);
  document.querySelector("#notch-width-value").textContent = (next.notchWidth || 620) + " px";
}

function fillLookForm(next) {
  if (!next) {
    return;
  }
  for (const key of ["accent", "paper", "islandTop", "islandBottom", "seed", "radius", "theme", "density", "motion", "notchWidth"]) {
    const field = lookForm.elements.namedItem(key);
    if (field && document.activeElement !== field) {
      field.value = String(next[key]);
    }
  }
  paintPreview(next);
}

const SERVICE_CARDS = [
  ["deepseek", "DeepSeek", "Chat with DeepSeek using your API key."],
  ["mistral", "Mistral", "Chat with Mistral using your API key."],
  ["groq", "Groq", "Fast inference for open models."],
  ["xai", "Grok", "Chat with Grok through the xAI API."],
  ["openrouter", "OpenRouter", "A key for any model OpenRouter serves. Answers stream in."],
  ["github", "GitHub", "A token that can read your pull requests, reviews, and contribution grid."],
  ["vercel", "Vercel", "A token that can read the latest deployment."],
  ["stripe", "Stripe", "A restricted key that can read the balance."],
  ["resend", "Resend", "A key that can read the latest email."],
  ["notion", "Notion", "An integration token that can search pages."],
  ["n8n", "n8n", "An API key for the n8n server saved on the Week page."],
  ["cal", "Cal.com", "An API key that can read upcoming bookings."],
];

const keysPage = document.querySelector("#page-keys");
for (const [id, title, blurb] of SERVICE_CARDS) {
  const form = document.createElement("form");
  form.className = "key-card";
  form.dataset.provider = id;
  const heading = document.createElement("div");
  heading.className = "key-heading";
  const name = document.createElement("h2");
  name.textContent = title;
  const badge = document.createElement("span");
  badge.className = "badge";
  badge.id = `${id}-badge`;
  badge.textContent = "Not saved";
  heading.append(name, badge);
  const copy = document.createElement("p");
  copy.textContent = blurb;
  const row = document.createElement("div");
  row.className = "key-row";
  const input = document.createElement("input");
  input.type = "password";
  input.autocomplete = "off";
  input.maxLength = 300;
  input.placeholder = "Paste a token";
  const save = document.createElement("button");
  save.type = "submit";
  save.className = "solid";
  save.textContent = "Save";
  const remove = document.createElement("button");
  remove.type = "button";
  remove.className = "ghost remove";
  remove.textContent = "Remove";
  row.append(input, save, remove);
  const note = document.createElement("p");
  note.className = "note";
  note.id = `${id}-note`;
  form.append(heading, copy, row, note);
  keysPage.appendChild(form);
}


const connectionSearch = document.createElement("input"); connectionSearch.type = "search"; connectionSearch.className = "connection-search"; connectionSearch.placeholder = "Find a provider or integration…"; connectionSearch.setAttribute("aria-label", "Find a provider or integration"); keysPage.querySelector("header").append(connectionSearch);
connectionSearch.addEventListener("input", () => {
  const query = connectionSearch.value.trim().toLowerCase();
  for (const form of keysPage.querySelectorAll(".key-card")) form.hidden = !form.querySelector("h2").textContent.toLowerCase().includes(query);
});
const modelIntro = document.createElement("p"); modelIntro.className = "connection-intro"; modelIntro.textContent = "Cloud & local models"; keysPage.querySelector("header").after(modelIntro);
const serviceIntro = document.createElement("p"); serviceIntro.className = "connection-intro"; serviceIntro.textContent = "Workspace integrations"; keysPage.append(serviceIntro);
for (const [id] of SERVICE_CARDS.filter(card => !["openrouter", "deepseek", "mistral", "groq", "xai"].includes(card[0]))) keysPage.append(keysPage.querySelector('[data-provider="' + id + '"]'));
const defaults = { chatgpt: "gpt-4.1-mini", gemini: "gemini-3.8-flash", openrouter: "openai/gpt-4.1-mini", deepseek: "deepseek-chat", mistral: "mistral-small-latest", groq: "llama-3.3-70b-versatile", xai: "grok-4.3" };
for (const field of document.querySelectorAll("#look-form [data-model]")) field.closest("label").remove();
for (const form of document.querySelectorAll(".key-card")) {
  const id = form.dataset.provider;
  if (defaults[id]) {
    const label = document.createElement("label"); label.className = "model-field"; label.textContent = "Model";
    const input = document.createElement("input"); input.dataset.model = id; input.maxLength = 80; input.value = defaults[id];
    label.append(input); form.querySelector(".key-row").before(label);
  }
  if (id === "custom") {
    form.classList.remove("local-card");
    const row = document.createElement("div"); row.className = "key-row";
    const input = document.createElement("input"); input.type = "password"; input.autocomplete = "off"; input.maxLength = 300; input.placeholder = "Optional API key"; input.setAttribute("aria-label", "Custom endpoint API key");
    const save = document.createElement("button"); save.type = "submit"; save.className = "solid"; save.textContent = "Save";
    const remove = document.createElement("button"); remove.type = "button"; remove.className = "ghost remove"; remove.textContent = "Remove";
    row.append(input, save, remove);
    const note = document.createElement("p"); note.id = "custom-note"; note.className = "note";
    form.append(row, note); form.querySelector("h2").textContent = "Custom endpoint";
  }
  const field = form.querySelector("[data-model]"); if (!field) continue;
  const button = document.createElement("button"); button.type = "button"; button.className = "discover ghost"; button.textContent = "Check connection & load models";
  const feedback = document.createElement("p"); feedback.className = "note"; feedback.setAttribute("role", "status");
  const list = document.createElement("datalist"); list.id = "models-" + id; field.setAttribute("list", list.id);
  form.append(button, feedback, list);
  button.addEventListener("click", async () => {
    button.disabled = true; feedback.textContent = "Looking for models…";
    try {
      const result = await window.nook.checkConnection(id, true);
      const models = result.models;
      list.replaceChildren(...models.map(id => { const option = document.createElement("option"); option.value = id; return option; }));
      feedback.textContent = !result.ok ? result.error : models.length ? "Connected · " + models.length + " chat models. Search below to choose one." : "Connected, but no chat models were listed. Enter a model ID manually.";
      feedback.dataset.status = result.ok ? 'connected' : 'error';
    } catch (_) { feedback.textContent = "Could not load models. Enter a model ID manually."; }
    finally { button.disabled = false; }
  });
}
const colorBox = document.querySelector("#agent-colors");
for (const name of ["claude", "cursor", "codex", "copilot", "muse", "opencode", "amp", "hermes"]) {
  const label = document.createElement("label");
  label.append(document.createTextNode(`${name} `));
  const input = document.createElement("input");
  input.type = "color";
  input.dataset.color = name;
  input.value = "#b7c6ff";
  label.appendChild(input);
  colorBox.appendChild(label);
}

function paintKeys(keys, serviceKeys) {
  for (const provider of ["chatgpt", "gemini", "claude", "custom", ...SERVICE_CARDS.map((card) => card[0])]) {
    const badge = document.querySelector(`#${provider}-badge`);
    if (!badge) {
      continue;
    }
    const saved = Boolean((keys && keys[provider]) || (serviceKeys && serviceKeys[provider]));
    badge.textContent = saved ? "Saved" : "Not saved";
    badge.classList.toggle("is-saved", saved);
  }
}

function fillModels(models) {
  if (!models) {
    return;
  }
  for (const field of document.querySelectorAll("[data-model]")) {
    if (document.activeElement !== field && models[field.dataset.model]) {
      field.value = models[field.dataset.model];
    }
  }
  for (const field of document.querySelectorAll("[data-url]")) {
    if (document.activeElement !== field && models[field.dataset.url]) {
      field.value = models[field.dataset.url];
    }
  }
}

navButtons.forEach((button) => {
  button.addEventListener("click", () => showPage(button.dataset.page));
});

let lookSaveTimer = 0;
function applyThemePreset(event) {
  if (event.target.name !== 'theme') return;
  // A user-selected preset replaces only palette colors, keeping layout and motion.
  if (look?.theme === event.target.value) return;
  const preset = window.NookAppearance.normalizeLook({ theme: event.target.value });
  for (const key of ['accent', 'paper', 'islandTop', 'islandBottom', 'seed']) {
    lookForm.elements.namedItem(key).value = preset[key];
  }
}
async function persistLook(next) {
  clearTimeout(lookSaveTimer); lookSaveTimer = 0;
  const note = document.querySelector('#appearance-status');
  try { await window.nook.saveLook(next); note.textContent = ''; }
  catch (_) { note.textContent = 'Could not save the appearance. Try again.'; }
}
lookForm.addEventListener("input", (event) => {
  if (event.target.dataset.model || event.target.dataset.url) {
    return;
  }
  applyThemePreset(event);
  const next = readLookForm();
  look = next;
  paintPreview(next);
  clearTimeout(lookSaveTimer);
  lookSaveTimer = setTimeout(() => persistLook(next), 160);
});
lookForm.addEventListener('change', (event) => {
  if (event.target.dataset.model || event.target.dataset.url) return;
  applyThemePreset(event);
  look = readLookForm();
  paintPreview(look);
  persistLook(look);
});

document.querySelector("#reset-look").addEventListener("click", () => {
  clearTimeout(lookSaveTimer);
  persistLook({});
});

document.querySelectorAll(".local-card").forEach((form) => {
  form.addEventListener("submit", (event) => event.preventDefault());
});

document.querySelectorAll("[data-model], [data-url]").forEach((field) => {
  field.addEventListener("change", async () => {
    const value = field.value.trim();
    const note = field.closest('.key-card')?.querySelector('.note');
    if (field.dataset.model && !/^[A-Za-z0-9._:/-]{1,80}$/.test(value)) {
      if (note) note.textContent = 'Enter a model ID of up to 80 characters, without spaces.';
      return;
    }
    const patch = {};
    if (field.dataset.model) {
      patch[field.dataset.model] = value;
    }
    if (field.dataset.url) {
      patch[field.dataset.url] = value;
    }
    try {
      const result = await window.nook.saveModel(patch);
      const key = field.dataset.model || field.dataset.url;
      if (note) note.textContent = result[key] === value ? 'Model settings saved.' : 'Use HTTPS for a cloud endpoint, or localhost for a local server. Previous address kept.';
    } catch (_) { if (note) note.textContent = 'Could not save model settings. Try again.'; }
  });
});

document.querySelector("#review-hooks").addEventListener("click", async () => {
  const preview = await window.nook.previewHooks();
  const files = (preview && preview.files) || [];
  document.querySelector("#settings-diff").textContent = files
    .map((file) => `${file.label}\n${file.diff}`)
    .join("\n\n");
});

document.querySelector("#install-hooks").addEventListener("click", async () => {
  const result = await window.nook.installHooks();
  document.querySelector("#agents-note").textContent = result.message || "Hooks installed.";
});

document.querySelector("#uninstall-hooks").addEventListener("click", async () => {
  const result = await window.nook.uninstallHooks();
  document.querySelector("#agents-note").textContent = result.message || "Nook hooks removed.";
});

document.querySelectorAll(".key-card:not(.local-card)").forEach((form) => {
  const provider = form.dataset.provider;
  const note = document.querySelector(`#${provider}-note`);
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const input = form.querySelector('[data-secret]');
    const submit = form.querySelector('button[type="submit"]');
    submit.disabled = true;
    try {
      const result = await window.nook.saveKey(provider, input.value);
      if (result.ok) { input.value = ""; input.type = "password"; form.querySelector(".secret-toggle").textContent = "Show"; form.querySelector(".secret-toggle").setAttribute("aria-pressed", "false"); }
      note.textContent = result.ok ? "Key encrypted and saved on this PC." : result.error || "Could not save the key.";
      if (result.ok) form.querySelector('.discover')?.click();
    } catch (_) { note.textContent = "Could not save. Please try again."; }
    finally { submit.disabled = false; }
  });
  form.querySelector(".remove").addEventListener("click", async () => {
    const result = await window.nook.clearKey(provider);
    note.textContent = result.ok ? "Removed." : result.error || "Could not remove the key.";
    if (result.ok) { form.querySelector('datalist')?.replaceChildren(); const status = form.querySelector('.note[data-status]'); if (status) { status.textContent = ''; delete status.dataset.status; } }
  });
});

function fillPrefs(prefs) {
  if (!prefs) {
    return;
  }
  const language = document.querySelector("#language");
  if (document.activeElement !== language) {
    language.value = prefs.language || "en";
  }
  for (const field of document.querySelectorAll("[data-shortcut]")) {
    const value = prefs.shortcuts && prefs.shortcuts[field.dataset.shortcut];
    if (document.activeElement !== field && value) {
      field.value = value;
      field.dispatchEvent(new Event("shortcut-paint"));
    }
  }
  for (const field of document.querySelectorAll("[data-color]")) {
    const value = prefs.colors && prefs.colors[field.dataset.color];
    if (document.activeElement !== field && value) {
      field.value = value;
    }
  }
  for (const field of document.querySelectorAll("[data-service-url]")) {
    const value = prefs[field.dataset.serviceUrl];
    if (document.activeElement !== field && value) {
      field.value = value;
    }
  }
  document.querySelector("#toggle-mute").textContent = prefs.muted ? "Unmute sounds" : "Mute sounds";
  document.querySelector("#open-hover").checked = Boolean(prefs.openOnHover);
  const displayMode = document.querySelector("#display-mode");
  if (document.activeElement !== displayMode) {
    displayMode.value = prefs.displayMode || "follow";
  }
  document.querySelector("#claude-usage").checked = Boolean(prefs.showClaudeUsage);
  document.querySelector("#codex-usage").checked = Boolean(prefs.showCodexUsage);
  document.querySelector("#hide-project").checked = Boolean(prefs.hideProject);
  if (document.activeElement !== document.querySelector("#main-tool")) {
    document.querySelector("#main-tool").value = prefs.mainTool || "";
  }
  for (const box of document.querySelectorAll("[data-pill]")) {
    box.checked = Array.isArray(prefs.pills) && prefs.pills.includes(box.dataset.pill);
  }
}

function paintRecap(recap) {
  if (!recap) {
    return;
  }
  document.querySelector("#recap").textContent = [
    `${recap.sessions} sessions · ${recap.events} events`,
    `${recap.files} files · +${recap.added} −${recap.removed}`,
    `${recap.commands} commands · ${recap.permissions} permissions · ${recap.questions || 0} questions`,
    `Top agent ${recap.topAgent}`,
    `Top project ${recap.topProject || "—"}`,
    `Busiest ${recap.busiest}`,
    `Longest ${Math.round((recap.longest || 0) / 60000)} min`,
  ].join("\n");
}

function collectPrefs() {
  const shortcuts = {};
  for (const field of document.querySelectorAll("[data-shortcut]")) {
    shortcuts[field.dataset.shortcut] = field.value;
  }
  const colors = {};
  for (const field of document.querySelectorAll("[data-color]")) {
    colors[field.dataset.color] = field.value;
  }
  const pills = [...document.querySelectorAll("[data-pill]:checked")].map((box) => box.dataset.pill).slice(0, 4);
  return {
    language: document.querySelector("#language").value,
    shortcuts,
    colors,
    n8nUrl: document.querySelector("#n8n-url").value,
    calUrl: document.querySelector("#cal-url").value,
    openOnHover: document.querySelector("#open-hover").checked,
    displayMode: document.querySelector("#display-mode").value,
    showClaudeUsage: document.querySelector("#claude-usage").checked,
    showCodexUsage: document.querySelector("#codex-usage").checked,
    hideProject: document.querySelector("#hide-project").checked,
    mainTool: document.querySelector("#main-tool").value,
    pills,
  };
}

document.querySelector("#prefs-form").addEventListener("change", () => {
  window.nook.savePrefs(collectPrefs());
});

document.querySelector("#shortcuts-form").addEventListener("change", () => {
  window.nook.savePrefs(collectPrefs());
});

document.querySelector("#hide-project").addEventListener("change", () => {
  window.nook.savePrefs(collectPrefs());
});

colorBox.addEventListener("change", () => {
  window.nook.savePrefs(collectPrefs());
});

document.querySelector("#toggle-mute").addEventListener("click", () => {
  const muted = document.querySelector("#toggle-mute").textContent.startsWith("Unmute");
  window.nook.savePrefs({ muted: !muted });
});

document.querySelector("#open-sounds").addEventListener("click", () => {
  window.nook.openSounds();
});

document.querySelector("#toggle-demo").addEventListener("click", async () => {
  const playing = document.querySelector("#toggle-demo").textContent.startsWith("Stop");
  if (playing) await window.NookTour.finish();
  else await window.NookTour.start();
});

document.querySelector("#send-out").addEventListener("click", () => {
  window.nook.togglePet();
});

const pillBox = document.querySelector("#pill-picks");
for (const name of ["gemini", "copilot", "muse", "opencode", "amp", "hermes", "claude-desktop", "github", "vercel", "stripe", "resend", "notion", "n8n", "cal"]) {
  const label = document.createElement("label");
  const input = document.createElement("input");
  input.type = "checkbox";
  input.dataset.pill = name;
  label.append(input, document.createTextNode(` ${name}`));
  pillBox.appendChild(label);
}

document.querySelector("#save-recap").addEventListener("click", async () => {
  const result = await window.nook.saveRecap();
  document.querySelector("#week-note").textContent = result.ok ? "Saved the week image to Pictures." : "Could not save the image.";
});

window.nook.onShowWeek(() => showPage("week"));

document.querySelector("#copy-recap").addEventListener("click", async () => {
  const svg = await window.nook.recapSvg();
  try {
    await navigator.clipboard.writeText(svg);
    document.querySelector("#week-note").textContent = "Copied the share image as SVG.";
  } catch (_error) {
    document.querySelector("#recap").textContent = svg;
  }
});

window.nook.onState((state) => {
  document.querySelector('#key-storage-status').textContent = state.keyStorage?.ready ? 'Keys are stored in Windows Credential Manager.' : state.keyStorage?.error || '';
  if (!lookSaveTimer) { look = state.look || look; fillLookForm(state.look); }
  paintKeys(state.keys, state.serviceKeys);
  fillModels(state.models);
  fillPrefs(state.prefs);
  paintRecap(state.recap);
  document.querySelector("#toggle-demo").textContent = state.demo ? "Stop demo" : "Play demo";
});

showPage("look");

const companionPreview = document.querySelector('.preview-companion');
for (const [mood,label] of [['idle','Idle'],['curious','Curious'],['focused','Working'],['reading','Reading'],['coding','Editing'],['running','Terminal'],['thinking','Thinking'],['expectant','Approval'],['happy','Complete'],['receiving','File drop'],['sleepy','Sleepy']]) {
  const button=document.createElement('button');button.type='button';button.className='ghost';button.textContent=label;button.setAttribute('aria-pressed',mood==='idle'?'true':'false');
  button.addEventListener('click',()=>{companionPreview.dataset.mood=mood;document.querySelectorAll('.mood-preview button').forEach(b=>b.setAttribute('aria-pressed',b===button?'true':'false'));});document.querySelector('.mood-preview').append(button);
}
