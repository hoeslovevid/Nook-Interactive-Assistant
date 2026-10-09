const test = require("node:test");
const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const path = require("node:path");
const { createRelay } = require("../lib/relay");
const { decisionOutput } = require("../lib/decisions");

const hookPath = path.join(__dirname, "..", "hooks", "nook-hook.js");

function runHook(pipe, args, payload) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [hookPath, ...args], {
      env: { ...process.env, NOOK_PIPE: pipe },
      stdio: ["pipe", "pipe", "pipe"],
    });
    let stdout = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString("utf8");
    });
    child.stdin.end(JSON.stringify(payload));
    child.on("close", (code) => resolve({ code, stdout: stdout.trim() }));
  });
}

test("the hook reports activity and waits for an approval", async () => {
  const pipe = `\\\\.\\pipe\\nook-test-${process.pid}`;
  const seen = [];
  const relay = createRelay(pipe, {
    onActivity(msg) {
      seen.push(msg.payload.hook_event_name);
    },
    onApproval(msg) {
      relay.respond(msg.id, decisionOutput(msg.agent, true));
    },
  });
  await relay.listen();
  try {
    const watch = await runHook(pipe, ["--agent", "claude"], {
      hook_event_name: "Stop",
    });
    const approval = await runHook(pipe, ["--agent", "claude", "--wait"], {
      hook_event_name: "PermissionRequest",
      tool_name: "Bash",
      tool_input: { command: "echo hi" },
    });
    const closed = await runHook("\\\\.\\pipe\\nook-missing-pipe", ["--agent", "cursor", "--wait"], {
      hook_event_name: "beforeShellExecution",
      command: "echo hi",
    });
    assert.equal(watch.code, 0);
    assert.deepEqual(seen, ["Stop"]);
    assert.equal(approval.code, 0);
    assert.equal(JSON.parse(approval.stdout).hookSpecificOutput.decision.behavior, "allow");
    assert.equal(closed.code, 1);
  } finally {
    await relay.close();
  }
});
