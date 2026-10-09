const pages = {
  look: document.querySelector("#page-look"),
  keys: document.querySelector("#page-keys"),
  agents: document.querySelector("#page-agents"),
  week: document.querySelector("#page-week"),
};
const navButtons = document.querySelectorAll(".nav");
const lookForm = document.querySelector("#look-form");
const radiusValue = document.querySelector("#radius-value");
const previewBody = document.querySelector("#preview-body");
const previewBar = document.querySelector("#preview-bar");
const previewSeed = document.querySelector("#preview-seed");
const previewName = document.querySelector("#preview-name");
const brandSeed = document.querySelector("#brand-seed");

let look = null;

function showPage(name) {
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
  document.querySelector("#fill-top").setAttribute("stop-color", next.islandTop || "#22252c");
  document.querySelector("#fill-bottom").setAttribute("stop-color", next.islandBottom || "#14161a");
  previewBar.setAttribute("fill", next.accent || "#dff25a");
  previewSeed.setAttribute("fill", next.seed || "#f4f0e6");
  document.querySelector("#preview-pupil").setAttribute("fill", next.accent || "#dff25a");
  previewName.setAttribute("fill", next.paper || "#f4f0e6");
  brandSeed.setAttribute("fill", next.accent || "#dff25a");
  radiusValue.textContent = String(radius);
}

function fillLookForm(next) {
  if (!next) {
    return;
  }
  for (const key of ["accent", "paper", "islandTop", "islandBottom", "seed", "radius"]) {
    const field = lookForm.elements.namedItem(key);
    if (field && document.activeElement !== field) {
      field.value = String(next[key]);
    }
  }
  paintPreview(next);
}

const SERVICE_CARDS = [
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

const colorBox = document.querySelector("#agent-colors");
for (const name of ["claude", "cursor", "codex", "copilot", "muse", "opencode", "amp", "hermes"]) {
  const label = document.createElement("label");
  label.append(document.createTextNode(`${name} `));
  const input = document.createElement("input");
  input.type = "color";
  input.dataset.color = name;
  input.value = "#dff25a";
  label.appendChild(input);
  colorBox.appendChild(label);
}

function paintKeys(keys, serviceKeys) {
  for (const provider of ["chatgpt", "gemini", "claude", ...SERVICE_CARDS.map((card) => card[0])]) {
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

lookForm.addEventListener("input", (event) => {
  if (event.target.dataset.model || event.target.dataset.url) {
    return;
  }
  const next = readLookForm();
  look = next;
  paintPreview(next);
  window.nook.saveLook(next);
});

document.querySelector("#reset-look").addEventListener("click", () => {
  window.nook.saveLook({
    accent: "#dff25a",
    paper: "#f4f0e6",
    islandTop: "#22252c",
    islandBottom: "#14161a",
    seed: "#f4f0e6",
    radius: 22,
  });
});

document.querySelectorAll(".local-card").forEach((form) => {
  form.addEventListener("submit", (event) => event.preventDefault());
});

document.querySelectorAll("[data-model], [data-url]").forEach((field) => {
  field.addEventListener("change", () => {
    const patch = {};
    if (field.dataset.model) {
      patch[field.dataset.model] = field.value;
    }
    if (field.dataset.url) {
      patch[field.dataset.url] = field.value;
    }
    window.nook.saveModel(patch);
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

document.querySelectorAll(".key-card:not(.local-card)").forEach((form) => {
  const provider = form.dataset.provider;
  const note = document.querySelector(`#${provider}-note`);
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const input = form.querySelector('input[type="password"]');
    const result = await window.nook.saveKey(provider, input.value);
    input.value = "";
    note.textContent = result.ok ? "Saved." : result.error || "Could not save the key.";
  });
  form.querySelector(".remove").addEventListener("click", async () => {
    const result = await window.nook.clearKey(provider);
    note.textContent = result.ok ? "Removed." : result.error || "Could not remove the key.";
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
  await window.nook.setDemo(!playing);
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

document.querySelectorAll("[data-shortcut]").forEach((field) => {
  field.readOnly = true;
  field.addEventListener("keydown", (event) => {
    event.preventDefault();
    if (["Control", "Shift", "Alt", "Meta"].includes(event.key)) {
      return;
    }
    const parts = [];
    if (event.ctrlKey || event.metaKey) {
      parts.push("CommandOrControl");
    }
    if (event.shiftKey) {
      parts.push("Shift");
    }
    if (event.altKey) {
      parts.push("Alt");
    }
    const named = { ArrowRight: "Right", ArrowLeft: "Left", ArrowUp: "Up", ArrowDown: "Down", " ": "Space" };
    const key = named[event.key] || (event.key.length === 1 ? event.key.toUpperCase() : event.key);
    parts.push(key);
    const combo = parts.join("+");
    if (/^CommandOrControl\+Alt\+[A-Z]$/.test(combo)) {
      document.querySelector("#week-note").textContent = "That shortcut types a character on some keyboards.";
      return;
    }
    field.value = combo;
    window.nook.savePrefs(collectPrefs());
  });
});

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
  look = state.look || look;
  fillLookForm(state.look);
  paintKeys(state.keys, state.serviceKeys);
  fillModels(state.models);
  fillPrefs(state.prefs);
  paintRecap(state.recap);
  document.querySelector("#toggle-demo").textContent = state.demo ? "Stop demo" : "Play demo";
});

showPage("look");
