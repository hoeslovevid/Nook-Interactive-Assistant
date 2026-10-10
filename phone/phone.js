let token = sessionStorage.getItem("nook-token") || "",
  timer,
  pendingId = "";
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
    select("sessions").replaceChildren(
      ...state.sessions.map((session) =>
        card(
          session.label || session.agent,
          (session.finished ? "Finished" : "Working") +
            (session.file ? " · " + session.file : ""),
        ),
      ),
    );
    select("activity").replaceChildren(
      ...state.activity.map((item) =>
        card(item.title, item.detail || item.agent),
      ),
    );
    approval(state.pending);
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
