const test = require("node:test");
const assert = require("node:assert/strict");
const {
  mergeClaudeSettings,
  mergeCursorHooks,
  mergeCodexSettings,
  mergeCopilotHooks,
  hooksInstalled,
} = require("../lib/install-hooks");

const watch = '"C:\\nook\\hooks\\nook-hook.cmd" --agent claude';
const wait = '"C:\\nook\\hooks\\nook-hook.cmd" --agent claude --wait';
const cursorWatch = '"C:\\nook\\hooks\\nook-hook.cmd" --agent cursor';
const cursorWait = '"C:\\nook\\hooks\\nook-hook.cmd" --agent cursor --wait';

test("claude merge keeps other hooks and replaces ours", () => {
  const existing = {
    theme: "dark",
    hooks: {
      Stop: [
        { matcher: "*", hooks: [{ type: "command", command: "echo keep" }] },
        {
          matcher: "*",
          hooks: [{ type: "command", command: '"old\\nook-hook.cmd" --agent claude' }],
        },
      ],
    },
  };
  const next = mergeClaudeSettings(existing, watch, wait);
  assert.equal(next.theme, "dark");
  assert.equal(next.hooks.Stop.filter((entry) => entry.hooks[0].command === "echo keep").length, 1);
  assert.equal(next.hooks.Stop.filter((entry) => String(entry.hooks[0].command).includes("nook-hook.cmd")).length, 1);
  assert.equal(next.hooks.PermissionRequest[0].hooks[0].command, wait);
  const again = mergeClaudeSettings(next, watch, wait);
  assert.equal(again.hooks.PermissionRequest.length, 1);
  assert.equal(again.hooks.Stop.length, 2);
});

test("cursor merge keeps a foreign command", () => {
  const next = mergeCursorHooks(
    { version: 1, hooks: { stop: [{ command: "./mine.sh" }] } },
    cursorWatch,
    cursorWait,
  );
  assert.deepEqual(
    next.hooks.stop.map((entry) => entry.command),
    ["./mine.sh", cursorWatch],
  );
  assert.equal(next.hooks.beforeShellExecution[0].command, cursorWait);
  assert.equal(hooksInstalled(next), true);
});

test("codex and copilot merges keep foreign hooks", () => {
  const codex = mergeCodexSettings(
    { hooks: { Stop: [{ matcher: "*", hooks: [{ type: "command", command: "echo keep" }] }] } },
    '"nook-hook.cmd" --agent codex',
    '"nook-hook.cmd" --agent codex --wait',
  );
  assert.equal(codex.hooks.Stop[0].hooks[0].command, "echo keep");
  assert.match(codex.hooks.PermissionRequest[0].hooks[0].commandWindows, /nook-hook.cmd/);
  const copilot = mergeCopilotHooks(
    { hooks: { sessionStart: [{ powershell: "echo keep" }] } },
    '"nook-hook.cmd" --agent copilot',
    '"nook-hook.cmd" --agent copilot --wait',
  );
  assert.equal(copilot.hooks.sessionStart[0].powershell, "echo keep");
  assert.match(copilot.hooks.permissionRequest[0].powershell, /nook-hook.cmd/);
});
