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

function terminalLink(input) {
  if (!input || typeof input !== 'object') return null;
  if (input.host === 'editor' && /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(input.id) && /^[a-f0-9]{64}$/i.test(input.token)) return { host: 'editor', id: input.id, token: input.token, pid: Number.isInteger(Number(input.pid)) && Number(input.pid) > 0 ? Number(input.pid) : 0 };
  if (input.host === 'wt' && /^Nook · [a-f0-9]{12}$/i.test(input.title)) return { host: 'wt', title: input.title };
  return null;
}
module.exports = { pickTerminal, terminalLink };
