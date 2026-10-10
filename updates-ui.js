(() => {
  const select = (id) => document.getElementById(id);
  function paint(state) {
    select("update-version").textContent = "Nook " + state.currentVersion;
    select("update-message").textContent = state.message;
    select("update-auto").checked = state.automatic;
    select("update-auto").disabled = state.phase === "unsupported";
    const busy = ["checking", "downloading"].includes(state.phase);
    select("update-token-save").disabled =
      busy || state.phase === "unsupported";
    select("update-token-clear").disabled = busy || !state.accessSaved;
    select("update-token-state").textContent = state.accessSaved
      ? "Token saved securely on this PC."
      : state.accessRequired ? "No token saved. Repository access is required." : "No token needed. Nook downloads from its public releases.";
    select("update-check").disabled = [
      "unsupported",
      "access-required",
      "checking",
      "downloading",
      "ready",
    ].includes(state.phase);
    select("update-download").hidden = state.phase !== "available";
    select("update-install").hidden = state.phase !== "ready";
    select("update-progress").hidden = state.phase !== "downloading";
    select("update-progress").value = state.progress;
    select("update-progress").setAttribute(
      "aria-label",
      `Downloading update: ${state.progress}%`,
    );
    select("update-checked").textContent = state.checkedAt
      ? "Last checked " + new Date(state.checkedAt).toLocaleString()
      : "";
    const badge = select("update-badge");
    badge.hidden = !["available", "ready"].includes(state.phase);
    badge.textContent = state.phase === "ready" ? "Ready" : "New";
    document.querySelector(".sidebar-footer .version").textContent =
      "Nook · " + state.currentVersion;
  }
  for (const action of ["check", "download", "install"])
    select("update-" + action).addEventListener("click", async () => {
      try {
        const result = await window.nook.update(action);
        paint(result);
      } catch (_) {
        select("update-message").textContent =
          "Could not complete the update. Try again.";
      }
    });
  select("update-auto").addEventListener("change", async (event) => {
    try {
      paint(await window.nook.update("automatic", event.target.checked));
    } catch (_) {
      select("update-message").textContent =
        "Could not save your update preference.";
    }
  });
  select("update-github").addEventListener("click", () =>
    window.nook.openUrl(
      "https://github.com/hoeslovevid/Nook-Interactive-Assistant/releases/latest",
    ),
  );
  select("update-access-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      const result = await window.nook.updateAccess(
        "save",
        select("update-token").value,
      );
      if (!result.ok) {
        select("update-token-state").textContent = result.error;
        return;
      }
      select("update-token").value = "";
      paint(result);
    } catch (_) {
      select("update-token-state").textContent = "Could not save your token.";
    }
  });
  select("update-token-clear").addEventListener("click", async () => {
    const result = await window.nook.updateAccess("clear");
    if (result.ok) paint(result);
    else select("update-token-state").textContent = result.error;
  });
  window.nook.onState((state) => {
    if (state.updates) paint(state.updates);
  });
})();
