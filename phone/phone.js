let token = sessionStorage.getItem("nook-token") || "",
  timer,
  pendingId = "";
let selectedId = "",
  lastDetail = "",
  phoneState = null;
let serviceGeneration = 0;
const select = (id) => document.getElementById(id),
  message = (text) => (select("message").textContent = text);
async function request(route, options = {}) {
  const response = await fetch(route, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: "Bearer " + token } : {}),
      ...options.headers,
    },
  });
  const result = await response.json();
  if (response.status === 401 && route != "/pair") {
    token = "";
    sessionStorage.removeItem("nook-token");
    show();
  }
  if (!response.ok) throw new Error(result.error || "Could not connect.");
  return result;
}
function show() {
  if (!token) { serviceGeneration++; select('service-detail').hidden = true; select('service-detail-items').replaceChildren(); }
  select("pair").hidden = Boolean(token);
  select("dashboard").hidden = !token;
  clearTimeout(timer);
  if (token) update();
}
select("pair-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = event.target.querySelector("button");
  button.disabled = true;
  try {
    const result = await request("/pair", {
      method: "POST",
      body: JSON.stringify({ code: select("code").value }),
    });
    token = result.token;
    sessionStorage.setItem("nook-token", token);
    message("");
    show();
  } catch (error) {
    message(error.message);
  } finally {
    button.disabled = false;
  }
});
select("logout").addEventListener("click", async () => {
  try {
    await request("/logout", { method: "POST" });
  } catch (_) {}
  token = "";
  sessionStorage.removeItem("nook-token");
  message("Disconnected.");
  show();
});
function card(title, detail) {
  const node = document.createElement("div");
  node.className = "card";
  const heading = document.createElement("strong");
  heading.textContent = title;
  const copy = document.createElement("small");
  copy.textContent = detail;
  node.append(heading, copy);
  return node;
}
function approval(item) {
  const box = select("approval");
  box.hidden = !item;
  if (!item) {
    pendingId = "";
    box.replaceChildren();
    return;
  }
  if (pendingId === item.id) return;
  pendingId = item.id;
  box.replaceChildren();
  const title = document.createElement("h2");
  title.textContent = item.title;
  const detail = document.createElement("pre");
  detail.textContent = item.detail;
  box.append(title, detail);
  for (const question of item.questions || []) {
    const group = document.createElement("div");
    group.className = "question";
    group.dataset.question = question.question;
    const label = document.createElement("label");
    label.textContent = question.question;
    group.append(label);
    for (const option of question.options || []) {
      const row = document.createElement("label");
      row.className = "choice";
      const input = document.createElement("input");
      input.type = question.multi ? "checkbox" : "radio";
      input.name = question.question;
      input.value = option.label;
      row.append(input, document.createTextNode(option.label));
      group.append(row);
    }
    const other = document.createElement("input");
    other.placeholder = "Or type your answer";
    other.setAttribute("aria-label", "Your answer to " + question.question);
    other.className = "typed";
    group.append(other);
    box.append(group);
  }
  const choices =
    item.kind === "question"
      ? [["allow", "Submit answers"]]
      : [
          ["allow", "Allow"],
          ["deny", "Deny"],
          ...(item.always ? [["always", "Always allow"]] : []),
        ];
  for (const [action, label] of choices) {
    const button = document.createElement("button");
    button.textContent = label;
    if (action === "deny") button.className = "deny";
    button.addEventListener("click", async () => {
      const answers = {};
      for (const group of box.querySelectorAll(".question"))
        answers[group.dataset.question] =
          group.querySelector(".typed").value.trim() ||
          Array.from(group.querySelectorAll("input:checked"))
            .map((input) => input.value)
            .join(", ");
      for (const control of box.querySelectorAll("button"))
        control.disabled = true;
      try {
        await request("/decide", {
          method: "POST",
          body: JSON.stringify({ id: item.id, action, answers }),
        });
        pendingId = "";
        message("Response sent to your PC.");
        update();
      } catch (error) {
        message(error.message);
        for (const control of box.querySelectorAll("button"))
          control.disabled = false;
      }
    });
    box.append(button);
  }
}
async function update() {
  clearTimeout(timer);
  if (!token || document.hidden) return;
  try {
    const state = await request("/state");
    select("status").textContent = state.status;
    select("connection").textContent =
      "Connected to your PC · " + new Date(state.updated).toLocaleTimeString();
    phoneState = state;
    select("sessions").replaceChildren(
      ...state.sessions.map((session) => {
        const node = card(
          session.label || session.agent,
          (session.finished ? "Finished" : "Working") +
            (session.file ? " · " + session.file : ""),
        );
        const button = document.createElement("button");
        button.className = "quiet";
        button.textContent = state.detailsEnabled
          ? "View session"
          : "Prepare instruction";
        button.hidden = !state.detailsEnabled && !state.instructionsEnabled;
        button.addEventListener("click", () => {
          selectedId = session.id;
          lastDetail = "";
          paintDetail();
        });
        node.append(button);
        return node;
      }),
    );
    select("activity").replaceChildren(
      ...state.activity.map((item) =>
        card(item.title, item.detail || item.agent),
      ),
    );
    approval(state.pending);
    select("services").replaceChildren(
      ...(state.services || []).map((item) => { const node = card(item.title, item.detail); if (['github', 'vercel', 'n8n'].includes(item.id)) { const button = document.createElement('button'); button.textContent = 'View details'; button.className = 'quiet'; button.addEventListener('click', () => openService(item.id)); node.append(button); } return node; }),
    );
    select("services-title").hidden = !(state.services || []).length;
    if (selectedId) await paintDetail();
    paintFocus();
  } catch (error) {
    select("connection").textContent = "PC unreachable. Retrying…";
    message(error.message);
  } finally {
    if (token) timer = setTimeout(update, 2500);
  }
}
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) update();
  else clearTimeout(timer);
});
show();
async function paintDetail() {
  const session = phoneState?.sessions.find((item) => item.id === selectedId);
  const enabled = phoneState?.detailsEnabled || phoneState?.instructionsEnabled;
  select("session-detail").hidden = !session || !enabled;
  if (!session || !enabled) {
    selectedId = "";
    return;
  }
  select("session-title").textContent = session.label || session.agent;
  select("instruction-form").hidden = !phoneState.instructionsEnabled;
  select("session-sharing").textContent = phoneState.detailsEnabled
    ? "Shared from your PC · latest 30 steps"
    : "Session details are off. Enable sharing in Companion & devices.";
  if (!phoneState.detailsEnabled) {
    select("session-steps").replaceChildren();
    select("session-final").replaceChildren();
    return;
  }
  const id = selectedId;
  try {
    const detail = await request("/session?id=" + encodeURIComponent(id));
    if (selectedId !== id) return;
    const signature = JSON.stringify(detail);
    if (signature === lastDetail) return;
    lastDetail = signature;
    select("session-steps").replaceChildren(
      ...detail.steps.map((step) => {
        const row = card(
          step.task || step.title || "Step",
          new Date(step.time).toLocaleTimeString() +
            (step.file ? " · " + step.file : ""),
        );
        const text = document.createElement("p");
        text.textContent = step.detail;
        row.append(text);
        if (step.diff) {
          const expand = document.createElement("details");
          const title = document.createElement("summary");
          title.textContent = `View diff · +${step.added} −${step.removed}`;
          const code = document.createElement("pre");
          code.textContent = step.diff;
          expand.append(title, code);
          row.append(expand);
        }
        return row;
      }),
    );
    select("session-final").replaceChildren();
    if (detail.final)
      select("session-final").append(card("Completed answer", detail.final));
  } catch (error) {
    select("session-sharing").textContent = error.message;
  }
}
select("session-close").addEventListener("click", () => {
  selectedId = "";
  select("session-detail").hidden = true;
});
select("instruction-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = event.target.querySelector("button");
  button.disabled = true;
  try {
    await request("/instruction", {
      method: "POST",
      body: JSON.stringify({
        id: selectedId,
        text: select("instruction").value,
      }),
    });
    select("instruction").value = "";
    message("Draft sent. Review it in Nook on your PC.");
  } catch (error) {
    message(error.message);
  } finally {
    button.disabled = false;
  }
});
function paintFocus() {
  const focus = select("focus-mode").checked;
  select('focus-empty').hidden = !focus || Boolean(phoneState?.pending);
  for (const id of ["sessions", "activity", "services"])
    select(id).hidden = focus;
  for (const heading of select("dashboard").querySelectorAll(":scope > h2"))
    heading.hidden =
      focus ||
      (heading.id === "services-title" && !(phoneState?.services || []).length);
  if (focus) select("session-detail").hidden = true;
  else if (selectedId) select("session-detail").hidden = false;
}
select("focus-mode").addEventListener("change", paintFocus);
async function openService(id) {
  const generation = ++serviceGeneration;
  select('service-detail').hidden = false; select('service-name').textContent = id; select('service-message').textContent = 'Loading…'; select('service-detail-items').replaceChildren();
  try {
    const result = await request('/service?id=' + encodeURIComponent(id)); if (generation !== serviceGeneration) return;
    select('service-message').textContent = result.items.length + ' recent items';
    for (const item of result.items) {
      const node = card(item.title, item.detail);
      for (const action of item.actions || []) { const button = document.createElement('button'); button.textContent = action.label; button.addEventListener('click', async () => { button.disabled = true; try { const result = await request('/service-action', { method: 'POST', body: JSON.stringify({ id: action.id }) }); select('service-message').textContent = result.cancelled ? 'Cancelled on the PC.' : 'Completed. Refresh the service for its latest state.'; } catch (error) { select('service-message').textContent = error.message; } }); node.append(button); }
      select('service-detail-items').append(node);
    }
  } catch (error) { select('service-message').textContent = error.message; }
}
select('service-close').addEventListener('click', () => { serviceGeneration++; select('service-detail').hidden = true; });
