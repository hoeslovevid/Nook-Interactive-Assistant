const featureSelect = (id) => document.getElementById(id);
let companionConfig = window.NookCompanion.normalize();
async function saveCompanion(patch) {
  try {
    companionConfig = await window.nook.saveCompanion(patch);
    paintCompanionSettings();
    featureSelect("wardrobe-note").textContent = "Saved. Nook is ready.";
  } catch (_) {
    featureSelect("wardrobe-note").textContent = "Could not save. Try again.";
  }
}
const outfitLabels = {
  none: "Original",
  cap: "Day off",
  glasses: "Bookworm",
  headphones: "Headphones",
  scarf: "Cozy scarf",
  winter: "Winter",
  crown: "Little monarch", bow: "Blush bow", raincoat: "Rainy day",
};
for (const outfit of window.NookCompanion.OUTFITS) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "outfit-option";
  button.dataset.outfit = outfit;
  button.setAttribute("aria-pressed", "false");
  const canvas = document.createElement("canvas");
  canvas.width = 192;
  canvas.height = 192;
  canvas.className = "seed outfit-preview";
  canvas.dataset.outfit = outfit;
  const text = document.createElement("span");
  text.textContent = outfitLabels[outfit];
  button.append(canvas, text);
  button.addEventListener("click", () =>
    saveCompanion({ outfit, seasonal: false }),
  );
  featureSelect("wardrobe").append(button);
}
function paintCompanionSettings() {
  if (featureSelect('phone-auto-start')) featureSelect('phone-auto-start').checked = companionConfig.phoneAutoStart;
  featureSelect("phone-details").checked = companionConfig.phoneDetails;
  featureSelect("phone-instructions").checked =
    companionConfig.phoneInstructions;
  featureSelect("seasonal-outfit").checked = companionConfig.seasonal;
  featureSelect("music-enabled").checked = companionConfig.music;
  featureSelect("voice-service").value = companionConfig.voice;
  for (const button of document.querySelectorAll(".outfit-option"))
    button.setAttribute(
      "aria-pressed",
      button.dataset.outfit === window.NookCompanion.outfit(companionConfig)
        ? "true"
        : "false",
    );
  for (const canvas of document.querySelectorAll(
    ".preview-companion",
  ))
    window.NookCompanion.apply(canvas, companionConfig);
}
const autoPhone = document.createElement('label'); autoPhone.className = 'feature-toggle';
autoPhone.innerHTML = '<input type="checkbox" id="phone-auto-start"> Start phone access with Nook <small>Use the same address after restarting; only enable on trusted Wi-Fi</small>';
document.querySelector('.phone-setup').append(autoPhone);
autoPhone.querySelector('input').addEventListener('change', event => saveCompanion({ phoneAutoStart: event.target.checked }));
featureSelect("seasonal-outfit").addEventListener("change", (event) =>
  saveCompanion({ seasonal: event.target.checked }),
);
featureSelect("music-enabled").addEventListener("change", (event) =>
  saveCompanion({ music: event.target.checked }),
);
featureSelect("voice-service").addEventListener("change", (event) =>
  saveCompanion({ voice: event.target.value }),
);
featureSelect("check-music").addEventListener("click", async () => {
  try {
    const result = await window.nook.media("status");
    featureSelect("music-note").textContent = result.available
      ? result.title || "Media connected"
      : result.error ||
        "Start playback in a supported music app, then refresh.";
  } catch (_) {
    featureSelect("music-note").textContent =
      "Could not reach Windows media controls.";
  }
});
function paintPhone(result) {
  const enabled = Boolean(result.enabled);
  featureSelect("phone-enable").hidden = enabled;
  for (const id of ["phone-disable", "phone-revoke", "phone-pairing"])
    featureSelect(id).hidden = !enabled;
  featureSelect("phone-url").textContent =
    result.urls?.[0] || "No Wi-Fi address found";
  featureSelect("phone-code").textContent =
    result.code || "Expired · get a new code";
  featureSelect("phone-count").textContent =
    (result.paired || 0) + " paired devices · sessions expire after 24 hours";
}
for (const [id, action] of [
  ["phone-enable", "start"],
  ["phone-disable", "stop"],
  ["phone-revoke", "rotate"],
])
  featureSelect(id).addEventListener("click", async () => {
    const button = featureSelect(id);
    button.disabled = true;
    try {
      const result = await window.nook.phone(action);
      if (!result.ok) throw new Error(result.error);
      paintPhone(result);
      featureSelect("phone-note").textContent =
        action === "stop"
          ? "Phone access disabled."
          : "Use the address and code above. Windows may ask you to allow access on private networks.";
    } catch (error) {
      featureSelect("phone-note").textContent = error.message;
    } finally {
      button.disabled = false;
    }
  });
featureSelect("phone-copy").addEventListener("click", async () => {
  const result = await window.nook.copyPhone();
  featureSelect("phone-note").textContent = result.ok
    ? "Address copied."
    : result.error;
});
window.nook.onState((state) => {
  companionConfig = window.NookCompanion.normalize(state.features?.companion);
  paintCompanionSettings();
  paintPhone(state.features?.phone || {});
  paintDrafts(state.features?.drafts || []);
});
for (const [id, key] of [
  ["phone-details", "phoneDetails"],
  ["phone-instructions", "phoneInstructions"],
])
  featureSelect(id).addEventListener("change", (event) =>
    saveCompanion({ [key]: event.target.checked }),
  );
let draftsSignature = "";
function paintDrafts(drafts) {
  const signature = JSON.stringify(drafts);
  if (signature === draftsSignature) return;
  draftsSignature = signature;
  const box = featureSelect("phone-drafts");
  box.replaceChildren();
  if (!drafts.length) {
    box.textContent =
      "No drafts waiting. Send one from a paired phone session.";
    return;
  }
  for (const draft of drafts) {
    const card = document.createElement("article");
    card.className = "draft-card";
    const title = document.createElement("strong");
    title.textContent = draft.label || draft.agent;
    const copy = document.createElement("p");
    copy.textContent = draft.text;
    const actions = document.createElement("div");
    actions.className = "settings-actions";
    for (const [action, label] of [
      ["copy", "Copy draft"],
      ["terminal", "Copy & open terminal"],
      ["dismiss", "Dismiss"],
    ]) {
      const button = document.createElement("button");
      button.className = "ghost";
      button.textContent = label;
      button.addEventListener("click", async () => {
        const result = await window.nook.phoneDraft(
          draft.id,
          action === "terminal" ? "copy" : action,
        );
        if (!result.ok) {
          featureSelect("phone-note").textContent = result.error;
          return;
        }
        if (action === "terminal")
          await window.nook.openTerminal(draft.sessionId);
        featureSelect("phone-note").textContent =
          action === "dismiss"
            ? "Draft dismissed."
            : "Draft copied. Review and paste it into the session when ready.";
      });
      actions.append(button);
    }
    card.append(title, copy, actions);
    box.append(card);
  }
}
setInterval(async () => {
  if (document.hidden || featureSelect("page-companion").hidden) return;
  try {
    const result = await window.nook.phone("status");
    if (result.ok) paintPhone(result);
  } catch (_) {}
}, 5000);
paintCompanionSettings();
