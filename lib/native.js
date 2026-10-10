const { execFile } = require("child_process");
const path = require("path");
function runScript(file, args = [], timeout = 15000) {
  return new Promise((resolve) => {
    execFile(
      "powershell.exe",
      [
        "-NoLogo",
        "-NoProfile",
        "-NonInteractive",
        "-ExecutionPolicy",
        "Bypass",
        "-File",
        path.join(__dirname, file),
        ...args,
      ],
      { windowsHide: true, timeout, maxBuffer: 4000000 },
      (error, output) => {
        try {
          resolve(JSON.parse(output.trim().replace(/^\uFEFF/, "")));
        } catch (_) {
          resolve({
            ok: false,
            error: error
              ? "Windows integration is unavailable or timed out."
              : "Windows returned an invalid response.",
          });
        }
      },
    );
  });
}
function media(action = "status", seconds = 0) {
  if (
    ![
      "status",
      "toggle",
      "next",
      "previous",
      "seek",
      "shuffle",
      "repeat",
    ].includes(action)
  )
    return Promise.resolve({ ok: false, error: "Unknown media action." });
  return runScript("windows-media.ps1", [
    "-Action",
    action,
    "-Position",
    String(
      Math.round(Math.max(0, Math.min(86400, Number(seconds) || 0)) * 10000000),
    ),
  ]);
}
module.exports = { runScript, media };
module.exports.windowAtPoint = (x, y, skipPid) =>
  runScript("windows-window.ps1", [
    "-X",
    String(Math.round(x)),
    "-Y",
    String(Math.round(y)),
    "-SkipPid",
    String(skipPid),
  ]);
