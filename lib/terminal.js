const EDITORS = new Set(["windowsterminal", "wt", "code", "cursor", "claude"]);
const CONSOLES = new Set(["cmd", "powershell", "pwsh", "conhost", "openconsole"]);

function baseName(name) {
  return String(name || "")
    .replace(/\.exe$/i, "")
    .toLowerCase();
}

function pickTerminal(chain) {
  const rows = Array.isArray(chain) ? chain : [];
  let desktop = false;
  for (const row of rows) {
    const name = baseName(row && row.name);
    if (name === "claude") {
      desktop = true;
    }
    if (EDITORS.has(name) && name !== "claude") {
      return { kind: "window", pid: Number(row.pid) || 0, desktop };
    }
  }
  const consoleOnly = rows.length > 0 && rows.every((row) => CONSOLES.has(baseName(row && row.name)));
  if (consoleOnly || desktop) {
    return { kind: "folder", pid: 0, desktop };
  }
  return { kind: "folder", pid: 0, desktop };
}

module.exports = { pickTerminal };
